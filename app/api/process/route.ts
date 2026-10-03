import { NextResponse } from "next/server";
import { describe, getListing, moderate, saveListing } from "@/lib/cloudinary.server";
import { errorMessage } from "@/lib/listing";

export const maxDuration = 60;

// Runs the AI pipeline on a fresh upload: safety check and listing draft in
// parallel, then writes the result back onto the asset as metadata and tags.
export async function POST(req: Request) {
  const { publicId } = await req.json().catch(() => ({}));
  if (typeof publicId !== "string") {
    return NextResponse.json({ error: "publicId is required" }, { status: 400 });
  }
  const listing = await getListing(publicId);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const [mod, draft] = await Promise.allSettled([moderate(publicId), describe(publicId)]);
  const warnings: string[] = [];

  if (mod.status === "fulfilled") {
    listing.moderation = mod.value.approved ? "approved" : "rejected";
    listing.moderationReasons = mod.value.reasons;
  } else {
    warnings.push(`Safety check could not run: ${errorMessage(mod.reason)}`);
  }

  if (draft.status === "fulfilled") {
    const d = draft.value;
    Object.assign(listing, {
      title: d.title || listing.title,
      category: d.category,
      color: d.color,
      material: d.material,
      description: d.description,
      price: d.price,
      keywords: d.keywords,
      recolorTarget: d.recolorTarget,
      qualityTips: d.qualityTips,
    });
  } else {
    warnings.push(`AI listing draft could not run: ${errorMessage(draft.reason)}`);
  }

  try {
    await saveListing(listing);
  } catch (e) {
    return NextResponse.json({ error: `Could not save to Cloudinary: ${errorMessage(e)}` }, { status: 502 });
  }
  return NextResponse.json({ listing, warnings });
}
