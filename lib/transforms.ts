// Delivery URL builders. Every image the product shows is the original upload
// plus a Cloudinary transformation chain, generated on the fly at the CDN edge.
// Nothing is pre-rendered or stored twice.

export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

const DELIVERY = "f_auto/q_auto";

export function cldUrl(publicId: string, transformation = "") {
  const parts = [transformation, DELIVERY].filter(Boolean).join("/");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${parts}/${publicId}`;
}

// Generative prompts live inside the URL, so commas, slashes and other
// separators have to go before the text is URL-encoded.
export function promptParam(text: string) {
  const clean = text
    .replace(/[,/;:_|\\?#&=]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return encodeURIComponent(clean);
}

const CUTOUT = "e_background_removal";

export const original = (id: string, w = 1200) => cldUrl(id, `c_limit,w_${w}`);

export const thumb = (id: string, size = 480) =>
  cldUrl(id, `c_fill,g_auto,ar_1:1,w_${size}`);

// Clean e-commerce shot: subject cut out, soft shadow, neutral backdrop.
export const studioWhite = (id: string, w = 1000) =>
  cldUrl(
    id,
    `${CUTOUT}/e_dropshadow:azimuth_220;elevation_60;spread_20/c_pad,ar_1:1,w_${w},b_rgb:F4F4F5`,
  );

export const transparentPng = (id: string) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${CUTOUT}/c_limit,w_1600/f_png/${id}`;

// Lifestyle scene: generative background replace. A fixed seed per variation
// keeps each tile stable across reloads while giving distinct options.
export const scene = (id: string, prompt: string, seed: number, w = 800) =>
  cldUrl(
    id,
    `e_gen_background_replace:prompt_${promptParam(prompt)};seed_${seed}/c_fill,g_auto,ar_1:1,w_${w}`,
  );

// Colourway: recolour the product itself without a reshoot.
export const recolor = (id: string, item: string, hex: string, w = 600) =>
  cldUrl(
    id,
    `e_gen_recolor:prompt_${promptParam(item)};to-color_${hex.replace("#", "")}/c_fill,g_auto,ar_1:1,w_${w}`,
  );

export type Channel = {
  key: string;
  name: string;
  spec: string;
  note: string;
  url: (id: string) => string;
};

// One upload, every marketplace and social size. Content-aware cropping (g_auto)
// keeps the product in frame; generative fill extends canvases instead of
// cropping when the target is much taller or wider than the photo.
export const CHANNELS: Channel[] = [
  {
    key: "amazon",
    name: "Amazon / Flipkart main image",
    spec: "2000 × 2000, pure white",
    note: "Background removed, product padded on #FFFFFF as marketplaces require.",
    url: (id) => cldUrl(id, `${CUTOUT}/c_pad,ar_1:1,w_2000,b_white`),
  },
  {
    key: "insta-post",
    name: "Instagram post",
    spec: "1080 × 1350 (4:5)",
    note: "Content-aware crop keeps the product centred.",
    url: (id) => cldUrl(id, "c_fill,g_auto,ar_4:5,w_1080"),
  },
  {
    key: "insta-story",
    name: "Instagram / WhatsApp status",
    spec: "1080 × 1920 (9:16)",
    note: "Generative fill extends the scene instead of cropping the product.",
    url: (id) => cldUrl(id, "c_pad,ar_9:16,w_1080,b_gen_fill"),
  },
  {
    key: "whatsapp",
    name: "WhatsApp catalog",
    spec: "800 × 800",
    note: "Square, light enough to send on slow connections.",
    url: (id) => cldUrl(id, "c_fill,g_auto,ar_1:1,w_800"),
  },
  {
    key: "banner",
    name: "Store banner",
    spec: "1600 × 600",
    note: "Generative fill widens the frame for a website hero.",
    url: (id) => cldUrl(id, "c_pad,ar_8:3,w_1600,b_gen_fill"),
  },
];

export const SCENES = [
  "on a light wooden table in a sunlit modern Indian home",
  "on a white marble countertop in a minimal studio with soft shadows",
  "festive Diwali setting with warm diya lights and marigold flowers",
  "outdoor cafe table with soft morning light and blurred greenery",
];

export const COLOURWAYS = [
  { name: "Indigo", hex: "#3F51B5" },
  { name: "Maroon", hex: "#800020" },
  { name: "Mustard", hex: "#E1AD01" },
  { name: "Sage", hex: "#9CAF88" },
];

// Adds fl_attachment so the browser saves the file instead of opening it.
export function downloadUrl(url: string, filename: string) {
  return url.replace("/image/upload/", `/image/upload/fl_attachment:${filename}/`);
}
