/**
 * Legal Concept Map — 독일 법률 개념 → 조문 매핑
 *
 * NeuRIS 키워드 검색이 실패할 때 대체 검색 경로로 사용.
 * 법률 용어/개념을 구체적 Norm에 매핑하여 "Sachmangel" → "§ 434 BGB" 연결.
 */

export interface ConceptEntry {
  keywords: string[];
  norm: string;
  description: string;
  category: string;
}

export interface ConceptMatch {
  entry: ConceptEntry;
  score: number;
  matchedKeyword: string;
}

const CONCEPT_MAP: ConceptEntry[] = [
  // ═══ Kaufrecht (§§ 433-479 BGB) ═══
  { keywords: ["sachmangel", "mangelhaft", "mangel der sache", "fehler haftigkeit"], norm: "§ 434 BGB", description: "Sachmangel-Begriffsbestimmung", category: "Kaufrecht" },
  { keywords: ["rechtsmangel", "fremdes recht", "im grundbuch eingetragen"], norm: "§ 435 BGB", description: "Rechtsmangel", category: "Kaufrecht" },
  { keywords: ["gewährleistung", "rechte bei mängeln", "mängelrechte"], norm: "§ 437 BGB", description: "Rechte des Käufers bei Mängeln", category: "Kaufrecht" },
  { keywords: ["nacherfüllung", "nachbesserung", "ersatzlieferung", "reparatur", "nachlieferung"], norm: "§ 439 BGB", description: "Nacherfüllung (Reparatur oder Ersatzlieferung)", category: "Kaufrecht" },
  { keywords: ["rücktritt", "rückgabe", "kaufpreis zurück", "vom vertrag zurück"], norm: "§ 437 Nr. 2 i.V.m. § 323 BGB", description: "Rücktrittsrecht wegen Sachmangel", category: "Kaufrecht" },
  { keywords: ["minderung", "preisnachlass", "kaufpreis herabsetzen"], norm: "§ 441 BGB", description: "Minderung des Kaufpreises", category: "Kaufrecht" },
  { keywords: ["schadensersatz statt der leistung", "schadensersatz wegen mangel"], norm: "§ 437 Nr. 3 i.V.m. §§ 280, 281 BGB", description: "Schadensersatz statt der Leistung", category: "Kaufrecht" },
  { keywords: ["verjährung gewährleistung", "gewährleistungsfrist", "verjährung mangel"], norm: "§ 438 BGB", description: "Verjährung der Mängelansprüche", category: "Kaufrecht" },
  { keywords: ["beweislastumkehr", "vermutung mangel", "mangel vermutet", "beweislast käufer"], norm: "§ 477 Abs. 1 BGB", description: "Beweislastumkehr beim Verbrauchsgüterkauf (1 Jahr)", category: "Kaufrecht" },
  { keywords: ["verbrauchsgüterkauf", "verbraucher kauft", "händler käufer", "unternehmer verbraucher"], norm: "§ 474 BGB", description: "Verbrauchsgüterkauf — Anwendungsbereich", category: "Kaufrecht" },
  { keywords: ["arglist", "arglistig verschwiegen", "täuschung verkäufer", "absichtlich mangel"], norm: "§ 444 BGB", description: "Ausschluss bei arglistigem Verschweigen", category: "Kaufrecht" },
  { keywords: ["beschaffenheit", "eigenschaft", "vereinbarung qualität", "soll-beschaffenheit"], norm: "§ 434 Abs. 1 S. 1 BGB", description: "Beschaffenheitsvereinbarung", category: "Kaufrecht" },
  { keywords: ["montageanleitung", "einbauanleitung", "aufbauanleitung", "fehlerhafte anleitung"], norm: "§ 434 Abs. 2 BGB", description: "Montagemangel", category: "Kaufrecht" },
  { keywords: ["aliud", "falsche ware", "andere sache", "nicht bestellte ware"], norm: "§ 434 Abs. 3 BGB", description: "Aliud-Lieferung als Sachmangel", category: "Kaufrecht" },
  { keywords: ["garantie", "herstellergarantie", "haltbarkeitsgarantie"], norm: "§ 443 BGB", description: "Garantie", category: "Kaufrecht" },
  { keywords: ["gebrauchtwagen", "gebraucht kauf", "gebrauchtwaren"], norm: "§ 475 Abs. 2 BGB", description: "Gebrauchtwagenkauf — Gewährleistungsbeschränkung möglich", category: "Kaufrecht" },
  { keywords: ["kaufvertrag", "kauf", "verkauf", "käufer", "verkäufer", "kaufen"], norm: "§ 433 BGB", description: "Kaufvertrag — Pflichten von Käufer und Verkäufer", category: "Kaufrecht" },
  { keywords: ["kaufpreis", "preis", "bezahlung", "zahlungspflicht"], norm: "§ 433 Abs. 2 BGB", description: "Kaufpreiszahlungspflicht", category: "Kaufrecht" },
  { keywords: ["gefahrübergang", "versand", "lieferung", "übergabe"], norm: "§ 446 BGB", description: "Gefahrübergang", category: "Kaufrecht" },
  { keywords: ["fernabsatz", "online kauf", "internet kauf", "versandhandel", "e-commerce"], norm: "§ 312c BGB", description: "Fernabsatzvertrag", category: "Kaufrecht" },
  { keywords: ["widerruf online", "14 tage widerruf", "widerrufsrecht online"], norm: "§ 355 BGB", description: "Widerrufsrecht bei Fernabsatz", category: "Kaufrecht" },
  { keywords: ["lieferverzug", "nicht geliefert", "spätlieferung", "lieferfrist"], norm: "§ 286 BGB", description: "Lieferverzug", category: "Kaufrecht" },
  { keywords: ["nachfrist", "fristsetzung nacherfüllung", "fristsetzung reparatur"], norm: "§ 323 Abs. 1 BGB", description: "Nachfristsetzung vor Rücktritt", category: "Kaufrecht" },
  { keywords: ["unerheblicher mangel", "geringfügig", "unbedeutend"], norm: "§ 323 Abs. 5 S. 2 BGB", description: "Unerheblichkeit — Rücktritt ausgeschlossen", category: "Kaufrecht" },
  { keywords: ["regress", "lieferanten regress", "rückgriff"], norm: "§ 478 BGB", description: "Lieferantenregress", category: "Kaufrecht" },

  // ═══ Mietrecht (§§ 535-580a BGB) ═══
  { keywords: ["mietvertrag", "miete", "mieter", "vermieter", "mietverhältnis"], norm: "§ 535 BGB", description: "Mietvertrag — Pflichten", category: "Mietrecht" },
  { keywords: ["mietminderung", "minderung miete", "miete kürzen", "wohnung mangel"], norm: "§ 536 BGB", description: "Mietminderung bei Mangel", category: "Mietrecht" },
  { keywords: ["ordentliche kündigung miete", "kündigung wohnung", "kündigungsfrist miete"], norm: "§ 573 BGB", description: "Ordentliche Kündigung des Vermieters", category: "Mietrecht" },
  { keywords: ["fristlose kündigung miete", "außerordentliche kündigung miete", "sofort kündigen wohnung"], norm: "§ 543 BGB", description: "Außerordentliche Kündigung Mietvertrag", category: "Mietrecht" },
  { keywords: ["schönheitsreparaturen", "malern", "renovierung", "tapeten"], norm: "§ 535 Abs. 1 BGB", description: "Schönheitsreparaturen", category: "Mietrecht" },
  { keywords: ["kaution", "mietkaution", "bürgschaft miete", "kautionskonto"], norm: "§ 551 BGB", description: "Mietkaution", category: "Mietrecht" },
  { keywords: ["mieterhöhung", "miete erhöhen", "vergleichsmiete"], norm: "§ 558 BGB", description: "Mieterhöhung bis zur ortsüblichen Vergleichsmiete", category: "Mietrecht" },
  { keywords: ["mietpreisbremse", "mietendeckel", "preisbindung"], norm: "§ 556d BGB", description: "Mietpreisbremse", category: "Mietrecht" },
  { keywords: ["nebenkosten", "betriebskosten", "heizkosten", "abrechnung miete"], norm: "§ 556 BGB", description: "Nebenkosten/Betriebskosten", category: "Mietrecht" },
  { keywords: ["härteklausel", "widerspruch kündigung", "sozialklausel"], norm: "§ 574 BGB", description: "Widerspruch gegen Kündigung (Härtefall)", category: "Mietrecht" },
  { keywords: ["mietrückstand", "miete nicht gezahlt", "miet schulden"], norm: "§ 543 Abs. 2 Nr. 3 BGB", description: "Fristlose Kündigung bei Mietrückstand", category: "Mietrecht" },
  { keywords: ["eigennutzung", "eigenbedarf", "eigene nutzung"], norm: "§ 573 Abs. 2 Nr. 2 BGB", description: "Eigenbedarfskündigung", category: "Mietrecht" },
  { keywords: ["staffelmiete", "gestaffelte miete"], norm: "§ 557a BGB", description: "Staffelmiete", category: "Mietrecht" },
  { keywords: ["indexmiete"], norm: "§ 557b BGB", description: "Indexmiete", category: "Mietrecht" },
  { keywords: ["schriftform mietvertrag", "form miete"], norm: "§ 550 BGB", description: "Schriftform bei langfristigen Mietverträgen", category: "Mietrecht" },

  // ═══ Arbeitsrecht ═══
  { keywords: ["kündigungsschutz", "soziale rechtfertigung", "unwirksame kündigung"], norm: "§ 1 KSchG", description: "Kündigungsschutz — soziale Rechtfertigung", category: "Arbeitsrecht" },
  { keywords: ["fristlose kündigung arbeit", "außerordentliche kündigung arbeit", "sofort entlassen"], norm: "§ 626 BGB", description: "Außerordentliche Kündigung Arbeitsverhältnis", category: "Arbeitsrecht" },
  { keywords: ["kündigungsschutzklage", "3 wochen frist", "klage arbeitsgericht"], norm: "§ 4 KSchG", description: "Kündigungsschutzklage — 3-Wochen-Frist", category: "Arbeitsrecht" },
  { keywords: ["abmahnung arbeit", "verwarnung", "ermahnung"], norm: "§ 626 Abs. 1 BGB", description: "Abmahnung als Voraussetzung", category: "Arbeitsrecht" },
  { keywords: ["weiterbeschäftigung", "weiter beschäftigen"], norm: "§ 102 Abs. 4 BetrVG", description: "Weiterbeschäftigungsanspruch", category: "Arbeitsrecht" },
  { keywords: ["massenentlassung", "betriebsbedingte kündigung", "abbau"], norm: "§ 17 KSchG", description: "Massenentlassungsanzeige", category: "Arbeitsrecht" },
  { keywords: ["urlaub", "urlaubsanspruch", "resturlaub", "urlaubsabgeltung"], norm: "§ 1 BUrlG", description: "Urlaubsanspruch", category: "Arbeitsrecht" },
  { keywords: ["überstunden", "mehrarbeit", "ausgleich"], norm: "§ 611a BGB / ArbZG", description: "Überstunden", category: "Arbeitsrecht" },
  { keywords: ["arbeitsvertrag", "arbeitnehmer", "arbeitgeber", "arbeitsverhältnis", "dienstvertrag"], norm: "§ 611a BGB", description: "Arbeitsvertrag", category: "Arbeitsrecht" },
  { keywords: ["probezeit", "probearbeit", "kündigung probezeit"], norm: "§ 622 Abs. 3 BGB", description: "Kündigungsfrist in Probezeit (2 Wochen)", category: "Arbeitsrecht" },
  { keywords: ["kuendigungsfrist arbeit", "frist kündigung arbeit", "ordentliche kündigung arbeit"], norm: "§ 622 BGB", description: "Kündigungsfristen im Arbeitsrecht", category: "Arbeitsrecht" },
  { keywords: ["mutterschutz", "schwangerschaft kündigung", "elternzeit"], norm: "§ 17 MuSchG", description: "Kündigungsverbot während Schwangerschaft", category: "Arbeitsrecht" },
  { keywords: ["zeitarbeit", "leiharbeit", "überlassung"], norm: "§ 1 AÜG", description: "Arbeitnehmerüberlassung", category: "Arbeitsrecht" },
  { keywords: ["betrriebsrat", "mitbestimmung", "personalrat"], norm: "§ 1 BetrVG", description: "Betriebsverfassungsgesetz", category: "Arbeitsrecht" },
  { keywords: ["abfindung", "aufhebungsvertrag", "auflösungsvertrag"], norm: "§ 9 KSchG / § 1a KSchG", description: "Abfindung", category: "Arbeitsrecht" },

  // ═══ Schuldrecht AT ═══
  { keywords: ["pflichtverletzung", "vertragsbruch", "schuldner pflicht"], norm: "§ 280 BGB", description: "Schadensersatz wegen Pflichtverletzung", category: "Schuldrecht AT" },
  { keywords: ["vertretenmüssen", "verschulden", "vorsatz fahrlässigkeit", "fahrlässig"], norm: "§ 276 BGB", description: "Vertretenmüssen", category: "Schuldrecht AT" },
  { keywords: ["unmöglichkeit", "nicht erbringbar", "leistung unmöglich"], norm: "§ 275 BGB", description: "Unmöglichkeit der Leistung", category: "Schuldrecht AT" },
  { keywords: ["verzug", "schuldnerverzug", "zahlungsrückstand", "mahnung"], norm: "§ 280 Abs. 2, § 286 BGB", description: "Verzug", category: "Schuldrecht AT" },
  { keywords: ["rücktritt vertrag", "vom vertrag zurück", "rückabwicklung"], norm: "§ 323 BGB", description: "Rücktritt vom Vertrag", category: "Schuldrecht AT" },
  { keywords: ["rückgewähr", "zurückgeben", "rückgabe kaufpreis"], norm: "§ 346 BGB", description: "Rückgewähr nach Rücktritt", category: "Schuldrecht AT" },
  { keywords: ["stellvertretung", "vertreter", "vollmacht", "bevollmächtigung"], norm: "§ 164 BGB", description: "Stellvertretung", category: "Schuldrecht AT" },
  { keywords: ["anfechtung", "irrtum", "täuschung", "bedrohung", "anfechten"], norm: "§ 119 BGB", description: "Anfechtung wegen Irrtum/Täuschung", category: "Schuldrecht AT" },
  { keywords: ["sittenwidrig", "wucher", "gegen die guten sitten", "übervorteilung"], norm: "§ 138 BGB", description: "Sittenwidrigkeit / Wucher", category: "Schuldrecht AT" },
  { keywords: ["nichtigkeit", "nichtig", "rechtsgeschäft unwirksam"], norm: "§ 134 BGB", description: "Nichtigkeit bei Gesetzesverstoß", category: "Schuldrecht AT" },
  { keywords: ["schadensersatz", "ersatz", "schaden", "entschädigung"], norm: "§ 249 BGB", description: "Art und Umfang des Schadensersatzes", category: "Schuldrecht AT" },
  { keywords: ["mitverschulden", "mitverursachung", "eigenverschulden"], norm: "§ 254 BGB", description: "Mitverschulden", category: "Schuldrecht AT" },
  { keywords: ["ungerechtfertigte bereicherung", "bereicherungsrecht", "zurückfordern", "ohne grund"], norm: "§ 812 BGB", description: "Ungerechtfertigte Bereicherung", category: "Schuldrecht AT" },
  { keywords: ["verjährung", "frist abgelaufen", "verjährt", "frist", "anspruch verjährt"], norm: "§ 195 BGB", description: "Regelverjährung 3 Jahre", category: "Schuldrecht AT" },
  { keywords: ["hemmung verjährung", "verjährung gestoppt", "verjährung ruht"], norm: "§ 203 ff. BGB", description: "Hemmung der Verjährung", category: "Schuldrecht AT" },

  // ═══ Deliktsrecht ═══
  { keywords: ["eigentumsverletzung", "sache beschädigt", "sachbeschädigung", "eigentum verletzt"], norm: "§ 823 Abs. 1 BGB", description: "Deliktischer Schadensersatz — Eigentumsverletzung", category: "Deliktsrecht" },
  { keywords: ["körperverletzung", "gesundheitsschaden", "verletzung körper", "unfall verletzung"], norm: "§ 823 Abs. 1 BGB", description: "Deliktischer Schadensersatz — Körperverletzung", category: "Deliktsrecht" },
  { keywords: ["schmerzensgeld", "immaterieller schaden", "schmerzengeld"], norm: "§ 253 Abs. 2 BGB", description: "Schmerzensgeld", category: "Deliktsrecht" },
  { keywords: ["gefährdungshaftung", "autounfall", "kfz haftung", "halter haftung"], norm: "§ 7 StVG", description: "Gefährdungshaftung im Straßenverkehr", category: "Deliktsrecht" },
  { keywords: ["produkthaftung", "produktfehler", "hersteller haftung"], norm: "§ 1 ProdHaftG", description: "Produkthaftungsgesetz", category: "Deliktsrecht" },
  { keywords: ["betrug", "täuschung absicht", "betrügerisch", "irreführung"], norm: "§ 263 StGB", description: "Betrug (Strafrecht + zivil § 823 Abs. 2)", category: "Deliktsrecht" },
  { keywords: ["diebstahl", "gestohlen", "entwendung"], norm: "§ 242 StGB", description: "Diebstahl", category: "Deliktsrecht" },
  { keywords: ["beleidigung", "verleumdung", "üble nachrede", "rufmord"], norm: "§§ 185-187 StGB", description: "Beleidigung/Verleumdung", category: "Deliktsrecht" },
  { keywords: ["verkehrspflicht", "verkehrssicherungspflicht", "organisationspflicht"], norm: "§ 823 Abs. 1 BGB (Rspr.)", description: "Verkehrssicherungspflicht", category: "Deliktsrecht" },
  { keywords: ["haftung mitarbeiter", "organisationshaftung", "vicarious liability"], norm: "§ 831 BGB", description: "Haftung für Verrichtungsgehilfen", category: "Deliktsrecht" },

  // ═══ Vertragsrecht AT ═══
  { keywords: ["angebot vertrag", "antrag", "willenserklärung"], norm: "§ 145 BGB", description: "Bindung an Angebot", category: "Vertragsrecht" },
  { keywords: ["annahme", "zusages", "akzeptanz vertrag"], norm: "§ 146 BGB", description: "Annahme", category: "Vertragsrecht" },
  { keywords: ["agb", "allgemeine geschäftsbedingungen", "standardbedingungen", "klauseln"], norm: "§ 307 BGB", description: "Inhaltskontrolle AGB", category: "Vertragsrecht" },
  { keywords: ["verbrauchervertrag", "verbraucher unternehmer", "b2c"], norm: "§ 310 Abs. 3 BGB", description: "Verbraucherverträge", category: "Vertragsrecht" },
  { keywords: ["werkvertrag", "handwerker", "bauleistung", "herstellung"], norm: "§ 631 BGB", description: "Werkvertrag", category: "Vertragsrecht" },
  { keywords: ["dienstvertrag", "dienstleistung", "beratervertrag"], norm: "§ 611 BGB", description: "Dienstvertrag", category: "Vertragsrecht" },
  { keywords: ["darlehensvertrag", "kredit", "darlehen", "zins"], norm: "§ 488 BGB", description: "Darlehensvertrag", category: "Vertragsrecht" },
  { keywords: ["bürgschaft", "bürgschaftserklärung", "garantie"], norm: "§ 765 BGB", description: "Bürgschaft", category: "Vertragsrecht" },

  // ═══ Datenschutz ═══
  { keywords: ["dsgvo auskunft", "auskunft personenbezogene daten", "auskunftsrecht"], norm: "Art. 15 DSGVO", description: "Auskunftsrecht", category: "Datenschutz" },
  { keywords: ["dsgvo löschung", "recht auf vergessen", "löschung daten", "löschantrag"], norm: "Art. 17 DSGVO", description: "Recht auf Löschung", category: "Datenschutz" },
  { keywords: ["datenpanne", "datenleck", "datenschutzverletzung", "sicherheitsverletzung"], norm: "Art. 33 DSGVO", description: "Meldepflicht bei Datenpanne", category: "Datenschutz" },
  { keywords: ["datenschutz schadensersatz", "dsgvo entschädigung"], norm: "Art. 82 DSGVO", description: "Schadensersatz bei DSGVO-Verstoß", category: "Datenschutz" },
  { keywords: ["einwilligung", "consent", "zustimmung daten"], norm: "Art. 6 Abs. 1 S. 1 lit. a DSGVO", description: "Einwilligung als Rechtsgrundlage", category: "Datenschutz" },
  { keywords: ["auftragsverarbeitung", "avv", "datenverarbeiter"], norm: "Art. 28 DSGVO", description: "Auftragsverarbeitungsvertrag", category: "Datenschutz" },

  // ═══ Erbrecht ═══
  { keywords: ["testament", "letztwillige verfügung", "eigenhändig", "erbe einsetzen"], norm: "§ 2229 BGB", description: "Testamentserrichtung", category: "Erbrecht" },
  { keywords: ["pflichtteil", "pflichtteilsberechtigt", "pflichtteilsanspruch"], norm: "§ 2303 BGB", description: "Pflichtteil", category: "Erbrecht" },
  { keywords: ["erbfolge", "gesetzliche erbfolge", "erbschaft", "nachlass"], norm: "§ 1922 BGB", description: "Gesetzliche Erbfolge", category: "Erbrecht" },
  { keywords: ["erbausschlagung", "ausschlagung", "erbschaft ausschlagen"], norm: "§ 1942 BGB", description: "Erbausschlagung", category: "Erbrecht" },
  { keywords: ["erbschein", "nachweis erbrecht"], norm: "§ 2353 BGB", description: "Erbschein", category: "Erbrecht" },

  // ═══ Gesellschaftsrecht ═══
  { keywords: ["gmbh", "gesellschaft beschränkter haftung", "geschäftsführer"], norm: "§ 1 GmbHG", description: "GmbH-Gründung", category: "Gesellschaftsrecht" },
  { keywords: ["stammkapital", "kapital gmbh", "mindestkapital"], norm: "§ 5 GmbHG", description: "Stammkapital (mindestens 25.000 €)", category: "Gesellschaftsrecht" },
  { keywords: ["haftung gmbh", "beschränkte haftung", "durchgriffshaftung"], norm: "§ 13 Abs. 2 GmbHG", description: "Beschränkte Haftung der GmbH", category: "Gesellschaftsrecht" },
  { keywords: ["kapitalerhaltung", "ausschüttung", "verdeckte gewinnausschüttung"], norm: "§ 30 GmbHG", description: "Kapitalerhaltung", category: "Gesellschaftsrecht" },

  // ═══ Zivilprozessrecht ═══
  { keywords: ["mahnbescheid", "mahnverfahren", "gerichtliches mahnverfahren"], norm: "§ 688 ZPO", description: "Mahnbescheid", category: "Zivilprozessrecht" },
  { keywords: ["berufung", "berufungsfrist", "einspruch"], norm: "§ 517 ZPO", description: "Berufungsfrist (1 Monat)", category: "Zivilprozessrecht" },
  { keywords: ["klage", "klageerhebung", "klageschrift"], norm: "§ 253 ZPO", description: "Klageerhebung", category: "Zivilprozessrecht" },
  { keywords: ["streitwert", "wert des streitgegenstands", "zuständigkeit wert"], norm: "§ 3 ZPO", description: "Streitwert", category: "Zivilprozessrecht" },
  { keywords: ["amtsgericht", "landgericht", "instanzenweg", "gerichtszuständigkeit"], norm: "§§ 23, 71 GVG", description: "Gerichtszuständigkeit (AG bis 5.000€, LG ab 5.001€)", category: "Zivilprozessrecht" },
  { keywords: ["anwaltszwang", "vertretungszwang", "anwalt erforderlich"], norm: "§ 78 ZPO", description: "Anwaltszwang (ab LG)", category: "Zivilprozessrecht" },
  { keywords: ["vollstreckung", "zwangsvollstreckung", "pfändung"], norm: "§ 704 ZPO", description: "Zwangsvollstreckung", category: "Zivilprozessrecht" },
];

export function searchConceptMap(query: string): ConceptMatch[] {
  const lowerQuery = query.toLowerCase();
  const tokens = lowerQuery.split(/[\s,;.]+/).filter((t) => t.length >= 3);

  if (tokens.length === 0) return [];

  const matches: ConceptMatch[] = [];

  for (const entry of CONCEPT_MAP) {
    let bestScore = 0;
    let bestKeyword = "";

    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase();

      for (const token of tokens) {
        if (kw.includes(token) || token.includes(kw)) {
          const score = Math.min(token.length, kw.length) / Math.max(token.length, kw.length);
          if (score > bestScore) {
            bestScore = score;
            bestKeyword = keyword;
          }
        }
      }
    }

    if (bestScore >= 0.3) {
      matches.push({ entry, score: bestScore, matchedKeyword: bestKeyword });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 10);
}
