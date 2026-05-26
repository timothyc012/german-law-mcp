---
name: theo-pack
description: Use when the user asks Theo/테오/태오 to coordinate German law, German tax, legal research, GDPR, or contract review through the local Theo Legal/Tax Pack.
---

# Theo Legal/Tax Pack Skill

Read the pack registry and routing matrix:

- `workspace-registry.yaml`
- `routing-matrix.md`
- `tax-refund-interview.md` for German annual tax return, refund, or
  Nachzahlung estimates

Route as follows:

- German legal authority checks -> `german-law-mcp`
- German tax and calculations -> `steuer-mcp`
- German annual tax return refund/additional-payment estimates ->
  `tax-refund-interview.md`, then `steuer-mcp`
- Quick contract triage -> `review_contract`, then the matching active
  specialist rulebook
- Broad international/Korean/EU research -> `legal-research`
- GDPR/privacy specialist research -> `gdpr-expert`
- Contract redlines, drafting, rereview, and Word outputs ->
  `contract-review`

Always report selected route, assumptions, source status, confidence, and any
needed professional-review caveat.
