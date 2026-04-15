/**
 * get-delegation-chain.ts — 독일법 3단계 위임 체계 추적
 *
 * general-legal-research 의 chain_law_system 워크플로우를 MCP 도구로 구현.
 *
 * 독일 법령 위임 체계:
 *   1단계: Gesetz (연방법률) — BGBl. 수록, 연방의회 제정
 *   2단계: Rechtsverordnung (법규명령/시행령) — 행정부 위임 입법
 *   3단계: Verwaltungsvorschrift (행정규칙) — 내부 지침, 법적 구속력 없음
 *
 * 예: § 6 BDSG → BDSG-DurchführungsVO → BMI-Verwaltungsvorschrift
 */

import { z } from "zod";
import { searchLegislation } from "../lib/neuris-client.js";
import { getLawSection as getLawSectionLib } from "../lib/gii-client.js";

export const getDelegationChainSchema = z.object({
  law: z
    .string()
    .describe(
      "법률 약어 또는 전체 이름 (예: 'BDSG', 'BGB', 'UWG', 'KWG')"
    ),
  section: z
    .string()
    .optional()
    .describe(
      "특정 조문 번호 (예: '6', '823'). 지정 시 해당 조문의 위임 규정만 추적"
    ),
});

export type GetDelegationChainInput = z.infer<typeof getDelegationChainSchema>;

// ── 알려진 위임 체계 매핑 (자주 쓰이는 법률) ─────────────────────────────

interface DelegationEntry {
  stufe: 1 | 2 | 3;
  name: string;
  abbreviation?: string;
  description: string;
  ermaechtigung?: string; // 수권 조항 (예: § 38 BDSG)
  erlassdatum?: string;
}

const KNOWN_DELEGATION_CHAINS: Record<string, DelegationEntry[]> = {
  BDSG: [
    {
      stufe: 1,
      name: "Bundesdatenschutzgesetz",
      abbreviation: "BDSG",
      description: "개인정보보호 연방법률 — DSGVO 국내 이행법",
    },
    {
      stufe: 2,
      name: "BDSG-Durchführungsverordnung",
      description: "BDSG 시행령 (현재는 대부분 DSGVO 직접 적용으로 별도 시행령 없음)",
      ermaechtigung: "§ 38 BDSG",
    },
    {
      stufe: 3,
      name: "Verwaltungsvorschriften der BfDI",
      description: "연방개인정보보호관 행정지침 — 내부 운용 기준",
    },
  ],
  KWG: [
    {
      stufe: 1,
      name: "Kreditwesengesetz",
      abbreviation: "KWG",
      description: "은행 및 금융서비스 기관에 관한 법률",
    },
    {
      stufe: 2,
      name: "Solvabilitätsverordnung (SolvV)",
      abbreviation: "SolvV",
      description: "자기자본 적정성 시행령",
      ermaechtigung: "§ 10 KWG",
    },
    {
      stufe: 2,
      name: "Groß- und Millionenkreditverordnung (GroMiKV)",
      abbreviation: "GroMiKV",
      description: "대출 한도 시행령",
      ermaechtigung: "§ 13 KWG",
    },
    {
      stufe: 3,
      name: "BaFin-Rundschreiben und -Merkblätter",
      description: "BaFin 행정지침 — 감독 실무 기준 (법적 구속력 없음, 사실상 구속력)",
    },
  ],
  GmbHG: [
    {
      stufe: 1,
      name: "Gesetz betreffend die Gesellschaften mit beschränkter Haftung",
      abbreviation: "GmbHG",
      description: "유한회사법",
    },
    {
      stufe: 2,
      name: "GmbHG-Anmeldungsverordnung",
      description: "등기 절차 시행령",
      ermaechtigung: "§ 8 GmbHG",
    },
  ],
  AktG: [
    {
      stufe: 1,
      name: "Aktiengesetz",
      abbreviation: "AktG",
      description: "주식회사법",
    },
    {
      stufe: 2,
      name: "Aktienwertpapiermeldeverordnung",
      description: "주식 신고 시행령",
    },
    {
      stufe: 3,
      name: "DCGK — Deutscher Corporate Governance Kodex",
      description: "독일 기업지배구조 모범규준 — 연성법(soft law), 'comply or explain'",
    },
  ],
  UWG: [
    {
      stufe: 1,
      name: "Gesetz gegen den unlauteren Wettbewerb",
      abbreviation: "UWG",
      description: "부정경쟁방지법",
    },
    {
      stufe: 2,
      name: "PAngV — Preisangabenverordnung",
      abbreviation: "PAngV",
      description: "가격표시 시행령",
      ermaechtigung: "§ 11 UWG i.V.m. § 1 PAngV",
    },
  ],
  EStG: [
    {
      stufe: 1,
      name: "Einkommensteuergesetz",
      abbreviation: "EStG",
      description: "소득세법",
    },
    {
      stufe: 2,
      name: "Einkommensteuer-Durchführungsverordnung (EStDV)",
      abbreviation: "EStDV",
      description: "소득세 시행령",
      ermaechtigung: "§ 51 EStG",
    },
    {
      stufe: 3,
      name: "Einkommensteuer-Richtlinien (EStR)",
      abbreviation: "EStR",
      description: "소득세 행정지침 — BMF가 발행, 세무서 내부 구속력",
    },
    {
      stufe: 3,
      name: "BMF-Schreiben",
      description: "연방재무부 유권해석 — 실무상 중요, 납세자에 대한 법적 구속력 없음",
    },
  ],
  UStG: [
    {
      stufe: 1,
      name: "Umsatzsteuergesetz",
      abbreviation: "UStG",
      description: "부가가치세법",
    },
    {
      stufe: 2,
      name: "Umsatzsteuer-Durchführungsverordnung (UStDV)",
      abbreviation: "UStDV",
      description: "부가가치세 시행령",
      ermaechtigung: "§ 27a UStG",
    },
    {
      stufe: 3,
      name: "Umsatzsteuer-Anwendungserlass (UStAE)",
      abbreviation: "UStAE",
      description: "부가가치세 적용 행정지침",
    },
  ],
  AO: [
    {
      stufe: 1,
      name: "Abgabenordnung",
      abbreviation: "AO",
      description: "조세기본법",
    },
    {
      stufe: 2,
      name: "Abgabenordnung-Durchführungsverordnung (AODV)",
      description: "조세기본법 시행령",
    },
    {
      stufe: 3,
      name: "AEAO — Anwendungserlass zur Abgabenordnung",
      abbreviation: "AEAO",
      description: "조세기본법 적용 행정지침 — BMF 발행",
    },
  ],
};

// ── 도구 구현 ────────────────────────────────────────────────────────────────

export async function getDelegationChain(
  input: GetDelegationChainInput
): Promise<string> {
  const { law, section } = input;
  const lawUpper = law.toUpperCase();

  const lines: string[] = [
    `[독일법 3단계 위임 체계 — ${law}${section ? ` § ${section}` : ""}]`,
    `조회일: ${new Date().toISOString().slice(0, 10)}`,
    "",
  ];

  // ── 1. 알려진 위임 체계 매핑에서 조회
  const knownChain = KNOWN_DELEGATION_CHAINS[lawUpper];

  if (knownChain) {
    lines.push("📋 위임 체계 구조:");
    lines.push("");

    for (const entry of knownChain) {
      const prefix =
        entry.stufe === 1 ? "1단계 (Gesetz)" :
        entry.stufe === 2 ? "2단계 (Rechtsverordnung)" :
                            "3단계 (Verwaltungsvorschrift)";
      const badge =
        entry.stufe === 1 ? "🏛️" :
        entry.stufe === 2 ? "📜" :
                            "📋";

      lines.push(`${badge} ${prefix}`);
      lines.push(`   명칭: ${entry.name}${entry.abbreviation ? ` (${entry.abbreviation})` : ""}`);
      lines.push(`   내용: ${entry.description}`);
      if (entry.ermaechtigung) {
        lines.push(`   수권조항: ${entry.ermaechtigung}`);
      }
      lines.push("");
    }
  } else {
    lines.push(`⚠️ '${law}'에 대한 사전 등록된 위임 체계가 없습니다.`);
    lines.push("NeuRIS에서 관련 시행령을 검색합니다...");
    lines.push("");

    // ── 2. NeuRIS에서 동적 검색 시도
    try {
      const voResult = await searchLegislation(`${law} Durchführungsverordnung`, 5);
      const vwResult = await searchLegislation(`${law} Verwaltungsvorschrift`, 3);

      if (voResult.totalItems > 0) {
        lines.push("📜 2단계 후보 (Rechtsverordnung) — NeuRIS 검색 결과:");
        for (const item of voResult.items.slice(0, 3)) {
          lines.push(`   • ${item.name}${item.abbreviation ? ` (${item.abbreviation})` : ""}`);
        }
        lines.push("");
      }

      if (vwResult.totalItems > 0) {
        lines.push("📋 3단계 후보 (Verwaltungsvorschrift) — NeuRIS 검색 결과:");
        for (const item of vwResult.items.slice(0, 3)) {
          lines.push(`   • ${item.name}${item.abbreviation ? ` (${item.abbreviation})` : ""}`);
        }
        lines.push("");
      }

      if (voResult.totalItems === 0 && vwResult.totalItems === 0) {
        lines.push("검색 결과 없음 — 해당 법률에 별도 시행령이 없거나 EU 규정이 직접 적용될 수 있습니다.");
      }
    } catch (err) {
      lines.push(`NeuRIS 검색 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 3. 특정 조문의 위임 규정 분석
  if (section) {
    lines.push("─".repeat(50));
    lines.push(`§ ${section} ${law} — 위임 조항 분석:`);
    lines.push("");

    try {
      const sectionText = await getLawSectionLib(law, section);
        if (sectionText) {
          // 위임 키워드 탐지
          const delegationKeywords = [
            "ermächtigt", "wird ermächtigt", "kann bestimmen",
            "durch Rechtsverordnung", "durch Verordnung",
            "Näheres regelt", "Das Nähere bestimmt",
            "Bundesministerium", "Bundesregierung",
          ];

          const text = sectionText.content;
          const foundKeywords = delegationKeywords.filter((kw) =>
            text.toLowerCase().includes(kw.toLowerCase())
          );

        if (foundKeywords.length > 0) {
          lines.push("🔑 위임 조항 발견:");
          lines.push(`   키워드: ${foundKeywords.join(", ")}`);
          lines.push("");
          lines.push("   → 이 조문은 하위 법령 제정을 수권하는 조항입니다.");
          lines.push("   → 관련 시행령(Rechtsverordnung)을 추가로 조회하세요.");
        } else {
          lines.push("이 조문에는 위임 규정이 포함되어 있지 않습니다.");
        }
      }
    } catch {
      lines.push(`조문 조회 불가 — GII에서 ${law} § ${section} 확인 필요`);
    }
  }

  // ── 4. 일반 설명 추가
  lines.push("");
  lines.push("─".repeat(50));
  lines.push("📌 독일법 위임 체계 개요:");
  lines.push("  1단계 Gesetz: 연방의회 제정법률 — 최고 효력, BGBl. 수록");
  lines.push("  2단계 Rechtsverordnung: 행정부 위임 입법 — 법률의 수권 필요");
  lines.push("  3단계 Verwaltungsvorschrift: 행정 내부 지침 — 법적 구속력 없음,");
  lines.push("    단 행정청은 구속됨 (Selbstbindung der Verwaltung)");
  lines.push("");
  lines.push("⚠️ 주의: Verwaltungsvorschrift는 법원을 구속하지 않으나");
  lines.push("  실무에서 세무/금융 분야는 사실상의 구속력을 가집니다.");

  return lines.join("\n");
}
