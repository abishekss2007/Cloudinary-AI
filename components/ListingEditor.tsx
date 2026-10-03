"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SmartImage from "./SmartImage";
import { CATEGORIES, Listing } from "@/lib/listing";
import {
  CHANNELS,
  COLOURWAYS,
  SCENES,
  downloadUrl,
  original,
  recolor,
  scene,
  studioWhite,
  transparentPng,
} from "@/lib/transforms";

export default function ListingEditor({ initial }: { initial: Listing }) {
  const router = useRouter();
  const [l, setL] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const id = l.publicId;

  useEffect(() => {
    const w = sessionStorage.getItem(`warn:${id}`);
    if (w) setWarnings(JSON.parse(w));
  }, [id]);

  const patch = async (body: Partial<Listing>) => {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    setSaving(false);
    if (res.error) return setMsg({ ok: false, text: res.error });
    setL(res.listing);
    setMsg({ ok: true, text: body.published === undefined ? "Saved to Cloudinary." : res.listing.published ? "Published to your storefront." : "Moved back to drafts." });
  };

  const rerun = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: id }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.error) return setMsg({ ok: false, text: res.error });
    setL(res.listing);
    setWarnings(res.warnings ?? []);
    sessionStorage.removeItem(`warn:${id}`);
  };

  const remove = async () => {
    if (!confirm("Delete this listing and its photo from Cloudinary?")) return;
    await fetch(`/api/listings/${id}`, { method: "DELETE" });
    router.push("/catalog?drafts=1");
  };

  return (
    <div className="space-y-10">
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          <button onClick={rerun} disabled={saving} className="mt-2 font-semibold underline">
            Run the AI steps again
          </button>
        </div>
      )}

      {/* Before / after and the listing form */}
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="grid grid-cols-2 gap-3">
            <figure>
              <SmartImage src={original(id, 800)} alt="Original upload" aspect="aspect-square" label="Loading…" />
              <figcaption className="mt-1 text-center text-xs text-muted">Your photo</figcaption>
            </figure>
            <figure>
              <SmartImage src={studioWhite(id, 800)} alt="Studio version" label="Removing background…" />
              <figcaption className="mt-1 text-center text-xs text-muted">ShelfReady studio shot</figcaption>
            </figure>
          </div>
          <ModerationBadge l={l} onRerun={rerun} busy={saving} />
          {l.qualityTips.length > 0 && (
            <div className="mt-3 rounded-xl border border-line bg-white p-4 text-sm">
              <p className="font-semibold">Tips for your next photo</p>
              <ul className="mt-1 list-disc pl-5 text-muted">
                {l.qualityTips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form
          className="space-y-4 rounded-2xl border border-line bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const { title, category, color, material, description, price, keywords } = l;
            patch({ title, category, color, material, description, price, keywords });
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Listing details</h2>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-brand-dark">Drafted by AI Vision</span>
          </div>
          <Field label="Title">
            <input className="input" value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className="input" value={l.category} onChange={(e) => setL({ ...l, category: e.target.value })}>
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Price (₹)">
              <input
                className="input"
                inputMode="numeric"
                value={l.price}
                onChange={(e) => setL({ ...l, price: e.target.value.replace(/[^\d]/g, "") })}
              />
            </Field>
            <Field label="Colour">
              <input className="input" value={l.color} onChange={(e) => setL({ ...l, color: e.target.value })} />
            </Field>
            <Field label="Material">
              <input className="input" value={l.material} onChange={(e) => setL({ ...l, material: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="input min-h-24"
              value={l.description}
              onChange={(e) => setL({ ...l, description: e.target.value })}
            />
          </Field>
          <Field label="Search keywords (comma separated)">
            <input
              className="input"
              value={l.keywords.join(", ")}
              onChange={(e) => setL({ ...l, keywords: e.target.value.split(",").map((k) => k.trimStart()) })}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button disabled={saving} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Save
            </button>
            <button
              type="button"
              disabled={saving || l.moderation !== "approved"}
              onClick={() => patch({ published: !l.published })}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
              title={l.moderation !== "approved" ? "Only listings that passed the safety check can be published" : ""}
            >
              {l.published ? "Unpublish" : "Publish to storefront"}
            </button>
            {l.published && (
              <Link href="/catalog" className="text-sm font-medium text-brand-dark underline">
                View storefront
              </Link>
            )}
            <button type="button" onClick={remove} className="ml-auto text-sm text-muted hover:text-bad">
              Delete
            </button>
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
        </form>
      </section>

      {l.moderation !== "rejected" && (
        <>
          <Scenes id={id} />
          {l.recolorTarget && <Colourways id={id} item={l.recolorTarget} />}
          <Channels id={id} />
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function ModerationBadge({ l, onRerun, busy }: { l: Listing; onRerun: () => void; busy: boolean }) {
  if (l.moderation === "approved")
    return (
      <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-ok">
        <b>Passed the safety check.</b> AI Vision found nothing that marketplaces prohibit.
      </p>
    );
  if (l.moderation === "rejected")
    return (
      <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-bad">
        <b>Blocked by the safety check.</b> This photo can&apos;t be published because it appears to show:{" "}
        {l.moderationReasons.join(", ") || "prohibited content"}.
      </div>
    );
  return (
    <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm">
      <b>Safety check pending.</b> Publishing unlocks once it passes.{" "}
      <button onClick={onRerun} disabled={busy} className="font-semibold underline">
        Run it now
      </button>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Scenes({ id }: { id: string }) {
  const [seeds, setSeeds] = useState(SCENES.map((_, i) => i + 1));
  const [custom, setCustom] = useState("");
  const [customShown, setCustomShown] = useState<string | null>(null);
  return (
    <Section
      title="Lifestyle shots"
      sub="Generative background replace puts your real product in a new scene. Tap “Another take” for a fresh variation."
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SCENES.map((p, i) => {
          const url = scene(id, p, seeds[i]);
          return (
            <div key={p}>
              <SmartImage src={url} alt={p} />
              <p className="mt-1 line-clamp-2 text-xs text-muted">{p}</p>
              <div className="mt-1 flex gap-3 text-xs font-semibold">
                <button className="text-brand-dark" onClick={() => setSeeds(seeds.map((s, j) => (j === i ? s + 10 : s)))}>
                  Another take
                </button>
                <a href={downloadUrl(url, `scene-${i + 1}`)}>Download</a>
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="mt-5 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) setCustomShown(custom.trim());
        }}
      >
        <input
          className="input flex-1"
          placeholder="Describe your own scene, for example: on a beach towel at sunset"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Generate</button>
      </form>
      {customShown && (
        <div className="mt-4 max-w-sm">
          <SmartImage src={scene(id, customShown, 7)} alt={customShown} />
          <a className="mt-1 inline-block text-xs font-semibold" href={downloadUrl(scene(id, customShown, 7), "custom-scene")}>
            Download
          </a>
        </div>
      )}
    </Section>
  );
}

function Colourways({ id, item }: { id: string; item: string }) {
  return (
    <Section
      title="Colourways"
      sub={`Generative recolour changes only the ${item}, so you can list colours you stock without a reshoot.`}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {COLOURWAYS.map((c) => (
          <div key={c.name}>
            <SmartImage src={recolor(id, item, c.hex)} alt={`${item} in ${c.name}`} label="Recolouring…" />
            <p className="mt-1 flex items-center gap-2 text-xs font-medium">
              <span className="h-3 w-3 rounded-full" style={{ background: c.hex }} />
              {c.name}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Channels({ id }: { id: string }) {
  return (
    <Section
      title="Export for every channel"
      sub="Each size is a live Cloudinary URL delivered with f_auto and q_auto, so buyers get WebP or AVIF at the smallest good quality."
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {CHANNELS.map((c) => {
          const url = c.url(id);
          const aspect =
            c.key === "insta-story" ? "aspect-[9/16]" : c.key === "insta-post" ? "aspect-[4/5]" : c.key === "banner" ? "aspect-[8/3]" : "aspect-square";
          return (
            <div key={c.key} className="flex flex-col rounded-xl border border-line bg-white p-3">
              <div className="flex flex-1 items-center">
                <SmartImage src={url} alt={c.name} aspect={aspect} className="w-full" label="Rendering…" />
              </div>
              <p className="mt-2 text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted">{c.spec}</p>
              <p className="mt-1 text-xs text-muted">{c.note}</p>
              <div className="mt-2 flex gap-3 text-xs font-semibold">
                <a href={downloadUrl(url, `${c.key}`)} className="text-brand-dark">
                  Download
                </a>
                <button onClick={() => navigator.clipboard.writeText(url)}>Copy link</button>
              </div>
            </div>
          );
        })}
        <div className="flex flex-col rounded-xl border border-line bg-white p-3">
          <div className="flex flex-1 items-center">
            <SmartImage
              src={transparentPng(id)}
              alt="Transparent cutout"
              className="w-full bg-[conic-gradient(#eee_0_25%,#fff_0_50%,#eee_0_75%,#fff_0)] bg-[length:16px_16px]"
              label="Cutting out…"
            />
          </div>
          <p className="mt-2 text-sm font-semibold">Transparent PNG</p>
          <p className="text-xs text-muted">For your own designs and posters.</p>
          <a href={downloadUrl(transparentPng(id), "cutout")} className="mt-2 text-xs font-semibold text-brand-dark">
            Download
          </a>
        </div>
      </div>
    </Section>
  );
}
