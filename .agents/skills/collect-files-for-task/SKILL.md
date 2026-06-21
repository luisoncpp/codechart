---
name: collect-files-for-task
description: Collects relevant files for a task without solving the task. Use when you need to find all documentation and code files related to a specific task. Invoke with "/collect-files-for-task [task description]"
---

# Collect Files for Task

Collects all relevant files for a specific task without solving it. Generates two files: `markdownsForTask.md` and `sourceFilesForTask.md`.

## Step Sequence

### Step 1: Read START-HERE.md

Launch an explore agent to understand the project:

```
task tool:
  description: "Collect files: understand project"
  prompt: |
    You are working on a file collection task.

    First read `docs/START-HERE.md` to understand the project context.
    Then navigate through the files mentioned in the "3-minute bootstrap" section:
    - docs/live/current-status.md
    - docs/live/file-map.md
    - docs/lessons-learned/README.md
    - docs/dev-workflow.md
    - docs/architecture/README.md
    - docs/flows/README.md

    Return a brief summary of the project and its structure.
  subagent_type: explore
```

Capture the `task_id` to continue.

### Step 2: Find relevant markdowns

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  description: "Collect files: find relevant markdowns"
  prompt: |
    You are collecting files for this task:

    [TASK_DESCRIPTION]

    Your goal: find ALL markdowns relevant to solving this task (NO code files).

    Steps:
    1. Review the "Fast routing by task" table in START-HERE.md to identify which markdowns might be relevant
    2. Search in `docs/` recursively for markdown files that may relate to the task
    3. Search in `docs/plan/`, `docs/architecture/`, `docs/flows/`, `docs/spec/` as appropriate
    4. Read the markdowns that appear relevant to confirm they are

    Relevance criteria:
    - The markdown describes architecture related to the task
    - The markdown contains specs, plans, or flows related to the task
    - The markdown documents relevant design decisions

    IMPORTANT: Do NOT read code files (.ts, .tsx, .js), only markdowns.

    Return a list of ALL relevant markdown files found with their full paths.
  subagent_type: explore
```

### Step 3: Write markdownsForTask.md

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  description: "Collect files: write markdowns list"
  prompt: |
    Write a file called `markdownsForTask.md` in the project root (if there is already a file named like that, delete it)

    The file should contain:
    - Title: "# Relevant Markdowns for the Task"
    - Brief description of the task
    - List of ALL relevant markdown files found (only filenames and paths, not content)

    Format:
    ## Task
    [short description]

    ## Relevant Markdowns
    - filename1.md
    - filename2.md
    - ...

    Do not include paths, only filenames.
  subagent_type: explore
```

### Step 4: Find relevant source code files

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  description: "Collect files: find source files"
  prompt: |
    You are collecting source code files for this task:

    [TASK_DESCRIPTION]

    The relevant markdowns are:
    [MARKDOWNS_LIST]

    Now search for relevant source code files (.ts, .tsx):

    Steps:
    1. Review the "Fast routing by task" table in START-HERE.md to identify which source files might be relevant
    2. Search in `src/`, `electron/` for file patterns that may relate to the task
    3. Read files that appear relevant to confirm they actually are
    4. Based on the content of the markdowns and the task description, search for more files that might be needed

    Relevance criteria:
    - The file implements functionality related to the task
    - The file contains interfaces, types, or contracts mentioned in the markdowns
    - The file is needed to understand how to implement the task

    IMPORTANT: Read each suspected relevant file to CONFIRM it is actually relevant before including it.

    Return a list of ALL relevant source code files found with their full paths.
  subagent_type: explore
```

### Step 5: Write sourceFilesForTask.md

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  description: "Collect files: write source files list"
  prompt: |
    Write a file called `sourceFilesForTask.md` in the project root (if there is already a file named like that, delete it)

    The file should contain:
    - Title: "# Relevant Source Code Files for the Task"
    - Brief description of the task
    - List of ALL relevant source code files confirmed (only filenames and paths, not content)

    Format:
    ## Task
    [short description]

    ## Relevant Source Code Files
    - filename1.ts
    - filename2.tsx
    - ...

    Do not include paths, only filenames.
  subagent_type: explore
```

### Step 6: Final summary

```
task tool:
  task_id: [PREVIOUS_TASK_ID]
  description: "Collect files: final summary"
  prompt: |
    Return a final summary of the collection task:

    1. How many relevant markdowns were found
    2. How many relevant source code files were found

    Indicate if there are any files that might be relevant but could not be confirmed by reading them.
  subagent_type: explore
```

## Example invocation

```
/collect-files-for-task "Implement Wiki Tag Links (WS1)"
```

## Notes

- Use `subagent_type=explore` for all research steps
- Always maintain the same `task_id` to continue the session
- Do not solve the task, only collect files
- Write both list files at the end of the process