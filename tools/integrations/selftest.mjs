/**
 * Exercise CLI integration rendering and ownership checks over temporary Target projects.
 *
 * Without these cases, an adapter could silently drop guards, render an undiscoverable skill,
 * overwrite a person's CLI settings, or leave stale integration files after deselection.
 *
 *   node tools/integrations/selftest.mjs
 *
 * Needs the Template's npm dependencies for a TOML parser, git, bash, and loopback port access.
 * No agent CLI, token, or external network.
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'
import { parse } from 'smol-toml'
import { SCRATCH_GIT_ENV } from '../lib/git-env.ts'
import { adapters } from './adapters.mjs'
import { renderIntegrations } from './render.mjs'
import { writeIntegrations } from './write.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const TEMP = mkdtempSync(join(tmpdir(), 'cli-integrations-'))
after(() => rmSync(TEMP, { recursive: true, force: true }))
const target = () => mkdtempSync(join(TEMP, 'target with spaces '))
const read = (dir, file) => readFileSync(join(dir, file), 'utf8')
const copySource = () => {
  const dir = target()
  cpSync(join(ROOT, '.harness'), join(dir, '.harness'), { recursive: true })
  cpSync(join(ROOT, 'scripts/hooks'), join(dir, 'scripts/hooks'), { recursive: true })
  return dir
}

test('Claude remains the default and renders the existing hooks and licensed skills', () => {
  const { files, warnings } = renderIntegrations({ root: ROOT })
  const settings = JSON.parse(files.get('.claude/settings.json'))
  assert.equal(settings.hooks.PreToolUse[0].matcher, 'Bash')
  assert.equal(settings.hooks.PreToolUse[1].matcher, 'Write|Edit')
  assert.equal(settings.hooks.WorktreeCreate[0].hooks[0].timeout, 120)
  assert.equal(settings.hooks.WorktreeRemove[0].hooks[0].timeout, 60)
  assert.equal(files.get('CLAUDE.md'), 'Read @AGENTS.md\n')
  assert.ok(files.has('.claude/skills/root-cause/LICENSE'))
  assert.ok(files.get('.claude/agents/fan-out-work.md').includes('name: fan-out-work'))
  assert.ok(files.get('.claude/skills/work/SKILL.md').includes('`EnterWorktree`'))
  assert.ok(!files.get('.claude/skills/work/SKILL.md').includes('{{'))
  assert.deepEqual(warnings, [])
  assert.ok([...files.keys()].every((file) => !file.startsWith('.codex/') && !file.startsWith('.agents/')))
})

test('Codex renders discoverable skills, native TOML agents, and supported command hooks', () => {
  const { files, warnings } = renderIntegrations({ root: ROOT, integrations: ['codex'] })
  const config = parse(files.get('.codex/config.toml'))
  const verifier = parse(files.get('.codex/agents/adversarial-verifier.toml'))
  assert.equal(verifier.name, 'adversarial-verifier')
  assert.ok(verifier.description.includes('adversarial verifier'))
  assert.ok(verifier.developer_instructions.includes('Change nothing. Report only.'))
  assert.equal(config.hooks.PreToolUse[0].matcher, 'Bash')
  assert.equal(config.hooks.PreToolUse[1].matcher, 'apply_patch')
  assert.ok(config.hooks.PreToolUse[1].hooks[0].command.includes('block-generated-edit.mjs'))
  assert.ok(!config.hooks.WorktreeCreate)
  assert.ok(!config.hooks.WorktreeRemove)
  assert.equal(warnings.length, 2)
  assert.ok(warnings.every((warning) => warning.includes('codex') && warning.includes('worktree')))
  assert.ok(files.has('.agents/skills/root-cause/LICENSE'))
  assert.ok(files.get('.agents/skills/work/SKILL.md').includes('HARNESS_CLI=codex'))
  assert.ok(!files.get('.agents/skills/work/SKILL.md').includes('EnterWorktree'))
  assert.ok(!files.get('.agents/skills/open-pr/SKILL.md').includes('ExitWorktree'))
  assert.ok([...files.keys()].every((file) => !file.startsWith('.claude/') && file !== 'CLAUDE.md'))
})

test('both adapters coexist and output does not depend on selection order', () => {
  const first = renderIntegrations({ root: ROOT, integrations: ['claude', 'codex'] })
  const second = renderIntegrations({ root: ROOT, integrations: ['codex', 'claude', 'codex'] })
  assert.deepEqual([...first.files], [...second.files])
  assert.ok(first.files.has('.claude/settings.json'))
  assert.ok(first.files.has('.codex/config.toml'))
})

test('another adapter can declare its native output paths without changing the writer', () => {
  adapters.fixture = {
    ...adapters.claude,
    id: 'fixture',
    outputPaths: ['.fixture/'],
    skillDirectory: '.fixture/skills',
    entryPoints: {},
    agent(agent) { return ['.fixture/agents/' + agent.name + '.md', agent.body] },
    hooks() { return { file: '.fixture/hooks.json', contents: '{}\n', warnings: [] } },
  }
  try {
    const dir = target()
    writeIntegrations({ root: ROOT, target: dir, integrations: ['fixture'] })
    writeIntegrations({ root: ROOT, target: dir, integrations: ['fixture'], check: true })
    assert.ok(read(dir, '.fixture/skills/work/SKILL.md').includes('EnterWorktree'))
    writeIntegrations({ root: ROOT, target: dir, integrations: ['claude'] })
    assert.ok(!readdirSync(dir).includes('.fixture'))
  } finally {
    delete adapters.fixture
  }
})

test('invalid selections fail before a Target project is touched', () => {
  for (const integrations of [[], ['unknown'], ['claude', 'unknown']]) {
    const dir = target()
    assert.throws(() => writeIntegrations({ root: ROOT, target: dir, integrations }), /integration/i)
    assert.deepEqual(readdirSync(dir), [])
  }
})

test('rendering is idempotent, check is read-only, and deselection removes owned output', () => {
  const dir = target()
  writeIntegrations({ root: ROOT, target: dir, integrations: ['claude', 'codex'] })
  const before = read(dir, '.harness/integrations.json')
  writeIntegrations({ root: ROOT, target: dir, integrations: ['codex', 'claude'] })
  assert.equal(read(dir, '.harness/integrations.json'), before)
  writeIntegrations({ root: ROOT, target: dir, integrations: ['claude', 'codex'], check: true })
  assert.equal(read(dir, '.harness/integrations.json'), before)
  assert.throws(() => writeIntegrations({ root: ROOT, target: dir, integrations: ['codex'], check: true }), /stale|differs/i)
  assert.equal(read(dir, '.harness/integrations.json'), before)
  writeIntegrations({ root: ROOT, target: dir, integrations: ['codex'] })
  assert.ok(!readdirSync(dir).includes('CLAUDE.md'))
  assert.equal(read(dir, '.codex/config.toml').includes('PreToolUse'), true)
})

test('a conflicting local settings file prevents every write', () => {
  const dir = target()
  mkdirSync(join(dir, '.codex'))
  writeFileSync(join(dir, '.codex/config.toml'), 'model = "personal"\n')
  assert.throws(() => writeIntegrations({ root: ROOT, target: dir, integrations: ['claude', 'codex'] }), /conflict.*config\.toml/i)
  assert.deepEqual(readdirSync(dir), ['.codex'])
  assert.equal(read(dir, '.codex/config.toml'), 'model = "personal"\n')
})

test('edited generated files are preserved even when their integration is removed', () => {
  const dir = target()
  writeIntegrations({ root: ROOT, target: dir })
  writeFileSync(join(dir, '.claude/skills/work/SKILL.md'), 'local change\n')
  assert.throws(() => writeIntegrations({ root: ROOT, target: dir, integrations: ['codex'] }), /conflict.*work\/SKILL\.md/i)
  assert.equal(read(dir, '.claude/skills/work/SKILL.md'), 'local change\n')
  assert.ok(!readdirSync(dir).includes('.codex'))
})

test('a symlink destination cannot redirect rendering outside the Target project', () => {
  const dir = target()
  const outside = target()
  symlinkSync(outside, join(dir, '.claude'))
  assert.throws(() => writeIntegrations({ root: ROOT, target: dir }), /symlink/i)
  assert.deepEqual(readdirSync(outside), [])
})

test('CLI accepts explicit selection and check, and rejects unknown arguments', () => {
  const dir = target()
  const cli = join(ROOT, 'scripts/render-integrations.mjs')
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: TEMP, encoding: 'utf8' })
  const rendered = run('--integrations', 'claude,codex', dir)
  assert.equal(rendered.status, 0, rendered.stderr)
  assert.equal(run('--check', '--integrations=codex,claude', dir).status, 0)
  const invalid = run('--integrations', 'unknown', target())
  assert.notEqual(invalid.status, 0)
  assert.match(invalid.stderr, /unknown.*integration/i)
  assert.notEqual(run('--typo', dir).status, 0)
})

test('Codex patches check every edited, deleted, added, and moved generated file', () => {
  const dir = target()
  mkdirSync(join(dir, 'scripts/hooks'), { recursive: true })
  for (const file of ['_shared.mjs', 'block-generated-edit.mjs']) {
    copyFileSync(join(ROOT, 'scripts/hooks', file), join(dir, 'scripts/hooks', file))
  }
  assert.equal(spawnSync('git', ['init', '-q', dir], { env: SCRATCH_GIT_ENV }).status, 0)
  const banner = '// GENERATED by tools/example.mjs; do not edit by hand.\n'
  writeFileSync(join(dir, 'generated.js'), banner)
  writeFileSync(join(dir, 'ordinary.js'), '// hand-maintained\n')
  mkdirSync(join(dir, 'subdir'))
  const run = (patch) => spawnSync(process.execPath, [join(dir, 'scripts/hooks/block-generated-edit.mjs')], {
    input: JSON.stringify({ cwd: join(dir, 'subdir'), tool_name: 'apply_patch', tool_input: { command: patch } }),
    encoding: 'utf8',
  })
  const control = run('*** Begin Patch\n*** Update File: ../ordinary.js\n@@\n-old\n+new\n*** End Patch')
  assert.equal(control.status, 0, control.stderr)
  for (const patch of [
    '*** Update File: ../ordinary.js\n@@\n-old\n+new\n*** Update File: ../generated.js\n@@\n-old\n+new',
    '*** Delete File: ../generated.js',
    '*** Add File: ../new.js\n+' + banner.trim(),
    '*** Update File: ../ordinary.js\n*** Move to: ../generated.js\n@@\n-old\n+new',
  ]) {
    const result = run('*** Begin Patch\n' + patch + '\n*** End Patch')
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /generator.*do not edit by hand/i)
  }
})

test('source changes update both integrations and preserve binary assets and executable modes', () => {
  const source = copySource()
  const dir = target()
  const binary = Buffer.from([0, 255, 12, 10, 192])
  writeFileSync(join(source, '.harness/skills/work/asset.bin'), binary)
  const script = join(source, '.harness/skills/work/helper.sh')
  writeFileSync(script, '#!/bin/sh\nexit 0\n', { mode: 0o755 })
  writeIntegrations({ root: source, target: dir, integrations: ['claude', 'codex'] })
  for (const prefix of ['.claude', '.agents']) {
    assert.deepEqual(readFileSync(join(dir, prefix, 'skills/work/asset.bin')), binary)
    assert.equal(statSync(join(dir, prefix, 'skills/work/helper.sh')).mode & 0o777, 0o755)
  }
  const skill = join(source, '.harness/skills/work/SKILL.md')
  writeFileSync(skill, readFileSync(skill, 'utf8') + '\nShared source update.\n')
  assert.throws(() => writeIntegrations({ root: source, target: dir, integrations: ['claude', 'codex'], check: true }), /differs/i)
  writeIntegrations({ root: source, target: dir, integrations: ['claude', 'codex'] })
  assert.ok(read(dir, '.agents/skills/work/SKILL.md').includes('Shared source update.'))
  assert.ok(read(dir, '.claude/skills/work/SKILL.md').includes('Shared source update.'))
  chmodSync(join(dir, '.agents/skills/work/helper.sh'), 0o644)
  assert.throws(() => writeIntegrations({ root: source, target: dir, integrations: ['claude', 'codex'], check: true }), /helper\.sh/)
})

test('invalid ownership manifests and unknown CLI placeholders fail without writing', () => {
  const dir = target()
  mkdirSync(join(dir, '.harness'))
  const malformed = '{"version":1,"files":{}}\n'
  writeFileSync(join(dir, '.harness/integrations.json'), malformed)
  assert.throws(() => writeIntegrations({ root: ROOT, target: dir }), /manifest/i)
  assert.equal(read(dir, '.harness/integrations.json'), malformed)
  assert.deepEqual(readdirSync(dir), ['.harness'])
  const source = copySource()
  const skill = join(source, '.harness/skills/work/SKILL.md')
  writeFileSync(skill, readFileSync(skill, 'utf8') + '\n{{CLI_unknown}}\n')
  assert.throws(() => renderIntegrations({ root: source }), /Unknown integration placeholder/)
})

test('Codex hooks resolve from a subdirectory and Codex worktrees use the shared provisioner', () => {
  const dir = target()
  cpSync(ROOT, dir, {
    recursive: true,
    // A deployed Target has .git and installed hooks; copying them makes this fixture inherit
    // Bob's hooks, remotes and index while excluding the dependencies those hooks require.
    filter: (file) => file !== join(ROOT, '.git') && file !== join(ROOT, 'node_modules') &&
      file !== join(ROOT, '.claude') && file !== join(ROOT, '.beads/embeddeddolt') && !file.endsWith('.DS_Store'),
  })
  writeIntegrations({ root: dir, target: dir, integrations: ['codex'] })
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    HARNESS_CLI: '',
  }
  const git = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8' }).trim()
  git('init', '-q', '-b', 'main')
  git('add', '.')
  git('-c', 'user.name=Integration test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Template')
  const origin = target()
  execFileSync('git', ['init', '-q', '--bare', origin], { env })
  git('remote', 'add', 'origin', origin)
  git('push', '-q', 'origin', 'main')
  const config = parse(read(dir, '.codex/config.toml'))
  mkdirSync(join(dir, 'subdirectory'))
  for (const handler of config.hooks.PreToolUse[0].hooks) {
    const hook = spawnSync('sh', ['-c', handler.command], {
      cwd: join(dir, 'subdirectory'), env, encoding: 'utf8',
      input: JSON.stringify({ cwd: join(dir, 'subdirectory'), tool_name: 'Bash', tool_input: { command: 'pwd' } }),
    })
    assert.equal(hook.status, 0, hook.stderr)
  }
  const provision = read(dir, '.agents/skills/work/SKILL.md')
    .match(/`(HARNESS_CLI=codex [^`]+)`/)[1]
    .replace('<task-ref> <slug>', 'codex lane')
  const result = spawnSync('bash', ['-c', provision], { cwd: join(dir, 'subdirectory'), env, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const worktree = join(dir, '.codex/worktrees/codex-lane')
  assert.ok(read(worktree, '.worktree/CONTEXT.md').includes('agent/codex-lane'))
  assert.ok(!read(worktree, '.worktree/CONTEXT.md').includes("Claude Code's own worktree isolation"))
  assert.ok(!readdirSync(dir).includes('.claude'))
  assert.equal(git('status', '--short'), '')
  git('worktree', 'remove', worktree)
  mkdirSync(worktree)
  const guarded = spawnSync(process.execPath, [join(dir, 'scripts/hooks/guard-git.mjs')], {
    env, encoding: 'utf8', input: JSON.stringify({ cwd: worktree, tool_name: 'Bash', tool_input: { command: 'git status' } }),
  })
  assert.equal(guarded.status, 2, guarded.stderr)
  assert.match(guarded.stderr, /git there answers for/)
})

test('policy claudeEnabledPlugins renders Claude enabledPlugins, and a malformed id fails', () => {
  const source = copySource()
  cpSync(join(ROOT, 'policy'), join(source, 'policy'), { recursive: true })
  const record = join(source, 'policy/skill-sources.json')
  const policy = JSON.parse(read(source, 'policy/skill-sources.json'))
  assert.equal(JSON.parse(renderIntegrations({ root: source }).files.get('.claude/settings.json')).enabledPlugins, undefined)
  writeFileSync(record, JSON.stringify({ ...policy, claudeEnabledPlugins: ['beads@beads-marketplace'] }))
  const settings = JSON.parse(renderIntegrations({ root: source }).files.get('.claude/settings.json'))
  assert.deepEqual(settings.enabledPlugins, { 'beads@beads-marketplace': true })
  assert.ok(settings.hooks.PreToolUse)
  assert.equal(Object.keys(settings).at(-1), 'enabledPlugins', 'claude plugin install rewrites the file with enabledPlugins last')
  assert.ok(!renderIntegrations({ root: source, integrations: ['codex'] }).files.get('.codex/config.toml').includes('beads'))
  writeFileSync(record, JSON.stringify({ ...policy, claudeEnabledPlugins: ['beads'] }))
  assert.throws(() => renderIntegrations({ root: source }), /Invalid policy claudeEnabledPlugins/)
})
