# Changelog

Generated from [Conventional Commits](https://www.conventionalcommits.org) by
[git-cliff](https://git-cliff.org). Do not edit by hand.

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

