// @Architecture(descriptionShort="Markdown documentation content for the Diff Notes help topic")

export const DIFF_NOTES_MARKDOWN = `# Diff Notes

Diff Notes allow you to embed read-only Markdown explanations directly inside pasted unified diffs. When visualized in CodeChart, these notes render as interactive, collapsible explanation banners inside L2 module documents and preview frames.

## Complete Diff Example

Diff Note markers use lines starting with \`#\` in **column 0** (the very first character of the line) immediately following the diff lines they explain:

\`\`\`diff
diff --git a/src/services/auth.ts b/src/services/auth.ts
--- a/src/services/auth.ts
+++ b/src/services/auth.ts
@@ -14,7 +14,9 @@ export function authenticateUser(credentials: Credentials) {
-  const token = generateLegacySessionToken(credentials.user);
# **Deprecated Legacy Auth:**
# Cookie-based session tokens have been phased out across all microservices.
# All new sessions must use stateless cryptographic tokens.
+  const token = generateJwtToken(credentials.user, credentials.password);
# **JWT Implementation:**
# - Generates an RS256-signed token with standard \`sub\` and \`exp\` claims.
# - Validated statelessly by upstream API gateways without DB lookups.
+  auditLog.recordLogin(credentials.user.id);
# Added audit logging to comply with SOC2 security requirements.
   return { token };
 }
\`\`\`

## Grammar & Target Binding Rules

- **Marker Syntax**: Any line whose first character is \`#\` (column 0) is parsed as a Diff Note.
  - \`+#\` or \` #\` are treated as regular code comments, not diff note markers.
  - Leading \`#\` and an optional space (\`/^# ?/\`) are stripped. Consecutive \`#\` lines merge into a single multi-line note.
- **Target Binding**: Notes bind to the maximal uninterrupted run of hunk lines directly above them:
  - **After an addition run (\`+\`)**: binds to the **after** side (new file line numbers).
  - **After a deletion run (\`-\`)**: binds to the **before** side (old file line numbers).
  - **After a context run (\` \`)**: binds to the **after** side.
  - **Replacements (\`-\` then \`+\`)**: You can annotate the deleted code (place \`#\` after \`-\` lines) and the added code (place \`#\` after \`+\` lines) separately.
- **Unbound Markers**: Markers placed before the first hunk or without preceding code hunks cannot bind to lines. CodeChart displays them in a floating warning panel on the canvas.

## Key Features

- **Inline Presentation**: Rendered as styled notice banners directly under the affected code lines in L2 views and preview frames.
- **Markdown Support**: Notes support rich Markdown formatting, including **bold**, *italics*, \`inline code\`, and links.
- **Review Progress Preservation**: CodeChart strips column-0 \`#\` markers before computing diff review checksums, so adding or refining diff notes never resets file review checkmarks.
`;
