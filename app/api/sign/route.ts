import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cloudinary, isConfigured } from "@/lib/cloudinary.server";
import { APP_TAG } from "@/lib/listing";

// Signs a direct browser-to-Cloudinary upload, so large phone photos never
// pass through this server. The server picks the public ID and tags.
export async function POST() {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Cloudinary credentials are not set." }, { status: 500 });
  }
  const params = {
    timestamp: Math.round(Date.now() / 1000),
    public_id: `listing_${randomBytes(6).toString("hex")}`,
    asset_folder: "shelfready",
    tags: `${APP_TAG},pending`,
  };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  return NextResponse.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    signature,
    params,
  });
}
