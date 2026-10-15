# Application-development rigor: adopt addyosmani/agent-skills?

**Written:** 2026-10-14

* Status: accepted
* Deciders: the maintainer
* Date: 2026-10-14

Technical Story: `/should-i-adopt https://github.com/addyosmani/agent-skills to add development
rigor and consistency to application development for this project?` This record wins over the
tracker issue that carries it where they disagree; the issue points here.

## Context and Problem Statement

The candidate is `addyosmani/agent-skills` at tag `0.6.13`, commit
`aeac41d4d005999432bb7312f7ff06383a91d59d`, released 2026-10-13: a Claude Code plugin (also
installable skill by skill with the `skills` CLI) holding 25 skills, 9 slash commands, 4 agents, 7
shared reference checklists and 3 opt-in hooks, MIT-licensed. The skills cover a spec → plan →
build → test → review → ship lifecycle for application code.

The problem named is "development rigor and consistency to application development". What the
harness has today for that, from `.harness/skills/`: `work` (verify the premise, claim, gate,
integrate), `open-pr` (adversarial verification before push), `root-cause` (diagnose before fix),
`add-task`, `add-skill` and `should-i-adopt`. What it has nothing for: test-first implementation,
a code-review rubric, incremental slices, specs and plans for product features.

The evidence for the problem is thin: `git ls-files` on `origin/main` (read 2026-10-14) lists only
harness files, no application code. No gate output, issue or file shows a product change that went
wrong for want of these skills. Should the harness adopt the candidate now, in part, or not yet?

## Decision Drivers

* Every prompt word is paid for by every session that loads it (`policy/prompt-budgets.json`
  `whyThisFileExists`); `AGENTS.md` is budgeted at 1,887 words.
* A rule has one home (`AGENTS.md` § Rules for agents live in tracked files, and nowhere else); an
  outside skill is admitted only through `add-skill`'s checks and `policy/skill-sources.json`.
* Tasks live in `bd`, never a markdown checklist (`.beads/PRIME.md`).
* Decisions are recorded in `docs/decisions` in this record's format (`AGENTS.md` § Decisions records).
* Nobody here can edit an installed skill; what it says, every session reads.

## Considered Options

* Do not adopt (nothing changes)
* Adopt the whole plugin through `claudeEnabledPlugins`
* Admit two or three skills through `installedSkills` with the `add-skill` skill
* Write a small tracked skill under `.harness/skills/` adapted from the candidate
* An alternative pack of the same shape, admitted the same way

## Decision Outcome

Chosen option: **"Admit two or three skills through `installedSkills`"**, as *adopt with
conditions*. The maintainer confirmed on 2026-10-14 that application code will live in this
repository, so the gap is real even though no code shows it yet. The whole plugin is ruled out by
friction answers 1 and 2, but those are its commands, which the per-skill route never installs
(E1). The narrow set costs 194 words of descriptions per session (74, 64 and 56 words, read from
the pinned commit, leaving out the `description:` key), beside the 1,859 words of `AGENTS.md`; each body loads only when invoked.

An earlier draft of this record said "not now", to be reopened at the first product epic. It was
withdrawn because that trigger is the moment nobody re-reads decision records, so its loss case,
product pull requests landing with no test-first discipline, was the likely case.

**Accepted on 2026-10-14.** The maintainer said "Proceed with adding the three skills". The
admission ran the same day, and § "Admission" gives its results. The conditions are filed from
harness-test-8uc. Condition 1 is harness-test-k7x, harness-test-44g and harness-test-eby, one per
skill. Condition 2 is harness-test-0dp, condition 3 is harness-test-pzj, and condition 4 is
harness-test-fwx. The pull request that lands this record carries conditions 1 to 3.

**The conditions**, each an issue filed once this record is accepted (`issueTypes` row `decision`,
`policy/vocabulary.json`). Conditions 2 and 3 mitigate every finding in § "What the three skill
bodies say" and § "Admission", which is why they are conditions:

1. One `add-skill` run per skill, at commit `aeac41d4d005999432bb7312f7ff06383a91d59d` or newer,
   for `test-driven-development`, `incremental-implementation` and `code-review-and-quality`. The
   operator accepts or refuses the audit's `runlayer` warn, and the findings listed below, which the
   `skill-assessor` agent is expected to report.
2. One sentence in `AGENTS.md` § Rules for agents live in tracked files, and nowhere else: where an
   installed skill and a tracked file disagree, the tracked file wins. `AGENTS.md` holds 1,847 words
   against a budget of 1,887 (`policy/prompt-budgets.json`), so the sentence fits without a raise. With it, `AGENTS.md` holds 1,859.
3. A note in the `work` skill. It says that `work` owns picking up and claiming an issue; that the
   admitted skills apply inside its worktree, and commit only there; that a defect noticed out of
   scope is filed with `foundIssueCommand`, not put to the user as a question; that the final gate
   is `mise run gates` and then `verify`, not the skills' example commands; and that gate work keeps
   the `:selftest` contract.
4. A product test task in `tasks.toml`, added through the `add-task` skill once product code
   lands, so the test-first loop has a command the gates also run.

**The fallback for `incremental-implementation`:** if the operator does not accept its findings,
vendor an adapted copy under `.harness/skills/`, as `root-cause` was adapted from
`obra/superpowers`. The copy can name the worktree, the tracker and the gates directly.

**The next wave:** `source-driven-development`, `api-and-interface-design` and
`security-and-hardening`, each admitted through `add-skill` under conditions 1 and 2 when its
trigger event comes. § "The other 22 skills" gives each skill's event, verdict and the lines that
decide it.

**Where this loses:** the worst case is a session asked to implement a feature that fires
`incremental-implementation` without `work`. That session commits each slice on local `main` in the
primary checkout, where `scripts/hooks/guard-git.mjs` applies no git rule (its header) and
`git-hooks.yml` checks no branch. Only condition 2 and `AGENTS.md` § Git workflow stand against it,
and both are advice. Beyond that, the three skills sit unused until product work starts, and
upstream may move past the pin first. If upstream #597 is unfixed by then, four reference links
across the three skills stay dead. Upstream #620 measured `incremental-implementation` firing 0 of 6 times on a
prompt that pastes the code inline, and its pinned description has no clause for that case. Its
rigor reaches such a session only when the `work` skill names it.

### Positive Consequences

* The first product session finds the skills in place and routed from `work`.
* Each admission goes through the existing checks; no new gate or policy key is needed.

### Negative Consequences

* Three rows in `policy/skill-sources.json` to re-pin as upstream releases every one to two weeks.
* Text nobody here can edit: a rule in it that conflicts with a later rule here is a second home
  until the row is removed.

## Friction assessed here

Each row: what the candidate does, what it collides with, severity (**blocks** / **costs** /
**none**), and the evidence (a trial `E<n>`, a source, or "unverified"). Trials ran in the dev
container image (`.devcontainer/Dockerfile`, as VS Code had built it) on a clone of `origin/main`
from a bundle; Docker's images, containers, networks and volumes matched the pre-trial listing after
cleanup.

| # | Question | Finding | Severity | Evidence |
|---|---|---|---|---|
| 1 | Where its instructions live | The plugin's text loads word for word. `constraint-driven-development` § and `/constraints` step 6 tell the session to add a line to `AGENTS.md` and `CLAUDE.md` and create `CONSTRAINTS.md` at the root: a second home for rules. `context-engineering` tells it to write `CLAUDE.md`, and no gate refuses that edit (E8, E9). `documentation-and-adrs` matches an existing ADR convention before its own (lines 36 to 44), so it would follow this record's format; an earlier draft of this row said otherwise. | **blocks** for the whole plugin; **costs** per skill (`constraint-driven-development` and `context-engineering` are excluded) | `constraint-driven-development` line 140, upstream `/constraints` line 25, `context-engineering` lines 38 to 72 at the pinned commit; E8, E9 |
| 2 | Files it adds, of which kind | Plugin route: only `enabledPlugins` in `.claude/settings.json`, rendered from the policy record (E5). Skill route: `.claude/skills/<name>/SKILL.md` untracked plus `skills-lock.json`, both in `info/exclude` (E1, E2). Its commands write `SPEC.md`, `tasks/plan.md`, `tasks/todo.md` and `CONSTRAINTS.md`: model output committed as source. `planning-and-task-breakdown` files tasks in `bd` when `AGENTS.md` names a tracker (lines 161 to 164), but always writes `tasks/plan.md` with a task index and checkpoints (line 145), the status document `.beads/PRIME.md` forbids; `/build auto` reads it. | **blocks** for `/plan` and `/build auto`; **none** for the skill route | E1, E2, E5; upstream `/build` § Autonomous steps 2 to 4 |
| 3 | What it reads, so its tier | Prompts only; no gate, no check. Cost is per session: the plugin's 25 descriptions total 1,368 words, leaving out each `description:` key, loaded as the skill index in every session; each `SKILL.md` is 1,320 to 3,555 words on invocation. | **costs** | `wc -w` over the pinned commit |
| 4 | What it writes outside its own files | Hooks are not wired by `plugin.json` (no `hooks/hooks.json`, E3); if wired by hand, `sdd-cache-*.sh` writes `.claude/sdd-cache/` and a `.debug.log`, `simplify-ignore.sh` writes cache files. `/build` commits per task; `git-workflow-and-versioning` shows `git reset --hard HEAD` and tag pushes. | **costs** | E3; `hooks/sdd-cache-pre.sh:50`, `git-workflow-and-versioning` lines 189 and 292 |
| 5 | In a linked worktree | The plugin's project record names the primary checkout (E3 `projectPath`), which is why sync runs there; installed skills are copied into new worktrees by `scripts/skill-sources.mjs copy`. Whether Claude Code enables a project-scope plugin inside a linked worktree whose path differs from the record's: unverified. | **none** known | E3; `scripts/skill-sources.mjs` header |
| 6 | Output an agent reads | `/ship` merges three subagent reports into one verdict; `/review` fills a template. No filter or cap on tool output. | **none** | upstream `/ship` § Phase B |
| 7 | Commands a session would run | From a linked worktree the guard allows `git add -A`, `git commit`, `git reset --hard HEAD`, `git push`, `git push origin v1.4.0`, `git tag` and `git revert … && git push`; it refuses `gh pr create` without `--base` and `git push origin main` (E4). The candidate's prose names no `gh pr create` at all, so the base rule bites only if a session infers one. From the primary checkout, both command guards also allow a native `git worktree add` and `remove`, `git bisect`, `git reset --hard HEAD`, a tag push and `npx -y chrome-devtools-mcp@latest` (E7). `/constraints` step 4 installs tools, against `mise.toml` and `package.json` as the one home of pins. | **costs** | E4, E7; upstream `/constraints` line 21 |
| 8 | Dependencies and platforms | Plugin route needs Claude Code only (2.1.296 in the image, E3). Skill route uses `skills` 1.7.2, already in `package.json`. Opt-in hooks need `jq` and `perl`. | **none** | E1, E3 |
| 9 | Cost | No money, no CI minutes. Tokens: the skill index every session plus one skill body per invocation (row 3). `/ship` spawns three subagents per run. | **costs** | row 3; upstream `/ship` § Phase A |
| 10 | Health | 0.6.13 on 2026-10-13; 0.6.6 on 2026-08-04, so a release every one to two weeks; 81 contributors with a GitHub login (93 counting anonymous ones, by the contributors API), 352 of 702 commits by the author; 106,682 stars, 58 open issues, 60 open pull requests on 2026-10-14; MIT. Open issue #620 measures eight skills firing 0 of 6 times when the code is pasted inline, and gives the clause that fixed `test-driven-development`, which its pinned description carries; #597 reports the per-skill install dropping `references/`, which E1 confirms: `code-review-and-quality` lands alone and its two `../../references/*.md` links point at nothing. skills.sh audits (read 2026-10-14): `runlayer` warn MEDIUM on all five skills read, `snyk` warn MEDIUM on `code-review-and-quality`; sync warns below `fail`/HIGH and proceeds (E2). | **costs** | `gh api`, E1, E2 |
| 11 | Reversal | Plugin: delete the row, the next sync uninstalls the project record; the marketplace stays declared in the user's Claude Code settings on a host (E3 "declared in user settings"), removed only in the container (`--owns-user-config`). Skills: delete the row, the next sync removes the directory. Files its commands wrote (`SPEC.md`, `CONSTRAINTS.md`, `tasks/`) stay until someone deletes them. | **costs** | E3; `scripts/skill-sources.mjs` header |

## What the three skill bodies say

Each `SKILL.md` was read in full on 2026-10-14 at the pinned commit. Each finding gives the kind
used by `.harness/agents/skill-assessor.md`: 1 contradicts a rule, 2 runs what is refused, 3 writes
where it steers later runs, 4 competes with a skill here, 5 reaches outside. None blocks. No skill
writes to a steering file (kind 3). This reading found nothing that reaches outside (kind 5), but
the `skill-assessor` agent found three such places at admission (§ "Admission").

**Common to all three:**

* Every skill links a shared file that a per-skill install leaves out (E1). `test-driven-development`
  line 361 links `references/testing-patterns.md`. `incremental-implementation` line 249 links
  `references/definition-of-done.md`, which it calls "the final gate". `code-review-and-quality`
  lines 353 and 354 link the security and performance checklists.
* Each names skills outside the set. `test-driven-development` names `browser-testing-with-devtools`
  at line 341 (line 22 names Chrome DevTools MCP). `incremental-implementation` names `git-workflow-and-versioning` at line 41.
  `code-review-and-quality` names `security-and-hardening`, `performance-optimization` and
  `constraint-driven-development` at lines 66, 79 and 164. `incremental-implementation` line 201
  names `test-driven-development`, which admitting both satisfies.
* No tracked file says which wins when an installed skill and a tracked rule disagree. Precedence
  sentences exist in `.beads/PRIME.md`, `AGENTS.md` § Worktree-local context, `policy/README.md`
  and the tracked skills, and none of them covers outside text.
  `AGENTS.md` § Every directory and document says what it is, and who wins asks for that sentence,
  and outside text cannot carry it. Condition 2 adds it.

**`test-driven-development`** (2,474 words; description 74):

| Line | What it says | Rule it meets | Kind | Severity |
|---|---|---|---|---|
| 3 | "Use when implementing any logic, fixing any bug, or changing any behavior" | It fires on harness gates too, where `AGENTS.md` § Standing rules for prompts and gates sets the `:selftest` contract. Its method agrees, since both fail first, but it names no selftest | 4 | costs |
| 3, 98 | "when a bug report arrives"; "do not start by trying to fix it" | `root-cause` claims "whenever a failure's cause is not yet known". Both reproduce first, but only `root-cause` stops after `rootCauseMaxFixes` failed fixes | 4 | costs |
| 26 to 34 | Discover the test commands from `package.json`, a `Makefile` or CI workflows | It omits `tasks.toml`, where every gate lives (`work` § 4: "Run no task name `tasks.toml` does not list"). `tasks.toml` has no product test task today | 1 | costs |
| 345 to 357 | A subagent writes the reproduction test | It agrees with `AGENTS.md` § Verification before claiming on briefs | none | none |

**`incremental-implementation`** (1,500 words; description 64):

| Line | What it says | Rule it meets | Kind | Severity |
|---|---|---|---|---|
| 3 | "when picking up the next task from a plan" | `work` claims "pick up ... an issue". A session that picks this skill instead skips the claim and the worktree (`work` § 3) | 4 | costs, the most severe finding |
| 41, 209, 245 | Commit each slice; "No uncommitted changes remain" | It names no branch. In the primary checkout `guard-git.mjs` applies no git rule (its header) and `git-hooks.yml` checks no branch, so slices land on local `main`. `AGENTS.md` § Git workflow puts agent work on `agent/<name>` branches | 1 | costs |
| 126 to 133 | "NOTICED BUT NOT TOUCHING ... Want me to create tasks for these?" | `work` § 4 files a found defect with `foundIssueCommand` before the pull request opens, and `.beads/PRIME.md` makes every task an issue in `bd`. The question also blocks an autonomous session | 1 | costs |
| 249 | Apply the Definition of Done "as the final gate" | The file is absent after install (E1). The final gate here is `mise run gates` and then `verify` (`AGENTS.md` § The gate ladder) | 1 | costs |
| 117 to 124 | Touch only what the task requires | It is stricter than `work` § 4, which lets a defect in a file the issue changes be fixed, and compatible with it | none | none |

**`code-review-and-quality`** (3,334 words; description 56):

| Line | What it says | Rule it meets | Kind | Severity |
|---|---|---|---|---|
| 277 | "Quantify problems when possible. 'This N+1 query will add ~50ms per item'" | `AGENTS.md` § Verification before claiming: never state a figure derived from inference, and say so when it is unverified | 1 | costs |
| 3 | "Use before merging any change ... when asked to review a diff or a pull request" | Three others claim this trigger: the built-in `code-review` skill, `mattpocock-skills:code-review` at user scope on the maintainer's machine, and the `adversarial-verifier` that `open-pr` § 3 runs before each push | 4 | costs |
| 12, 347 to 349 | An "Approve" verdict | The guard refuses `gh pr review --approve` and `gh pr merge --admin` everywhere, and lets `--request-changes` through (E6) | 2 | none, because the guard holds |
| 164 | Invert one condition, run the suite, then restore the file from a copy | It edits a tracked file by hand, so a session cut off mid-run leaves the mutant behind. `@stryker-mutator/core` 10.0.0 is in `package.json`, but no task, config or gate uses it | none | costs |
| 239 to 248 | "Ask before deleting" dead code | Same as `incremental-implementation` lines 126 to 133: the question blocks an autonomous session | 1 | costs |
| 132 to 138 | Change descriptions with an imperative first line | No tracked rule on commit messages exists. For a pull request title, `open-pr` § 4 ends the title with the carried issue ids, which this rule leaves out, so the assessor counts lines 134 and 136 as kind 1 | 1 | costs |
| 253 to 258 | Respond to a review within one business day | It is advice for a human team and changes nothing an agent does | none | none |

## The other 22 skills

Each remaining `SKILL.md` was read in full on 2026-10-14 at the pinned commit, with every file
bundled beside it: the reference files of `performance-optimization`, `security-and-hardening` and
`constraint-driven-development`, and the three documents and one shell script of `idea-refine`.
Kinds are as in § "What the three skill bodies say". Each skill gets one of four verdicts:

* **Next wave**: admit through `add-skill` when its trigger event comes, under conditions 1 and 2.
* **At its event**: no conflict that blocks; assess again when the event comes.
* **Optional**: nothing here needs it, and nothing in it does harm.
* **Exclude**: its central act is one a tracked rule or skill here already owns.

**Across the pack:**

* **Dead links.** 11 of the 25 skills link a repository-level `references/` file that a per-skill
  install leaves out: 24 links to 7 files (a search of `skills/` at the pinned commit).
* **Stop and ask.** Several skills end the turn or wait for a person: `spec-driven-development`
  lines 170 to 174, `using-agent-skills` lines 67 to 70, `context-engineering` line 284,
  `source-driven-development` lines 61 and 136, `planning-and-task-breakdown` lines 122 and 253.
  `work` § 1 tells an autonomous session to note the evidence and move on instead. Three skills
  exempt non-interactive runs themselves: `interview-me` line 36, `constraint-driven-development`
  line 38 and `doubt-driven-development` lines 161 to 164.
* **Constants in prose.** Thresholds stated as rules: `shipping-and-launch` lines 146 to 151,
  `performance-optimization` lines 193 to 201, `security-and-hardening` line 123,
  `context-engineering` line 319, `constraint-driven-development` lines 238 to 248. A constant a
  prompt reads lives in a policy file under a key (`AGENTS.md` § Three kinds of file, and never a
  fourth). `using-agent-skills` line 80 also recommends an inferred figure, as
  `code-review-and-quality` line 277 does.
* **New files at new paths.** `SPEC.md` and `SPEC-<module>.md` at the root, `tasks/`,
  `CONSTRAINTS.md`, `PERF.md`, `docs/ideas/`, `docs/intent/` and `docs/runbooks/`. Each new
  directory needs its `README.md` (`AGENTS.md` § Every directory and document says what it is, and
  who wins), and no template opens with a `**Written:**` line.
* **Unpinned tools.** `browser-testing-with-devtools` line 35 runs `npx -y chrome-devtools-mcp@latest`.
  `performance-optimization` lines 206 and 209 run `npx bundlesize` and `npx lhci`.
  `constraint-driven-development` lines 149 to 160 install with `brew`, `pipx` and `npm`. Pins live
  in `mise.toml` and `package.json` only.
* **Triggers claimed on this machine too.** Outside this repository, this session's skill list on
  2026-10-14 also held `frontend-design`, `mattpocock-skills` (`grilling`, `tdd`, `code-review`,
  `diagnosing-bugs`), the built-in `simplify`, `code-review` and `security-review`, a
  `security-audit` skill, and browser tools from `claude-in-chrome` and Playwright. Several claim the
  same triggers as skills below. None is tracked here, so the record notes them and decides nothing
  about them.
* **A harness gap the reading exposed.** `context-engineering` lines 38 to 72 and
  `constraint-driven-development` line 140 write rules into `CLAUDE.md`, and
  `documentation-and-adrs` lines 254 and 296 point sessions there. `block-generated-edit.mjs` lets
  an edit of `CLAUDE.md` or `.claude/settings.json` through, because neither carries a banner (E8).
  No gate runs the renderer's drift check on the committed tree. A hand edit to
  `.claude/settings.json` passed every gate that runs in a fresh clone (E9). A hand edit to
  `CLAUDE.md` failed `integrations:selftest`, but only because one of its cases copies the checkout
  into a fixture (E9). Filed as `harness-test-edj`.

| Skill | Words | Verdict | What decides it |
|---|---|---|---|
| `source-driven-development` | 1,473 | Next wave: the first framework or library code | It fetches documentation pages (lines 63 to 93), a kind 5 reach outside, and treats them as data (lines 97 to 114). Its citation rules (lines 165 to 177) match `AGENTS.md` § Verification before claiming. It asks the user when versions are missing (line 61). |
| `api-and-interface-design` | 2,168 | Next wave: the first public interface or module boundary | No conflict found and no dead link. It names `deprecation-and-migration` (line 30). |
| `security-and-hardening` | 4,254 with its reference | Next wave: the first code that takes input, stores data or adds a dependency | No rule conflict. Its install-script policy (lines 135 to 137) matches the `allowScripts` block already in `package.json`. It has six dead links to `security-checklist.md`. Its triggers overlap `security-review` and `security-audit` outside the repository. |
| `deprecation-and-migration` | 1,971 | At its event: the first schema migration or removal of a public API | No conflict found. It names `incremental-implementation` (line 183). |
| `observability-and-instrumentation` | 2,161 | At its event: the first service that runs in production | No conflict. It adds `docs/runbooks/` (line 174) and has one dead link (line 238). |
| `performance-optimization` | 3,933 with its reference | At its event: the first performance requirement | Budgets as constants in prose (lines 193 to 201), unpinned `npx` tools (lines 206 and 209), a `PERF.md` ledger (line 172), and four dead links. |
| `frontend-ui-engineering` | 1,582 | At its event: the first user interface | No harness conflict. Its examples assume React and Tailwind. One dead link (line 308). |
| `browser-testing-with-devtools` | 2,138 | At its event: the first user interface, with the server added through the harness's integrations source | It adds an MCP server to `.mcp.json` or the Claude Code settings with an unpinned `@latest` (lines 28 to 39), kinds 3 and 5. `.claude/settings.json` is rendered output. Its security rules (lines 60 to 107) are strong. |
| `shipping-and-launch` | 1,807 | At its event: the first production deploy | Its rollback step `git revert <commit> && git push` (line 272) pushes the current branch, past the pull-request route of `AGENTS.md` § Git workflow, and the guard applies no git rule in the primary checkout. Rollout thresholds are constants in prose (lines 146 to 151). Four dead links. |
| `interview-me` | 2,512 | Optional | It exempts non-interactive runs itself (line 36). It claims "grill me" (line 3), as `mattpocock-skills:grilling` does. It offers `docs/intent/` (line 146). |
| `idea-refine` | 6,419 with its files | Optional | Its bundled script only creates `docs/ideas/`. Line 32 runs it by a path that does not exist after a per-skill install. It claims "stress-test my plan" (line 3), as `interview-me` and `doubt-driven-development` do. |
| `doubt-driven-development` | 2,582 | Optional, once the pre-push verifier shows what it misses | In-flight review overlaps the `adversarial-verifier` that `open-pr` § 3 runs (kind 4). Its cross-model step (lines 116 to 148) sends the artifact to another vendor's CLI after per-call approval (kind 5), and asks the user every interactive cycle (line 124). It writes to `/tmp` (line 144), not `.scratch/` (`AGENTS.md` § Memory tiers). Two dead links. |
| `code-simplification` | 2,028 | Optional | It competes with the built-in `simplify` skill (kind 4), and commits after each simplification with no branch named (line 165). |
| `documentation-and-adrs` | 1,639 | Optional, for product documentation | It matches an existing ADR convention first (lines 36 to 44), so it would follow this record's format. It points sessions at `CLAUDE.md` as the home for conventions (lines 254 and 296), kind 3. |
| `using-agent-skills` | 1,320 | Exclude | It routes among all 25 skills (lines 16 to 43 and 137 to 164), most absent after a narrow admission. It fires "when starting a session" (line 3), which the author's own `hooks/session-start.sh` lines 5 to 8 say not to do on Claude Code. It stops and waits (lines 67 to 70) and recommends inferred figures (line 80). |
| `git-workflow-and-versioning` | 2,154 | Exclude | It claims every change, commit, branch, pull request and push (line 3), which `work`, `open-pr` and `AGENTS.md` § Git workflow own. Its `feature/` and `fix/` branch names (lines 138 to 145) contradict `agent/<name>`. Its native `git worktree add` and `remove` (lines 151 to 165) contradict the one worktree script (`work` § 3). Husky and lint-staged (lines 232 to 242) would compete with `git-hooks.yml`. Both guards allow its worktree, reset and tag-push commands from the primary checkout (E7). |
| `ci-cd-and-automation` | 1,560 | Exclude | Its pipeline (lines 24 to 98) is a second workflow beside `verify.yml`, pins Node 22 (line 78) against the `mise.toml` pin, and knows one tier against the four of `AGENTS.md` § The gate ladder. "Automate quality gates" (line 3) is the `add-task` skill's trigger. |
| `context-engineering` | 2,288 | Exclude | Its first level writes the project's rules into `CLAUDE.md` (lines 38 to 72), which `AGENTS.md` § Rules for agents live in tracked files, and nowhere else rules out, and nothing refuses that edit (E8, E9). Its session-boundary steps (lines 123 to 137) agree with `AGENTS.md` § Memory tiers. |
| `constraint-driven-development` | 5,113 with its reference | Exclude as a skill | It writes `CONSTRAINTS.md` and a line into `AGENTS.md` and `CLAUDE.md` (lines 95 and 140), and declares `CONSTRAINTS.md` canonical (line 184): a second home for rules and constants. It installs outside `mise.toml` (lines 149 to 160). Its `check:fast` and `check:task` scripts (lines 175 to 177) clash with the suffix contract's `:check`. Its ideas fit this harness: the weakened-bar checks (lines 202 to 216), ratchets (lines 226 to 232) and a floor guard that exits 0, 1 or 2. `@stryker-mutator/core` 10.0.0 is already in `package.json`. Built as a gate through `add-task`, they need their own `should-i-adopt` run. |
| `spec-driven-development` | 1,988 | Exclude while OpenSpec is the spec tool | `@fission-ai/openspec` 1.6.0 is in `package.json`, and `assetLabels` names `openspec/specs/` as the living spec (`policy/vocabulary.json`). The skill defers to OpenSpec only "if the project already uses" it (lines 150 to 154), and no `openspec/` directory exists yet, so it would write `SPEC.md` files at the root (line 65). Its Boundaries section (lines 110 to 113) puts agent rules in a spec, kind 3. |
| `planning-and-task-breakdown` | 1,730 | Exclude | It files tasks in `bd` when `AGENTS.md` names a tracker (lines 161 to 164), which § Memory tiers does. It still always writes `tasks/plan.md` (line 145) with a task index and checkpoints (lines 166 to 211), the status document `.beads/PRIME.md` rules out. Epics and their tasks in `bd` already carry product plans (`issueTypes`, `policy/vocabulary.json`). |
| `debugging-and-error-recovery` | 1,690 | Exclude | Its trigger (line 3) is `root-cause`'s, and `root-cause` is adapted to this repository and stops after `rootCauseMaxFixes` failed fixes, where this skill has no stop. Its fallbacks under time pressure (lines 214 to 241) return a default, where `AGENTS.md` § The gate ladder calls a found tool that fails a failure. Its rule on untrusted error output (lines 272 to 279) is worth folding into `root-cause`. |

## Admission

The `add-skill` checks ran on 2026-10-14 at commit `aeac41d4d005999432bb7312f7ff06383a91d59d`,
which upstream's default branch still named that day (`git ls-remote`).

| Skill | Guard scan | skills.sh audit | `skill-assessor` | Decision issue |
|---|---|---|---|---|
| `test-driven-development` | no finding | `runlayer` warn MEDIUM; the other four pass | 5 findings | harness-test-k7x |
| `incremental-implementation` | no finding | `runlayer` warn MEDIUM; the other four pass | 8 findings | harness-test-44g |
| `code-review-and-quality` | no finding | `snyk` and `runlayer` warn MEDIUM; the other three pass | 9 findings | harness-test-eby |

Each decision issue lists all its findings by line. The assessor found 10 that § "What the three
skill bodies say" lacks:

* `test-driven-development` line 3 competes with `work`, as well as with `root-cause`. It never commits.
* `test-driven-development` lines 314 and 341 send a session to Chrome DevTools MCP, which nothing
  here configures (kind 5).
* `incremental-implementation` line 160 merges small increments to the main branch.
* `incremental-implementation` lines 201 to 209 name `npm test`, `./gradlew test` and `pytest`, not
  `tasks.toml` tasks.
* `incremental-implementation` line 206 names `npx tsc --noEmit`. `package-lock.json` has no
  `typescript` entry, so `npx` would fetch an unpinned package named `tsc` (kind 5).
* `incremental-implementation` lines 17 and 226 state a limit of 100 lines as a constant in prose.
* `code-review-and-quality` line 121 starts each change on top of the last.
* `code-review-and-quality` lines 269 and 362 require cleanup before merge, where `work` § 4 files
  a defect outside the issue's files.
* `code-review-and-quality` lines 285 to 292 vet a new dependency with five questions of their
  own, which competes with `should-i-adopt`.
* `code-review-and-quality` lines 288, 289 and 302 run `npm audit` and read a dependency's
  repository (kind 5). These calls change nothing.

Condition 2 settles each new kind 1 finding, because a tracked file now wins. A kind 4 finding is
about which skill a session picks, and a precedence sentence picks none. So the kind 4 findings stay
a risk, and only the `work` note and `AGENTS.md` stand against it, as advice. The `work` note also
sends checks to `tasks.toml` tasks, which covers `npx tsc`.
Chrome DevTools MCP stays out of reach until a tracked change configures it.

Each assessor also reported that upstream's `CLAUDE.md` and `.claude/rules/` loaded into its
context, because `add-skill` § 2 clones inside this repository's tree. None followed them. That
is filed as harness-test-8s2.

## Pros and Cons of the Options

### Do not adopt (nothing changes)

* Good, because nothing is paid for until there is product code to apply it to.
* Bad, because the first product pull requests land with no test-first discipline and no review
  rubric, and the question is answered again against a friction table that has gone stale.

### Adopt the whole plugin through `claudeEnabledPlugins`

Ruled out. Friction 1 and 2 are **blocks**: `/plan`, `/build auto` and `/constraints` write a
markdown checklist and rules into `AGENTS.md`, and a plugin's commands cannot be disabled one at a
time. It does land mechanically: `skills:check` accepts a marketplace row at `0.6.13` and the
renderer writes `enabledPlugins` (E5), and `claude plugin install --scope project` succeeds (E3).

### Admit two or three skills through `installedSkills` (chosen)

* Good, because E2 shows the route works unchanged: a row for `code-review-and-quality` at the
  pinned commit passes `skills:check`, `check:policy` and `sync` lands it in `.claude/skills/`.
* Good, because each skill passes the guard scan (no finding over 25 skills from the primary
  checkout, where the git rules are a no-op), and the `skill-assessor` agent's findings go to the
  operator before admission.
* Good, because only the admitted descriptions load.
* Bad, because four reference links across the three skills dangle after a per-skill install (E1,
  upstream #597), one of them `incremental-implementation`'s final gate, until the author resolves
  it or the row moves to a fixing commit.
* Bad, because the skills cannot be edited here, and `code-review-and-quality` competes with the
  built-in `/code-review` on the same trigger (its README says to use the namespaced form).
* Candidates: `test-driven-development`, `incremental-implementation`, `code-review-and-quality`.
  The next wave and the rest are sorted, skill by skill, in § "The other 22 skills".
* Conditions: the four under § "Decision Outcome". A `promptWordBudgets` row is not needed, since
  budgets cover tracked prompts only, but each admission issue records the skill's word count.

### Write a small tracked skill under `.harness/skills/`

* Good, because it is editable, budgeted in `policy/prompt-budgets.json`, and can cite the `work`
  skill's steps rather than restate them.
* Good, because `add-skill` § "A tracked skill comes or goes" already says what to edit, and a copy
  adapted from the candidate records its source and commit.
* Good, because it is the fallback for `incremental-implementation`, whose findings all come from
  text a copy could rewrite.
* Bad, because someone writes and maintains it, and the candidate's updates do not reach it.
* Bad, because the same YAGNI applies: there is no product code to write it for yet.

### An alternative pack of the same shape

* `mattpocock-skills` (`tdd`, `code-review`, `diagnosing-bugs`) is enabled on the maintainer's
  machine at user scope, not in this repository, so sessions here see it by accident of the machine.
  It would need the same admission through `policy/skill-sources.json`, and was not assessed in this run.

## Trials

| Trial | What it tested | Result |
|---|---|---|
| E1 | `skills add addyosmani/agent-skills#aeac41d… --skill code-review-and-quality --copy`, as sync runs it | Lands `.claude/skills/code-review-and-quality/SKILL.md` only; `skills-lock.json` records the SHA; the skill's lines 353 and 354 link `../../references/*.md`, absent |
| E2 | One `installedSkills` row in a copy of `policy/skill-sources.json`, then `mise run skills:check`, `sync --dry-run`, `sync`, `mise run check:policy` | All pass; sync warns `snyk` and `runlayer` at warn MEDIUM and adds the skill |
| E3 | `claude plugin marketplace add https://github.com/addyosmani/agent-skills.git#0.6.13` then `claude plugin install agent-skills@addy-agent-skills --scope project`, throwaway `CLAUDE_CONFIG_DIR` | Both succeed; cache holds 25 skills, 9 commands, 4 agents, 7 references, no `hooks.json`; the record's `projectPath` is the clone; the marketplace is declared in user settings |
| E4 | Nine commands from the candidate's prose piped to `scripts/hooks/guard-git.mjs` with `cwd` in a linked worktree | Allowed: seven; refused: `gh pr create` without `--base`, `git push origin main` |
| E5 | `claudeEnabledPlugins` and a `claudePluginMarketplaces` row at `0.6.13`, then `node scripts/render-integrations.mjs .`, `--check`, `mise run skills:check`, `sync --dry-run` | All pass; `.claude/settings.json` gains `enabledPlugins`; the renderer also rewrote `.harness/integrations.json` (not examined) |
| E6 | `gh pr review 1 --approve`, `gh pr merge 1 --admin --squash` and `gh pr review 1 --request-changes` piped to `guard-git.mjs` from the primary checkout, on the host, which only reads | The first two are refused; `--request-changes` passes |
| E7 | Seven commands from the other 22 skills piped to `guard-git.mjs` and `guard-unprovisioned-worktree.mjs` from the primary checkout, on the host, which only reads | All seven pass both guards: native `git worktree add` and `remove`, `git bisect start`, `git reset --hard HEAD`, `git push origin v1.4.0`, `npx -y chrome-devtools-mcp@latest`, and `idea-refine`'s script |
| E8 | An Edit payload for `CLAUDE.md`, `.claude/settings.json`, `AGENTS.md`, `CONSTRAINTS.md`, `.mcp.json` and `tasks/plan.md` piped to `block-generated-edit.mjs`, on the host, which only reads | All six pass. `CLAUDE.md` and `.claude/settings.json` are rendered output (`tools/integrations/claude.mjs`) but carry no banner |
| E9 | In a container clone of `origin/main` with hooks installed: a line appended to `CLAUDE.md` and committed, then `mise run gates` and `render-integrations.mjs --check`; again with a key added to `.claude/settings.json`; and the unmodified commit as control | Control: 14 of 15 jobs pass, and `beads-check` fails because a fresh clone has no tracker database. `.claude/settings.json` edit: the same 14 pass. `CLAUDE.md` edit: `integrations-selftest` also fails, with "CLAUDE.md has local contents", from a case that copies the checkout into a fixture. `--check` exits 1 on both edits, and 0 on the committed tree when run on the host |
| E10 | All three rows in a container clone of `origin/main`, then `mise run skills:check`, `mise run check:policy`, `sync --dry-run`, `sync` and a second `sync` | Both checks pass. `sync` adds the three skills at the pin, with one `SKILL.md` each, and `skills-lock.json` records the SHA for each. The second `sync` prints nothing. Docker state matched the pre-trial listing afterwards |

## Left unverified

* Whether a project-scope plugin is enabled inside a linked worktree (friction 5).
* Whether a session asked to implement a feature picks `incremental-implementation` over `work`.
  That needs a live Claude Code session, so no trial checked it.
* The `skill-assessor` agent read the three admitted skills at admission (§ "Admission"), but not
  the other 22. Each next-wave admission runs it then.
* Whether a push that changes only `CLAUDE.md` runs `integrations-selftest` before the push. Its
  glob in `git-hooks.yml` does not list `CLAUDE.md`, and E9 ran every job by `mise run gates`, so
  only `verify.yml`, which runs it on every pull request, is known to catch that edit.
* Whether the admitted skills fire from their descriptions in sessions here (upstream #620 measured
  `test-driven-development` and `incremental-implementation` firing 0 of 6 times when code is pasted
  inline; the pinned `test-driven-development` description carries the clause #620 gives for it,
  and `code-review-and-quality` fired 6 of 6 after upstream #612; no trial here, since it needs a live Claude Code
  session with the account's settings).
* The guard scan ran from the primary checkout, where `guard-git.mjs` skips its git rules; E4 covers
  the worktree case for nine commands, not every code block.
* The `0.6.13` release notes and the diff since `0.6.12` were not read.

## Links

* Candidate: https://github.com/addyosmani/agent-skills at `aeac41d4d005999432bb7312f7ff06383a91d59d`
* Upstream issues read: #597 (references not installed per skill), #620 (skills rarely fire with inline code)
* Admission route: `.harness/skills/add-skill/SKILL.md`; record: `policy/skill-sources.json`
* Tracker: harness-test-8uc (this decision); harness-test-k7x, harness-test-44g and harness-test-eby
  (admissions); harness-test-0dp, harness-test-pzj and harness-test-fwx (conditions 2 to 4);
  harness-test-edj, harness-test-8s2 and harness-test-9ag (found on the way)
