# Changelog

Generated from [Conventional Commits](https://www.conventionalcommits.org) by
[git-cliff](https://git-cliff.org). Do not edit by hand.

## [0.1.7](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.7) — 2026-10-12


### 🐛 Fixes

- Never block images, PDFs or other binary files (a PNG has hundreds of newline bytes and was reported as '897 lines') ([`ae36673`](https://github.com/sorinirimies/pi-read-guard/commit/ae36673e1134501eb8831a3585b2fa958c821dc5))

### 🔧 Build & CI

- Restore the Gitea nightly and release workflows (both hosts run the full pipeline in parallel) ([`c88b439`](https://github.com/sorinirimies/pi-read-guard/commit/c88b43937d22fd63ddbb276c642eab2a2047f4a7))

### 🧹 Chores

- Just recipes to push, pull and force-push to several remotes (push-all, pull-all, push-tags-all, *-force, sync-starscream, setup-remotes; release-push goes to every remote) ([`ebecb81`](https://github.com/sorinirimies/pi-read-guard/commit/ebecb81fe0e1db5009b94f59d3d4a324409e3d3d))
- Justfile remotes and release recipes in the gitkraft style (gitea-microlab, gitea-starscream, gitea-nexus-lab: push, pull, release, sync, all-remotes and force variants; unconfigured remotes are skipped) ([`f08a363`](https://github.com/sorinirimies/pi-read-guard/commit/f08a363cd748c2400eeb19f7c9166652357d48fc))
## [0.1.6](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.6) — 2026-10-12


### 📚 Docs

- List pi-context-diet in the related plugins ([`ee34635`](https://github.com/sorinirimies/pi-read-guard/commit/ee34635fd3f4136753c666a87fb7d7f888008309))

### 🧪 Tests

- No test may touch the real ~/.pi/agent (preload sets a temp config dir; the autocomplete test persisted mode=always into it) ([`0178283`](https://github.com/sorinirimies/pi-read-guard/commit/0178283d81e83b0ddcb25484035569af289faee6))

### 🔧 Build & CI

- **deps:** Bump taiki-e/install-action from 2.87.26 to 2.87.27 (#4) ([`1415f43`](https://github.com/sorinirimies/pi-read-guard/commit/1415f4375e13031c7c01cc553e875be8c2e34593))
## [0.1.5](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.5) — 2026-10-12


### 🔧 Build & CI

- **deps:** Bump actions/setup-node from 7.0.0 to 7.1.0 (#3) ([`d35ceb6`](https://github.com/sorinirimies/pi-read-guard/commit/d35ceb64dd06532886d467c94c7735e103fcef53))
## [0.1.3](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.3) — 2026-10-10


### 🔧 Build & CI

- **deps:** Bump actions/setup-node from 4.4.0 to 7.0.0 ([`c74bacd`](https://github.com/sorinirimies/pi-read-guard/commit/c74bacd59cf6aa01d9baef34c1b1632d820cb4dd))
## [0.1.2](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.2) — 2026-10-09


### 🐛 Fixes

- Block messages report the real line count (a trailing newline is not a line) ([`85eb127`](https://github.com/sorinirimies/pi-read-guard/commit/85eb1276898c1fffc41c6b7ae9188454206c785d))

### 🧪 Tests

- Make resolveToolPath tests platform-independent (Windows CI) ([`50a99f9`](https://github.com/sorinirimies/pi-read-guard/commit/50a99f947f08ed011dcb1eb51b30ccd7e9e179c7))
- File:// URL case valid on Windows too ([`d8e235a`](https://github.com/sorinirimies/pi-read-guard/commit/d8e235aa2512d0ddec04a43d525f03232b34cd23))

### 🔧 Build & CI

- Auto-merge library updates only after CI is green, and publish a patch automatically (any library update ships; major updates wait for review) ([`fc23a48`](https://github.com/sorinirimies/pi-read-guard/commit/fc23a48028b8d7d6de8671f877d01862b3e20a42))
## [0.1.1](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.1) — 2026-10-09


### 🐛 Fixes

- Resolve paths exactly like pi (@, ~, file://, macOS variants), stream line counts in constant memory, fail open on errors, harden globs; pin actions to SHAs and pass tags via env ([`8fb6860`](https://github.com/sorinirimies/pi-read-guard/commit/8fb68606939094808c8d3b8bc21a99aca22c4619))

### 🧪 Tests

- Raise coverage to ~100% and enforce 95% thresholds (bunfig), coverage summary in CI, nu tests for every script; extract resolveAgentDir for testability ([`1d0dc23`](https://github.com/sorinirimies/pi-read-guard/commit/1d0dc230876e978b82009ed79691b7bc240a88b4))

### 🔧 Build & CI

- Nushell quality gate, GitHub + Gitea workflows (CI, nightly deps + patch release, npm publish), justfile, typecheck ([`379e414`](https://github.com/sorinirimies/pi-read-guard/commit/379e414f432fc78d21be51b55b720135ab9f9b61))
## [0.1.0](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.0) — 2026-10-09


### ✨ Features

- Pi-read-guard v0.1.0 ([`cad93cd`](https://github.com/sorinirimies/pi-read-guard/commit/cad93cdb6c85a95b54a00a53024337c9f3833660))

