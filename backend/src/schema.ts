import { z } from "zod";

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Doit être un code devise ISO 4217 (ex: EUR, USD)");

export const convertQuerySchema = z.object({
  from: currencyCode,
  to: currencyCode,
  amount: z.coerce.number().positive("Le montant doit être positif"),
});

export type ConvertQuery = z.infer<typeof convertQuerySchema>;