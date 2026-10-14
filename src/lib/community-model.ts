import { z } from "zod";

export const signatureStyles = ["drawn", "written", "clean"] as const;
const signaturePoint = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
  })
  .strict();
export const signatureDrawingSchema = z
  .object({
    aspectRatio: z.number().finite().min(0.8).max(8),
    strokes: z.array(z.array(signaturePoint).min(2).max(1000)).min(1).max(40),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.strokes.reduce((count, stroke) => count + stroke.length, 0) > 2000
    )
      ctx.addIssue({
        code: "custom",
        message: "Keep the signature within 2000 points.",
      });
  });
export type SignatureDrawing = z.infer<typeof signatureDrawingSchema>;
function checkDrawing(
  value: {
    signatureStyle: (typeof signatureStyles)[number];
    signatureDrawing: SignatureDrawing | null;
  },
  ctx: z.RefinementCtx,
) {
  if ((value.signatureStyle === "drawn") !== Boolean(value.signatureDrawing))
    ctx.addIssue({
      code: "custom",
      message: "Draw a signature or choose a name style.",
      path: ["signatureDrawing"],
    });
}
export const sharedSentenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .transform((value) => value.normalize("NFC"));
export const signatureSchema = z
  .string()
  .trim()
  .max(60)
  .transform((value) => value.normalize("NFC"));
export const publishSentencesSchema = z
  .object({
    sentences: z.array(sharedSentenceSchema).min(1).max(5),
    signature: signatureSchema,
    signatureStyle: z.enum(signatureStyles),
    signatureDrawing: signatureDrawingSchema.nullable().default(null),
    public: z.literal(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    checkDrawing(value, ctx);
    if (new Set(value.sentences).size !== value.sentences.length)
      ctx.addIssue({ code: "custom", message: "Choose each sentence once." });
  });
export const editPublicSentenceSchema = z
  .object({
    german: sharedSentenceSchema,
    signature: signatureSchema,
    signatureStyle: z.enum(signatureStyles),
    signatureDrawing: signatureDrawingSchema.nullable().default(null),
    revision: z.number().int().min(0).max(2147483646),
  })
  .strict()
  .superRefine(checkDrawing);
export type PublishSentences = z.infer<typeof publishSentencesSchema>;
export type EditPublicSentence = z.infer<typeof editPublicSentenceSchema>;
export type PublicSentence = {
  id: string;
  german: string;
  signature: string;
  signatureStyle: (typeof signatureStyles)[number];
  signatureDrawing?: SignatureDrawing | null;
  createdAt: string;
  updatedAt: string;
};
export type OwnPublicSentence = PublicSentence & { revision: number };
export type SentenceFeed = {
  posts: PublicSentence[];
  nextCursor: string | null;
};
export const sentenceFeedQuery = z
  .object({
    q: z.string().trim().max(80).default(""),
    cursor: z.string().max(250).optional(),
  })
  .strict();
export const sentenceCursorSchema = z
  .object({
    // Keep PostgreSQL's full microsecond precision for stable keyset pagination.
    date: z
      .string()
      .max(40)
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/,
      )
      .refine((value) => Number.isFinite(Date.parse(value))),
    id: z.uuid(),
  })
  .strict();
