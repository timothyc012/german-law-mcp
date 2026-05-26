import { describe, expect, it } from "vitest";

import { reviewDpa } from "../../src/tools/review-dpa.js";
import { reviewEmployment } from "../../src/tools/review-employment.js";
import { reviewEula } from "../../src/tools/review-eula.js";
import { reviewGeneral } from "../../src/tools/review-general.js";
import { reviewLease } from "../../src/tools/review-lease.js";
import { reviewLicense } from "../../src/tools/review-license.js";
import { reviewMa } from "../../src/tools/review-ma.js";
import { reviewServices } from "../../src/tools/review-services.js";

describe("phase 2-6 contract rulebooks", () => {
  it.each([
    [
      "DPA",
      reviewDpa,
      "This Data Processing Agreement under Art. 28 GDPR lets the processor use subprocessors and describes security measures, audits, and deletion.",
    ],
    [
      "Service",
      reviewServices,
      "This Statement of Work covers implementation services, deliverables, change requests, acceptance, payment milestones, SLA support, and IP rights.",
    ],
    [
      "License",
      reviewLicense,
      "This License Agreement grants non-exclusive licensed rights, sublicensing, royalties, audit reporting, and open source component obligations.",
    ],
    [
      "EULA",
      reviewEula,
      "This End User License Agreement limits reverse engineering, changes terms by update, excludes warranty, limits liability, and collects telemetry data.",
    ],
    [
      "Employment",
      reviewEmployment,
      "This Employment Agreement sets salary, probation, termination notice, working time, overtime, vacation, and non-compete confidentiality duties.",
    ],
    [
      "Lease",
      reviewLease,
      "This Lease Agreement describes the rent, security deposit, repairs, termination, fixed term, sublease, and use of the leased premises.",
    ],
    [
      "MA",
      reviewMa,
      "This Share Purchase Agreement includes closing conditions, representations and warranties, indemnity cap, disclosure schedule, and merger control approval.",
    ],
    [
      "General",
      reviewGeneral,
      "This agreement between the parties covers scope, price, payment, term, termination, liability cap, governing law, jurisdiction, and authority.",
    ],
  ])("%s rulebook emits a dispatcher payload and source anchors", async (contractType, review, text) => {
    const output = await review({
      text,
      role: "receiving",
      jurisdictions: ["DE", "EU", "KR"],
      language: "both",
    });

    expect(output).toContain(`${contractType}-Review`);
    expect(output).toContain("Dispatcher-Payload");
    expect(output).toContain("citationAnchor");
    expect(output).toContain("Hinweis");
  });
});
