---
name: read-collected-files
description: Reads all files listed in markdownsForTask.md and sourceFilesForTask.md. Use after collect-files-for-task to load all relevant files into context. Invoke with "/read-collected-files"
---

# Read Collected Files

Reads all files listed in `markdownsForTask.md` and `sourceFilesForTask.md`. No analysis, no summarization, no explanation, no error finding. Pure reading only.

## Steps

### Step 1: Read markdownsForTask.md

Read the file `markdownsForTask.md` at the project root to get the list of markdown files to read.

### Step 2: Read sourceFilesForTask.md

Read the file `sourceFilesForTask.md` at the project root to get the list of source code files to read.

### Step 3: Read all listed files

Read every file listed in both documents. Use the Read tool for each file.

### Step 4: Confirm

If all files(with all their content, not just snippets) were read successfully without technical issues (file not found, permission denied, etc.), respond with exactly:

```
RECEIVED
```

If any file could not be read, report which file failed and why.