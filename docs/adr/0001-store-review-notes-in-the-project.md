# Store Review Notes in the project

CodeChart stores single-user Review Notes in a separate `.codechart/review-notes.json` file under the analyzed project root, rather than in operating-system app data or `.codechart/config.json`. This keeps notes offline and attached to a project when its folder moves, at the cost of making the file visible to Git unless the user chooses to ignore it.
