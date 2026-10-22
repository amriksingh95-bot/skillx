# AGENTS.md — SkillXT Reward Program

## Graphify

Before searching files, query the Graphify graph first (graphify query / path / explain). Verify results against the source code.

## Visual Gate (Mandatory for UI/Layout Tasks)

Any task involving layout, spacing, alignment, visual hierarchy, colors, typography, or rendered appearance is subject to the Visual Gate before it can be marked complete.

### Requirements

1. **Explicit scope of QA:** AG must explicitly state whether its "QA passed" claim covers visual rendering or only code/logic correctness (build success, lint, gap math, API response shape, etc.). Code inspection alone is never equivalent to visual verification.

2. **Human review or screenshot-based check:** Tasks involving layout/visual changes require one of the following before sign-off:
   - A screenshot from the developer (AG) at 2+ viewport widths, OR
   - A screenshot-based automated check (e.g., Playwright, Puppeteer, Percy), OR
   - Explicit written acknowledgment from AG: **"I cannot render this UI — visual verification must be done by a human"** — and that acknowledgment must be recorded with the task.

3. **AG must request screenshots:** When a visual change is made, AG should proactively request screenshots from the user/human reviewer rather than assuming silence means approval. Do not mark visual tasks done without rendered evidence.

4. **Signed-off vs self-verified distinction:**
   - **Code logic / API / backend:** AG may self-verify and report pass/fail with evidence.
   - **Rendered output / layout / CSS / components:** Requires human-verified screenshots. Code math (gap arithmetic, flex values, etc.) is not sufficient sign-off.

### Enforcement

If AG cannot produce rendered evidence (no browser automation available), it must declare this upfront at task start, not after the user asks for screenshots. The declaration becomes part of the task record so it cannot be silently assumed later.
## Reporting Rules (Execution Phases)

- Every execution report MUST show literal before/after code (diff-style with +/- lines), never a prose-only bullet summary of what changed.
- If a file is fully rewritten, show the complete new file content — not a partial snippet with "unchanged" placeholders unless explicitly asked to summarize.
- Always end with the actual build result: exact module count and error count (e.g. "2,436 modules, 0 errors") — not just "build succeeded."
- If asked to "re-send" or "redo" a report, only re-send the missing/incomplete part — do not regenerate the entire report from scratch unless explicitly told to.
- Never leave prose commentary, thought logs, or tool-call fragments (e.g. stray function-call artifacts) inside the final report — the report must be clean and copy-paste ready.
- For minor/mechanical changes (reverts, renames, single-line fixes), keep the report short: just the diff + build result — skip lengthy explanations, "what changed" prose, or work-state recaps unless something unexpected came up.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
