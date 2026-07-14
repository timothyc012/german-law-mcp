import type { CrossReference, LawSection, TocEntry } from "../gii-client.js";

export type LawIndexMode = "live" | "indexed" | "hybrid";

export type FreshnessStatus = "current" | "stale" | "unverified" | "live_unavailable";

export type LawIndexResultSource = LawSection["source"] | "Index";

export interface IndexedLawResult {
  abbreviation?: string;
  name: string;
  slug?: TocEntry["slug"];
  xmlUrl?: TocEntry["xmlUrl"];
  url?: string;
  source: LawIndexResultSource;
  freshness: FreshnessStatus;
  indexedAt?: string;
  verifiedAt?: string;
}

export interface IndexedLawSectionResult {
  law: LawSection["law"];
  lawName: LawSection["lawName"];
  section: LawSection["section"];
  title: LawSection["title"];
  content: LawSection["content"];
  url: LawSection["url"];
  crossReferences: CrossReference[];
  source: LawIndexResultSource;
  freshness: FreshnessStatus;
  fetchedAt?: LawSection["fetchedAt"];
  indexedAt?: string;
  verifiedAt?: string;
}

export interface LawIndexSearchOptions {
  mode?: LawIndexMode;
  size?: number;
  verifyLive?: boolean;
  maxVerify?: number;
  includeStale?: boolean;
}

export interface LawIndexProviderMetadata {
  name: string;
  mode: LawIndexMode;
  available: boolean;
  indexPath?: string;
  generatedAt?: string;
  lawCount?: number;
  sectionCount?: number;
  reason?: string;
}

export interface LawIndexProvider {
  getMetadata(): LawIndexProviderMetadata;
  searchLaws(query: string, options?: LawIndexSearchOptions): Promise<IndexedLawResult[]>;
  getSection(
    abbreviation: string,
    section: string,
    options?: LawIndexSearchOptions,
  ): Promise<IndexedLawSectionResult | null>;
}
