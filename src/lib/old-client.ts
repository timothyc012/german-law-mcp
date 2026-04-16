/**
 * Open Legal Data (de.openlegaldata.io) API Client
 *
 * 352,067 decisions from ALL German courts including OLG, LG, AG.
 * No authentication required for read access.
 * Complements NeuRIS (federal courts only) with state court coverage.
 */

const OLD_BASE = "https://de.openlegaldata.io/api";

export interface OLDCase {
  id: number;
  slug: string;
  court: {
    id: number;
    name: string;
    slug: string;
    jurisdiction: string;
    level_of_appeal: string;
  };
  file_number: string;  // Aktenzeichen
  date: string;         // YYYY-MM-DD
  type: string;         // Urteil, Beschluss
  ecli: string;
  content?: string;     // Full text (when fetched individually)
}

export interface OLDSearchResult {
  count: number;
  next: string | null;
  results: OLDCase[];
}

/**
 * Search cases by Aktenzeichen (file number)
 */
export async function searchByAktenzeichen(
  fileNumber: string,
  pageSize: number = 5,
): Promise<OLDSearchResult> {
  const url = `${OLD_BASE}/cases/?format=json&file_number=${encodeURIComponent(fileNumber)}&page_size=${pageSize}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OLD API error: ${res.status}`);
  return res.json() as Promise<OLDSearchResult>;
}

/**
 * Search cases by court slug and optional date range
 */
export async function searchByCourt(
  courtSlug: string,
  query?: string,
  dateGte?: string,
  dateLte?: string,
  pageSize: number = 10,
): Promise<OLDSearchResult> {
  const params = new URLSearchParams({ format: "json", page_size: String(pageSize) });
  params.set("court__slug", courtSlug);
  if (query) params.set("search", query);
  if (dateGte) params.set("date__gte", dateGte);
  if (dateLte) params.set("date__lte", dateLte);
  params.set("ordering", "-date");

  const url = `${OLD_BASE}/cases/?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OLD API error: ${res.status}`);
  return res.json() as Promise<OLDSearchResult>;
}

/**
 * Get a single case by ID (includes full text)
 */
export async function getCaseById(id: number): Promise<OLDCase> {
  const url = `${OLD_BASE}/cases/${id}/?format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OLD API error: ${res.status} for case ${id}`);
  return res.json() as Promise<OLDCase>;
}

/**
 * Map common court name patterns to OLD API slugs
 */
export function courtToSlug(court: string): string | null {
  const lower = court.toLowerCase().replace(/\s+/g, "-");
  // Direct slug patterns: "olg-münchen" → "olg-munchen", "lg-köln" → "lg-koln"
  const slug = lower
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");

  // Common mappings
  const COURT_SLUGS: Record<string, string> = {
    "olg-munchen": "olg-munchen",
    "olg-koln": "olg-koln",
    "olg-frankfurt": "olg-frankfurt-am-main",
    "olg-hamburg": "olg-hamburg",
    "olg-dusseldorf": "olg-dusseldorf",
    "olg-stuttgart": "olg-stuttgart",
    "olg-karlsruhe": "olg-karlsruhe",
    "olg-nurnberg": "olg-nurnberg",
    "kg-berlin": "kg",  // Kammergericht
    "lg-berlin": "lg-berlin",
    "lg-munchen": "lg-munchen-i",
    "lg-hamburg": "lg-hamburg",
    "lg-koln": "lg-koln",
    "lg-frankfurt": "lg-frankfurt-am-main",
  };

  return COURT_SLUGS[slug] ?? slug;
}
