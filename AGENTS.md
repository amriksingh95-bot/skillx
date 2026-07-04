# AGENTS.md — SkillXT Reward Program

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
