import "server-only";
import { v2 as cloudinary } from "cloudinary";
import {
  APP_TAG,
  CATEGORIES,
  Listing,
  listingContext,
  listingTags,
  toListing,
} from "./listing";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export { cloudinary };

export function isConfigured() {
  return Boolean(cloudName && apiKey && apiSecret);
}

// ---------- AI Vision (Analyze API) ----------

async function analyze<T>(task: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(
    `https://api.cloudinary.com/v2/analysis/${cloudName}/analyze/${task}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64"),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? res.statusText;
    throw new Error(`AI Vision ${task} failed (${res.status}): ${msg}`);
  }
  return json as T;
}

// The analysis runs on a downsized JPEG so it is fast and cheap.
function analysisSource(publicId: string) {
  return { uri: cloudinary.url(publicId, { transformation: [{ width: 1024, crop: "limit" }], format: "jpg" }) };
}

const REJECTION_QUESTIONS = [
  "Does the image show weapons, ammunition or explosives?",
  "Does the image show drugs, drug paraphernalia, tobacco or alcohol?",
  "Does the image contain nudity or sexually suggestive content?",
  "Does the image contain graphic violence, blood or gore?",
  "Does the image show hateful symbols or offensive gestures?",
  "Does the image show a live animal or wildlife product being sold?",
];

export async function moderate(publicId: string) {
  type R = { data?: { analysis?: { responses?: { prompt?: string; value?: string }[] } } };
  const json = await analyze<R>("ai_vision_moderation", {
    source: analysisSource(publicId),
    rejection_questions: REJECTION_QUESTIONS,
  });
  const responses = json.data?.analysis?.responses ?? [];
  const reasons = responses
    .map((r, i) => ({ q: r.prompt ?? REJECTION_QUESTIONS[i], v: (r.value ?? "").toLowerCase() }))
    .filter((r) => r.v.startsWith("yes"))
    .map((r) => r.q.replace(/^Does the image (show|contain) /, "").replace(/\?$/, ""));
  return { approved: reasons.length === 0, reasons };
}

const LISTING_PROMPT = `You are helping a small Indian online seller create a product listing from this photo.
Reply with ONLY a JSON object, no markdown, with these keys:
"title": a specific, searchable product title under 70 characters,
"category": exactly one of ${JSON.stringify(CATEGORIES)},
"color": the main colour in one or two words,
"material": the likely material in one or two words,
"description": two persuasive sentences a buyer would read,
"price_inr": a realistic retail price in Indian rupees as a number,
"keywords": an array of 6 short search keywords,
"recolor_target": the noun for the main product to recolour, for example "shirt" or "mug",
"photo_tips": an array of up to 3 short tips to improve this photo, empty if it is already good.`;

type ListingDraft = {
  title?: string;
  category?: string;
  color?: string;
  material?: string;
  description?: string;
  price_inr?: number | string;
  keywords?: string[];
  recolor_target?: string;
  photo_tips?: string[];
};

function parseJsonLoose(text: string): ListingDraft {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return {};
  }
}

export async function describe(publicId: string) {
  type R = { data?: { analysis?: { responses?: { value?: string }[] } } };
  const json = await analyze<R>("ai_vision_general", {
    source: analysisSource(publicId),
    prompts: [LISTING_PROMPT],
  });
  const text = json.data?.analysis?.responses?.[0]?.value ?? "";
  const d = parseJsonLoose(text);
  const category = CATEGORIES.find((c) => c.toLowerCase() === String(d.category ?? "").toLowerCase()) ?? "Other";
  const price = Number(String(d.price_inr ?? "").replace(/[^\d.]/g, ""));
  return {
    title: String(d.title ?? "").trim(),
    category,
    color: String(d.color ?? "").trim(),
    material: String(d.material ?? "").trim(),
    description: String(d.description ?? "").trim(),
    price: price > 0 ? String(Math.round(price)) : "",
    keywords: (Array.isArray(d.keywords) ? d.keywords : []).map(String).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    recolorTarget: String(d.recolor_target ?? "").trim(),
    qualityTips: (Array.isArray(d.photo_tips) ? d.photo_tips : []).map(String).filter(Boolean).slice(0, 3),
  };
}

// ---------- Listings stored on the asset ----------

export async function getListing(publicId: string): Promise<Listing | null> {
  try {
    const r = await cloudinary.api.resource(publicId, { context: true, tags: true });
    if (!r.tags?.includes(APP_TAG)) return null;
    return toListing(r);
  } catch {
    return null;
  }
}

export async function saveListing(l: Listing) {
  await cloudinary.api.update(l.publicId, {
    tags: listingTags(l),
    context: listingContext(l),
  });
  await writeStructuredMetadata(l);
}

// Structured metadata is optional: it is written only when the fields exist
// (created by `npm run setup:metadata`), so the app works on a fresh account too.
async function writeStructuredMetadata(l: Listing) {
  const price = Number(l.price);
  const metadata: Record<string, string | number> = {
    sr_title: l.title.slice(0, 250),
    sr_status: l.moderation === "rejected" ? "rejected" : l.published ? "published" : "draft",
  };
  if (price > 0) metadata.sr_price_inr = price;
  try {
    await cloudinary.uploader.update_metadata(metadata, [l.publicId]);
  } catch {
    // Fields not set up on this account; contextual metadata already holds the data.
  }
}

export type CatalogQuery = { q?: string; category?: string; includeDrafts?: boolean };

// Terms are reduced to safe word characters before going into an expression,
// so user input can never change the expression's structure.
function safeTerm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").trim();
}

export async function searchCatalog({ q, category, includeDrafts }: CatalogQuery) {
  // Structured filters run as a Search API expression over tags.
  const parts = [`tags=${APP_TAG}`];
  if (!includeDrafts) parts.push("tags=published");
  if (category) parts.push(`tags=cat-${safeTerm(category).replace(/\s+/g, "-")}`);
  const res = await cloudinary.search
    .expression(parts.join(" AND "))
    .with_field("context")
    .with_field("tags")
    .sort_by("created_at", "desc")
    .max_results(100)
    .execute();
  const listings = (res.resources ?? []).map(toListing) as Listing[];

  // Free text matches every word against the listing's AI-written fields.
  const words = safeTerm(q ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return listings;
  return listings.filter((l) => {
    const hay = [l.title, l.description, l.category, l.color, l.material, ...l.keywords]
      .join(" ")
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
