import Uploader from "@/components/Uploader";
import { isConfigured } from "@/lib/cloudinary.server";

const FEATURES = [
  { icon: "🛡️", title: "Safety check", body: "AI Vision moderation blocks weapons, drugs, adult or violent images before they can be published." },
  { icon: "✍️", title: "Listing written for you", body: "AI Vision reads the photo and drafts the title, category, colour, material, price and keywords." },
  { icon: "✨", title: "Studio and lifestyle shots", body: "Background removal, drop shadows and generative backgrounds turn a kitchen-table photo into a catalogue shot." },
  { icon: "🎨", title: "Colourways without a reshoot", body: "Generative recolour shows the same product in other colours you stock." },
  { icon: "📐", title: "Every channel size", body: "Content-aware crops and generative fill export Amazon, Instagram, WhatsApp and banner sizes in one click." },
  { icon: "🔎", title: "Searchable storefront", body: "Listings live as Cloudinary metadata and tags, queried with the Search API and delivered with f_auto and q_auto." },
];

export const dynamic = "force-dynamic";

export default function Home() {
  const configured = isConfigured();
  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">For small online sellers</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            One phone photo in. A ready-to-sell listing out.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Millions of home businesses sell on Instagram, WhatsApp and marketplaces with photos taken on a bedsheet.
            ShelfReady uses Cloudinary AI to check, describe, restyle and resize each photo for every place you sell, in
            under a minute.
          </p>
        </div>
        <div>
          {configured ? (
            <Uploader />
          ) : (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm">
              <p className="font-semibold">Cloudinary is not connected yet.</p>
              <p className="mt-1">
                Copy <code>.env.example</code> to <code>.env.local</code>, add your cloud name, API key and secret, then
                restart the dev server.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-white p-5">
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-2 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
