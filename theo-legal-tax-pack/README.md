# Theo Legal/Tax Pack

Theo Legal/Tax Pack is a thin orchestration package for local legal and tax
workflows. It does not copy large knowledge bases or rewrite upstream project
history. Instead, it registers the user's existing workspaces and gives Theo a
single routing surface for Claude Code, Codex, and MCP clients.

## Included Capabilities

| Module | Role | Integration Type |
| --- | --- | --- |
| `theo-legal` | Front-door legal orchestrator | Claude/Codex skill |
| `german-law-mcp` | German law statutes, cases, deadlines, RVG, EU/BMF support | MCP server |
| `steuer-mcp` | German tax calculators and tax-law utilities | MCP server |
| `legal-research` | General international/KR/EU legal research workflow | Workspace specialist |
| `gdpr-expert` | EU privacy, GDPR, EDPB, CJEU structured RAG | Workspace specialist |
| `contract-review` | Contract review, DOCX redlines, drafting, rereview | Workspace specialist |

## Why This Is a Pack, Not a Source Merge

- `german-law-mcp` and `steuer-mcp` are runtime tools.
- `legal-research`, `gdpr-expert`, and `contract-review` contain large local
  libraries and workflow state.
- Copying those projects into one repo would increase sharing risk and make
  updates harder.
- A registry-based pack keeps each project independently maintainable while
  making Theo behave like one coherent legal/tax assistant.

## Files

- `architecture.md` - how the pack is organized.
- `routing-matrix.md` - which route Theo should choose for each task.
- `tax-refund-interview.md` - interview flow for German annual tax refund and
  additional-payment estimates.
- `workspace-registry.yaml` - canonical local project registry.
- `mcp/claude-code.example.json` - Claude Code MCP template.
- `mcp/codex.example.toml` - Codex MCP template.
- `codex-skills/theo-pack/SKILL.md` - Codex skill surface for the pack.
- `installers/check-local-workspaces.sh` - local sanity check script.

## Sharing Guidance

Share this pack as a clean repo or archive with no inherited git history from
other repositories. The pack should contain templates and routing docs only. Do
not include private `library/`, `knowledge/`, `output/`, `.env`, API keys,
attorney materials, or client documents.
