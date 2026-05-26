import { LEASE_RULEBOOK } from "../lib/rulebooks/lease.js";
import { reviewRulebook } from "../lib/rulebooks/reviewer.js";
import { genericContractReviewSchema, type GenericContractReviewToolInput } from "./review-tool-schema.js";

export const reviewLeaseSchema = genericContractReviewSchema;
export type ReviewLeaseInput = GenericContractReviewToolInput;

export async function reviewLease(input: ReviewLeaseInput): Promise<string> {
  return reviewRulebook(LEASE_RULEBOOK, reviewLeaseSchema.parse(input));
}

