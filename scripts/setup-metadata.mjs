// Creates the optional structured metadata fields ShelfReady writes to.
// Run once per Cloudinary account: npm run setup:metadata
import { readFileSync, existsSync } from "node:fs";
import { v2 as cloudinary } from "cloudinary";

// Minimal .env.local loader so the script needs no extra dependency.
for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fields = [
  { external_id: "sr_title", label: "ShelfReady title", type: "string" },
  { external_id: "sr_price_inr", label: "ShelfReady price (INR)", type: "integer" },
  {
    external_id: "sr_status",
    label: "ShelfReady status",
    type: "enum",
    datasource: {
      values: [
        { external_id: "draft", value: "Draft" },
        { external_id: "published", value: "Published" },
        { external_id: "rejected", value: "Rejected" },
      ],
    },
  },
];

for (const field of fields) {
  try {
    await cloudinary.api.add_metadata_field(field);
    console.log(`Created ${field.external_id}`);
  } catch (e) {
    const msg = e?.error?.message ?? e?.message ?? String(e);
    console.log(`Skipped ${field.external_id}: ${msg}`);
  }
}
