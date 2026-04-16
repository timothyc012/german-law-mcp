#!/usr/bin/env node
/**
 * legal-verify.mjs
 *
 * Scans all .ts files in src/tools/ and src/lib/ for hardcoded § references,
 * then verifies each reference against the live GII (gesetze-im-internet.de)
 * API. Also spot-checks specific content claims embedded near those references.
 *
 * Usage:   node scripts/legal-verify.mjs
 * Exit:    0 = all verified (or section-exists), 1 = any ❌ not found
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Law abbreviation → GII slug mapping ──────────────────────────────────────

const LAW_SLUG = {
  BGB: "bgb",
  ZPO: "zpo",
  StGB: "stgb",
  StPO: "stpo",
  KSchG: "kschg",
  BetrVG: "betrvg",
  BUrlG: "burlg",
  ArbZG: "arbzg",
  GG: "gg",
  VwGO: "vwgo",
  VwVfG: "vwvfg",
  AO: "ao_1977",
  HGB: "hgb",
  AGG: "agg",
  ArbGG: "arbgg",
  InsO: "inso",
  GmbHG: "gmbhg",
  AktG: "aktg",
  BauGB: "bbaug",
  StVG: "stvg",
  // Extra laws found in codebase
  OWiG: "owig_1968",
  FamFG: "famfg",
  BeurkG: "beurkg",
  GVG: "gvg",
  BVerfGG: "bverfgg",
  BDSG: "bdsg_2018",
  EStG: "estg",
  UStG: "ustg_1980",
  KStG: "kstg_1977",
  GewStG: "gewstg",
  FGO: "fgo",
  TzBfG: "tzbfg",
  UrhG: "urhg",
  PatG: "patg",
  MarkenG: "markeng",
  UWG: "uwg_2004",
  GWB: "gwb",
  BImSchG: "bimschg",
  StVO: "stvo_2013",
  VVG: "vvg_2008",
  WEG: "woeigg",
  TKG: "tkg_2021",
  TTDSG: "ttdsg",
  MuSchG: "muschg_2018",
};

// Laws that use "Art." instead of "§"
const ART_LAWS = new Set(["GG", "EGBGB"]);

// ── Content claims to verify ──────────────────────────────────────────────────
// Each entry: if a file contains `trigger` near a section ref, check that
// the GII text for `law`/`section` contains at least one of `mustFind`.

const CONTENT_CLAIMS = [
  // ── BGB Verjährung ──
  { law: "BGB", section: "195", trigger: /drei Jahre|3 Jahre/i, mustFind: ["drei Jahre"], desc: "§ 195 BGB — Regelverjährung 3 Jahre" },
  { law: "BGB", section: "199", trigger: /Verjährungsbeginn|Kenntnis/i, mustFind: ["Kenntnis"], desc: "§ 199 BGB — Verjährungsbeginn bei Kenntnis" },

  // ── BGB Kaufrecht ──
  { law: "BGB", section: "433", trigger: /Kaufvertrag|Käufer/i, mustFind: ["Kaufvertrag", "Käufer"], desc: "§ 433 BGB — Kaufvertrag Pflichten" },
  { law: "BGB", section: "434", trigger: /Sachmangel/i, mustFind: ["Sachmangel", "mangelfrei"], desc: "§ 434 BGB — Sachmangel Definition" },
  { law: "BGB", section: "437", trigger: /Nacherfüllung|Rücktritt|Schadensersatz/i, mustFind: ["Nacherfüllung", "zurücktreten", "Schadensersatz"], desc: "§ 437 BGB — Käuferrechte bei Mängeln" },
  { law: "BGB", section: "438", trigger: /arglistig/i, mustFind: ["arglistig"], desc: "§ 438 Abs. 3 BGB — arglistiges Verschweigen" },
  { law: "BGB", section: "438", trigger: /zwei Jahr|2 Jahr/i, mustFind: ["zwei Jahren"], desc: "§ 438 Abs. 1 Nr. 3 BGB — 2 Jahre Gewährleistung" },
  { law: "BGB", section: "439", trigger: /Nacherfüllung/i, mustFind: ["Nacherfüllung", "Beseitigung des Mangels"], desc: "§ 439 BGB — Nacherfüllung" },
  { law: "BGB", section: "441", trigger: /Minderung/i, mustFind: ["Minderung", "herabsetzen"], desc: "§ 441 BGB — Minderung" },
  { law: "BGB", section: "444", trigger: /arglistig|Haftungsausschluss/i, mustFind: ["arglistig"], desc: "§ 444 BGB — Haftungsausschluss bei Arglist" },
  { law: "BGB", section: "446", trigger: /Gefahrübergang/i, mustFind: ["Gefahr", "Übergabe"], desc: "§ 446 BGB — Gefahrübergang" },
  { law: "BGB", section: "474", trigger: /Verbrauchsgüterkauf/i, mustFind: ["Verbraucher", "Unternehmer"], desc: "§ 474 BGB — Verbrauchsgüterkauf" },
  { law: "BGB", section: "477", trigger: /Beweislast|vermutet/i, mustFind: ["vermutet", "Beweislast"], desc: "§ 477 BGB — Beweislastumkehr" },

  // ── BGB Mietrecht ──
  { law: "BGB", section: "535", trigger: /Mietvertrag|Mieter/i, mustFind: ["Mieter", "Vermieter"], desc: "§ 535 BGB — Mietvertrag Hauptpflichten" },
  { law: "BGB", section: "536", trigger: /Mietminderung|Mangel/i, mustFind: ["Mangel", "Minderung", "gemindert"], desc: "§ 536 BGB — Mietminderung" },
  { law: "BGB", section: "543", trigger: /fristlos|wichtiger Grund/i, mustFind: ["wichtiger Grund", "außerordentlich"], desc: "§ 543 BGB — Fristlose Kündigung Mietvertrag" },
  { law: "BGB", section: "573", trigger: /berechtigtes Interesse|Eigenbedarf/i, mustFind: ["berechtigtes Interesse"], desc: "§ 573 BGB — Ordentliche Kündigung" },
  { law: "BGB", section: "573c", trigger: /Kündigungsfrist|3 Monate/i, mustFind: ["drei Monate", "drei Monaten"], desc: "§ 573c BGB — Kündigungsfristen" },

  // ── BGB Schadensersatz ──
  { law: "BGB", section: "280", trigger: /Pflichtverletzung|Schadensersatz/i, mustFind: ["Pflichtverletzung", "Schadensersatz"], desc: "§ 280 BGB — Schadensersatz wegen Pflichtverletzung" },
  { law: "BGB", section: "823", trigger: /Körper|Gesundheit|Eigentum/i, mustFind: ["Leben", "Körper", "Gesundheit", "Eigentum"], desc: "§ 823 BGB — Deliktsrecht absolute Rechtsgüter" },
  { law: "BGB", section: "249", trigger: /Naturalrestitution|Wiederherstellung/i, mustFind: ["Zustand herzustellen", "Herstellung"], desc: "§ 249 BGB — Naturalrestitution" },
  { law: "BGB", section: "253", trigger: /Schmerzensgeld|immateriell/i, mustFind: ["billige Entschädigung", "nicht Vermögensschaden"], desc: "§ 253 BGB — Schmerzensgeld" },
  { law: "BGB", section: "254", trigger: /Mitverschulden/i, mustFind: ["Mitverschulden", "Verschulden des Beschädigten"], desc: "§ 254 BGB — Mitverschulden" },

  // ── BGB Allgemein ──
  { law: "BGB", section: "242", trigger: /Treu und Glauben/i, mustFind: ["Treu und Glauben"], desc: "§ 242 BGB — Treu und Glauben" },
  { law: "BGB", section: "812", trigger: /Bereicherung|ohne Rechtsgrund/i, mustFind: ["ohne rechtlichen Grund", "Bereicherung"], desc: "§ 812 BGB — Ungerechtfertigte Bereicherung" },
  { law: "BGB", section: "626", trigger: /fristlos|wichtiger Grund/i, mustFind: ["wichtigem Grund", "wichtiger Grund"], desc: "§ 626 BGB — Fristlose Kündigung" },
  { law: "BGB", section: "193", trigger: /Feiertag|Sonntag|Samstag/i, mustFind: ["Sonntag", "Feiertag", "Samstag"], desc: "§ 193 BGB — Fristverschiebung Werktag" },

  // ── ZPO Fristen ──
  { law: "ZPO", section: "517", trigger: /Berufungsfrist|eines Monats/i, mustFind: ["eines Monats", "einen Monat"], desc: "§ 517 ZPO — Berufungsfrist 1 Monat" },
  { law: "ZPO", section: "520", trigger: /Berufungsbegründung/i, mustFind: ["zwei Monaten", "zwei Monate"], desc: "§ 520 ZPO — Berufungsbegründung 2 Monate" },
  { law: "ZPO", section: "548", trigger: /Revisionsfrist/i, mustFind: ["eines Monats", "einen Monat"], desc: "§ 548 ZPO — Revisionsfrist 1 Monat" },
  { law: "ZPO", section: "339", trigger: /Einspruch|Versäumnisurteil/i, mustFind: ["zwei Wochen", "Einspruch"], desc: "§ 339 ZPO — Einspruch 2 Wochen" },
  { law: "ZPO", section: "694", trigger: /Widerspruch|Mahnbescheid/i, mustFind: ["Widerspruch"], desc: "§ 694 ZPO — Widerspruch Mahnbescheid" },
  { law: "ZPO", section: "700", trigger: /Vollstreckungsbescheid/i, mustFind: ["Vollstreckungsbescheid"], desc: "§ 700 ZPO — Vollstreckungsbescheid" },

  // ── Arbeitsrecht ──
  { law: "KSchG", section: "1", trigger: /sozial ungerechtfertigt|Kündigungsschutz/i, mustFind: ["sozial ungerechtfertigt", "sozial gerechtfertigt"], desc: "§ 1 KSchG — Soziale Rechtfertigung" },
  { law: "KSchG", section: "4", trigger: /drei Wochen|3 Wochen|Klagefrist/i, mustFind: ["drei Wochen", "innerhalb von drei Wochen"], desc: "§ 4 KSchG — 3-Wochen-Klagefrist" },
  { law: "KSchG", section: "23", trigger: /zehn Arbeitnehmer|10 Arbeitnehmer/i, mustFind: ["zehn Arbeitnehmer", "mehr als zehn"], desc: "§ 23 KSchG — Schwellenwert 10 AN" },
  { law: "ArbGG", section: "66", trigger: /Berufungsfrist.*Arbeit/i, mustFind: ["eines Monats", "einen Monat"], desc: "§ 66 ArbGG — Berufungsfrist Arbeitsgericht" },

  // ── StGB ──
  { law: "StGB", section: "263", trigger: /Betrug|Täuschung/i, mustFind: ["Täuschung", "Vermögensvorteil", "Vermögensschaden"], desc: "§ 263 StGB — Betrug" },

  // ── Verwaltungsrecht ──
  { law: "VwGO", section: "70", trigger: /Widerspruchsfrist|eines Monats/i, mustFind: ["eines Monats", "einen Monat"], desc: "§ 70 VwGO — Widerspruchsfrist 1 Monat" },
  { law: "VwGO", section: "74", trigger: /Anfechtungsklage|eines Monats/i, mustFind: ["eines Monats", "einen Monat"], desc: "§ 74 VwGO — Klagefrist 1 Monat" },

  // ── StPO ──
  { law: "StPO", section: "317", trigger: /Berufung.*Straf|Woche/i, mustFind: ["Woche"], desc: "§ 317 StPO — Berufungsbegründung Strafrecht" },
  { law: "StPO", section: "341", trigger: /Revision.*Straf|eine Woche/i, mustFind: ["eine Woche", "einer Woche"], desc: "§ 341 StPO — Revisionsfrist Strafrecht 1 Woche" },

  // ── StVG ──
  { law: "StVG", section: "7", trigger: /Halter|Gefährdungshaftung/i, mustFind: ["Halter", "Betrieb eines Kraftfahrzeugs"], desc: "§ 7 StVG — Halterhaftung" },
];

// ── Regex to extract § references from source files ──────────────────────────

/**
 * Matches patterns like:
 *   § 434 BGB
 *   §§ 433 ff. BGB
 *   § 477 Abs. 1 BGB
 *   § 438 Abs. 1 Nr. 3 BGB
 *   Art. 1 GG
 */
const SECTION_REF_RE =
  /(?:§§?|Art\.?)\s*(\d+[a-z]?)(?:\s+(?:Abs\.|Satz|Nr\.|S\.)[\s\d.]+)?\s+([A-Z][A-Za-z]+(?:\s+[IVX]+)?)\b/g;

// ── Utility: collect all .ts files in given directories ──────────────────────

function collectTsFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        files.push(...collectTsFiles(full));
      } else if (entry.endsWith(".ts")) {
        files.push(full);
      }
    }
  } catch {
    // Directory doesn't exist — skip silently
  }
  return files;
}

// ── Utility: build GII section URL ───────────────────────────────────────────

function buildUrl(slug, section, isArt) {
  if (isArt) {
    return `https://www.gesetze-im-internet.de/${slug}/art_${section}.html`;
  }
  return `https://www.gesetze-im-internet.de/${slug}/__${section}.html`;
}

// ── Utility: fetch GII HTML with ISO-8859-1 decoding ─────────────────────────

async function fetchGii(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "german-law-mcp/legal-verify (+legal-verify.mjs)" },
  });
  if (!res.ok) {
    return { ok: false, status: res.status, text: "" };
  }
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("iso-8859-1").decode(buffer);
  return { ok: true, status: res.status, text };
}

// ── Utility: strip HTML tags for content search ───────────────────────────────

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&sect;/g, "§")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/\s+/g, " ")
    .trim();
}

// ── Utility: rate-limit helper (max 2 req/s) ─────────────────────────────────

let lastRequestAt = 0;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const gap = now - lastRequestAt;
  if (gap < 500) {
    await new Promise((r) => setTimeout(r, 500 - gap));
  }
  lastRequestAt = Date.now();
  return fetchGii(url);
}

// ── Step 1: collect source files ─────────────────────────────────────────────

const srcTools = join(ROOT, "src", "tools");
const srcLib = join(ROOT, "src", "lib");

const sourceFiles = [...collectTsFiles(srcTools), ...collectTsFiles(srcLib)];

if (sourceFiles.length === 0) {
  console.error("No .ts files found under src/tools/ or src/lib/. Exiting.");
  process.exit(1);
}

console.log(`Scanning ${sourceFiles.length} TypeScript files...\n`);

// ── Step 2: extract all unique § / Art. references ───────────────────────────

// Map: "BGB:434" → { law, section, isArt, slug, files: Set<string> }
const refs = new Map();

// Also collect surrounding context for content-claim checks
// Map: "BGB:434" → Set of 300-char context windows
const contexts = new Map();

for (const filePath of sourceFiles) {
  let src;
  try {
    src = readFileSync(filePath, "utf-8");
  } catch {
    continue;
  }

  const relPath = filePath.replace(ROOT + "/", "");

  let m;
  SECTION_REF_RE.lastIndex = 0;

  while ((m = SECTION_REF_RE.exec(src)) !== null) {
    const rawSection = m[1]; // e.g. "434", "477a"
    const rawLaw = m[2].trim(); // e.g. "BGB", "ZPO"

    // Normalise law: remove trailing Roman numerals that are part of SGB names
    const law = rawLaw.replace(/\s+[IVX]+$/, "").trim();

    const slug = LAW_SLUG[law];
    if (!slug) continue; // Unknown law — skip

    const isArt = ART_LAWS.has(law);
    const key = `${law}:${rawSection}`;

    if (!refs.has(key)) {
      refs.set(key, { law, section: rawSection, isArt, slug, files: new Set() });
      contexts.set(key, new Set());
    }
    refs.get(key).files.add(relPath);

    // Capture ±150 chars around the match for content-claim analysis
    const start = Math.max(0, m.index - 150);
    const end = Math.min(src.length, m.index + m[0].length + 150);
    contexts.get(key).add(src.slice(start, end));
  }
}

if (refs.size === 0) {
  console.log("No § / Art. references found matching known laws. Nothing to verify.");
  process.exit(0);
}

console.log(`Found ${refs.size} unique section references across ${sourceFiles.length} files.\n`);
console.log("━".repeat(70));

// ── Step 3: verify each reference against GII ────────────────────────────────

const results = [];

// Sort for deterministic output: by law, then section numerically
const sortedKeys = [...refs.keys()].sort((a, b) => {
  const [lawA, secA] = a.split(":");
  const [lawB, secB] = b.split(":");
  if (lawA !== lawB) return lawA.localeCompare(lawB);
  return parseInt(secA, 10) - parseInt(secB, 10);
});

let idx = 0;
for (const key of sortedKeys) {
  idx++;
  const { law, section, isArt, slug, files } = refs.get(key);
  const url = buildUrl(slug, section, isArt);
  const prefix = isArt ? "Art." : "§";
  const display = `${prefix} ${section} ${law}`;

  process.stdout.write(`[${idx}/${refs.size}] ${display.padEnd(20)} `);

  let fetchResult;
  try {
    fetchResult = await rateLimitedFetch(url);
  } catch (err) {
    console.log(`❌ NETWORK ERROR: ${err.message}`);
    results.push({ key, display, status: "error", reason: err.message, url, files });
    continue;
  }

  if (!fetchResult.ok) {
    // 404 = section doesn't exist
    if (fetchResult.status === 404) {
      console.log(`❌ Section not found (HTTP 404)`);
      results.push({ key, display, status: "notfound", url, files });
    } else {
      console.log(`⚠️  HTTP ${fetchResult.status}`);
      results.push({ key, display, status: "httperr", reason: `HTTP ${fetchResult.status}`, url, files });
    }
    continue;
  }

  // Section exists — now check content claims
  const plainText = stripHtml(fetchResult.text);
  const contextWindows = [...(contexts.get(key) || [])].join(" ");

  // Find matching content claims for this law+section
  const matchingClaims = CONTENT_CLAIMS.filter(
    (c) => c.law === law && c.section === section && c.trigger.test(contextWindows)
  );

  if (matchingClaims.length === 0) {
    // No content claim to verify — section existence is enough
    console.log(`✅ Exists`);
    results.push({ key, display, status: "exists", url, files });
    continue;
  }

  // Verify content claims
  let allClaimsVerified = true;
  const claimResults = [];

  for (const claim of matchingClaims) {
    const found = claim.mustFind.some((needle) =>
      plainText.toLowerCase().includes(needle.toLowerCase())
    );
    claimResults.push({ claim, found });
    if (!found) allClaimsVerified = false;
  }

  if (allClaimsVerified) {
    const claimDesc = matchingClaims.map((c) => c.desc).join(", ");
    console.log(`✅ Verified (${claimDesc})`);
    results.push({ key, display, status: "verified", claimResults, url, files });
  } else {
    const failedClaims = claimResults.filter((r) => !r.found);
    const failDesc = failedClaims.map((r) => r.claim.desc).join(", ");
    console.log(`⚠️  Section exists but content unverified: ${failDesc}`);
    results.push({ key, display, status: "contentfail", claimResults, url, files });
  }
}

// ── Step 4: Summary report ────────────────────────────────────────────────────

console.log("\n" + "━".repeat(70));
console.log("VERIFICATION REPORT");
console.log("━".repeat(70));

const verified = results.filter((r) => r.status === "verified");
const exists = results.filter((r) => r.status === "exists");
const contentFail = results.filter((r) => r.status === "contentfail");
const notFound = results.filter((r) => r.status === "notfound");
const errors = results.filter((r) => r.status === "error" || r.status === "httperr");

console.log(`\n✅ Fully verified (content claims passed):    ${verified.length}`);
console.log(`✅ Section exists (no content claim to check): ${exists.length}`);
console.log(`⚠️  Section exists but content unverified:     ${contentFail.length}`);
console.log(`❌ Section not found (HTTP 404):               ${notFound.length}`);
console.log(`❌ Network/HTTP errors:                        ${errors.length}`);
console.log(`\nTotal unique references checked: ${results.length}`);

if (contentFail.length > 0) {
  console.log("\n── Content-unverified details ──────────────────────────────────────");
  for (const r of contentFail) {
    console.log(`\n⚠️  ${r.display}`);
    console.log(`   URL: ${r.url}`);
    for (const cr of r.claimResults) {
      const icon = cr.found ? "  ✅" : "  ⚠️ ";
      console.log(`${icon} ${cr.claim.desc}`);
      if (!cr.found) {
        console.log(`      Expected one of: ${cr.claim.mustFind.join(", ")}`);
      }
    }
    console.log(`   Referenced in: ${[...r.files].join(", ")}`);
  }
}

if (notFound.length > 0) {
  console.log("\n── Not-found details ───────────────────────────────────────────────");
  for (const r of notFound) {
    console.log(`\n❌ ${r.display}`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Referenced in: ${[...r.files].join(", ")}`);
  }
}

if (errors.length > 0) {
  console.log("\n── Error details ───────────────────────────────────────────────────");
  for (const r of errors) {
    console.log(`\n❌ ${r.display} — ${r.reason}`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Referenced in: ${[...r.files].join(", ")}`);
  }
}

console.log("\n" + "━".repeat(70));

const hasFailures = notFound.length > 0 || errors.length > 0;
if (hasFailures) {
  console.log("Result: FAIL — one or more sections could not be verified.\n");
  process.exit(1);
} else {
  console.log("Result: PASS — all referenced sections exist on GII.\n");
  process.exit(0);
}
