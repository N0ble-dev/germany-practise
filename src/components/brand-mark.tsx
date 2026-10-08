import Image from "next/image";

export function BrandMark() {
  return (
    <Image
      className="brand-symbol"
      src="/brand/deutsch-journey.svg"
      alt=""
      width={40}
      height={40}
      unoptimized
    />
  );
}
