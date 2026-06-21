---
name: multi-step-agent-task
description: Executes a complex task in chained steps using sub-agents. Use when you need to explore, plan, implement, and document in multiple sequential steps. Invoke with "/multi-step-agent-task [task description]"
---

# Multi-Step Agent Task

Executes complex tasks in sequential steps using sub-agents. Each step uses `task_id` to maintain context.

You are only an orchestrator, you are not supposed to do the task yourself, only prevent the sub-agent from going off the track.

## Sequence of steps

### Step 1: Launch initial sub-agent

Use `subagent_type=explore` for the initial task:

```
task tool:
  description: "Multi-step task: [name]"
  prompt: |
    You are working on this task with other agents:

    [TASK_DESCRIPTION]

    **Your first task**: Find the relevant markdowns to solve this task (only markdowns, NOT code files).
    Start by reading START-HERE.md to understand the context.
    Give me the list of relevant markdowns.
  subagent_type: explore
```

Capture the `task_id` to continue.

### Step 2: Read markdowns and summarize

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  prompt: |
    Now read those markdowns and give me a brief summary of the content, or any details that don't match the task description.
    The markdowns are:
    [MARKDOWNS_LIST]
```

### Step 3: Verify docs and propose plan

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  prompt: |
    Remember the task:

    [TASK_DESCRIPTION]

    The docs we read are discarded and must not be used.

    Now propose an implementation plan based solely on the description above.
    You may read code files to understand the current state and then propose the steps.
```

### Step 4: Execute plan

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  subagent_type: general
  prompt: |
    Execute the plan you proposed. [PLAN_STEPS]

    Only make changes, do not run tests yet.
    Verify that TypeScript compiles correctly after the changes.
```

### Step 5: Verify

```
bash tool:
  command: npm run test

If there are errors, go back to step 4 to fix, then re-verify.
```

### Step 6: Add tests and docs

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  subagent_type: general
  prompt: |
    Now you need to:

    1. **Add tests for new uncovered code:**
       - Unit tests for new modules/functions
       - Verify that main methods work
       - Cover edge cases

    2. **Update architecture and flow documents:**
       - [DOCS_TO_UPDATE]
       - Create new ADRs if there are architectural decisions

    Verify that new tests pass and TypeScript still compiles.
```

### Step 7: Run tests and lint, fix failures

```
bash tool:
  command: npm run test
bash tool:
  command: npm run lint

If there are errors or lint violations, go back to step 4 to fix them, then re-verify.
Do NOT skip this step — both tests and lint must pass before considering the task complete.
```

### Step 8: Consider updating documentation

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  subagent_type: general
  prompt: |
    Review the changes made and consider whether documentation needs to be updated:

    1. Are there new modules, functions, or APIs that need to be documented?
    2. Do any existing docs need to be corrected based on the changes?
    3. Should any README, START-HERE, or architecture docs reflect the new state?

    If documentation updates are needed, make them now.
    If no updates are needed, explicitly state why.
```

### Step 9: Consider adding another flow

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  subagent_type: general
  prompt: |
    Review the implementation and consider:

    1. Does this change require a new workflow or flow to be documented?
    2. Are there any integration points or downstream processes affected?
    3. Should a new flow be added to the project's flow documentation?

    If a new flow is needed, describe it and add it.
    If no new flow is needed, explicitly state why.
```

### Step 10: Verify code style guidelines

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  subagent_type: general
  prompt: |
    Review all the code changes made and verify they follow the project's code style guidelines:

    1. Check naming conventions (variables, functions, files) match existing patterns
    2. Check code formatting (indentation, line length, spacing)
    3. Check that no comments were added unless explicitly requested
    4. Check that imports follow the project's conventions
    5. Check that error handling patterns match the existing codebase
    6. Check that type annotations are complete and correct

    If any style violations are found, fix them now.
    If everything follows the guidelines, explicitly confirm.
```

## Error patterns and retry

- **If TypeScript doesn't compile**: Go back to step 4, fix, re-verify
- **If tests fail**: Analyze error, fix code (not tests), re-verify
- **If lint fails**: Fix lint violations, re-verify
- **If there is a discrepancy between docs and task**: Mark docs as discarded, continue with original description

## Invocation example

```
/multi-step-agent-task "Step 3: Create a read-only PaneWorkspace module..."
```

## Notes

- Use `subagent_type=explore` for research steps
- Use `subagent_type=general` for implementation steps
- Always keep the same `task_id` to continue the session
- Verify at the end of each implementation step
