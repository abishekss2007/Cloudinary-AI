// A listing is a single Cloudinary asset. Its fields live in the asset's
// contextual metadata and its state lives in tags, so Cloudinary is the
// system of record and the Search API is the catalog query engine.

export const APP_TAG = "shelfready";

export const CATEGORIES = [
  "Apparel",
  "Footwear",
  "Jewellery & Accessories",
  "Bags",
  "Home & Decor",
  "Kitchen",
  "Beauty & Personal Care",
  "Electronics",
  "Handicrafts",
  "Food & Beverages",
  "Toys",
  "Other",
] as const;

export type ModerationStatus = "pending" | "approved" | "rejected";

export type Listing = {
  publicId: string;
  createdAt: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  title: string;
  category: string;
  color: string;
  material: string;
  description: string;
  price: string;
  keywords: string[];
  recolorTarget: string;
  qualityTips: string[];
  moderation: ModerationStatus;
  moderationReasons: string[];
  published: boolean;
};

type RawResource = {
  public_id: string;
  created_at: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  tags?: string[];
  context?: { custom?: Record<string, string> } | Record<string, string>;
};

const split = (v?: string) =>
  (v ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

export function toListing(r: RawResource): Listing {
  // The Admin API nests context under `custom`; the Search API returns it flat.
  const ctx: Record<string, string> =
    (r.context && "custom" in r.context
      ? (r.context.custom as Record<string, string>)
      : (r.context as Record<string, string>)) ?? {};
  const tags = r.tags ?? [];
  const moderation: ModerationStatus = tags.includes("rejected")
    ? "rejected"
    : tags.includes("approved")
      ? "approved"
      : "pending";
  return {
    publicId: r.public_id,
    createdAt: r.created_at,
    width: r.width,
    height: r.height,
    bytes: r.bytes,
    format: r.format,
    title: ctx.title ?? "",
    category: ctx.category ?? "",
    color: ctx.color ?? "",
    material: ctx.material ?? "",
    description: ctx.description ?? "",
    price: ctx.price ?? "",
    keywords: split(ctx.keywords),
    recolorTarget: ctx.recolor_target ?? "",
    qualityTips: split(ctx.quality_tips),
    moderation,
    moderationReasons: split(ctx.moderation_reasons),
    published: tags.includes("published"),
  };
}

export function slugTag(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Tags make the catalog filterable with plain Search API expressions.
export function listingTags(l: Pick<Listing, "category" | "color" | "keywords" | "moderation" | "published">) {
  const tags = new Set<string>([APP_TAG, l.moderation]);
  if (l.published && l.moderation === "approved") tags.add("published");
  if (l.category) tags.add(`cat-${slugTag(l.category)}`);
  if (l.color) tags.add(slugTag(l.color));
  for (const k of l.keywords) if (k) tags.add(slugTag(k));
  return [...tags].filter(Boolean).slice(0, 40);
}

export function listingContext(l: Omit<Listing, "publicId" | "createdAt" | "width" | "height" | "bytes" | "format" | "moderation" | "published">) {
  return {
    title: l.title,
    category: l.category,
    color: l.color,
    material: l.material,
    description: l.description,
    price: l.price,
    keywords: l.keywords.join(";"),
    recolor_target: l.recolorTarget,
    quality_tips: l.qualityTips.join(";"),
    moderation_reasons: l.moderationReasons.join(";"),
  };
}

// The Cloudinary SDK rejects with `{ error: { message } }` objects, not Errors.
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  const obj = e as { error?: { message?: string }; message?: string } | null;
  return obj?.error?.message ?? obj?.message ?? String(e);
}
