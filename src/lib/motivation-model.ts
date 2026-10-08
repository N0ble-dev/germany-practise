import { z } from "zod";
export const destinationIds = [
  "berlin",
  "hamburg",
  "heidelberg",
  "eibsee",
] as const;
export type DestinationId = (typeof destinationIds)[number];
export const motivationSchema = z.object({
  destination: z.enum(destinationIds).default("berlin"),
  why: z.string().trim().max(280).default(""),
});
