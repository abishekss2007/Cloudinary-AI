import Link from "next/link";
import SmartImage from "@/components/SmartImage";
import { isConfigured, searchCatalog } from "@/lib/cloudinary.server";
import { CATEGORIES, errorMessage } from "@/lib/listing";
import { studioWhite } from "@/lib/transforms";

export const dynamic = "force-dynamic";

type Search = Promise<{ q?: string; category?: string; drafts?: string }>;

export default async function Catalog({ searchParams }: { searchParams: Search }) {
  const { q = "", category = "", drafts } = await searchParams;
  const includeDrafts = drafts === "1";
  let listings: Awaited<ReturnType<typeof searchCatalog>> = [];
  let error: string | null = null;
  if (isConfigured()) {
    try {
      listings = await searchCatalog({ q, category, includeDrafts });
    } catch (e) {
      error = errorMessage(e);
    }
  } else {
    error = "Cloudinary credentials are not set.";
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">
        {includeDrafts ? "Seller dashboard" : "Storefront"}
      </p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
        {includeDrafts ? "All your listings" : "Shop the catalogue"}
      </h1>

      <form className="mt-6 flex flex-col gap-2 sm:flex-row" action="/catalog">
        {includeDrafts && <input type="hidden" name="drafts" value="1" />}
        <input name="q" defaultValue={q} placeholder="Search, for example: blue cotton kurta" className="input flex-1" />
        <select name="category" defaultValue={category} className="input sm:w-56">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      <p className="mt-2 text-xs text-muted">
        Results come from the Cloudinary Search API over the tags and metadata AI Vision wrote for each photo.
      </p>

      {error && <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>}

      {!error && listings.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-muted">
          {includeDrafts ? "No listings yet." : "Nothing published yet."}{" "}
          <Link href="/" className="font-semibold text-brand-dark underline">
            Create a listing
          </Link>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {listings.map((l) => (
          <Link key={l.publicId} href={`/listing/${l.publicId}`} className="group rounded-2xl border border-line bg-white p-3 hover:shadow-md">
            <SmartImage src={studioWhite(l.publicId, 600)} alt={l.title} label="Preparing photo…" />
            <div className="mt-3 flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-semibold group-hover:text-brand-dark">{l.title || "Untitled product"}</p>
              {l.price && <p className="shrink-0 text-sm font-bold">₹{Number(l.price).toLocaleString("en-IN")}</p>}
            </div>
            <p className="mt-1 text-xs text-muted">{[l.category, l.color, l.material].filter(Boolean).join(" · ")}</p>
            {includeDrafts && (
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  l.moderation === "rejected"
                    ? "bg-red-50 text-bad"
                    : l.published
                      ? "bg-green-50 text-ok"
                      : "bg-stone-100 text-muted"
                }`}
              >
                {l.moderation === "rejected" ? "Blocked" : l.published ? "Published" : "Draft"}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
