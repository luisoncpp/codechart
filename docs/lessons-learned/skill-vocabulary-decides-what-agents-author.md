# A skill's vocabulary decides what the agent will never write

**Context:** the CodeChart review skill (`help-code-review-prompt.ts`) produced Findings but zero explanatory notes, although LLMs normally over-comment code.

**Three things combined to suppress notes completely:**

1. **No create tool.** The MCP surface had `upsert_findings` but nothing that created a note. An agent cannot author what no tool writes, and it will not say that it wanted to.
2. **A definition that assigns ownership.** "Review Note — a comment the *human* wrote… treat it as their feedback to you" reads as "not yours to write". Agents follow term definitions more strictly than workflow prose.
3. **A brevity instruction with no outlet.** "Surface the few issues that matter, not a long list of comments" was meant for issues, but with Findings as the only output it suppressed explanations too. Every Finding also needs a severity, so an explanation either became a fake `info` issue or was dropped.

**What to do when writing an agent skill or MCP surface:**

- Give each kind of output its own tool and its own term (here: Diff Notes = explain, Findings = judge), and say which ones the agent owns.
- Scope every "be brief" instruction to one output type, and give the other types an explicit, generous density target ("roughly one per meaningful hunk group; many more notes than findings").
- When an agent never produces something, check the tool list and the term definitions before blaming the model.
