import type { LawIndexMode } from "./types.js";

const VALID_MODES: readonly LawIndexMode[] = ["live", "indexed", "hybrid"];

export interface LawIndexConfig {
  mode: LawIndexMode;
  indexPath?: string;
  liveVerify: boolean;
  maxVerify: number;
}

export function loadLawIndexConfig(env: NodeJS.ProcessEnv = process.env): LawIndexConfig {
  return {
    mode: parseMode(env.GERMAN_LAW_INDEX_MODE),
    indexPath: parseOptionalPath(env.GERMAN_LAW_INDEX_PATH),
    liveVerify: parseBoolean(env.GERMAN_LAW_LIVE_VERIFY, "GERMAN_LAW_LIVE_VERIFY", true),
    maxVerify: parseNonNegativeInteger(env.GERMAN_LAW_INDEX_MAX_VERIFY, "GERMAN_LAW_INDEX_MAX_VERIFY", 3),
  };
}

function parseMode(value: string | undefined): LawIndexMode {
  if (value === undefined) return "live";

  const normalized = value.trim().toLowerCase();
  if (isLawIndexMode(normalized)) return normalized;

  throw new Error(
    `Invalid GERMAN_LAW_INDEX_MODE: "${value}". Expected one of: ${VALID_MODES.join(", ")}.`,
  );
}

function isLawIndexMode(value: string): value is LawIndexMode {
  return VALID_MODES.includes(value as LawIndexMode);
}

function parseOptionalPath(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseBoolean(value: string | undefined, name: string, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;

  throw new Error(`Invalid ${name}: "${value}". Expected a boolean value.`);
}

function parseNonNegativeInteger(
  value: string | undefined,
  name: string,
  defaultValue: number,
): number {
  if (value === undefined) return defaultValue;

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid ${name}: "${value}". Expected a non-negative integer.`);
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Invalid ${name}: "${value}". Expected a safe integer.`);
  }

  return parsed;
}
