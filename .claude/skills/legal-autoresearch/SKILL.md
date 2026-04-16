---
name: legal-autoresearch
description: "Autonomous iterative improvement loop for german-law-mcp. Modify → Build → Test → Verify → Keep/Revert."
---

# Legal Autoresearch — Autonomous Quality Loop

Based on Karpathy's autoresearch pattern, adapted for legal code.

## 2-Track Model

### Track A — Automatic (no human review needed)
- TypeScript compilation (`npm run build`)
- Legal regression guard (`node scripts/legal-regression-guard.mjs`)
- GII verification (`node scripts/legal-verify.mjs`)
- Code deduplication, formatting
- If all pass → auto-commit

### Track B — Requires human review
- Changes to § references (norm numbers, Absatz, Satz)
- Changes to legal periods (Fristen, Verjährung)
- Changes to holiday data
- Changes to fee calculations (RVG)
- Flag with LEGAL REVIEW NEEDED

## Execution Loop

1. IDENTIFY: Pick lowest-score dimension
2. MODIFY: Make ONE atomic change
3. VERIFY: Run build + regression guard + legal-verify
4. EVALUATE: All pass? → commit. Any fail? → revert.
5. REPEAT

## Scoring (5 dimensions)

| Dimension | Weight | Verification |
|-----------|--------|-------------|
| Legal Accuracy | 30% | legal-verify.mjs + regression guard |
| Functional | 25% | npm run build + manual test |
| Architecture | 15% | lint, duplication check |
| Edge Cases | 20% | regression guard assertions |
| UX | 10% | output format review |

## Key Rule

MCP provides DATA. LLM provides INTERPRETATION.
Never add legal reasoning to MCP tools — only accurate data retrieval.
