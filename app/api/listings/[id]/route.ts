import { NextResponse } from "next/server";
import { cloudinary, getListing, saveListing } from "@/lib/cloudinary.server";
import { CATEGORIES, errorMessage } from "@/lib/listing";

type Ctx = { params: Promise<{ id: string }> };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  const title = str(body.title, 120);
  const category = str(body.category, 40);
  const color = str(body.color, 40);
  const material = str(body.material, 40);
  const description = str(body.description, 600);
  const price = str(body.price, 10);
  if (title !== undefined) listing.title = title;
  if (category !== undefined && (CATEGORIES as readonly string[]).includes(category)) listing.category = category;
  if (color !== undefined) listing.color = color;
  if (material !== undefined) listing.material = material;
  if (description !== undefined) listing.description = description;
  if (price !== undefined) listing.price = price.replace(/[^\d]/g, "");
  if (Array.isArray(body.keywords)) {
    listing.keywords = body.keywords.map((k: unknown) => String(k).trim().slice(0, 30)).filter(Boolean).slice(0, 10);
  }
  if (typeof body.published === "boolean") {
    if (body.published && listing.moderation !== "approved") {
      return NextResponse.json(
        { error: "Only listings that passed the safety check can be published." },
        { status: 409 },
      );
    }
    listing.published = body.published;
  }

  try {
    await saveListing(listing);
  } catch (e) {
    return NextResponse.json({ error: `Could not save to Cloudinary: ${errorMessage(e)}` }, { status: 502 });
  }
  return NextResponse.json({ listing });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  await cloudinary.uploader.destroy(id, { invalidate: true });
  return NextResponse.json({ ok: true });
}
