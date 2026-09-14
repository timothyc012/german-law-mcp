import { EULA_RULEBOOK } from "../lib/rulebooks/eula.js";
import { reviewRulebook } from "../lib/rulebooks/reviewer.js";
import { genericContractReviewSchema, type GenericContractReviewToolInput } from "./review-tool-schema.js";

export const reviewEulaSchema = genericContractReviewSchema;
export type ReviewEulaInput = GenericContractReviewToolInput;

export async function reviewEula(input: ReviewEulaInput): Promise<string> {
  return reviewRulebook(EULA_RULEBOOK, reviewEulaSchema.parse(input));
}

