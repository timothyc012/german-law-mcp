# Theo Routing Matrix

Use this matrix when the user says "Theo", "테오", "태오", "ask Theo", or asks
for legal/tax analysis through the pack.

| User Task | Primary Route | Fallback / Notes |
| --- | --- | --- |
| German statute lookup, cases, deadlines, RVG, BMF, EU/German legal source checks | `german-law-mcp` | Use official-source fallback only if MCP is unavailable. |
| German tax calculation, VAT, payroll, corporate tax, trade tax, inheritance tax, real-estate transfer tax | `steuer-mcp` | If legal interpretation is needed, combine with `german-law-mcp`. |
| German annual tax return estimate, refund estimate, Nachzahlung estimate, "연말정산 예상 환급액" | `steuer-mcp` + `tax-refund-interview.md` | Interview for missing inputs before calculating; do not ask for tax ID, bank account, or exact address. |
| Broad legal research, multi-jurisdiction comparison, KR/EU/global source collection | `legal-research` | Good default when facts are unclear or the task needs a full research memo. |
| GDPR, ePrivacy, EDPB, CJEU privacy case law, data governance, AI/data regulation overlap | `gdpr-expert` | Use `legal-research` for non-EU comparative expansion. |
| Contract review, redlines, clause comments, negotiation memo, draft/rereview/export-clean workflow | `contract-review` | For quick German AGB risk screening, `german-law-mcp` may be enough. |
| Cross-border contract with German tax implications | `contract-review` + `steuer-mcp` + `german-law-mcp` | Start with document workflow, then call tools for law/tax checks. |
| German + Korean legal issue | `legal-research` + `german-law-mcp` + Korean law MCP if configured | Require source-grade labels and jurisdiction-specific caveats. |
| Privacy clause in a contract | `contract-review` + `gdpr-expert` | Keep drafting/redline state in `contract-review`; privacy authority in `gdpr-expert`. |

## Output Contract

Every routed answer should include:

- selected route;
- missing facts or assumptions;
- source/citation status;
- confidence level;
- attorney/qualified professional review caveat where the output may affect a
  real legal or tax decision.
