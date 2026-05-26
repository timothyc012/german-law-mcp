#!/usr/bin/env bash
set -euo pipefail

paths=(
  "${THEO_LEGAL:-__THEO_LEGAL__}"
  "${GERMAN_LAW_MCP:-__GERMAN_LAW_MCP__}"
  "${STEUER_MCP:-__STEUER_MCP__}"
  "${LEGAL_RESEARCH:-__LEGAL_RESEARCH__}"
  "${GDPR_EXPERT:-__GDPR_EXPERT__}"
  "${CONTRACT_REVIEW:-__CONTRACT_REVIEW__}"
)

missing=0

for path in "${paths[@]}"; do
  if [[ "$path" == __*__ ]]; then
    printf 'SKIP placeholder: %s\n' "$path"
    continue
  fi

  if [[ -d "$path" ]]; then
    printf 'OK   %s\n' "$path"
  else
    printf 'MISS %s\n' "$path"
    missing=1
  fi
done

exit "$missing"

