import { EMPLOYMENT_RULEBOOK } from "../lib/rulebooks/employment.js";
import { reviewRulebook } from "../lib/rulebooks/reviewer.js";
import { genericContractReviewSchema, type GenericContractReviewToolInput } from "./review-tool-schema.js";

export const reviewEmploymentSchema = genericContractReviewSchema;
export type ReviewEmploymentInput = GenericContractReviewToolInput;

export async function reviewEmployment(input: ReviewEmploymentInput): Promise<string> {
  return reviewRulebook(EMPLOYMENT_RULEBOOK, reviewEmploymentSchema.parse(input));
}

