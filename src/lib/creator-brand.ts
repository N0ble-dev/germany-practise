// The product creator's identity is independent of the signed-in learner.
export const creatorBrand = {
  name: "Nabil Mohamed",
  logo: "/brand/nabil-logo.png",
  website: "https://nabil7.site/",
  copyrightYear: 2026,
} as const;

export const creatorCopyright = `© ${creatorBrand.copyrightYear} ${creatorBrand.name}. All rights reserved.`;
