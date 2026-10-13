# Shared CLI definitions

**This directory is the hand-maintained source for CLI skills, agents, hooks, and entry points.** Shared `AGENTS.md` governs workflow rules; adapters govern native CLI syntax.

| Source | Role |
|---|---|
| `skills/` | Standard skill directories, including references, scripts, assets, and licenses |
| `agents/` | Shared agent Markdown with `name` and `description` frontmatter |
| `hooks.json` | Logical events and command scripts, timeouts in seconds, and status messages |
| `CLAUDE.md` | Claude's entry point into the shared `AGENTS.md` rules |
| `worktree-CONTEXT.md.tmpl` | Shared briefing, rendered for the active CLI and then the worktree |
| `integrations.json` (generated in a Target project) | Selected integrations and digests of owned output files |

The Template contains these sources instead of pre-rendered CLI directories. Deploy copies common
files, including this directory and the rendering tools, then invokes the integration renderer.
Generated integration files are committed in the Target project. Edit the source and re-render;
local edits to generated files cause a conflict, so rendering cannot silently discard them.

| Selection | Generated integration files |
|---|---|
| `claude` | `CLAUDE.md`, `.claude/skills/`, `.claude/agents/*.md`, `.claude/settings.json`, `.claude/worktree-CONTEXT.md.tmpl` |
| `codex` | `.agents/skills/`, `.codex/agents/*.toml`, `.codex/config.toml` |
| `claude,codex` | Both sets of files, with shared definitions as their source |

## Source format

Skills keep their standard `SKILL.md` frontmatter and supporting directory contents; binary assets
and executable file modes are preserved. Each agent
has a filename matching its `name`, and single-line string fields for `name` and `description`.
Use plain strings, YAML single-quoted strings, or JSON double-quoted strings. Agent bodies are
instructions; model and tool settings belong in the adapter when a CLI needs them, except `tools`,
which Claude's adapter passes through to limit a read-only agent and Codex's ignores.

CLI substitutions are `{{CLI_WORKTREE_CREATE}}`, `{{CLI_WORKTREE_REMOVE}}`, and
`{{CLI_WORKTREE_ISOLATION}}`. Unknown CLI substitutions are errors. Briefing substitutions such
as `{{WORKTREE_PATH}}` are filled later by `scripts/render-worktree-context.mjs`.

Hook groups have an `event` and a nonempty `handlers` array. Each handler specifies `script`,
`timeout`, and `statusMessage`. The script must exist under `scripts/hooks/`.

| Logical event | Claude mapping | Codex mapping |
|---|---|---|
| `before-command` | `PreToolUse`, `Bash` | `PreToolUse`, `Bash` |
| `before-edit` | `PreToolUse`, `Write|Edit` | `PreToolUse`, `apply_patch` |
| `worktree-create` | `WorktreeCreate` | Unsupported; reported when rendering |
| `worktree-remove` | `WorktreeRemove` | Unsupported; reported when rendering |

Codex's Bash hook payload is compatible with the command guards. The edit guard extracts every
path from Codex's patch payload, including deletion and move targets. Hook commands resolve from
the git root, so starting Codex in a subdirectory does not change the script location.

Codex worktree workflows run the provision script with `HARNESS_CLI=codex`; it creates
`.codex/worktrees/` and a briefing without Claude-specific worktree isolation text. With both
integrations selected, the script defaults to Claude unless `HARNESS_CLI` selects Codex. Cleanup
happens from the primary checkout after the worktree session ends.

## Rendering and checking

```sh
node scripts/render-integrations.mjs --integrations claude,codex .
node scripts/render-integrations.mjs --integrations claude,codex --check .
```

`--source <directory>` reads definitions from another Template or Target project. The default
source is the checkout containing the script, independent of the working directory. The API is
`renderIntegrations({ root, integrations })` for in-memory output, or
`writeIntegrations({ root, target, integrations, check })` for writing or checking.

Every destination is checked before writing. An unchanged owned file can be updated or removed
when selection changes; conflicting local files and destination symlinks are refused. `--check`
also finds stale owned files. An I/O failure during writing can leave partial output; this is a
local renderer, not an atomic filesystem transaction.

The renderer does not install CLIs or change machine Bootstrap. Start Codex in the Target project
and complete its project and hook trust review before relying on the configured hooks.

## Official Codex formats

The adapter follows [skill discovery](https://learn.chatgpt.com/docs/build-skills),
[custom agent TOML](https://learn.chatgpt.com/docs/agent-configuration/subagents), and
[hook configuration and payloads](https://learn.chatgpt.com/docs/hooks). These documented formats
take precedence over older CLI assumptions. A Codex release supporting these formats is required.
