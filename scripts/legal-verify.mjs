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

  // ══════════════════════════════════════════════════════════════════
  // EXPANDED CONTENT CLAIMS — derived from source code factual claims
  // ══════════════════════════════════════════════════════════════════

  // ── BGB Allgemeines Schuldrecht ──
  { law: "BGB", section: "241", trigger: /Nebenpflicht|Schutzpflicht|Schuldverhältnis/i, mustFind: ["Schuldner", "Gläubiger", "Pflicht"], desc: "§ 241 BGB — Pflichten aus dem Schuldverhältnis" },
  { law: "BGB", section: "275", trigger: /Unmöglichkeit|unmöglich/i, mustFind: ["Leistung", "unmöglich"], desc: "§ 275 BGB — Ausschluss der Leistungspflicht bei Unmöglichkeit" },
  { law: "BGB", section: "276", trigger: /Verschulden|Vorsatz|Fahrlässigkeit/i, mustFind: ["Vorsatz", "Fahrlässigkeit"], desc: "§ 276 BGB — Verantwortlichkeit des Schuldners" },
  { law: "BGB", section: "278", trigger: /Erfüllungsgehilfe|Verrichtungsgehilfe/i, mustFind: ["Erfüllungsgehilfe", "gesetzlichen Vertreter"], desc: "§ 278 BGB — Haftung für Erfüllungsgehilfen" },
  { law: "BGB", section: "281", trigger: /Fristsetzung|Frist.*Nacherfüllung/i, mustFind: ["Frist"], desc: "§ 281 BGB — Schadensersatz nach Fristsetzung" },
  { law: "BGB", section: "286", trigger: /Schuldnerverzug|Mahnung|Lieferverzug/i, mustFind: ["Schuldner", "Verzug", "Mahnung"], desc: "§ 286 BGB — Verzug des Schuldners" },
  { law: "BGB", section: "288", trigger: /Verzugszinsen|Zinsen/i, mustFind: ["Zinsen", "Verzug"], desc: "§ 288 BGB — Verzugszinsen" },
  { law: "BGB", section: "305", trigger: /AGB|Allgemeine Geschäftsbedingungen/i, mustFind: ["Allgemeine Geschäftsbedingungen", "Bedingungen"], desc: "§ 305 BGB — Einbeziehung von AGB" },
  { law: "BGB", section: "307", trigger: /AGB|Inhaltskontrolle|unangemessen/i, mustFind: ["unangemessen", "benachteiligt"], desc: "§ 307 BGB — Inhaltskontrolle AGB" },
  { law: "BGB", section: "311", trigger: /Schuldverhältnis|Vertragsschluss|culpa in contrahendo/i, mustFind: ["Schuldverhältnis", "Vertrag"], desc: "§ 311 BGB — Rechtsgeschäftliche und rechtsgeschäftsähnliche Schuldverhältnisse" },
  { law: "BGB", section: "313", trigger: /Geschäftsgrundlage|Wegfall|Störung/i, mustFind: ["Geschäftsgrundlage", "Anpassung"], desc: "§ 313 BGB — Störung der Geschäftsgrundlage" },
  { law: "BGB", section: "314", trigger: /Dauerschuldverhältnis|wichtiger Grund/i, mustFind: ["Dauerschuldverhältnis", "wichtigem Grund"], desc: "§ 314 BGB — Kündigung von Dauerschuldverhältnissen" },
  { law: "BGB", section: "323", trigger: /Rücktritt|Nachfrist|Fristsetzung/i, mustFind: ["Frist", "Rücktritt"], desc: "§ 323 BGB — Rücktritt wegen nicht oder nicht vertragsgemäß erbrachter Leistung" },
  { law: "BGB", section: "346", trigger: /Rückgewähr|Rücktritt.*Folgen/i, mustFind: ["Rückgewähr", "herauszugeben"], desc: "§ 346 BGB — Wirkungen des Rücktritts" },
  { law: "BGB", section: "355", trigger: /Widerrufsrecht|14 Tage|Widerruf/i, mustFind: ["Widerruf", "widerrufen"], desc: "§ 355 BGB — Widerrufsrecht bei Verbraucherverträgen" },

  // ── BGB Allgemeiner Teil ──
  { law: "BGB", section: "119", trigger: /Anfechtung|Irrtum/i, mustFind: ["Irrtum", "anfechten", "Anfechtung"], desc: "§ 119 BGB — Anfechtbarkeit wegen Irrtums" },
  { law: "BGB", section: "134", trigger: /Nichtigkeit|gesetzliches Verbot/i, mustFind: ["nichtig", "gesetzliches Verbot"], desc: "§ 134 BGB — Nichtigkeit wegen Gesetzesverstoß" },
  { law: "BGB", section: "138", trigger: /sittenwidrig|Wucher/i, mustFind: ["sittenwidrig", "nichtig"], desc: "§ 138 BGB — Sittenwidriges Rechtsgeschäft / Wucher" },
  { law: "BGB", section: "145", trigger: /Angebot|Antrag|Vertragsschluss/i, mustFind: ["Antrag", "Angebot"], desc: "§ 145 BGB — Bindung an den Antrag" },
  { law: "BGB", section: "164", trigger: /Stellvertretung|Vollmacht|Vertreter/i, mustFind: ["Vertreter", "Vollmacht"], desc: "§ 164 BGB — Wirkung der Willenserklärung des Vertreters" },
  { law: "BGB", section: "186", trigger: /Fristen|Berechnung|Fristenberechnung/i, mustFind: ["Frist"], desc: "§ 186 BGB — Geltungsbereich der Fristenregeln" },
  { law: "BGB", section: "187", trigger: /Fristbeginn|Ereignis|Fristberechnung/i, mustFind: ["Frist", "Tag"], desc: "§ 187 BGB — Fristbeginn" },
  { law: "BGB", section: "188", trigger: /Fristende|Monats|Wochenfrist/i, mustFind: ["Frist"], desc: "§ 188 BGB — Fristende" },
  { law: "BGB", section: "214", trigger: /Verjährung.*Einrede|Erfüllung.*verweigern/i, mustFind: ["Verjährung", "verweigern"], desc: "§ 214 BGB — Wirkung der Verjährung" },

  // ── BGB Kaufrecht (weitere) ──
  { law: "BGB", section: "435", trigger: /Rechtsmangel/i, mustFind: ["Recht", "Dritter", "Mangel"], desc: "§ 435 BGB — Rechtsmangel" },
  { law: "BGB", section: "440", trigger: /Nacherfüllung.*fehlgeschlagen|Nacherfüllung.*unzumutbar/i, mustFind: ["Nacherfüllung", "fehlgeschlagen"], desc: "§ 440 BGB — Besondere Bestimmungen für Rücktritt und Schadensersatz" },
  { law: "BGB", section: "442", trigger: /Kenntnis.*Mangel|Mangel.*bekannt/i, mustFind: ["Mangel", "Kenntnis"], desc: "§ 442 BGB — Kenntnis des Käufers" },
  { law: "BGB", section: "443", trigger: /Garantie|Haltbarkeitsgarantie/i, mustFind: ["Garantie"], desc: "§ 443 BGB — Garantie" },
  { law: "BGB", section: "475", trigger: /Verbrauchsgüterkauf.*Abdingbarkeit|Gebrauchtwagen/i, mustFind: ["Verbraucher", "Unternehmer"], desc: "§ 475 BGB — Anwendung auf den Verbrauchsgüterkauf" },
  { law: "BGB", section: "478", trigger: /Lieferantenregress|Regress/i, mustFind: ["Lieferkette", "Verkäufer", "Regress"], desc: "§ 478 BGB — Rückgriff des Unternehmers" },

  // ── BGB Mietrecht (weitere) ──
  { law: "BGB", section: "536a", trigger: /Schadensersatz.*Vermieter|Mietmangel.*Verschulden/i, mustFind: ["Schadensersatz", "Vermieter"], desc: "§ 536a BGB — Schadensersatzpflicht des Vermieters wegen Mängel" },
  { law: "BGB", section: "536c", trigger: /Anzeigepflicht.*Mieter|Mangel.*anzeigen/i, mustFind: ["Anzeige", "Mieter", "Mangel"], desc: "§ 536c BGB — Während der Mietzeit auftretende Mängel" },
  { law: "BGB", section: "550", trigger: /Schriftform.*Mietvertrag|langfristig.*Miete/i, mustFind: ["Schriftform", "Mietvertrag"], desc: "§ 550 BGB — Schriftform des Mietvertrags" },
  { law: "BGB", section: "551", trigger: /Mietkaution|Kaution/i, mustFind: ["Sicherheit", "Kaution", "Mieter"], desc: "§ 551 BGB — Begrenzung und Anlage von Mietsicherheiten" },
  { law: "BGB", section: "556", trigger: /Nebenkosten|Betriebskosten/i, mustFind: ["Betriebskosten", "Nebenkosten"], desc: "§ 556 BGB — Vereinbarungen über Betriebskosten" },
  { law: "BGB", section: "557a", trigger: /Staffelmiete/i, mustFind: ["Miete", "Erhöhung"], desc: "§ 557a BGB — Staffelmiete" },
  { law: "BGB", section: "557b", trigger: /Indexmiete/i, mustFind: ["Miete", "Index"], desc: "§ 557b BGB — Indexmiete" },
  { law: "BGB", section: "558", trigger: /Mieterhöhung|Vergleichsmiete/i, mustFind: ["Miete", "Vergleich", "Erhöhung"], desc: "§ 558 BGB — Mieterhöhung bis zur ortsüblichen Vergleichsmiete" },
  { law: "BGB", section: "568", trigger: /Schriftform.*Kündigung.*Miete|Kündigungsform/i, mustFind: ["Schriftform", "Kündigung"], desc: "§ 568 BGB — Schriftform der Kündigung" },
  { law: "BGB", section: "574", trigger: /Härteklausel|Widerspruch.*Kündigung|soziale Härte/i, mustFind: ["Widerspruch", "Härt"], desc: "§ 574 BGB — Widerspruch des Mieters gegen die Kündigung" },
  { law: "BGB", section: "574b", trigger: /Widerspruch.*Monate.*Kündigung|2 Monate.*Kündigung/i, mustFind: ["Widerspruch", "Monat"], desc: "§ 574b BGB — Form und Frist des Widerspruchs" },

  // ── BGB Arbeitsrecht ──
  { law: "BGB", section: "611", trigger: /Dienstvertrag|Dienste/i, mustFind: ["Dienste", "Dienstvertrag"], desc: "§ 611 BGB — Vertragstypische Pflichten beim Dienstvertrag" },
  { law: "BGB", section: "611a", trigger: /Arbeitsvertrag|Arbeitnehmer/i, mustFind: ["Arbeitnehmer", "Arbeitgeber"], desc: "§ 611a BGB — Arbeitsvertrag" },
  { law: "BGB", section: "622", trigger: /Kündigungsfrist.*Arbeit|Arbeit.*Kündigung.*Frist/i, mustFind: ["Kündigungsfrist", "Wochen"], desc: "§ 622 BGB — Kündigungsfristen bei Arbeitsverhältnissen" },
  { law: "BGB", section: "623", trigger: /Schriftform.*Kündigung.*Arbeit/i, mustFind: ["Schriftform", "unwirksam"], desc: "§ 623 BGB — Schriftform der Kündigung im Arbeitsrecht" },

  // ── BGB Deliktsrecht (weitere) ──
  { law: "BGB", section: "826", trigger: /sittenwidrig.*Schaden|vorsätzlich.*sittenwidrig/i, mustFind: ["Vorsatz", "sittenwidrig"], desc: "§ 826 BGB — Sittenwidrige vorsätzliche Schädigung" },
  { law: "BGB", section: "831", trigger: /Verrichtungsgehilfe|Haftung.*Gehilfe/i, mustFind: ["Verrichtungsgehilfe", "Schaden"], desc: "§ 831 BGB — Haftung für den Verrichtungsgehilfen" },

  // ── BGB Bereicherungsrecht (weitere) ──
  { law: "BGB", section: "818", trigger: /Herausgabe.*Bereicherung|Bereicherung.*Herausgabe/i, mustFind: ["herauszugeben", "Bereicherung"], desc: "§ 818 BGB — Umfang des Bereicherungsanspruchs" },

  // ── BGB Erbrecht ──
  { law: "BGB", section: "1922", trigger: /Erbfolge|Erbschaft|Nachlass/i, mustFind: ["Erbfolge", "Erbe", "Nachlass"], desc: "§ 1922 BGB — Gesetzliche Erbfolge" },
  { law: "BGB", section: "2229", trigger: /Testament|Testierfähigkeit/i, mustFind: ["Testament", "testieren"], desc: "§ 2229 BGB — Testierfähigkeit" },
  { law: "BGB", section: "2303", trigger: /Pflichtteil/i, mustFind: ["Pflichtteil"], desc: "§ 2303 BGB — Pflichtteilsberechtigte" },

  // ── BGB Sachenrecht ──
  { law: "BGB", section: "903", trigger: /Eigentum|Eigentumsrecht/i, mustFind: ["Eigentümer", "Eigentum"], desc: "§ 903 BGB — Befugnisse des Eigentümers" },
  { law: "BGB", section: "929", trigger: /Eigentumsübertragung|Übereignung/i, mustFind: ["Eigentum", "Übergabe"], desc: "§ 929 BGB — Einigung und Übergabe" },
  { law: "BGB", section: "985", trigger: /Herausgabeanspruch|Eigentumsherausgabe/i, mustFind: ["Herausgabe", "Eigentümer"], desc: "§ 985 BGB — Herausgabeanspruch des Eigentümers" },

  // ── BGB Werkvertrag ──
  { law: "BGB", section: "631", trigger: /Werkvertrag|Herstellung|Handwerker/i, mustFind: ["Werk", "Vergütung"], desc: "§ 631 BGB — Vertragstypische Pflichten beim Werkvertrag" },
  { law: "BGB", section: "634", trigger: /Werkmangel|Nacherfüllung.*Werk/i, mustFind: ["Mangel", "Nacherfüllung"], desc: "§ 634 BGB — Rechte des Bestellers bei Mängeln" },

  // ── BGB Darlehen / Bürgschaft ──
  { law: "BGB", section: "488", trigger: /Darlehen|Kredit|Darlehensvertrag/i, mustFind: ["Darlehen", "Zinsen"], desc: "§ 488 BGB — Vertragstypische Pflichten beim Darlehensvertrag" },
  { law: "BGB", section: "765", trigger: /Bürgschaft/i, mustFind: ["Bürgschaft", "Bürge"], desc: "§ 765 BGB — Vertragstypische Pflichten bei der Bürgschaft" },

  // ── ZPO (weitere) ──
  { law: "ZPO", section: "253", trigger: /Klage|Klageschrift|Klageerhebung/i, mustFind: ["Klageschrift", "Klage"], desc: "§ 253 ZPO — Klageschrift" },
  { law: "ZPO", section: "276", trigger: /Klageerwiderung/i, mustFind: ["Klageerwiderung", "Frist"], desc: "§ 276 ZPO — Klageerwiderung" },
  { law: "ZPO", section: "292", trigger: /Beweislast|Vermutung/i, mustFind: ["Beweislast", "Vermutung"], desc: "§ 292 ZPO — Beweis des Gegenteils" },
  { law: "ZPO", section: "511", trigger: /Berufung.*zulässig/i, mustFind: ["Berufung"], desc: "§ 511 ZPO — Statthaftigkeit der Berufung" },
  { law: "ZPO", section: "544", trigger: /Nichtzulassungsbeschwerde/i, mustFind: ["Revision", "Zulassung", "Beschwerde"], desc: "§ 544 ZPO — Nichtzulassungsbeschwerde" },
  { law: "ZPO", section: "551", trigger: /Revisionsbegründung/i, mustFind: ["Revision", "Begründung"], desc: "§ 551 ZPO — Revisionsbegründung" },
  { law: "ZPO", section: "688", trigger: /Mahnverfahren|Mahnbescheid/i, mustFind: ["Mahnbescheid", "Mahnung"], desc: "§ 688 ZPO — Zulässigkeit des Mahnverfahrens" },
  { law: "ZPO", section: "704", trigger: /Vollstreckungstitel|Zwangsvollstreckung/i, mustFind: ["Vollstreckung", "Urteil"], desc: "§ 704 ZPO — Vollstreckbare Endurteile" },
  { law: "ZPO", section: "78", trigger: /Anwaltszwang|Rechtsanwalt.*Pflicht/i, mustFind: ["Rechtsanwalt", "vertreten"], desc: "§ 78 ZPO — Anwaltsprozess" },

  // ── BetrVG ──
  { law: "BetrVG", section: "1", trigger: /Betriebsrat/i, mustFind: ["Betriebsrat", "Betrieb"], desc: "§ 1 BetrVG — Errichtung von Betriebsräten" },
  { law: "BetrVG", section: "102", trigger: /Betriebsrat.*Anhörung|Kündigung.*Betriebsrat/i, mustFind: ["Betriebsrat", "Kündigung", "Anhörung"], desc: "§ 102 BetrVG — Mitbestimmung bei Kündigungen" },

  // ── BUrlG ──
  { law: "BUrlG", section: "1", trigger: /Urlaubsanspruch|Urlaub/i, mustFind: ["Urlaub", "Erholung"], desc: "§ 1 BUrlG — Urlaubsanspruch" },
  { law: "BUrlG", section: "3", trigger: /Mindesturlaub|24 Werktage/i, mustFind: ["Werktage", "Urlaub"], desc: "§ 3 BUrlG — Dauer des Urlaubs" },
  { law: "BUrlG", section: "7", trigger: /Urlaubsabgeltung|Urlaubsgewährung|Verfall.*Urlaub/i, mustFind: ["Urlaub", "Abgeltung"], desc: "§ 7 BUrlG — Zeitpunkt, Übertragbarkeit und Abgeltung des Urlaubs" },

  // ── ArbZG ──
  { law: "ArbZG", section: "3", trigger: /Arbeitszeit.*Maximum|8 Stunden/i, mustFind: ["Stunden", "Arbeitnehmer"], desc: "§ 3 ArbZG — Arbeitszeit der Arbeitnehmer" },

  // ── KSchG (weitere) ──
  { law: "KSchG", section: "7", trigger: /Kündigungsfiktion|gilt als wirksam/i, mustFind: ["wirksam", "Frist"], desc: "§ 7 KSchG — Wirksamwerden der Kündigung" },
  { law: "KSchG", section: "17", trigger: /Massenentlassung/i, mustFind: ["Massenentlassung", "Arbeitnehmer"], desc: "§ 17 KSchG — Anzeigepflicht bei Massenentlassung" },

  // ── GVG ──
  { law: "GVG", section: "23", trigger: /Amtsgericht.*Zuständigkeit|Streitwert.*5000/i, mustFind: ["Amtsgericht", "Zuständigkeit"], desc: "§ 23 GVG — Zuständigkeit des Amtsgerichts" },

  // ── StGB (weitere) ──
  { law: "StGB", section: "242", trigger: /Diebstahl|gestohlen/i, mustFind: ["Diebstahl", "Wegnahme"], desc: "§ 242 StGB — Diebstahl" },
  { law: "StGB", section: "223", trigger: /Körperverletzung.*Straf/i, mustFind: ["Körperverletzung"], desc: "§ 223 StGB — Körperverletzung" },
  { law: "StGB", section: "185", trigger: /Beleidigung/i, mustFind: ["Beleidigung"], desc: "§ 185 StGB — Beleidigung" },

  // ── GmbHG ──
  { law: "GmbHG", section: "1", trigger: /GmbH.*Gründung|Gesellschaft.*beschränkter Haftung/i, mustFind: ["Gesellschaft", "Haftung"], desc: "§ 1 GmbHG — Zweck der GmbH" },
  { law: "GmbHG", section: "5", trigger: /Stammkapital|25000/i, mustFind: ["Stammkapital"], desc: "§ 5 GmbHG — Stammkapital" },
  { law: "GmbHG", section: "13", trigger: /juristische Person|Haftung.*GmbH/i, mustFind: ["Gesellschaft", "Haftung"], desc: "§ 13 GmbHG — Juristische Person" },
  { law: "GmbHG", section: "30", trigger: /Kapitalerhaltung|Stammkapital.*Auszahlung/i, mustFind: ["Stammkapital", "Gläubiger"], desc: "§ 30 GmbHG — Kapitalerhaltung" },

  // ── InsO ──
  { law: "InsO", section: "1", trigger: /Insolvenz|Zweck.*Insolvenz/i, mustFind: ["Insolvenz", "Gläubiger"], desc: "§ 1 InsO — Ziele des Insolvenzverfahrens" },

  // ── HGB ──
  { law: "HGB", section: "377", trigger: /Mängelrüge.*Handelskauf|Untersuchungspflicht/i, mustFind: ["Mängel", "Rüge", "Käufer"], desc: "§ 377 HGB — Untersuchungs- und Rügepflicht" },

  // ── GWB ──
  { law: "GWB", section: "1", trigger: /Kartell|Wettbewerbsverbot/i, mustFind: ["Kartell", "Wettbewerb"], desc: "§ 1 GWB — Verbot von Wettbewerbsbeschränkungen" },

  // ── UWG ──
  { law: "UWG", section: "1", trigger: /unlauterer Wettbewerb|Wettbewerb.*Schutz/i, mustFind: ["Wettbewerb", "Mitbewerber"], desc: "§ 1 UWG — Zweck des UWG" },

  // ── VwVfG ──
  { law: "VwVfG", section: "35", trigger: /Verwaltungsakt/i, mustFind: ["Verwaltungsakt", "Behörde"], desc: "§ 35 VwVfG — Begriff des Verwaltungsakts" },

  // ── VwGO (weitere) ──
  { law: "VwGO", section: "58", trigger: /Rechtsmittelbelehrung|ohne Belehrung/i, mustFind: ["Belehrung", "Frist"], desc: "§ 58 VwGO — Beginn der Klagefrist ohne Rechtsmittelbelehrung" },

  // ── AGG ──
  { law: "AGG", section: "1", trigger: /Diskriminierung|Benachteiligung.*AGG/i, mustFind: ["Benachteiligung", "Diskriminierung"], desc: "§ 1 AGG — Ziel des AGG" },

  // ── MuSchG ──
  { law: "MuSchG", section: "17", trigger: /Mutterschutz.*Kündigung|Kündigungsverbot.*Schwangerschaft/i, mustFind: ["Kündigung", "Schwangerschaft"], desc: "§ 17 MuSchG — Kündigungsverbot" },
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

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const GII_USER_AGENT = "german-law-mcp/legal-verify (+legal-verify.mjs)";

function abortError() {
  return new DOMException("Request aborted", "AbortError");
}

function isAbortLikeError(error) {
  return error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError");
}

function withTimeoutSignal(signal, timeoutMs) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

function sleep(ms, signal) {
  if (signal?.aborted) {
    return Promise.reject(abortError());
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeout);
      reject(abortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchWithRetry(url, init = {}, options = {}) {
  const retries = options.retries ?? 1;
  const backoffMs = options.backoffMs ?? 300;
  const timeoutMs = options.timeoutMs ?? 15_000;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (init.signal?.aborted) {
      throw abortError();
    }

    try {
      const response = await fetch(url, {
        ...init,
        signal: withTimeoutSignal(init.signal, timeoutMs),
      });

      if (!RETRYABLE_STATUS.has(response.status) || attempt === retries) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (isAbortLikeError(error) || attempt === retries) {
        throw error;
      }
    }

    await sleep(backoffMs * 2 ** attempt, init.signal);
  }

  throw lastError ?? new Error(`Request failed: ${url}`);
}

async function fetchGii(url) {
  const res = await fetchWithRetry(
    url,
    { headers: { "User-Agent": GII_USER_AGENT } },
    { timeoutMs: 15_000, retries: 1, backoffMs: 500 },
  );
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
