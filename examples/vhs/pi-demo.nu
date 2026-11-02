#!/usr/bin/env nu
# Starts a real pi with ONLY the pi-read-guard extension loaded (plus the built-in read, write and edit tools),
# against the synthetic fixture (see fixture.nu): no real files, sessions, skills, MCP servers or
# network are touched.
#
#   eval "$(nu examples/vhs/fixture.nu env)" && bun examples/vhs/mock-llm.ts 8992 &  nu examples/vhs/pi-demo.nu

# pi's arguments: only this extension, no session, the built-in tools the demos need.
export def pi_args [repo: string]: nothing -> list<string> {
    [--no-extensions -e ($repo | path join extensions read-guard.ts) --no-skills --no-prompt-templates --no-context-files --no-mcp --no-session --tools "read,write,edit" --offline]
}

def main [] {
    let repo = $env.FILE_PWD | path join .. .. | path expand
    cd ($env.HOME | path join projects my-app)
    exec pi ...(pi_args $repo)
}
