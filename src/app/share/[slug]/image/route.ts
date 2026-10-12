import { SocialRepository } from "@/lib/social-repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (!/^[a-f0-9]{48}$/.test(slug))
    return new Response(null, { status: 404, headers });
  try {
    const share = await new SocialRepository().publicCard(slug);
    if (!share) return new Response(null, { status: 404, headers });
    return new Response(Buffer.from(share.image.slice(22), "base64"), {
      headers: {
        ...headers,
        "Content-Type": "image/png",
        ...(new URL(request.url).searchParams.has("download")
          ? {
              "Content-Disposition":
                'attachment; filename="deutsch-journey-learner-card.png"',
            }
          : {}),
      },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
