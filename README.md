# pi-read-guard

[![npm](https://img.shields.io/npm/v/pi-read-guard.svg)](https://www.npmjs.com/package/pi-read-guard)
[![npm downloads](https://img.shields.io/npm/dm/pi-read-guard.svg)](https://www.npmjs.com/package/pi-read-guard)
[![CI](https://github.com/sorinirimies/pi-read-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/sorinirimies/pi-read-guard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A [pi](https://github.com/earendil-works/pi-coding-agent) extension that prevents massive unbudgeted full-file reads, steering the agent to `offset`/`limit` or search tools.

Enforcement lives in a `tool_call` hook, so it adds **zero tokens to the system prompt**.

<img src="examples/vhs/generated/overview.gif" alt="The agent tries to read a 319-line file whole; pi-read-guard blocks it and the agent reads a 60-line slice instead" width="900">

## Rules

- `read` on any file with more than `maxReadLines` (default 200) without `offset` or `limit` is **blocked**.
- The model is steered to read a slice with `offset`/`limit`, or to search first (`rg`, `codegraph_search`).

## Install

```bash
pi install npm:pi-read-guard
# or
pi install git:github.com/sorinirimies/pi-read-guard
```

## Previews

Recorded from a real pi with only this plugin loaded; a small scripted mock model plays the agent, so you see the **real guard** reacting to **real tool calls**.

**A full read of a large file is blocked, the agent reads a slice** (60 lines instead of 319):

![The read is blocked and the agent reads lines 1 to 60](examples/vhs/generated/overview.gif)

**No bypass by spelling:** `~/…` and `@…` paths (which pi expands before reading) are blocked just like the plain one:

![Reading via ~/ and @ is blocked too](examples/vhs/generated/paths.gif)

**Commands:** status and block count, `off` / `on`, and `allow <path>` for one deliberate full read:

![/read-guard status, off, on and allow](examples/vhs/generated/commands.gif)

## Commands

- `/read-guard`: status and block count
- `/read-guard off` / `on`: disable / enable for this session
- `/read-guard allow <path>`: allow one full read of `<path>` this session

## Config (optional)

`~/.pi/agent/read-guard.json`:

```json
{ "maxReadLines": 200, "ignore": ["*.md", "*.json"] }
```

## Security notes

- **A token saver, not a sandbox.** It guards pi's `read` tool. An agent can still read files through `bash` (`cat`); the guard keeps accidental full-file reads out of your context, nothing more.
- **Same path as the tool.** Paths are resolved exactly like pi's own `read` (`@file`, `~/file`, `file://`, Unicode spaces, Windows shell paths, and the macOS filename variants it falls back to), so those spellings can't slip past it. A contract test compares it with pi's real `resolveToCwd`.
- **Fails open.** pi blocks a tool when a `tool_call` handler throws, so any unexpected error here means "allow".
- **Constant memory.** Line counts are streamed (64 KB chunks, early exit), never the whole file.
- No network access, no shell commands, **zero runtime dependencies**.

## Development

```bash
bun install
just check          # typecheck + tests + pack check + nushell tests (what CI runs)
just test           # bun test only (with coverage)
just coverage       # tests + a coverage table
```

**Coverage:** every `bun test` collects coverage (`bunfig.toml`) and **fails below 95% lines / 95% functions**. CI shows the table on the run page and uploads `lcov.info`.

CI scripts are [nushell](https://www.nushell.sh) (`scripts/`), the same ones locally and in GitHub / Gitea Actions.
`just --list` shows every task.

## Demo recordings

The GIFs above live in [`examples/vhs/generated/`](examples/vhs/generated) and are stored with **Git LFS** (`git lfs install` once). They are recorded with [VHS](https://github.com/charmbracelet/vhs) from a **real pi** that loads only this extension, on **synthetic** data (`examples/vhs/fixture.sh`), never from real files, sessions or credentials. The agent is a scripted mock model (`examples/vhs/mock-llm.ts`), so the recording is repeatable.

```sh
just vhs-all          # every tape (examples/vhs/*.tape): needs vhs, ttyd, ffmpeg, pi, bun, python3
just vhs-tape overview  # one tape
just vhs-list         # list the tapes
just demo             # try it yourself in a real pi on the same synthetic data
```

## Releases (automatic)

| Workflow | When | What |
|---|---|---|
| **CI** | push / PR | quality gate on Linux; tests on macOS and Windows |
| **Auto-merge library updates** | CI finished on a Dependabot PR | **patch and minor** updates (GitHub Actions) are merged automatically, but only **after CI is green** on that exact commit; a **major** update waits for you. Then it starts the nightly workflow so the update ships |
| **Nightly Dependency Update** | every night (GitHub 02:00 UTC, Gitea 02:30) and after each auto-merge | `bun update` within ranges, verify on all platforms, commit `chore(deps)`; then **build, tag and publish a new patch** whenever a library was upgraded or merged, or `feat`/`fix`/`perf` commits are waiting since the last tag |
| **Release** | tag `vX.Y.Z` | validates the tag against `package.json`, runs the gate, `npm publish` (idempotent, with provenance), creates the release |

So library updates need no human: they are merged once CI passes, built, versioned and published as a patch. A downgrade, a failing check, or a major update stops the chain and waits for review.

Manual release: `just bump patch` (or `minor` / `major` / `X.Y.Z`), then `just release-push`.

**Secrets** (repo settings): `NPM_TOKEN` is an npm *granular access token* with publish rights and "bypass 2FA" (required for CI publishing). Optional: `GH_PAT` (lets a tag push trigger the release itself), `GITEA_TOKEN` (Gitea).

Commits follow [Conventional Commits](https://www.conventionalcommits.org); the changelog is generated by git-cliff.

## Related plugins

Three small [pi](https://github.com/earendil-works/pi-coding-agent) extensions that save tokens without adding anything to the system prompt:

| Plugin | What it does |
|---|---|
| [**pi-edit-first**](https://github.com/sorinirimies/pi-edit-first) | Blocks whole-file `write` rewrites and hand-written project manifests, steering the agent to targeted `edit` calls and scaffolders |
| [**pi-read-guard**](https://github.com/sorinirimies/pi-read-guard) | Blocks full reads of large files, steering the agent to `offset`/`limit` or search |
| [**pi-tokenburn**](https://github.com/sorinirimies/pi-tokenburn) | Live token and cost counter in pi's footer, with charts and budgets |

```bash
pi install npm:pi-edit-first
pi install npm:pi-read-guard
pi install npm:pi-tokenburn
```

MIT
