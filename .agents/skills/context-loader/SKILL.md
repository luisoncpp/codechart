---
name: context-loader
description: >
  Multi-step context builder: a cheap agent explores the project (markdowns
  first, then source code), progressively building a context bundle via
  concat script. The expensive agent reads the bundle (one Read vs many)
  and solves. Invoke with "/context-loader" followed by the task description.
---

# Context Loader

Multi-step workflow that builds a context bundle incrementally. The cheap agent
discovers and bundles files. YOU (the orchestrator) read the bundle and pass it
**verbatim** to the expensive solver. The solver does all implementation.

```
Step 0: clear old bundle
Step 1: @explorer finds markdown docs → concat into bundle
Step 2: @explorer reads markdowns, finds related code → concat into bundle
Step 3: @code-solver reads the bundle (one Read) → solves
Step 4: verify
```

## Critical rules for the orchestrator

- **YOU NEVER IMPLEMENT CODE.** Your only job is to orchestrate the agents.
- **YOU NEVER SUMMARIZE.** Pass task descriptions verbatim, never condensed.
- **YOU NEVER EDIT FILES.** All edits happen inside `@code-solver`.
- The only tools you use: Bash (to clear the bundle and run tests).

## Prerequisites

### 1. Copy the concat scripts

Copy `scripts/concat-bundle.ps1` and `scripts/concat-bundle.sh` from this
skill's directory into `.opencode/scripts/`.

### 2. Configure agents

Create `.opencode/agents/code-solver.md`:

```markdown
---
description: Solves coding tasks with full context provided in the prompt
mode: subagent
model: opencode-go/deepseek-v4-pro
tools:
  write: true
  edit: true
  bash: true
---

You receive full file contents in your prompt. The context was just gathered —
those files are up to date. Do NOT use Read on any file whose content already
appears in your prompt. Solve the task using the provided context.
```

### 3. Concat script behavior

- **First call** (`-o out.txt -- ...`): overwrites output with header + sources
- **Append call** (`-a -o out.txt -- ...`): appends to existing file
- Each file wrapped in `--- BEGIN FILE: path ---` / `--- END FILE: path ---`
- The script is pure shell/PowerShell — no model involved, no tokens

## When to use

- You need to reason over many files but want to minimize expensive token spend
- The task requires finding related files (not just a pre-known list)
- The expensive model would otherwise make many `Read` calls

## When NOT to use

- You already have ALL relevant file contents in the current conversation
- The total bundle content exceeds the expensive model's context window
- The task benefits from interactive file discovery

## Workflow

### Step 0: Clear old bundle

```bash
Remove-Item -ErrorAction SilentlyContinue .opencode/context-bundle.txt
```

### Step 1: `@explorer` — collect markdown docs

```
@explorer Task: <task description>

Start by reading @docs/START-HERE.md and AGENTS.md to understand the project.
Then find ALL markdown documentation files relevant to this task.
Read them to understand the architecture (DO NOT READ CODE, YOU ARE WORKING WITH OTHER AGENTS AND READING CODE IS NOT YOUR JOB).
Run the concat script with ALL
those markdowns and report a summary of what you found.
```

### Step 2: `@explorer` — collect source code

Use the same agent than in Step 1(DO NOT SPAWN ANOTHER ONE) use the task_id to continue the same thread.
Don't double think this, just do it and reuse the same subagent, same task_id.
Even if it feels more "natural" to spawn another agent DONT DO IT.

```
Now read the markdowns you bundled to identify related source code.
Find ALL TypeScript source files that:

1. Are directly mentioned in the markdowns
2. Would need to be edited to complete the task
3. Are necessary to understand the full implementation context
4. Try to devise a plan to fix the task (do not execute it), and identify which files would be relevant to that plan.

Use Glob and Grep to find them. Read key files to verify relevance.
Then APPEND them to the bundle.
```

### Step 3: `@code-solver` — solve with bundle

The solver reads the bundle (one Read vs many individual reads).

```
@code-solver Read @.opencode/context-bundle.txt complete in a single request.
**DO NOT TRY TO READ JUST THE "RELEVANT" SECTIONS**, all the file is relevant, all of that.
USE ONE SINGLE READ TO READ IT ALL!!!!!
The file is meant to prevent multiple reads, so DO NOT SPLIT IT IN MULTIPLE READS!!!
If you are double thinking about that. DO NOT!, just read the whole file in a single read.
It's a bundle that contain a lot of files that were just gathered
and are up-to date. Do NOT use Read for any file whose content already appears
there.

Task:
<original task description>

Implement the solution. Follow the workflow on @docs/dev-workflow.md , make sure the tests pass.
```

### Step 4: Verify

```bash
npm test
```

If tests fail, pass the error output directly to `@code-solver` with
instructions to fix. Do NOT attempt to fix them yourself.

## Invocation

```
/context-loader "Paso 4: Refactor the auth middleware to use JWT instead of sessions"
```

## Notes

- **The orchestrator does NOT implement.** Only `@code-solver` edits code.
- **The orchestrator does NOT summarize.** Pass task descriptions verbatim.
- **The concat script does the writing.** `@file-reader` only calls the script,
  never emits file contents in its response.
- **One Read, not many.** `@code-solver` reads the bundle file once instead of
  reading each source file individually.
- **Bundle is appendable.** Use `-a` in step 2 to add files without losing step 1.
- **Delimiter blocks.** The script wraps each file, enabling precise line
  references by the solver.
- **Token budget.** If the combined content nears the context limit, be
  selective with the file list or split the task.
