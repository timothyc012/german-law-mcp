# german-law-mcp

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

독일 연방법률 검색·분석을 위한 **Model Context Protocol (MCP) 서버**.  
33개 도구로 법령 조문, 법률 목차, 판례, 변호사 수임료, 기한 계산, 법적 감정서, 독일-EU법 비교·EUR-Lex 직접 조회, 위임체계 추적, 조문 비교, 계약/AGB 리스크 스크리닝, 종합 리서치 체인, 교차참조 추출, 품질 검증, 주법(Landesrecht), 개정 이력, 법률 용어 사전, 리스크 조기 경고까지 커버합니다.

## 데이터 소스

| 소스 | 내용 | 무료 |
|------|------|------|
| [NeuRIS](https://www.recht.bund.de) | 연방법원 판례 81,924건 (BGH, BVerfG, BVerwG, BFH, BAG, BSG, BPatG) | ✅ |
| [gesetze-im-internet.de](https://www.gesetze-im-internet.de) | 독일 연방법률 전문 (BGB, StGB, ZPO 등 6,000+ 법령) + 개정 이력 | ✅ |
| [openjur.de](https://openjur.de) | OLG·LG·AG 판례 (주 법원, 200만+ 건) | ✅ |
| [EUR-Lex CELLAR](https://publications.europa.eu/webapi/rdf/sparql) | EU 법령 실시간 메타데이터 (SPARQL API) | ✅ |
| Wayback Machine | 법령 역사적 버전 조회 | ✅ |

## 도구 목록 (33개)

### 기본 검색 (6개)

| 도구 | 설명 |
|------|------|
| `search_law` | 키워드로 연방법령 검색 |
| `get_law_section` | 특정 조문 전문 조회 (`§ 437 BGB` 등) |
| `get_law_toc` | 법률 목차·체계 조회 |
| `search_case_law` | 연방법원 판례 검색 (법원별 필터 가능) |
| `get_case_text` | 판례 전문 조회 (NeuRIS 문서번호로) |
| `search_all` | 법령 + 판례 통합 검색 |

### 실무 계산 (2개)

| 도구 | 설명 |
|------|------|
| `calculate_rvg` | 변호사 수임료 계산 (RVG 기준, 소가별 요율표) |
| `calculate_frist` | 소송 기한 계산 (ZPO § 222, 공휴일·일요일 자동 처리) |

### 검증 / 이력 (4개)

| 도구 | 설명 |
|------|------|
| `verify_citation` | 판례 인용 검증 — AI 환각 방지 (Aktenzeichen, NJW, BGHZ, BeckRS) |
| `get_norm_version` | 법령 역사적 버전 조회 (Wayback Machine 연동) |
| `get_amendment_history` | BGBl 개정 이력 타임라인 — GII 실시간 파싱 + 하드코딩 병합 |
| `get_law_amendments` | GII 기준 현행 개정 상태·주석 조회 |

### 심층 분석 (4개) — Phase 2

| 도구 | 설명 |
|------|------|
| `gutachten_scaffold` | 법률 감정서(Rechtsgutachten) 구조 자동 생성 — 독일 법학 방법론(Gutachtenstil) |
| `spot_issues` | 사실관계 → 법적 이슈 자동 스포팅 + 기한·소멸시효 경고 |
| `analyze_case` | 판례 심층 분석 — 리드자츠, 주문, 규범망, 유사 판례 |
| `get_norm_context` | 법령 맥락 조회 — 인접 조문, 관련 규범, 주석서 포인터, BGH 판례 |

### 확장 도구 (5개) — Phase 3

| 도구 | 설명 |
|------|------|
| `search_state_courts` | OLG·LG 판례 검색 (openjur.de, 주 법원) |
| `analyze_scenario` | 시나리오 기반 청구원인 분석 — 성공가능성 신호등, 증거·절차 가이드 |
| `compare_de_eu` | 독일-EU법 교차비교 — EU규정, 독일 이행법, 위반 시 효과, EuGH 판례 |
| `search_eurlex` | EUR-Lex CELLAR에서 EU 규정·지침·결정 검색 |
| `get_eurlex_document` | CELEX 번호로 EUR-Lex 문서 본문 조회 |

### 품질 / 고급 분석 (6개) — Phase 4

| 도구 | 설명 |
|------|------|
| `get_delegation_chain` | 3단계 위임체계 추적 — 법률 → Rechtsverordnung → Verwaltungsvorschrift |
| `find_delegated_legislation` | NeuRIS에서 관련 시행령·위임법령 검색 |
| `search_with_grade` | 소스 신뢰도 등급(A–D) 포함 통합 검색 |
| `extract_cross_refs` | 조문 교차참조 자동 추출 — 타 법률·EU법령 링크 분류 |
| `compare_sections` | 두 조문 또는 구/현행 조문 텍스트 diff 비교 |
| `quality_gate` | 14단계 법률 분석 품질 자동 검증 |

### 주법 Landesrecht (2개) — Phase 5

| 도구 | 설명 |
|------|------|
| `search_state_law` | 16개 주 주요 법령 검색 — 약어·분야·주코드 필터 지원 |
| `get_state_law_section` | 주법 조문 조회 — Bayern(gesetze-bayern.de) 실시간 파싱, 기타 주 URL 안내 |

### 사전 / 용어 (1개) — Phase 6

| 도구 | 설명 |
|------|------|
| `lookup_legal_term` | 독일 법률 용어 사전 — 40개 이상 용어, 한국어·영어 설명, 관련 조문, 퍼지 검색 |

### 리스크 / 계약 검토 (2개) — Phase 7

| 도구 | 설명 |
|------|------|
| `risk_alert` | 사실관계 기반 리스크 조기 경고 — Verjährung 카운트다운, Frist 경고, 비용·관할 리스크 점검 |
| `review_contract_clauses` | BGB §§ 307-309 기준 계약·AGB 불공정 조항 리스크 스크리닝 |

### 체인 워크플로우 (1개)

| 도구 | 설명 |
|------|------|
| `chain_full_research` | 이슈 스포팅, 법령·판례 검색, 품질 게이트를 묶은 종합 리서치 보고서 |

## 설치

```bash
git clone https://github.com/your-org/german-law-mcp
cd german-law-mcp
npm install
npm run build
```

## 검증 명령

```bash
npm run typecheck           # TypeScript 정적 검증
npm run verify:regression   # 법적 정확성 회귀 가드
npm run verify:docs         # README ↔ 등록 도구/스크립트 동기화 검사
npm run verify              # 위 세 가지 안전 검증 묶음
```

선택적 실시간 법령 검증:

```bash
npm run verify:live-law     # GII 실시간 조회 기반 하드코딩 조문 spot-check
```

## MCP 클라이언트 설정

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "german-law": {
      "command": "node",
      "args": ["/absolute/path/to/german-law-mcp/dist/index.js"]
    }
  }
}
```

### Hermes Agent (`~/.hermes/config.yaml`)

```yaml
mcp:
  servers:
    - name: german-law
      command: node
      args:
        - /absolute/path/to/german-law-mcp/dist/index.js
```

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "german-law": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## 사용 예시

### 조문 조회
```
get_law_section({ gesetz: "BGB", paragraph: "437" })
→ § 437 BGB 전문 (구매물 하자에 관한 권리)
```

### 판례 검색
```
search_case_law({ query: "Sachmangel Gebrauchtwagen", court: "bgh", size: 5 })
→ BGH 중고차 하자 관련 판례 5건
```

### 변호사 수임료 계산
```
calculate_rvg({ streitwert: 15000, verfahren: "klage" })
→ 소가 15,000€ 기준 수임료 전체 명세
```

### 소송 기한 계산
```
calculate_frist({ startdatum: "2024-03-15", frist_typ: "wochen", frist_wert: 3 })
→ 3주 기한 = 2024-04-05 (토요일이면 다음 월요일로 자동 이동)
```

### 법률 감정서 생성
```
gutachten_scaffold({
  sachverhalt: "A kauft Auto für 8.000€. Motor defekt nach 2 Wochen. Verkäufer verweigert Nacherfüllung.",
  rechtsfrage: "Kann A vom Kaufvertrag zurücktreten?",
  rechtsgebiet: "kaufrecht"
})
→ 완성된 Gutachtenstil 감정서 뼈대
```

### 독일-EU법 비교
```
compare_de_eu({ thema: "Datenschutz", fokus: "abweichungen" })
→ DSGVO vs. BDSG 주요 차이점 + BVerfG/EuGH 핵심 판례
```

### 리스크 조기 경고
```
risk_alert({
  sachverhalt: "Käufer verlangt Rücktritt wegen Motorschaden 22 Monate nach Übergabe. Verkäufer bestreitet jeden Mangel.",
  streitwert: 12000
})
→ 소멸시효 임박 여부, 입증책임, 소송비용·관할 리스크 요약
```

## 아키텍처

```
src/
├── index.ts              # MCP 서버 진입점 (도구 33개 등록)
├── lib/
│   ├── neuris-client.ts      # NeuRIS API 클라이언트
│   ├── gii-client.ts         # gesetze-im-internet.de 클라이언트
│   ├── bgbl-client.ts        # BGBl 개정 이력 파서 (GII 파싱)
│   ├── eurlex-client.ts      # EUR-Lex CELLAR SPARQL 클라이언트
│   ├── state-law-client.ts   # 주법 포털 클라이언트 (gesetze-bayern.de 등)
│   ├── cross-references.ts   # 교차참조 텍스트 파서
│   ├── source-grade.ts       # 소스 신뢰도 등급(A–D) 평가
│   ├── cache.ts              # 응답 캐싱 (TTL 기반)
│   ├── court-map.ts          # 법원 코드 매핑
│   └── law-abbreviations.ts  # 법령 약어 데이터베이스 (50+)
└── tools/                # 도구별 구현 (33개)
    ├── search-law.ts
    ├── get-law-section.ts
    ├── search-case-law.ts
    ├── get-case-text.ts
    ├── search-all.ts
    ├── calculate-rvg.ts
    ├── calculate-frist.ts
    ├── verify-citation.ts
    ├── get-norm-version.ts
    ├── get-amendment-history.ts  # Phase 6 — BGBl 개정 이력
    ├── gutachten-scaffold.ts
    ├── spot-issues.ts
    ├── analyze-case.ts
    ├── get-norm-context.ts
    ├── search-state-courts.ts
    ├── analyze-scenario.ts
    ├── compare-de-eu.ts          # EUR-Lex 실시간 연동
    ├── get-delegation-chain.ts   # Phase 4
    ├── search-with-grade.ts      # Phase 4
    ├── extract-cross-refs.ts     # Phase 4
    ├── quality-gate.ts           # Phase 4
    ├── search-state-law.ts       # Phase 5
    ├── get-state-law-section.ts  # Phase 5
    ├── lookup-legal-term.ts      # Phase 6 — 법률 용어 사전
    └── risk-alert.ts             # Phase 7 — 리스크 조기 경고
```

이제 Phase 4와 Phase 5 사용 예시를 추가합니다.

### 위임체계 추적

```
get_delegation_chain({ law: "BDSG", section: "26" })
→ BDSG §26 → BDSG-Durchführungsverordnung → 내부 지침 체계
```

### 소스 등급 포함 검색

```
search_with_grade({ query: "Datenschutz Cloud", min_grade: "B" })
→ 연방법률(A) + 연방법원 판례(B) 결과만 반환
```

### 교차참조 추출

```
extract_cross_refs({ law: "BGB", section: "823" })
→ § 823 BGB 참조: § 249, § 253, § 831, § 1 ProdHaftG, Art. 82 DSGVO 등
```

### 14단계 품질 검증

```
quality_gate({
  analysis: "BGB §437 Abs.1 gemäß BGH NJW 2020, 1234...",
  context: { laws: ["BGB"], courts: ["BGH"] }
})
→ 게이트 1–14 통과/실패 상세 보고 + 개선 권고
```

### 주법 검색

```
search_state_law({ query: "Versammlungsfreiheit", state: "BY" })
→ Bayern 집회법 관련 법령 목록

get_state_law_section({ state: "BY", law: "BayBO", section: "13" })
→ 바이에른 건축법 §13 조문 원문 (gesetze-bayern.de 실시간 파싱)
```

## Korean Law MCP 비교

| 기능 | german-law-mcp | korean-law-mcp |
|------|---------------|----------------|
| 기본 검색 | ✅ | ✅ |
| 판례 조회 | ✅ NeuRIS (연방) + openjur (주) | ✅ 종합법률정보 |
| 조문 전문 | ✅ GII | ✅ 법제처 Open API |
| 수임료 계산 | ✅ RVG | ❌ |
| 기한 계산 | ✅ ZPO + 공휴일 | ❌ |
| 인용 검증 | ✅ 환각 방지 | ❌ |
| 역사적 버전 | ✅ Wayback Machine | ❌ |
| 감정서 생성 | ✅ Gutachtenstil | ❌ |
| 이슈 스포터 | ✅ | ❌ |
| 판례 심층 분석 | ✅ | ❌ |
| 규범 맥락 | ✅ | ❌ |
| EU법 비교 | ✅ | ❌ |
| 위임체계 추적 | ✅ 3단계 자동 추적 | ❌ |
| 소스 등급 필터 | ✅ A–D 등급 | ❌ |
| 교차참조 추출 | ✅ EU법 포함 | ❌ |
| 품질 게이트 | ✅ 14단계 | ❌ |
| 주법(Landesrecht) | ✅ 16개 주 | ❌ |

## 법적 고지

이 도구는 **참고용**으로만 제공됩니다. 법적 구속력 있는 판단을 위해서는 반드시 자격을 갖춘 변호사에게 문의하십시오.

Dieses Tool dient ausschließlich **Informationszwecken**. Für rechtsverbindliche Beratung wenden Sie sich an einen zugelassenen Rechtsanwalt.

## 라이선스

MIT License — 자유롭게 사용·수정·배포 가능.
