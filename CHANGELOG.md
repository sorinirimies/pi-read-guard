# Changelog

Generated from [Conventional Commits](https://www.conventionalcommits.org) by
[git-cliff](https://git-cliff.org). Do not edit by hand.

## [0.1.13](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.13) — 2026-11-02


### 🐛 Fixes

- **ci:** A 409 from the other host publishing the same version first is not a failure ([`ed56b8a`](https://github.com/sorinirimies/pi-read-guard/commit/ed56b8a1b65f64f7504e731e28d86b8dbf614b14))

### 📚 Docs

- **readme:** Add the Audit and Fuzz badges ([`3a3a768`](https://github.com/sorinirimies/pi-read-guard/commit/3a3a768206df5d2866a718cf998be447a8a16e7f))
- This repo's agent rules as a project skill in .agents/skills ([`6a7af8b`](https://github.com/sorinirimies/pi-read-guard/commit/6a7af8b5321629cea1f44598000c16da809a8a97))
- Drop the per-repo agent rules skill; the shared skills cover it ([`a53364e`](https://github.com/sorinirimies/pi-read-guard/commit/a53364e0c40856f87ec6e26ca7ef7c7b04983543))

### 🧪 Tests

- Skip UNC paths in the resolveReadTarget fuzz (Windows asks the network: seconds per lookup) ([`eb40d7e`](https://github.com/sorinirimies/pi-read-guard/commit/eb40d7efeb1a198d925b17aec614327abf1ebfd7))

### 🔧 Build & CI

- **deps-dev:** Pin minimatch 11.0.3 via overrides ([`ab7200c`](https://github.com/sorinirimies/pi-read-guard/commit/ab7200c59711d29f52f07c39b1cb586dec35dcd6))
- Cut a release from the Release workflow (bump, changelog, tag, push, publish) ([`cc7a0e7`](https://github.com/sorinirimies/pi-read-guard/commit/cc7a0e78c99ebec479a5471bc98b519ea18136b7))
- **deps:** Bump taiki-e/install-action from 2.87.31 to 2.88.1 (#8) ([`9f1c097`](https://github.com/sorinirimies/pi-read-guard/commit/9f1c0972cfc05d50262f6c8729f521cffb4463e1))

### 🧹 Chores

- Nightly dev-tooling lockfile update 2026-11-01 (not released) ([`a2fbe2b`](https://github.com/sorinirimies/pi-read-guard/commit/a2fbe2b12e6dc3d3ea0a2451b5a3da9d1c1d581a))
- Ignore .codegraph index ([`26c4cdc`](https://github.com/sorinirimies/pi-read-guard/commit/26c4cdc85875559318415098866a6f993dfb931c))
## [0.1.12](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.12) — 2026-10-31


### 🐛 Fixes

- `?` in an ignore glob matches one character (it reached the RegExp unescaped and threw on every tool call) ([`e75b169`](https://github.com/sorinirimies/pi-read-guard/commit/e75b1699760c644026c80693493886e2ec906df6))

### 🧪 Tests

- Seeded fuzz tests (FUZZ_ITERS / FUZZ_SEED; a failure prints the seed that reproduces it) ([`b89413d`](https://github.com/sorinirimies/pi-read-guard/commit/b89413d3ab32be604797e5d93023a9b787d9e258))

### 🔧 Build & CI

- Fuzz and Security workflows on GitHub and Gitea ([`8cfd1b6`](https://github.com/sorinirimies/pi-read-guard/commit/8cfd1b6797214b60c9683e9466616662e200c8a2))
## [0.1.11](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.11) — 2026-10-31


### 🔧 Build & CI

- Ignore commits already released via the other host's parallel nightly (no phantom patch release) ([`a299986`](https://github.com/sorinirimies/pi-read-guard/commit/a2999865130ef23ce2191505baf276dd014009f9))
- **deps:** Bump taiki-e/install-action from 2.87.27 to 2.87.29 (#5) ([`9cf2f72`](https://github.com/sorinirimies/pi-read-guard/commit/9cf2f725908a80dce550b31ab45d2e023d01bc0d))
- **deps:** Bump taiki-e/install-action from 2.87.29 to 2.87.31 (#6) ([`18cb5df`](https://github.com/sorinirimies/pi-read-guard/commit/18cb5df527470529082ba657c40ee7ea84e0b553))
- **deps:** Bump hustcer/setup-nu from 3.28 to 3.29 (#7) ([`71102d0`](https://github.com/sorinirimies/pi-read-guard/commit/71102d0f8931bfbb1a930a17b94b98a8fae64920))
- Allow AUTOMERGE_TOKEN so workflow-file Dependabot PRs auto-merge ([`8da4a30`](https://github.com/sorinirimies/pi-read-guard/commit/8da4a3067a8eaf7fdedb23c638224924c1de126d))
- **deps-dev:** Pin undici 8.12.3 via overrides ([`33b7a60`](https://github.com/sorinirimies/pi-read-guard/commit/33b7a60f9cd88fb7031c6381054cef4657abca31))
- Keep .gitea workflow actions up to date; auto-merge needs GH_PAT for action bumps ([`241dec7`](https://github.com/sorinirimies/pi-read-guard/commit/241dec7551de40aeade8832e56aa954bfa28600b))
- **deps:** Bump Gitea workflow actions ([`8f8d11f`](https://github.com/sorinirimies/pi-read-guard/commit/8f8d11ff17834a94188674c50328fecbd3aa160d))
- One nightly (GitHub); Gitea mirrors GitHub's main and tags hourly ([`f2c15f4`](https://github.com/sorinirimies/pi-read-guard/commit/f2c15f4414f1d19375f7b9528496c2b3212f2133))

### 🧹 Chores

- Nightly dev-tooling lockfile update 2026-10-15 (not released) ([`0947d64`](https://github.com/sorinirimies/pi-read-guard/commit/0947d646b401090fc1174bba5b28dfabcfeeb1ae))
- Nightly dev-tooling lockfile update 2026-10-16 (not released) ([`c6e1fde`](https://github.com/sorinirimies/pi-read-guard/commit/c6e1fdee5dbd0b58f9743d60b24c8d7c1fbcfd0a))
- Nightly dev-tooling lockfile update 2026-10-20 (not released) ([`7dbcf63`](https://github.com/sorinirimies/pi-read-guard/commit/7dbcf63d62a0dfe3130e645177e5cace47ab8fe1))
- Nightly dev-tooling lockfile update 2026-10-21 (not released) ([`4e19ceb`](https://github.com/sorinirimies/pi-read-guard/commit/4e19ceb0d1a6c65b9bcfb8085e908c5db3a07f72))
- Nightly dev-tooling lockfile update 2026-10-22 (not released) ([`103b9f1`](https://github.com/sorinirimies/pi-read-guard/commit/103b9f1bbaeced613e47eca53c494f23d4fb8652))
- Nightly dev-tooling lockfile update 2026-10-23 (not released) ([`d9d4dc2`](https://github.com/sorinirimies/pi-read-guard/commit/d9d4dc2fcdbf9fefa05434b47ef75da1a1ab8c16))
- Nightly dev-tooling lockfile update 2026-10-27 (not released) ([`85a2fe9`](https://github.com/sorinirimies/pi-read-guard/commit/85a2fe9c4bc06d609f8ca7a715d2e072bb9318ee))
- Nightly dev-tooling lockfile update 2026-10-29 (not released) ([`9adb908`](https://github.com/sorinirimies/pi-read-guard/commit/9adb9089062a3a9bc23c062a1b475c551b08e0a5))
- Nightly dev-tooling lockfile update 2026-10-30 (not released) ([`78c6cde`](https://github.com/sorinirimies/pi-read-guard/commit/78c6cde86f0be4478cf852a1407b7affce0325c3))
- Nightly dev-tooling lockfile update 2026-10-31 (not released) ([`de56bf3`](https://github.com/sorinirimies/pi-read-guard/commit/de56bf3c094e2934cc5a84cf6c04c9f82e0fb8ca))
- Nightly dev-tooling lockfile update 2026-10-31 (not released) ([`27ae4c7`](https://github.com/sorinirimies/pi-read-guard/commit/27ae4c70510176f9659b1f64976f68bc51b62b1f))
- Merge Gitea's main (both hosts ran their own nightly) ([`46bb339`](https://github.com/sorinirimies/pi-read-guard/commit/46bb339cc5bb0be560f5b7eee18590fc425dfaef))
## [0.1.10](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.10) — 2026-10-15


### 📚 Docs

- Separate install commands for individual copy ([`6f1a39a`](https://github.com/sorinirimies/pi-read-guard/commit/6f1a39a3cafa3132f1cfb113d59ae76b5ee1efc5))

### 🔧 Build & CI

- Publish only when a runtime dependency really upgrades (or feat/fix/perf); dev-tooling updates no longer release ([`e709da4`](https://github.com/sorinirimies/pi-read-guard/commit/e709da4f3b88d99bab4e53864a245d797c12d560))
- Don't release on ci(deps) (GitHub Actions) bumps ([`0b9ce1d`](https://github.com/sorinirimies/pi-read-guard/commit/0b9ce1dd993dc9dabae28caa231e66c90a11872e))

### 🧹 Chores

- **justfile:** Push/pull current branch instead of hardcoded main ([`96fb34c`](https://github.com/sorinirimies/pi-read-guard/commit/96fb34ca1d6780dd60a34dfd831f3095da194ff4))
- Nightly dev-tooling lockfile update 2026-10-15 (not released) ([`4e58e2a`](https://github.com/sorinirimies/pi-read-guard/commit/4e58e2acbcb708d3bcba7ebc585ea48718588a28))
## [0.1.9](https://github.com/sorinirimies/pi-read-guard/releases/tag/v0.1.9) — 2026-10-14


### 📚 Docs

- Separate install commands for individual copy ([`1504fa3`](https://github.com/sorinirimies/pi-read-guard/commit/1504fa347cc4a5e3f45df295d4cd69a9c00f446f))

### 🔧 Build & CI

- Don't release on ci(deps) (GitHub Actions) bumps ([`262012b`](https://github.com/sorinirimies/pi-read-guard/commit/262012b48f19285d18a3bad8ce5f4a3eeb14d429))
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

