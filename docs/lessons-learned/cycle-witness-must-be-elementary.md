# Cycle witness must be elementary

Date: 2026-08-26

## What to remember

A Tarjan SCC is the right *set* of cycle participants; the diagnostic *message*
still needs its own walk. Closing only when returning to the start node will
oscillate and **fabricate** edges. Prefer the **shortest elementary cycle through
the highest-degree member** (the hub to break) and say so in the headline:
`circular include (N modules): …`.

`(others in this cycle: …)` means co-members of the same SCC, not “unrelated
extras.” A huge list usually means a real hub (e.g. character/controller) glued
`.h`/`.cpp` units together — trust `(N modules)` over the short witness alone.

For C++, strip extensions in the message (`RexCharacter`, not `RexCharacter.h`)
so the logical unit is obvious after impl/header collapse.
