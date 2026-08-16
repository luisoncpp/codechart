# A plain `#[tauri::command]` runs on the main thread, so `Promise.all` over two of them is a lie

`tauri-macros` defaults a command's `execution_context` to `Blocking`, and the blocking
wrapper calls the function body **inline in the IPC handler** — on the main thread. The
`async` keyword (or `#[tauri::command(async)]` on a synchronous function) is what moves
it to the async runtime.

Two consequences, and the second is the one that hides:

1. **The window stops painting** for as long as the command runs. A full project
   analysis is seconds; the app looks hung, with no spinner able to spin.
2. **Concurrent commands do not overlap.** The frontend can write

   ```ts
   const [before, after] = await Promise.all([
     git.loadProjectSnapshot({ gitRef: baseRef, … }),
     git.loadProjectSnapshot({ gitRef: headRef, … }),
   ]);
   ```

   and read it as "two snapshots in parallel". They queue. The code that *looks* like
   the optimization is the code that isn't doing anything — nothing fails, nothing logs,
   the wall clock is just the sum.

`(async)` on a synchronous body hands it to the runtime rather than making it
non-blocking: it still occupies a worker thread while it runs. That buys concurrency up
to the worker count, which is the point here (two snapshots), not unlimited concurrency.
CPU-bound work at higher fan-out would want an explicit blocking pool.

**The rule for this repo:** any command that touches disk, git, or the parser is
`#[tauri::command(async)]`. Only a command returning something already in memory stays
synchronous — `get_startup_project_path` is the single one left.

**Second-order effect worth checking when you flip a command:** main-thread execution
was accidentally serializing IPC, so ordering between two un-awaited calls used to be
guaranteed. It no longer is. Both persistence paths here already serialize their own
writes (`diff-review-tracker.ts`, `review-notes-store.ts` both hold a `saveInFlight`
flag), so nothing depended on it — but a new fire-and-forget write would need the same.
