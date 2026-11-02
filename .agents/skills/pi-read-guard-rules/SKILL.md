---
name: pi-read-guard-rules
description: Rules for work in the pi-read-guard repository that the code can't show: constraints, ownership and must-keep behaviour. Use before changing, fixing, reviewing or extending code here, together with the typescript-in-projects skill.
---

# pi-read-guard: rules the code can't show

Hard constraints for this repository. The general conventions (orientation, tests,
scripting, releasing) are in the `typescript-in-projects` skill; this file holds only what is
specific to pi-read-guard.

* Blocks `read` of files over `maxReadLines` without `offset`/`limit`. Images, PDFs
  and binaries (NUL byte in the first 8 KB) are never blocked.
