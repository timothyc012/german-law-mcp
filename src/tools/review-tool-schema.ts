import { z } from "zod";

export const genericContractReviewSchema = z.object({
  text: z.string().min(20).max(120_000).describe("Vertragstext oder repräsentativer Auszug zur Prüfung"),
  role: z
    .enum(["disclosing", "receiving", "mutual"])
    .default("receiving")
    .describe("Mandantenrolle, soweit für asymmetrische Klauseln relevant"),
  jurisdictions: z
    .array(z.enum(["DE", "EU", "KR"]))
    .default(["DE", "EU", "KR"])
    .describe("Welche Rechtsordnungen geprüft werden sollen"),
  language: z.enum(["de", "ko", "both"]).default("both").describe("Ausgabesprache"),
});

export type GenericContractReviewToolInput = z.input<typeof genericContractReviewSchema>;

