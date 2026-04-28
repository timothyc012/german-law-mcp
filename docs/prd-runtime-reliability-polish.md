# Runtime Reliability Polish PRD

## Objective

Prepare `german-law-mcp` for a v1.0-quality runtime by tightening the reliability of existing external-source integrations before adding larger product surfaces such as remote HTTP/SSE deployment or local RAG.

The goal is not to expand the legal feature set in this sprint. The goal is to make the current tools fail more predictably, recover from transient network issues, and expose upstream API drift early enough that maintainers can act before users see confusing MCP failures.

## Scope

### In Scope

1. Align standalone verification HTTP behavior with the runtime HTTP policy.
2. Add NeuRIS response-shape sentinels around collection-style API responses.
3. Extend unit coverage for the new defensive parsing behavior.
4. Keep `npm run verify`, unit tests, build, smoke test, and scorecard green.

### Out of Scope

1. New dependencies.
2. HTTP/SSE server mode.
3. Persistent cache or sqlite-vec RAG.
4. Large NeuRIS client refactors unrelated to response validation.
5. New legal-domain tools beyond the already-landed contract review and full research workflow.

## Users

Primary users are legal practitioners and AI clients using the MCP server for German law research. Secondary users are maintainers who need quick, actionable signals when government or EU data sources change behavior.

## Requirements

### Runtime Reliability

- All new or changed outbound HTTP logic must send an identifiable User-Agent.
- Transient 429 and 5xx responses should receive a bounded retry with backoff.
- Abort and timeout failures must not be retried blindly.
- Live verification should preserve its current rate limiting and ISO-8859-1 decoding.

### API Drift Detection

- NeuRIS collection endpoints must validate that the top-level response has the expected shape before mapping result items.
- Drift errors must name the NeuRIS context that failed and include a compact validation summary.
- Validation must remain tolerant of extra upstream fields.

### Verification

- Add focused tests for NeuRIS collection validation.
- Existing MCP behavior must remain unchanged for valid responses.
- Required commands:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run verify`
  - `npm run build`
  - `npm run smoke:mcp`
  - `npm run score`

## Implementation Plan

1. Document this PRD and use it as the sprint scope boundary.
2. Update `scripts/legal-verify.mjs` so `fetchGii` uses the same retry, timeout, User-Agent, and abort principles as `src/lib/http-client.ts`.
3. Add a small Zod-backed NeuRIS collection parser in `src/lib/neuris-client.ts`.
4. Route `searchLegislation`, `searchCaseLaw`, `searchAll`, and `luceneSearch` through that parser.
5. Add unit tests proving valid NeuRIS collections pass and malformed collection shapes fail clearly.
6. Run the verification commands and fix any regressions.

## Success Criteria

- Valid NeuRIS collection payloads still map into the same public result types.
- Malformed NeuRIS collection payloads fail with a clear `NeuRIS API shape changed` error.
- The live-law verification script no longer has an ad hoc raw fetch path for GII requests.
- All required verification commands pass locally.

## Risks

- NeuRIS is a test-phase service, so validation must be strict enough to catch breaking drift but tolerant enough not to reject harmless extra fields.
- `scripts/legal-verify.mjs` is intentionally standalone. Avoid coupling it to `dist/` output or requiring a build before verification can run.
