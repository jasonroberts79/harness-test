/**
 * The doctor: probes this machine's setup for this repository, changes nothing, and prints one line
 * per probe as ok, warn or fail, each warn and fail naming the command that fixes it.
 *
 * THE FAILURE IT EXISTS TO PREVENT. A setup step skipped on one machine fails later, in the middle
 * of work, with an error that does not name the step: a hook that runs nothing, an old
 * `node_modules`, a plugin never installed. The entrypoint's warnings scroll past unread, so each
 * probe lives here, once, and runs at the end of `mise run bootstrap`, at the end of every container
 * start, and by hand.
 *
 *   mise run doctor                     every probe; exits 1 on any fail
 *   node scripts/doctor.mjs --container adds the probes of what the dev container's entrypoint set up
 *   mise run doctor:selftest            (--selftest) each probe broken once in a fixture, beside a control
 *
 * Lines start `[doctor] ok`, `[doctor] warn` or `[doctor] fail`; the Template test reads them.
 * NEEDS Node, and nothing from node_modules, so it runs when `npm ci` has failed. It reads the
 * machine, so it runs in neither the pre-push hook nor CI; its selftest runs in both.
 * A git hook runs with the PATH of whatever ran git, plus git's own exec-path, and `mise run` puts
 * every pin on the doctor's own PATH; so the node probe asks a new login shell, as a new terminal
 * starts one, which node it finds here (probed 2026-10-12, Git 2.54.0, mise 2026.10.6).
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SELF = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(SELF), '..')
const HOOK_EVENTS = ['pre-commit', 'prepare-commit-msg', 'post-checkout', 'post-merge', 'pre-push']
export const LOCK_MARKER = 'node_modules/.devcontainer-lock-hash'

function sh(command, args, options = {}) {
  // A hook's GIT_DIR would point git at the hook's checkout; a GIT_CONFIG_* key is a caller's on purpose.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_') || key.startsWith('GIT_CONFIG_')))
  const result = spawnSync(command, args, { cwd: ROOT, env, encoding: 'utf8', shell: process.platform === 'win32', ...options })
  return { ok: !result.error && result.status === 0, out: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(), missing: result.error?.code === 'ENOENT' }
}

/** The pin `mise.toml` gives a tool, or null. */
export function misePin(root, tool) {
  const text = existsSync(join(root, 'mise.toml')) ? readFileSync(join(root, 'mise.toml'), 'utf8') : ''
  return new RegExp(`^\\s*"?${tool}"?\\s*=\\s*"([^"]+)"`, 'm').exec(text)?.[1] ?? null
}

/** Git's floor, read from the hook runner that holds it (`MIN_GIT` in scripts/git-hooks.mjs). */
function gitFloor(root) {
  const file = join(root, 'scripts/git-hooks.mjs')
  const match = existsSync(file) && /const MIN_GIT = \[(\d+), (\d+), (\d+)\]/.exec(readFileSync(file, 'utf8'))
  return match ? match.slice(1).map(Number) : null
}

function older(have, floor) {
  const at = have.findIndex((n, i) => n !== floor[i])
  return at >= 0 && have[at] < floor[at]
}

/** `node --version` as a new terminal's shell runs it in `root`: the PATH a hook started from that terminal gets. */
function shellNode(root) {
  const shell = process.env.SHELL
  // ponytail: Windows has no SHELL, so there the probe reads this process's PATH, which `mise run`
  // has already fixed up; ask Git Bash's login shell if a Windows hook is found missing its node.
  if (!shell || process.platform === 'win32') return sh('node', ['--version'], { cwd: root })
  const args = /^pwsh/.test(basename(shell)) ? ['-Login', '-Command', 'node --version'] : ['-ilc', 'node --version']
  const env = Object.fromEntries(['HOME', 'USER', 'LOGNAME', 'LANG'].filter((k) => process.env[k]).map((k) => [k, process.env[k]]))
  const result = sh(shell, args, { cwd: root, env: { ...env, SHELL: shell, TERM: 'dumb' }, stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 })
  // An interactive shell's profile can print first; the version is its last line shaped like one.
  return result.ok ? { ...result, out: result.out.match(/v\d+\.\d+\.\d+/g)?.at(-1) ?? result.out } : result
}

/** The probes only a person can fix, which bootstrap also runs before it starts. */
export function personProbes(root = ROOT, { container = false } = {}) {
  const results = []
  const floor = gitFloor(root)
  const git = sh('git', ['--version'])
  const have = /(\d+)\.(\d+)\.(\d+)/.exec(git.out)?.slice(1).map(Number)
  if (!git.ok || !have) results.push(['fail', 'toolchain', 'git is installed', git.out || 'git not found', 'install Git from https://git-scm.com'])
  else if (floor && older(have, floor)) results.push(['fail', 'toolchain', `git is ${floor.join('.')} or later`, `git is ${have.join('.')}`, `install Git ${floor.join('.')} or later`])
  else results.push(['ok', 'toolchain', `git ${have.join('.')}`])
  const mise = sh('mise', ['--version'])
  if (!mise.ok) results.push(['fail', 'toolchain', 'mise is installed', mise.out || 'mise not found', 'install mise from https://mise.jdx.dev, then `mise trust`'])
  else results.push(['ok', 'toolchain', 'mise is installed'])
  if (!container) {
    const pin = misePin(root, 'node')
    const node = shellNode(root)
    if (pin && node.out !== `v${pin}`) {
      results.push(['warn', 'toolchain', `the PATH's node is the pinned ${pin}`, node.ok ? `a new ${basename(process.env.SHELL ?? 'shell')} finds ${node.out}` : `a new shell finds no node: ${node.out.split('\n').at(-1) || 'it did not start'}`, 'put mise first on the PATH: `mise activate` in your shell profile, or its shims directory'])
    } else if (pin) results.push(['ok', 'toolchain', `the PATH's node is the pinned ${pin}`])
  }
  return results
}

export function probes(root = ROOT, { container = false } = {}) {
  const results = personProbes(root, { container })
  const say = (status, area, probe, detail, fix) => results.push([status, area, probe, detail, fix])
  if (results.some(([status, , probe]) => status === 'ok' && probe === 'mise is installed')) {
    const missing = sh('mise', ['ls', '--current', '--missing', '--no-header'])
    if (!missing.ok) say('warn', 'toolchain', 'mise reads mise.toml', missing.out, '`mise trust`')
    else if (missing.out) say(container ? 'warn' : 'fail', 'toolchain', 'every tool mise.toml pins is installed', missing.out.split('\n').map((l) => l.trim().split(/\s+/)[0]).join(', ') + ' missing', container ? 'rebuild the container' : '`mise run bootstrap`')
    else say('ok', 'toolchain', 'every tool mise.toml pins is installed')
  }

  const lock = join(root, 'package-lock.json')
  const want = existsSync(lock) ? createHash('sha256').update(readFileSync(lock)).digest('hex') : null
  const have = existsSync(join(root, LOCK_MARKER)) ? readFileSync(join(root, LOCK_MARKER), 'utf8').trim() : null
  if (want && want !== have) say('fail', 'checkout', 'node_modules matches package-lock.json', have ? 'installed from another lockfile' : 'no install recorded', '`mise run bootstrap`')
  else say('ok', 'checkout', 'node_modules matches package-lock.json')

  const unhooked = HOOK_EVENTS.filter((event) => sh('git', ['-C', root, 'config', '--get', `hook.asdlc-${event}.command`]).out !== `node scripts/git-hooks.mjs ${event}`)
  if (unhooked.length) say('fail', 'checkout', 'the git hooks are installed', `${unhooked.join(', ')} not installed`, '`mise run hooks:install`')
  else say('ok', 'checkout', 'the git hooks are installed')

  if (!existsSync(join(root, '.beads/embeddeddolt'))) say('fail', 'tracker', 'the Tracker is hydrated', 'no .beads/embeddeddolt', '`bd bootstrap` (never `bd init`), or `mise run bootstrap`')
  else say('ok', 'tracker', 'the Tracker is hydrated')

  const sync = sh(process.execPath, [join(root, 'scripts/skill-sources.mjs'), 'sync', '--dry-run'])
  const drift = sync.out.split('\n').filter((line) => /^(would |held:|skip:|fail:)/.test(line))
  if (!sync.ok || drift.some((line) => line.startsWith('fail:'))) say('fail', 'claude code', 'plugins and installed skills match policy/skill-sources.json', drift.join('; ') || sync.out, '`mise run skills:install` shows the failure')
  else if (drift.length) say('warn', 'claude code', 'plugins and installed skills match policy/skill-sources.json', drift.join('; '), '`mise run skills:install`; a held skill is re-admitted with the add-skill skill')
  else say('ok', 'claude code', 'plugins and installed skills match policy/skill-sources.json')

  if (container) {
    if (!sh(process.execPath, [join(root, 'scripts/github-app-token.mjs'), 'token']).ok) {
      say('warn', 'container', 'the GitHub App mints a token', 'git and gh cannot reach GitHub', '`node scripts/github-app-token.mjs token` in the clone says why')
    } else say('ok', 'container', 'the GitHub App mints a token')
    if (!sh('git', ['-C', root, 'config', 'user.email']).out) say('warn', 'container', 'git has a commit identity', 'no user.email', '`node scripts/github-app-token.mjs identity` says why the App\'s could not be read')
    else say('ok', 'container', 'git has a commit identity')
  }
  return results
}

export function format([status, area, probe, detail, fix]) {
  return `[doctor] ${status.padEnd(4)} ${area}: ${probe}${detail ? ` -- ${detail}` : ''}${fix ? `; fix: ${fix}` : ''}`
}

function main(argv) {
  if (argv.includes('--selftest')) return selftest()
  const results = probes(ROOT, { container: argv.includes('--container') })
  for (const result of results) console.log(format(result))
  const count = (s) => results.filter(([status]) => status === s).length
  console.log(`[doctor] ${count('ok')} ok, ${count('warn')} warn, ${count('fail')} fail`)
  process.exitCode = count('fail') ? 1 : 0
}

// ---- selftest ---------------------------------------------------------------------------------

async function selftest() {
  const { test, after } = await import('node:test')
  const assert = (await import('node:assert/strict')).default
  const temp = realpathSync(mkdtempSync(join(tmpdir(), 'doctor-selftest-')))
  after(() => rmSync(temp, { recursive: true, force: true }))
  const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim()
  let count = 0

  /** A scratch checkout every probe passes, with stub mise, sync and token helper; `breakIt` undoes one thing. */
  function fixture(breakIt = () => {}) {
    const root = join(temp, `case-${++count}`)
    const bin = join(root, '.stub-bin')
    mkdirSync(join(root, 'scripts'), { recursive: true })
    mkdirSync(bin)
    cpSync(SELF, join(root, 'scripts/doctor.mjs'))
    writeFileSync(join(root, 'scripts/git-hooks.mjs'), 'const MIN_GIT = [2, 20, 0]\n')
    writeFileSync(join(root, 'scripts/skill-sources.mjs'), "if (process.env.STUB_SYNC) console.log(process.env.STUB_SYNC)\n")
    writeFileSync(join(root, 'scripts/github-app-token.mjs'), 'process.exit(process.env.STUB_TOKEN_FAILS ? 1 : 0)\n')
    writeFileSync(join(root, 'mise.toml'), `[tools]\nnode = "${process.version.slice(1)}"\n`)
    writeFileSync(join(root, 'package-lock.json'), '{}\n')
    mkdirSync(join(root, 'node_modules'))
    writeFileSync(join(root, LOCK_MARKER), createHash('sha256').update('{}\n').digest('hex'))
    mkdirSync(join(root, '.beads/embeddeddolt'), { recursive: true })
    // The doctor starts the login shell with a bare environment, so the stub reads a file, not a variable.
    writeFileSync(join(bin, 'login-shell'), `#!/bin/sh\n[ "$1" = -ilc ] || exit 64\necho "profile noise v0.0.1"\n[ -f "${bin}/no-node" ] && { echo "node: command not found" >&2; exit 127; }\necho ${process.version}\n`, { mode: 0o755 })
    writeFileSync(join(bin, 'mise'), '#!/bin/sh\n[ "$1" = ls ] && printf "%s" "$STUB_MISE_MISSING"\nexit 0\n', { mode: 0o755 })
    writeFileSync(join(bin, 'git'), `#!/bin/sh\n[ "$1" = --version ] && [ -n "$STUB_GIT_VERSION" ] && { echo "git version $STUB_GIT_VERSION"; exit 0; }\nexec "${realGit}" "$@"\n`, { mode: 0o755 })
    const env = { ...process.env, PATH: [bin, dirname(process.execPath), '/usr/bin', '/bin'].join(delimiter), GIT_CONFIG_GLOBAL: join(root, '.gitconfig'), GIT_CONFIG_SYSTEM: '/dev/null', SHELL: join(bin, 'login-shell') }
    for (const key of Object.keys(env)) if (key.startsWith('GIT_') && !key.startsWith('GIT_CONFIG_')) delete env[key]
    const git = (...args) => spawnSync('git', ['-C', root, ...args], { env, encoding: 'utf8' })
    git('init', '--quiet')
    git('config', '--global', 'user.email', 'doctor@example.invalid')
    for (const event of HOOK_EVENTS) git('config', `hook.asdlc-${event}.command`, `node scripts/git-hooks.mjs ${event}`)
    breakIt({ root, env, git })
    return (...args) => spawnSync(process.execPath, [join(root, 'scripts/doctor.mjs'), ...args], { cwd: root, env, encoding: 'utf8' })
  }
  const lines = (r) => r.stdout.split('\n').filter((l) => /^\[doctor\] (warn|fail)/.test(l))

  test('control: a set-up machine gets every probe ok and exits 0, on the host and in the container', () => {
    const doctor = fixture()
    for (const args of [[], ['--container']]) {
      const r = doctor(...args)
      assert.equal(r.status, 0, r.stdout + r.stderr)
      assert.deepEqual(lines(r), [])
      assert.match(r.stdout, /\[doctor\] \d+ ok, 0 warn, 0 fail/)
    }
  })
  for (const [name, breakIt, reason, status = 1, args = []] of [
    ['a git older than the floor', ({ env }) => { env.STUB_GIT_VERSION = '2.19.9' }, /fail toolchain: git is 2\.20\.0 or later -- git is 2\.19\.9/],
    ['no mise', ({ root }) => rmSync(join(root, '.stub-bin/mise')), /fail toolchain: mise is installed/],
    ['a pinned tool missing', ({ env }) => { env.STUB_MISE_MISSING = 'gh  2.102.0' }, /fail toolchain: every tool mise\.toml pins is installed -- gh missing; fix: `mise run bootstrap`/],
    ['a pinned tool missing, in the container', ({ env }) => { env.STUB_MISE_MISSING = 'gh  2.102.0' }, /warn toolchain: every tool .* fix: rebuild the container/, 0, ['--container']],
    ['a PATH whose node is not the pin', ({ root }) => writeFileSync(join(root, 'mise.toml'), '[tools]\nnode = "1.0.0"\n'), /warn toolchain: the PATH's node is the pinned 1\.0\.0/, 0],
    ['a login shell with no node', ({ root }) => writeFileSync(join(root, '.stub-bin/no-node'), ''), /warn toolchain: the PATH's node is the pinned .* -- a new shell finds no node: node: command not found/, 0],
    ['node_modules from another lockfile', ({ root }) => writeFileSync(join(root, 'package-lock.json'), '{"changed":true}\n'), /fail checkout: node_modules matches package-lock\.json -- installed from another lockfile/],
    ['a hook not installed', ({ git }) => git('config', '--unset', 'hook.asdlc-pre-push.command'), /fail checkout: the git hooks are installed -- pre-push not installed/],
    ['no Tracker', ({ root }) => rmSync(join(root, '.beads'), { recursive: true }), /fail tracker: the Tracker is hydrated/],
    ['plugin drift', ({ env }) => { env.STUB_SYNC = 'would install plugin x@y for this clone' }, /warn claude code: .* -- would install plugin x@y/, 0],
    ['a held skill', ({ env }) => { env.STUB_SYNC = 'held: helper stays off this machine' }, /warn claude code: .* -- held: helper/, 0],
    ['a sync that fails', ({ env }) => { env.STUB_SYNC = 'fail: reading Claude Code\'s plugins' }, /fail claude code: .* -- fail: reading/],
    ['an App that mints no token, in the container', ({ env }) => { env.STUB_TOKEN_FAILS = '1' }, /warn container: the GitHub App mints a token/, 0, ['--container']],
    ['no commit identity, in the container', ({ git }) => git('config', '--global', '--unset', 'user.email'), /warn container: git has a commit identity/, 0, ['--container']],
  ]) {
    test(`fails for its reason on ${name}`, () => {
      const r = fixture(breakIt)(...args)
      assert.equal(r.status, status, r.stdout + r.stderr)
      assert.equal(lines(r).length, 1, lines(r).join('\n'))
      assert.match(lines(r)[0], reason)
    })
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === SELF) await main(process.argv.slice(2))
