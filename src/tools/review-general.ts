import { GENERAL_RULEBOOK } from "../lib/rulebooks/general.js";
import { reviewRulebook } from "../lib/rulebooks/reviewer.js";
import { genericContractReviewSchema, type GenericContractReviewToolInput } from "./review-tool-schema.js";

export const reviewGeneralSchema = genericContractReviewSchema;
export type ReviewGeneralInput = GenericContractReviewToolInput;

export async function reviewGeneral(input: ReviewGeneralInput): Promise<string> {
  return reviewRulebook(GENERAL_RULEBOOK, reviewGeneralSchema.parse(input));
}

