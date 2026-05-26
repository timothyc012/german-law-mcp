import { describe, expect, it } from "vitest";

import { activeContractRoutes, classifyContract, plannedContractRoutes } from "../../src/lib/contract-registry.js";
import { reviewContract, reviewContractSchema } from "../../src/tools/review-contract.js";

describe("review-contract dispatcher", () => {
  it("classifies NDA input and dispatches to the active review_nda tool", async () => {
    const output = await reviewContract({
      text:
        "This Non-Disclosure Agreement is governed by German law. The receiving party may use confidential information for evaluation only. " +
        "A GmbH and 주식회사 exchange personal data under this NDA. The seat of arbitration shall be London.",
      contract_type: "auto",
      role: "receiving",
      jurisdictions: ["DE", "EU", "KR"],
      language: "both",
    });

    expect(output).toContain("Contract Review Dispatcher");
    expect(output).toContain("Detected contract type: NDA");
    expect(output).toContain("Active Specialist Execution: review_nda");
    expect(output).toContain("NDA-Review");
    expect(output).toContain("Dispatcher-Payload");
  });

  it("discloses planned DPA route without pretending review_dpa is active", async () => {
    const output = await reviewContract({
      text:
        "This Data Processing Agreement is entered into under Art. 28 GDPR. The controller appoints the processor for personal data processing and subprocessor support.",
      contract_type: "auto",
      jurisdictions: ["DE", "EU", "KR"],
      language: "ko",
      include_fallback: false,
    });

    expect(output).toContain("Detected contract type: DPA");
    expect(output).toContain("review_dpa");
    expect(output).toContain("Status: PLANNED");
    expect(output).toContain("Specialist MCP tool is not active yet");
    expect(output).not.toContain("Active Specialist Execution");
  });

  it("uses German AGB quick-screen fallback for general contracts", async () => {
    const output = await reviewContract({
      text:
        "General Terms: The provider may change prices at any time without giving reasons. Termination must be made only by registered letter.",
      contract_type: "General",
      jurisdictions: ["DE"],
      language: "both",
      german_agb_context: "b2c",
      include_fallback: true,
    });

    expect(output).toContain("Detected contract type: General");
    expect(output).toContain("Limited Fallback: German AGB quick screen");
    expect(output).toContain("AGB-Kontrolle");
  });

  it("keeps only NDA active while tracking v2 planned routes", () => {
    expect(activeContractRoutes().map((route) => route.toolName)).toEqual(["review_nda"]);
    expect(plannedContractRoutes().map((route) => route.toolName)).toEqual([
      "review_dpa",
      "review_services",
      "review_license",
      "review_eula",
      "review_employment",
      "review_lease",
      "review_ma",
      "review_general",
    ]);
  });

  it("keeps classifier output deterministic for service contracts", () => {
    expect(classifyContract("Statement of Work for software implementation services and SLA support")).toMatchObject({
      contractType: "Service",
      confidence: "medium",
    });
  });

  it("rejects oversized dispatcher input before analysis", () => {
    const parsed = reviewContractSchema.safeParse({
      text: "x".repeat(120_001),
      contract_type: "auto",
    });

    expect(parsed.success).toBe(false);
  });
});
