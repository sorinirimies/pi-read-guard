# VHS tape: commands
# /read-guard shows its status and the block count. `off` / `on` switch it for the session and
# `allow <path>` lets one deliberate full read through.
#
# Runs a real pi with only the pi-read-guard extension loaded (and pi's built-in read, write and
# edit tools), on the throw-away project from fixture.sh. A tiny scripted mock model (mock-llm.ts)
# plays the agent, so the recording shows the REAL guard reacting to REAL tool calls. HOME and
# the pi agent dir are redirected into /tmp: it never touches your real files or settings.

Output examples/vhs/generated/commands.gif

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 720
Set Padding 24
Set PlaybackSpeed 1.0
Set Theme "Catppuccin Mocha"

Hide
Type 'bash examples/vhs/fixture.sh >/dev/null && echo DONE-$((6*7))'
Enter
Wait+Screen@60s /DONE-42/
Type 'eval "$(examples/vhs/fixture.sh env)" && (bun examples/vhs/mock-llm.ts 8992 >/dev/null 2>&1 &) ; sleep 1 ; clear'
Enter
Type "bash examples/vhs/pi-demo.sh"
Enter
Wait+Screen@30s /demo-model/
Show

Sleep 1.5s
Type "/read-guard"
Sleep 700ms
Enter
Sleep 300ms
Enter
Sleep 2.2s
Type "Read src/orders.ts and summarise it"
Sleep 800ms
Enter
Wait+Screen@40s /Summary/
Sleep 2s
Type "/read-guard"
Sleep 700ms
Enter
Sleep 300ms
Enter
Sleep 2.5s
Type "/read-guard off"
Sleep 600ms
Enter
Sleep 2.2s
Type "/read-guard on"
Sleep 600ms
Enter
Sleep 2.2s
Type "/read-guard allow src/orders.ts"
Sleep 600ms
Enter
Sleep 3s

# (hidden) quit pi, then stop the mock model
Hide
Ctrl+D
Sleep 1s
Type "pkill -f mock-llm"
Enter
Sleep 500ms
