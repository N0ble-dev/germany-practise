import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { creatorBrand, creatorCopyright } from "@/lib/creator-brand";

export function CreatorCredit() {
  const signature = (
    <>
      <span className="creator-logo" aria-hidden="true">
        <Image
          src={creatorBrand.logo}
          alt=""
          width={34}
          height={38}
          unoptimized
        />
      </span>
      <span className="creator-signature-text">
        <span className="creator-eyebrow">Designed & built by</span>
        <strong>{creatorBrand.name}</strong>
      </span>
      <ArrowUpRight size={18} strokeWidth={1.7} aria-hidden="true" />
    </>
  );
  return (
    <div className="creator-credit">
      <a
        className="creator-signature"
        href={creatorBrand.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${creatorBrand.name}'s personal website (opens in a new tab)`}
      >
        {signature}
      </a>
      <a
        className="creator-copyright"
        href={creatorBrand.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${creatorCopyright} Visit the creator's website (opens in a new tab).`}
      >
        <span>
          © {creatorBrand.copyrightYear}{" "}
          <span className="creator-copyright-name">{creatorBrand.name}</span>
          {". All rights reserved."}
        </span>
      </a>
    </div>
  );
}
