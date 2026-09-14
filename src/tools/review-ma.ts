import { MA_RULEBOOK } from "../lib/rulebooks/ma.js";
import { reviewRulebook } from "../lib/rulebooks/reviewer.js";
import { genericContractReviewSchema, type GenericContractReviewToolInput } from "./review-tool-schema.js";

export const reviewMaSchema = genericContractReviewSchema;
export type ReviewMaInput = GenericContractReviewToolInput;

export async function reviewMa(input: ReviewMaInput): Promise<string> {
  return reviewRulebook(MA_RULEBOOK, reviewMaSchema.parse(input));
}

