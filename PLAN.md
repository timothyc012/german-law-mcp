# German Law MCP — v1 구현 계획

## 1. 프로젝트 개요

### 1.1 목표

독일 연방법률 시스템을 MCP(Model Context Protocol) 도구로 래핑하여,
Claude Desktop / Cursor / Claude.ai 등에서 자연어로 독일 법률을 검색하고
법적 근거 기반 답변을 받을 수 있게 한다.

### 1.2 핵심 사용 시나리오

```
사용자: "중고거래를 했는데 상대방이 환불을 요청하면 어떻게 하지?"

Claude: search_law("Kaufvertrag Gewährleistung") 호출
  → BGB §433-§453 (매매계약) 발견

Claude: get_law_section("bgb", "437") 호출
  → §437 매수인의 권리: 추완청구(§439), 해제/감액(§440,323), 손해배상(§280,281)

Claude: get_law_section("bgb", "444") 호출
  → 사인 간 거래에서 하자담보 배제 약정 조건 확인

Claude: 최종 답변 (법적 근거 + 실무 조언)
```

MCP 서버는 **검색과 조회**만 담당한다. 법률 해석, 질문 분석, 답변 구성은
Claude의 추론 능력이 처리한다.

### 1.3 기존 프로젝트와의 차별성

| 구분 | 기존 (`@ansvar/german-law-mcp` 등) | 본 프로젝트 |
|------|-----------------------------------|------------|
| 법령 커버리지 | 5,000건 샘플 | **6,450+ (GII 전체)** |
| 판례 커버리지 | 일부 | **81,924건 (NeuRIS 전체)** |
| 데이터 소스 | 단일 API | **NeuRIS + GII 2중 폴백** |
| 법원 커버리지 | 일부 | **7개 연방법원 전체** |
| 인증 | API 키 필요 | **무인증 (완전 무료)** |

---

## 2. 데이터 소스 (검증 완료: 2026-04-11)

### 2.1 법령 (Gesetze)

| 소스 | 용도 | 커버리지 | 인증 | 상태 |
|------|------|---------|------|------|
| **Gesetze im Internet (GII)** | 조문 직접 조회 (1순위) | ~6,450 법률 전체 | 없음 | 안정적 |
| **NeuRIS API** | 키워드 검색 + ELI 조회 | 2,425 법률 (37%) | 없음 | 시범 서비스 |

**GII 접근 패턴** (검증 완료):
```
목차:     https://www.gesetze-im-internet.de/gii-toc.xml
조문:     https://www.gesetze-im-internet.de/{slug}/__{section}.html
예시:     https://www.gesetze-im-internet.de/bgb/__437.html
인코딩:   ISO-8859-1 (latin-1) ← UTF-8 아님, 변환 필요
```

**NeuRIS 법령 검색** (검증 완료):
```
Base URL: https://testphase.rechtsinformationen.bund.de

검색:     GET /v1/legislation?searchTerm={query}&size={1-300}&pageIndex={n}
메타데이터: GET /v1/legislation/eli/{jurisdiction}/{agent}/{year}/{naturalIdentifier}/{pointInTime}/{version}/{language}
HTML:     위 경로 + /{pointInTimeManifestation}/{subtype}.html
XML:      위 경로 + /{pointInTimeManifestation}/{subtype}.xml
조문HTML:  위 경로 + /{pointInTimeManifestation}/{subtype}/{articleEid}.html
```

**법령 조회 전략**:
```
키워드 검색 → NeuRIS /v1/legislation?searchTerm=... (검색 기능 우수)
특정 조문   → GII HTML (커버리지 100%, URL 예측 가능)
폴백        → NeuRIS 검색 결과 없으면 GII toc.xml에서 약어 매칭
```

### 2.2 판례 (Urteile/Beschlüsse)

| 소스 | 용도 | 커버리지 | 인증 |
|------|------|---------|------|
| **NeuRIS API** | 검색 + 전문 조회 (1순위) | 81,924건 | 없음 |
| **BGHeute API** | BGH 전용 보조 (2순위) | 81,852건 BGH | 없음 |

**NeuRIS 판례 검색** (검증 완료):
```
검색:     GET /v1/case-law?searchTerm={query}&court={court}&size={1-300}
법원목록:  GET /v1/case-law/courts
메타데이터: GET /v1/case-law/{documentNumber}
전문HTML:  GET /v1/case-law/{documentNumber}.html
전문XML:   GET /v1/case-law/{documentNumber}.xml
```

**NeuRIS 법원별 판례 수** (실측):
```
BGH:             34,023건   (연방대법원)
BFH:             11,479건   (연방재정법원)
BVerwG:          10,128건   (연방행정법원)
BPatG München:    7,236건   (연방특허법원)
BAG:              7,163건   (연방노동법원)
BSG:              6,316건   (연방사회법원)
BVerfG:           5,579건   (연방헌법재판소)
```

**BGHeute API** (검증 완료):
```
Base URL: https://bgheute.de/api

GET /api/decisions?page={n}
GET /api/decisions/search?q={query}&fields=titel,urteilstext
GET /api/decisions/{aktenzeichen}
GET /api/senats
GET /api/stats
```

### 2.3 통합 검색

**NeuRIS 통합 검색** (법령+판례 동시):
```
기본검색:    GET /v1/document?searchTerm={query}&size={1-300}
Lucene검색:  GET /v1/document/lucene-search?query={lucene_query}&size={1-300}
```

Lucene 검색은 AND/OR/NOT, 필드 지정 등 고급 쿼리를 지원한다.

### 2.4 사용하지 않는 소스 (v1 제외)

| 소스 | 제외 사유 |
|------|----------|
| Rechtsprechung im Internet | 접근 불가 (구형 WML 로그인 화면만 노출) |
| NeuRIS Literature | 데이터 0건 |
| NeuRIS Administrative Directive | 데이터 0건 |
| EUR-Lex CELLAR | v2 범위 (EU법) |
| Open Legal Data | NeuRIS + GII로 충분, 데이터 신선도 불확실 |
| Zenodo Corpora | 벌크 데이터셋, 실시간 MCP에 부적합 |

---

## 3. 아키텍처

### 3.1 전체 구조

```
┌──────────────────────────────────────────┐
│       MCP Client (Claude Desktop 등)      │
└──────────────┬───────────────────────────┘
               │ STDIO (JSON-RPC)
┌──────────────▼───────────────────────────┐
│        German Law MCP Server              │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │         5개 MCP 도구                 │ │
│  │  search_law · get_law_section       │ │
│  │  search_case_law · get_case_text    │ │
│  │  search_all                         │ │
│  └──────────────┬──────────────────────┘ │
│  ┌──────────────▼──────────────────────┐ │
│  │         공통 라이브러리              │ │
│  │  neuris-client · gii-client         │ │
│  │  law-abbreviations · court-map      │ │
│  │  cache                              │ │
│  └──────────────┬──────────────────────┘ │
└─────────────────┼────────────────────────┘
                  │ HTTPS (fetch)
    ┌─────────────▼──────────────┐
    │  NeuRIS API    GII (HTML)  │
    │  BGHeute API               │
    └────────────────────────────┘
```

### 3.2 프로젝트 구조

```
german-law-mcp/
├── src/
│   ├── index.ts                  # MCP 서버 엔트리 (STDIO)
│   ├── tools/
│   │   ├── search-law.ts         # search_law: 법령 키워드 검색
│   │   ├── get-law-section.ts    # get_law_section: 조문 조회
│   │   ├── search-case-law.ts    # search_case_law: 판례 검색
│   │   ├── get-case-text.ts      # get_case_text: 판결문 조회
│   │   └── search-all.ts         # search_all: 통합 검색
│   └── lib/
│       ├── neuris-client.ts      # NeuRIS REST API 클라이언트
│       ├── gii-client.ts         # Gesetze im Internet 클라이언트
│       ├── law-abbreviations.ts  # 법률 약어 → GII slug 매핑 (50+)
│       ├── court-map.ts          # 법원 코드 정규화
│       └── cache.ts              # LRU 캐시 (500 entries, 1h TTL)
├── package.json
├── tsconfig.json
├── PLAN.md                       # 본 문서
└── README.md
```

### 3.3 기술 스택

| 항목 | 선택 | 사유 |
|------|------|------|
| 런타임 | Node.js 20+ | MCP SDK 공식 지원 |
| 언어 | TypeScript (ESM) | 타입 안전성 |
| MCP SDK | `@modelcontextprotocol/sdk` | 공식 SDK |
| 스키마 검증 | `zod` | MCP SDK 의존성 |
| HTTP | Node.js 내장 `fetch` | 외부 의존성 제거 |
| HTML 파싱 | 정규식 + 간단한 파서 | GII HTML이 단순 구조 |
| 빌드 | `tsc` | 추가 빌드 도구 불필요 |

**의존성 (최소)**:
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  }
}
```

---

## 4. 도구 상세 설계 (5개)

### 4.1 search_law — 법령 키워드 검색

```typescript
{
  name: "search_law",
  description: "독일 연방법률을 키워드로 검색합니다. 법률명, 주제, 법적 개념 등으로 검색 가능.",
  inputSchema: {
    query: string,         // 검색어 (예: "Kaufvertrag", "Mietrecht", "Datenschutz")
    size?: number,         // 결과 수 (기본 10, 최대 50)
  }
}
```

**로직**:
1. NeuRIS `GET /v1/legislation?searchTerm={query}&size={size}` 호출
2. 결과에서 법률명, 약어, ELI, textMatches 추출
3. 결과가 0건이면 GII toc.xml에서 약어/이름 매칭 시도
4. 정리된 목록 반환 (법률명, 약어, 조문 매칭 하이라이트)

**반환 형식 예시**:
```
[검색결과: "Kaufvertrag" — 26건]

1. Bürgerliches Gesetzbuch (BGB)
   약어: BGB | 상태: 현행
   매칭: §437 "Ist die Sache mangelhaft, kann der Käufer..."
   매칭: §433 "Durch den Kaufvertrag wird der Verkäufer..."

2. Handelsgesetzbuch (HGB)
   약어: HGB | 상태: 현행
   매칭: §373 "Ist der Käufer mit der Annahme der Ware im Verzug..."
```

### 4.2 get_law_section — 조문 조회

```typescript
{
  name: "get_law_section",
  description: "독일 법률의 특정 조문(§)을 조회합니다. 법률 약어와 조문 번호를 지정하세요.",
  inputSchema: {
    law: string,           // 법률 약어 (예: "BGB", "StGB", "GG")
    section: string,       // 조문 번호 (예: "437", "1", "823")
  }
}
```

**로직**:
1. `law-abbreviations.ts`에서 약어 → GII slug 변환 (BGB→`bgb`)
2. GII `https://www.gesetze-im-internet.de/{slug}/__{section}.html` 호출
3. 응답 인코딩 변환 (ISO-8859-1 → UTF-8)
4. HTML에서 조문 제목 + 본문 텍스트 추출
5. 실패 시 NeuRIS ELI 경로로 폴백

**반환 형식 예시**:
```
§ 437 BGB — Rechte des Käufers bei Mängeln
(매수인의 하자 시 권리)

Ist die Sache mangelhaft, kann der Käufer, wenn die Voraussetzungen
der folgenden Vorschriften vorliegen und soweit nicht ein anderes
bestimmt ist,
1. nach § 439 Nacherfüllung verlangen,
2. nach den §§ 440, 323 und 326 Abs. 5 von dem Vertrag zurücktreten
   oder nach § 441 den Kaufpreis mindern und
3. nach den §§ 440, 280, 281, 283 und 311a Schadensersatz oder nach
   § 284 Ersatz vergeblicher Aufwendungen verlangen.

출처: https://www.gesetze-im-internet.de/bgb/__437.html
```

### 4.3 search_case_law — 판례 검색

```typescript
{
  name: "search_case_law",
  description: "독일 연방법원 판례를 검색합니다. 7개 연방법원(BGH, BVerfG, BVerwG, BFH, BAG, BSG, BPatG) 전체 또는 특정 법원을 지정하여 검색.",
  inputSchema: {
    query: string,         // 검색어
    court?: string,        // 법원 (예: "BGH", "BVerfG") — 생략 시 전체
    size?: number,         // 결과 수 (기본 10, 최대 50)
  }
}
```

**로직**:
1. `court-map.ts`에서 법원 코드 정규화 (`bgh`→`BGH`, `bpatg`→`BPatG München`)
2. NeuRIS `GET /v1/case-law?searchTerm={query}&court={court}&size={size}` 호출
3. 결과에서 사건번호, 법원, 날짜, 요지, 매칭 텍스트 추출
4. BGH 결과가 부족하면 BGHeute API로 보조 검색

**반환 형식 예시**:
```
[판례검색: "Gewährleistung Gebrauchtwagen" — BGH — 15건]

1. BGH XII ZR 93/10 (2012-06-27) — Urteil
   12. Zivilsenat
   "Mietvertrag: Intransparenz einer Entgeltanpassungsklausel"
   문서번호: JURE120015069

2. BGH VIII ZR 234/15 (2016-03-09) — Urteil
   8. Zivilsenat
   "Rücktritt vom Kaufvertrag bei Gebrauchtwagenkauf"
   문서번호: JURE160004521
```

### 4.4 get_case_text — 판결문 조회

```typescript
{
  name: "get_case_text",
  description: "판례의 전문(판결문 텍스트)을 조회합니다. search_case_law 결과의 문서번호를 사용하세요.",
  inputSchema: {
    documentNumber: string,  // NeuRIS 문서번호 (예: "JURE120015069")
  }
}
```

**로직**:
1. NeuRIS `GET /v1/case-law/{documentNumber}` 으로 메타데이터 조회
2. NeuRIS `GET /v1/case-law/{documentNumber}.html` 으로 전문 조회
3. HTML에서 텍스트 추출 (Tenor, Tatbestand, Entscheidungsgründe)
4. 너무 길면 요약 범위(Leitsatz + Tenor + 처음 2000자) 반환

### 4.5 search_all — 통합 검색

```typescript
{
  name: "search_all",
  description: "법령과 판례를 동시에 검색합니다. 주제가 불분명하거나 법령+판례를 함께 찾고 싶을 때 사용하세요.",
  inputSchema: {
    query: string,         // 검색어
    size?: number,         // 결과 수 (기본 10, 최대 50)
  }
}
```

**로직**:
1. NeuRIS `GET /v1/document?searchTerm={query}&size={size}` 호출
2. 결과를 법령/판례로 분류하여 반환
3. 고급 검색이 필요하면 `/v1/document/lucene-search` 사용

---

## 5. 핵심 라이브러리 설계

### 5.1 neuris-client.ts

```typescript
const NEURIS_BASE = "https://testphase.rechtsinformationen.bund.de"

export class NeuRISClient {
  async searchLegislation(query: string, size?: number): Promise<LegislationSearchResult>
  async getLegislation(eli: string): Promise<LegislationDetail>
  async getLegislationHtml(eli: string, manifestation: string, subtype: string): Promise<string>

  async searchCaseLaw(query: string, court?: string, size?: number): Promise<CaseLawSearchResult>
  async getCaseLaw(documentNumber: string): Promise<CaseLawDetail>
  async getCaseLawHtml(documentNumber: string): Promise<string>
  async getCourts(): Promise<Court[]>

  async searchAll(query: string, size?: number): Promise<UnifiedSearchResult>
  async luceneSearch(query: string, size?: number): Promise<UnifiedSearchResult>
}
```

주의사항:
- 움라우트(ä, ö, ü, ß) URL 인코딩 정확히 처리
- 응답은 JSON-LD (`@type`, `@id` 필드)
- `textMatches[].text` 에 `<mark>` 하이라이트 포함 → 제거 후 활용
- 페이지네이션: `pageIndex` (0-based) + `size` (max 300)

### 5.2 gii-client.ts

```typescript
const GII_BASE = "https://www.gesetze-im-internet.de"

export class GIIClient {
  async getLawSection(slug: string, section: string): Promise<LawSection>
  async getToc(): Promise<TocEntry[]>
  async searchByAbbreviation(abbr: string): Promise<TocEntry | null>
}
```

주의사항:
- **인코딩이 ISO-8859-1** — `Buffer` + `TextDecoder('iso-8859-1')` 변환 필수
- HTML 구조가 단순: `<div class="jnhtml">` 안에 조문 텍스트
- 조문 번호 규칙: `__437.html` (§437), `__1.html` (§1)
- Art. (Artikel) 사용 법률(GG 등): `__art_1.html`

### 5.3 law-abbreviations.ts

주요 법률 약어 → GII slug 매핑 (최소 50개, 확장 가능):

```typescript
export const LAW_MAP: Record<string, { slug: string; name: string; sectionPrefix: "§" | "Art." }> = {
  // 민법/상법
  "BGB":   { slug: "bgb",   name: "Bürgerliches Gesetzbuch", sectionPrefix: "§" },
  "HGB":   { slug: "hgb",   name: "Handelsgesetzbuch", sectionPrefix: "§" },
  "StGB":  { slug: "stgb",  name: "Strafgesetzbuch", sectionPrefix: "§" },
  "ZPO":   { slug: "zpo",   name: "Zivilprozessordnung", sectionPrefix: "§" },
  "StPO":  { slug: "stpo",  name: "Strafprozessordnung", sectionPrefix: "§" },

  // 헌법/공법
  "GG":    { slug: "gg",    name: "Grundgesetz", sectionPrefix: "Art." },
  "VwVfG": { slug: "vwvfg", name: "Verwaltungsverfahrensgesetz", sectionPrefix: "§" },
  "VwGO":  { slug: "vwgo",  name: "Verwaltungsgerichtsordnung", sectionPrefix: "§" },

  // 세법
  "AO":    { slug: "ao_1977", name: "Abgabenordnung", sectionPrefix: "§" },
  "EStG":  { slug: "estg",    name: "Einkommensteuergesetz", sectionPrefix: "§" },
  "UStG":  { slug: "ustg_1980", name: "Umsatzsteuergesetz", sectionPrefix: "§" },

  // 노동/사회
  "KSchG": { slug: "kschg",  name: "Kündigungsschutzgesetz", sectionPrefix: "§" },
  "BUrlG": { slug: "burlg",  name: "Bundesurlaubsgesetz", sectionPrefix: "§" },
  "BetrVG":{ slug: "betrvg", name: "Betriebsverfassungsgesetz", sectionPrefix: "§" },

  // IT/데이터
  "BDSG":  { slug: "bdsg_2018", name: "Bundesdatenschutzgesetz", sectionPrefix: "§" },
  "TMG":   { slug: "tmg",      name: "Telemediengesetz", sectionPrefix: "§" },
  "UrhG":  { slug: "urhg",     name: "Urheberrechtsgesetz", sectionPrefix: "§" },

  // 건설/환경
  "BauGB": { slug: "bbaug",  name: "Baugesetzbuch", sectionPrefix: "§" },
  "BImSchG":{ slug: "bimschg", name: "Bundes-Immissionsschutzgesetz", sectionPrefix: "§" },

  // ... 50개 이상 확장
}
```

### 5.4 court-map.ts

```typescript
// 사용자 입력 → NeuRIS court 파라미터 매핑
export const COURT_MAP: Record<string, { neurisId: string; label: string }> = {
  "bgh":    { neurisId: "BGH",             label: "Bundesgerichtshof (연방대법원)" },
  "bverfg": { neurisId: "BVerfG",          label: "Bundesverfassungsgericht (연방헌법재판소)" },
  "bverwg": { neurisId: "BVerwG",          label: "Bundesverwaltungsgericht (연방행정법원)" },
  "bfh":    { neurisId: "BFH",             label: "Bundesfinanzhof (연방재정법원)" },
  "bag":    { neurisId: "BAG",             label: "Bundesarbeitsgericht (연방노동법원)" },
  "bsg":    { neurisId: "BSG",             label: "Bundessozialgericht (연방사회법원)" },
  "bpatg":  { neurisId: "BPatG München",   label: "Bundespatentgericht (연방특허법원)" },
}
```

### 5.5 cache.ts

```typescript
// 간단한 LRU 캐시 — 외부 라이브러리 없이 Map 기반
export class LRUCache<T> {
  constructor(maxSize: number = 500, ttlMs: number = 3600_000)
  get(key: string): T | undefined
  set(key: string, value: T): void
}
```

---

## 6. 주의사항 및 엣지케이스

### 6.1 인코딩

| 소스 | 인코딩 | 처리 |
|------|--------|------|
| NeuRIS API | UTF-8 | 그대로 사용 |
| GII HTML | ISO-8859-1 | `TextDecoder('iso-8859-1')` 변환 |
| BGHeute API | UTF-8 | 그대로 사용 |

### 6.2 NeuRIS 움라우트 검색 이슈

테스트 결과 움라우트 포함 검색어가 0건을 반환하는 경우 발견:
- `Gewährleistung` → 0건
- `Mietvertrag` → 1,681건

대응:
1. 움라우트를 기본형으로 변환하여 재시도 (ä→ae, ö→oe, ü→ue, ß→ss)
2. 원본 + 변환형 두 번 검색 후 합산

### 6.3 GII 조문 번호 패턴

| 법률 유형 | URL 패턴 | 예시 |
|----------|---------|------|
| § (일반) | `__{number}.html` | `__437.html` |
| Art. (헌법 등) | `__art_{number}.html` | `__art_1.html` |
| § + 문자 | `__{number}{letter}.html` | `__823a.html` (추정) |
| 범위 | 지원 안함 | 개별 조회 필요 |

### 6.4 NeuRIS 시범 서비스 리스크

NeuRIS는 공식적으로 "trial service"이다:
- API 스펙이 예고 없이 변경될 수 있음
- 데이터가 불완전 (법령 37%, 판례는 양호)
- GII 폴백이 반드시 필요한 이유

---

## 7. 구현 순서

### Phase 1: 기반 (1~2일)

| # | 작업 | 산출물 |
|---|------|--------|
| 1.1 | package.json + tsconfig.json 셋업 | 프로젝트 초기화 |
| 1.2 | `cache.ts` — LRU 캐시 | `src/lib/cache.ts` |
| 1.3 | `law-abbreviations.ts` — 50개 매핑 | `src/lib/law-abbreviations.ts` |
| 1.4 | `court-map.ts` — 7개 법원 매핑 | `src/lib/court-map.ts` |
| 1.5 | `gii-client.ts` — GII HTML 파싱 | `src/lib/gii-client.ts` |
| 1.6 | `neuris-client.ts` — NeuRIS REST | `src/lib/neuris-client.ts` |

### Phase 2: 도구 구현 (2~3일)

| # | 작업 | 산출물 |
|---|------|--------|
| 2.1 | `search-law.ts` | `src/tools/search-law.ts` |
| 2.2 | `get-law-section.ts` | `src/tools/get-law-section.ts` |
| 2.3 | `search-case-law.ts` | `src/tools/search-case-law.ts` |
| 2.4 | `get-case-text.ts` | `src/tools/get-case-text.ts` |
| 2.5 | `search-all.ts` | `src/tools/search-all.ts` |
| 2.6 | `index.ts` — MCP 서버 등록 | `src/index.ts` |

### Phase 3: 통합 + 배포 (1~2일)

| # | 작업 | 산출물 |
|---|------|--------|
| 3.1 | 빌드 + 로컬 테스트 | `dist/` |
| 3.2 | Claude Desktop 설정 | `claude_desktop_config.json` 가이드 |
| 3.3 | 실제 질문으로 E2E 테스트 | 동작 검증 |
| 3.4 | README.md 작성 | `README.md` |

### 총 예상: 5~7일

---

## 8. v2 확장 로드맵 (v1 완성 후)

| 기능 | 설명 |
|------|------|
| EU법 통합 | EUR-Lex CELLAR SPARQL/REST |
| CLI + REPL | `german-law "BGB § 437"` 터미널 도구 |
| Fly.io 원격 배포 | HTTP 모드 추가 |
| 법률 용어 사전 | Deutsches Rechtswörterbuch 연동 |
| 개정 이력 | Bundesgesetzblatt 연동 |
| npm 배포 | `npm install -g german-law-mcp` |
| 체인 도구 | 복합 워크플로우 (종합리서치, 법체계분석 등) |

---

## 9. 참고 링크

| 항목 | URL |
|------|-----|
| NeuRIS API 문서 | https://docs.rechtsinformationen.bund.de/ |
| NeuRIS OpenAPI spec | https://docs.rechtsinformationen.bund.de/data/openapi.json |
| NeuRIS 포털 | https://testphase.rechtsinformationen.bund.de/ |
| Gesetze im Internet | https://www.gesetze-im-internet.de/ |
| GII 목차 XML | https://www.gesetze-im-internet.de/gii-toc.xml |
| BGHeute API | https://bgheute.de/api/ |
| MCP SDK (TypeScript) | https://github.com/modelcontextprotocol/typescript-sdk |
| MCP 스펙 | https://spec.modelcontextprotocol.io/ |
