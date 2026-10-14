"use client";
import { Copy, Quote, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import { SignatureInk } from "./signature-pad";
import { speakGerman } from "@/lib/speech";
import type { PublicSentence } from "@/lib/community-model";

export function CommunitySentenceCard({
  post,
  onMessage,
  preview = false,
}: {
  post: PublicSentence;
  onMessage?: (message: string) => void;
  preview?: boolean;
}) {
  const tone =
    ["lavender", "mint", "blue", "peach"][
      parseInt(post.id.at(-1) || "0", 16) % 4
    ] || "lavender";
  return (
    <article
      className={`community-note community-note-${tone}`}
      aria-label={
        preview ? "Public sentence preview" : "Shared German sentence"
      }
    >
      <div className="community-note-top">
        <span>{preview ? "YOUR PUBLIC PREVIEW" : "A LITTLE GERMAN"}</span>
        <Quote size={19} aria-hidden="true" />
      </div>
      <p className="community-note-german" lang="de" dir="auto">
        {post.german}
      </p>
      <div className="community-note-signoff">
        {post.signatureStyle === "drawn" && post.signatureDrawing && (
          <div className="community-drawn-signature">
            <SignatureInk drawing={post.signatureDrawing} />
          </div>
        )}
        <span
          className={`community-signature community-signature-${post.signatureStyle}`}
          dir="auto"
        >
          {post.signature ? `— ${post.signature}` : "A fellow learner"}
        </span>
        {!preview && (
          <time dateTime={new Date(post.createdAt).toISOString()}>
            {new Date(post.createdAt).toLocaleDateString("en", {
              dateStyle: "medium",
              timeZone: "UTC",
            })}
          </time>
        )}
      </div>
      {!preview && (
        <div className="community-note-actions">
          <Button
            variant="ghost"
            onClick={() =>
              speakGerman(post.german).catch((error) =>
                onMessage?.(error.message),
              )
            }
          >
            <Volume2 size={16} aria-hidden="true" /> Listen
          </Button>
          <Button
            variant="ghost"
            aria-label={`Copy sentence: ${post.german}`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(post.german);
                onMessage?.("Sentence copied.");
              } catch {
                onMessage?.(
                  "Copy is unavailable here. Select the sentence text to copy it.",
                );
              }
            }}
          >
            <Copy size={16} aria-hidden="true" /> Copy
          </Button>
        </div>
      )}
    </article>
  );
}
