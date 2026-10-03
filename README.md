# ShelfReady

**One phone photo in. A ready-to-sell listing out.**

Built for *Pixels to Products, the Cloudinary AI Hackathon 2026*.
**Track: PS-03 · Your Media-Savvy Startup.**

## The problem

India has millions of home businesses selling clothes, jewellery, food, crafts and decor on Instagram, WhatsApp, Meesho, Amazon and Flipkart. Most of them shoot products on a bedsheet with a phone. Turning that photo into a listing is slow, manual work:

- marketplaces reject photos that aren't on a pure white background;
- every channel wants a different size (square, 4:5, 9:16, banner);
- writing a searchable title, description, category and keywords takes time;
- a studio or lifestyle shoot costs more than many sellers make in a month;
- marketplaces delist products whose photos show prohibited items.

## What ShelfReady does

A seller drops one photo. In under a minute ShelfReady:

1. **Checks it is safe to sell.** Cloudinary AI Vision moderation asks a set of yes/no questions (weapons, drugs, adult, violent, hateful, wildlife). A blocked photo can never be published.
2. **Writes the listing.** AI Vision reads the photo and drafts the title, category, colour, material, description, a suggested price in rupees, search keywords and tips to improve the photo. The seller can edit any of it.
3. **Makes a studio shot.** Background removal plus a generated drop shadow turns the photo into a clean catalogue image.
4. **Makes lifestyle shots.** Generative background replace places the real product in scenes (a sunlit Indian home, a marble studio, a Diwali setting, a café), with seeded variations ("Another take") and a free-text custom scene.
5. **Makes colourways.** Generative recolour shows the same product in other colours, so a seller can list colours they stock without a reshoot.
6. **Exports every channel size.** Amazon/Flipkart 2000×2000 on white, Instagram 4:5, Instagram/WhatsApp status 9:16, WhatsApp catalog, a 1600×600 store banner and a transparent PNG. Content-aware cropping keeps the product in frame; generative fill extends the canvas instead of cutting the product off.
7. **Publishes to a searchable storefront.** Listings are filtered with the Cloudinary Search API and delivered with `f_auto` and `q_auto`.

## How Cloudinary is used

Cloudinary is the whole backend: there is no separate database or file store.

| Need | Cloudinary feature | Where |
| --- | --- | --- |
| Upload large phone photos straight from the browser | Signed Upload API (server signs, browser uploads) | `app/api/sign/route.ts`, `components/Uploader.tsx` |
| Block prohibited products | AI Vision `ai_vision_moderation` | `lib/cloudinary.server.ts` → `moderate()` |
| Draft the listing from the photo | AI Vision `ai_vision_general` | `lib/cloudinary.server.ts` → `describe()` |
| Store the listing | Contextual metadata, tags, and optional structured metadata | `saveListing()`, `scripts/setup-metadata.mjs` |
| Catalog and filters | Search API over tags | `searchCatalog()` |
| Studio shot | `e_background_removal`, `e_dropshadow`, `c_pad` | `lib/transforms.ts` |
| Lifestyle scenes and variations | `e_gen_background_replace` with `seed` | `lib/transforms.ts` → `scene()` |
| Colourways | `e_gen_recolor` | `lib/transforms.ts` → `recolor()` |
| Channel sizes | `c_fill,g_auto` content-aware crop, `b_gen_fill` generative fill | `CHANNELS` in `lib/transforms.ts` |
| Fast delivery | `f_auto`, `q_auto` on every URL, `fl_attachment` for downloads | `cldUrl()` |

Every derived image is a URL over the one original upload, generated on demand at the CDN and cached. The seller stores one file and gets more than 15 ready-to-use assets.

## Run it locally

Requirements: Node 20+ and a free Cloudinary account.

```bash
git clone <this repo>
cd <repo>
npm install
cp .env.example .env.local      # add your cloud name, API key and API secret
npm run setup:metadata          # optional: creates structured metadata fields
npm run dev                     # http://localhost:3000
```

`.env.local`:

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...   # optional, defaults to CLOUDINARY_CLOUD_NAME
```

### Deploy

Import the repo into Vercel, add the same environment variables, and deploy. Uploads go straight from the browser to Cloudinary, so Vercel's request size limit doesn't apply.

## How to test it

1. Open the home page and drop any product photo (a mug, a shoe, a kurta on a bed).
2. Watch the three steps: upload, safety check with AI draft, then the listing studio opens.
3. Check the AI-written title, category, price and keywords; edit them and press **Save**.
4. Scroll through the studio shot, lifestyle scenes (try **Another take** and a custom scene), colourways and channel exports. Download any of them.
5. Press **Publish to storefront**, then open **Storefront** and search for a keyword or filter by category.
6. Upload a photo of something prohibited (for example a toy gun or a cigarette pack) to see the safety check block publishing.

Generative transformations are rendered on first view and can take several seconds; the page shows a placeholder and retries until each one is ready.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Cloudinary Node SDK 2.

## Notes and limits

- This is a hackathon build with no seller accounts: anyone with the link can create listings. Moderation still applies to every upload.
- AI Vision and generative transformations use Cloudinary credits; the free plan covers a demo.
