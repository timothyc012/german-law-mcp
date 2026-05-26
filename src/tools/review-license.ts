import { LICENSE_RULEBOOK } from "../lib/rulebooks/license.js";
import { reviewRulebook } from "../lib/rulebooks/reviewer.js";
import { genericContractReviewSchema, type GenericContractReviewToolInput } from "./review-tool-schema.js";

export const reviewLicenseSchema = genericContractReviewSchema;
export type ReviewLicenseInput = GenericContractReviewToolInput;

export async function reviewLicense(input: ReviewLicenseInput): Promise<string> {
  return reviewRulebook(LICENSE_RULEBOOK, reviewLicenseSchema.parse(input));
}

