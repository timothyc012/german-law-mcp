import { SERVICE_RULEBOOK } from "../lib/rulebooks/service.js";
import { reviewRulebook } from "../lib/rulebooks/reviewer.js";
import { genericContractReviewSchema, type GenericContractReviewToolInput } from "./review-tool-schema.js";

export const reviewServicesSchema = genericContractReviewSchema;
export type ReviewServicesInput = GenericContractReviewToolInput;

export async function reviewServices(input: ReviewServicesInput): Promise<string> {
  return reviewRulebook(SERVICE_RULEBOOK, reviewServicesSchema.parse(input));
}

