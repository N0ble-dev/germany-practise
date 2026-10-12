import { z } from "zod";
import { wordSchema, type Word } from "./learning";

export const sharedWordSchema = z.object({
  german: z.string().trim().min(1).max(120),
  english: z.string().trim().min(1).max(240),
  arabic: z.string().max(240).default(""),
  type: z.enum(["noun", "verb", "adjective", "phrase"]),
  article: z.enum(["", "der", "die", "das"]),
  plural: z.string().max(120).default(""),
  topic: z.string().max(100),
  lesson: z.number().int().min(1).max(12),
  example: z.string().max(500),
  hint: z.string().max(500),
});
export const sharedContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("word"), word: sharedWordSchema }),
  z.object({
    kind: z.literal("sentence"),
    sentence: z.string().trim().min(1).max(500),
  }),
]);
export type SharedContent = z.infer<typeof sharedContentSchema>;
export type SpaceMember = { userId: string; name: string; seat: number };
export type StudySpace = {
  id: string;
  name: string;
  ownerId: string;
  members: SpaceMember[];
};
export type SpaceItem = {
  id: string;
  authorId: string | null;
  authorName: string;
  content: SharedContent;
  createdAt: string;
};
export type SpaceInvite = { seat: number; expiresAt: string };
export type SpaceDetail = {
  space: StudySpace;
  items: SpaceItem[];
  invites: SpaceInvite[];
  nextCursor: string | null;
};

export const socialActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(1).max(60),
  }),
  z.object({
    action: z.literal("invite"),
    spaceId: z.uuid(),
    seat: z.union([z.literal(1), z.literal(2)]),
  }),
  z.object({
    action: z.literal("revoke"),
    spaceId: z.uuid(),
    seat: z.union([z.literal(1), z.literal(2)]),
  }),
  z.object({
    action: z.literal("join"),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({
    action: z.literal("remove"),
    spaceId: z.uuid(),
    userId: z.uuid(),
  }),
  z.object({ action: z.literal("leave"), spaceId: z.uuid() }),
  z.object({
    action: z.literal("share"),
    spaceId: z.uuid(),
    content: sharedContentSchema,
  }),
  z.object({
    action: z.literal("delete-item"),
    spaceId: z.uuid(),
    itemId: z.uuid(),
  }),
]);
export type SocialAction = z.infer<typeof socialActionSchema>;

export const profileCardSchema = z.object({
  name: z.string().trim().min(1).max(60),
  showPhoto: z.boolean(),
  showStats: z.boolean(),
  words: z.number().int().min(0).max(5000),
  xp: z.number().int().min(0).max(1_000_000_000),
});
export type PublicCard = z.infer<typeof profileCardSchema>;
export type ProfileShare = {
  slug: string;
  card: PublicCard;
  image: string;
  updatedAt: string;
};

export function copySharedWord(word: z.infer<typeof sharedWordSchema>): Word {
  return wordSchema.parse({
    ...word,
    id: crypto.randomUUID(),
    favorite: false,
    status: "new",
    due: new Date().toISOString(),
    interval: 0,
    ease: 2.5,
    reviews: 0,
    mistakes: 0,
  });
}
