import { DPA_RULEBOOK } from "../lib/rulebooks/dpa.js";
import { reviewRulebook } from "../lib/rulebooks/reviewer.js";
import { genericContractReviewSchema, type GenericContractReviewToolInput } from "./review-tool-schema.js";

export const reviewDpaSchema = genericContractReviewSchema;
export type ReviewDpaInput = GenericContractReviewToolInput;

export async function reviewDpa(input: ReviewDpaInput): Promise<string> {
  return reviewRulebook(DPA_RULEBOOK, reviewDpaSchema.parse(input));
}

