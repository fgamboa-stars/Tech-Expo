# Heritage at Risk — Git Workflow

All Heritage at Risk development happens on the **`TestOne`** branch of the `Tech-Expo` repository. **Never commit directly to `main`.** Changes reach `main` only through a reviewed pull request.

## Contents
1. [Repository setup](#1-repository-setup)
2. [Branch creation](#2-branch-creation)
3. [Branch switching](#3-branch-switching)
4. [Daily workflow](#4-daily-workflow)
5. [Commit conventions](#5-commit-conventions)
6. [Push process](#6-push-process)
7. [Pull process](#7-pull-process)
8. [Pull request process](#8-pull-request-process)
9. [Merge conflict resolution](#9-merge-conflict-resolution)
10. [Quick reference](#quick-reference)

---

## 1. Repository setup

```bash
# One-time identity setup (use the email linked to your GitHub account)
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"

# Clone the repository
git clone https://github.com/fgamboa-stars/Tech-Expo.git
cd Tech-Expo

# Install dependencies
npm install
```

Verify the remote:
```bash
git remote -v
# origin  https://github.com/fgamboa-stars/Tech-Expo.git (fetch)
# origin  https://github.com/fgamboa-stars/Tech-Expo.git (push)
```

## 2. Branch creation

First check whether `TestOne` already exists on GitHub:

```bash
git fetch origin
git branch -a | grep TestOne
```

- If you see `remotes/origin/TestOne`, **it exists** — skip to [Branch switching](#3-branch-switching).
- If not, create it from the latest `main` and publish it:

```bash
git checkout main
git pull origin main
git checkout -b TestOne
git push -u origin TestOne
```

For a larger piece of work you can branch off `TestOne` (e.g., `TestOne-heat-layer`) and open a pull request back into `TestOne`.

## 3. Branch switching

```bash
git checkout TestOne          # or: git switch TestOne
git status                    # confirm: "On branch TestOne"
```

If Git refuses because you have uncommitted changes, either commit them or stash them:
```bash
git stash                     # set changes aside
git checkout TestOne
git stash pop                 # bring them back
```

Your terminal prompt or `git branch --show-current` should say **TestOne** before you start editing.

## 4. Daily workflow

```bash
# 1. Start of session: get the latest work
git checkout TestOne
git pull origin TestOne

# 2. Work: edit, then check everything still passes
npm test
npm run typecheck
npm run dev                    # look at your change in the browser

# 3. Review what changed
git status
git diff

# 4. Stage and commit in small, focused steps
git add src/analysis/riskScoring.ts src/analysis/__tests__/riskScoring.test.ts
git commit -m "feat(scoring): weight sea-level rise above flood zones"

# 5. Share
git push origin TestOne
```

Tips:
- Commit early and often; one logical change per commit.
- Do not commit `node_modules/`, `dist/`, or `.env.local` (all git-ignored).
- Commit `public/data/analysis-results.json` only when you intend the deployed site to show those results.

## 5. Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary in the imperative, ≤ 72 chars>

<optional body: what and why, wrapped at 72 chars>
```

| Type | Use for |
|---|---|
| `feat` | New feature (a page, a hazard layer, a metric) |
| `fix` | Bug fix |
| `docs` | README, guides, comments only |
| `style` | CSS / formatting with no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or fixing tests |
| `data` | Updating analysis results or the reference set |
| `chore` | Tooling, dependencies, config |

Common scopes: `map`, `explorer`, `dashboard`, `story`, `analysis`, `scoring`, `data`, `ui`, `docs`.

Examples:
```
feat(map): add NOAA +3 ft sea-level layer toggle
fix(explorer): keep selected state after live analysis completes
docs(guide): explain FeatureFilter usage
data: regenerate national NHL analysis (2026-11-02)
```

## 6. Push process

```bash
git push origin TestOne
```

- First push of a new local branch: `git push -u origin TestOne` (sets the upstream so later you can type just `git push`).
- If the push is rejected with *"Updates were rejected because the remote contains work that you do not have locally"*, someone pushed first. Pull (next section), resolve any conflicts, run the tests, then push again.
- **Never** use `git push --force` on `TestOne` or `main`. If you truly must rewrite your own unshared commits, use `git push --force-with-lease` and tell your team.

## 7. Pull process

```bash
git checkout TestOne
git pull origin TestOne
```

To bring in changes that landed on `main` (e.g., after another PR merged):
```bash
git fetch origin
git merge origin/main          # merge main into TestOne
npm install                    # in case dependencies changed
npm test
git push origin TestOne
```

Prefer `git pull --rebase origin TestOne` if you have local commits that are not yet pushed and want a linear history.

## 8. Pull request process

When `TestOne` is ready to go to `main`:

1. Make sure `TestOne` is up to date with `main` (see [Pull process](#7-pull-process)) and that `npm test`, `npm run typecheck` and `npm run build` succeed.
2. On GitHub: **Pull requests → New pull request**, base **`main`** ← compare **`TestOne`**.
   Or with the GitHub CLI:
   ```bash
   gh pr create --base main --head TestOne --title "Heritage at Risk v1.0" --body "Summary of changes…"
   ```
3. Write a description: what changed, why, how to test (e.g., "open #/explore/FL and run the analysis"), and screenshots of new UI in light and dark mode.
4. Request a reviewer. Address comments with new commits on `TestOne` (they appear in the PR automatically).
5. After approval, use **Squash and merge** or **Merge commit** (team choice). Do not delete `TestOne` — development continues there.
6. Locally: `git checkout main && git pull origin main`, then return to `TestOne` and `git merge origin/main`.

## 9. Merge conflict resolution

A conflict happens when two branches change the same lines. Git pauses the merge and marks the file:

```
<<<<<<< HEAD
export const MULTI_HAZARD_BONUS = 8;
=======
export const MULTI_HAZARD_BONUS = 10;
>>>>>>> origin/main
```

Step by step:
```bash
git status                       # lists "both modified" files
# 1. Open each file, decide the correct final content, delete the <<<<<<< ======= >>>>>>> markers
# 2. Verify
npm test
npm run typecheck
# 3. Mark resolved and finish the merge
git add src/analysis/riskScoring.ts
git commit                       # (or `git rebase --continue` if you were rebasing)
git push origin TestOne
```

Helpful commands:
- `git diff --name-only --diff-filter=U` — list conflicted files
- `git checkout --ours <file>` / `git checkout --theirs <file>` — take one side entirely
- `git merge --abort` / `git rebase --abort` — cancel and return to where you started

Conflict-prone files in this project: `src/config/layers.ts`, `src/styles/*.css`, `package-lock.json`. For `package-lock.json`, accept either side and then run `npm install` to regenerate it.

## Quick reference

```bash
git clone https://github.com/fgamboa-stars/Tech-Expo.git
cd Tech-Expo
git checkout TestOne            # branch already exists
#   OR, if it does not exist yet:
git checkout -b TestOne

git add .
git commit -m "Implement Heritage at Risk application"
git push origin TestOne
```
