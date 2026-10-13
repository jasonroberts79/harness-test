---
name: open-pr
description: Open a pull request from an agent branch and see it through to its merge - test the merge against the open pull requests, watch with one watcher, act on each outcome of verify and the pull-request reviewer, enable auto-merge once both pass, wait for the merge, and remove the worktree and branch after it. Use whenever a session opens a pull request
---

# Open a pull request

A caller brings three things:

- **the branch**, `agent/<name>`, checked out in the session's worktree;
- **the issues it carries**, by id, or none;
- **the body**, in a file under `.scratch/`, holding what the caller says it holds.

This skill does the rest, through step 7. What follows is the caller's.

## 1. The branch is ready

Gate and rebase it as `AGENTS.md` § The gate ladder says.

## 2. Test the merge against the open pull requests

    gh pr list --state open --json number,headRefName,files

For each one that touches a file this branch touches, test the merge:

    git merge-tree --write-tree --name-only origin/<its branch> HEAD

A shared file is not a conflict; a conflict this reports is.

## 3. Pre-push review

Hand off the work item and worktree path to the `adversarial-verifier` agent and wait for it's report
If problems are identified, fix them    

## 4. Push and open it

### Title
A sentence saying what changed, ending with the ids the branch carries as `AGENTS.md` § Git
workflow says, separated by commas. The branch review reads them from those parentheses and nowhere
else.

A pull request that carries no issue ends with no parentheses. Never cite an issue the branch does
not carry.

### Body

It opens with any register entry or prerequisite the caller names, then each conflict step 2 found,
with the pull request it is against.

### github

In the dev container, the user pushes a branch that changes `.github/workflows/`, since GitHub
refuses that push from the agents' App; once they have, run `gh pr create`.

    git push -u origin <branch>
    gh pr create --base main --head <branch> --title "<title>" --body-file <file>

Open it ready for review, since GitHub merges no draft: `--draft` only when the request says draft.
If the create fails, run `gh pr list --head <branch>` before retrying: a create can land after its
client gives up.

## 5. Watch it with one watcher

First ask `gh pr view <number> --json mergeable` until it is not `UNKNOWN`. At `CONFLICTING`
GitHub starts no `verify`, so the watcher would never end: rebase.
Otherwise:

    gh pr checks <number> --watch

Run it in the background, and no second watcher; end the turn to wait only if its exit wakes the
session. If it exits at once with "no checks reported", that is
not a failing check, and starting it again is not a second watcher.

## 6. Act on the outcome

The watcher ends once all checks have finished. The reviewer's
verdict is its review on the head (`gh pr view <number> --json reviews`); the run each names gives
every reason.

Resolve the issues identified and push the fixes. Repeat until all checks pass.

## 7. Wait for the merge, then clean up

Run in the background, as the one watcher:

    env PR=<number> node scripts/pr-review.mjs wait

It prints one line, and exits 0 once the pull request has merged. It exits 1 once it has closed
unmerged.

Once it has merged, leave and remove the worktree: {{CLI_WORKTREE_REMOVE}}.

Hand the caller the pull request's number and URL, whether it merged, in `wait`'s line or the words
of its review
