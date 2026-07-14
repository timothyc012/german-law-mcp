import { loadLawIndexConfig, type LawIndexConfig } from "./config.js";
import type {
  IndexedLawResult,
  IndexedLawSectionResult,
  LawIndexProvider,
  LawIndexProviderMetadata,
  LawIndexSearchOptions,
} from "./types.js";

const INDEX_NOT_IMPLEMENTED =
  "German law indexed provider not implemented yet. Use GERMAN_LAW_INDEX_MODE=live until an indexed provider is wired.";

export class NoopLawIndexProvider implements LawIndexProvider {
  readonly #metadata: LawIndexProviderMetadata;

  constructor(config: LawIndexConfig = loadLawIndexConfig()) {
    this.#metadata = {
      name: "noop-law-index",
      mode: config.mode,
      available: false,
      indexPath: config.indexPath,
      reason: "Live mode uses existing live clients directly; no local index provider is active.",
    };
  }

  getMetadata(): LawIndexProviderMetadata {
    return { ...this.#metadata };
  }

  async searchLaws(_query: string, _options?: LawIndexSearchOptions): Promise<IndexedLawResult[]> {
    return [];
  }

  async getSection(
    _abbreviation: string,
    _section: string,
    _options?: LawIndexSearchOptions,
  ): Promise<IndexedLawSectionResult | null> {
    return null;
  }
}

export function createLawIndexProvider(config: LawIndexConfig = loadLawIndexConfig()): LawIndexProvider {
  if (config.mode === "live") {
    return new NoopLawIndexProvider(config);
  }

  throw new Error(INDEX_NOT_IMPLEMENTED);
}
