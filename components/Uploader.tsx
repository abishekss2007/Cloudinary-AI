"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

type Step = "idle" | "upload" | "ai" | "done" | "error";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Uploading to Cloudinary" },
  { key: "ai", label: "Safety check and AI listing draft" },
  { key: "done", label: "Opening your listing studio" },
];

export default function Uploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const start = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
      if (file.size > 10 * 1024 * 1024) return setError("Images up to 10 MB work on the free plan.");
      setError(null);
      setPreview(URL.createObjectURL(file));
      setStep("upload");
      setProgress(0);
      try {
        const sign = await fetch("/api/sign", { method: "POST" }).then((r) => r.json());
        if (sign.error) throw new Error(sign.error);

        const form = new FormData();
        form.append("file", file);
        form.append("api_key", sign.apiKey);
        form.append("signature", sign.signature);
        for (const [k, v] of Object.entries(sign.params)) form.append(k, String(v));

        const uploaded = await new Promise<{ public_id: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`);
          xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
          xhr.onload = () => {
            const body = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300) resolve(body);
            else reject(new Error(body?.error?.message ?? "Upload failed"));
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(form);
        });

        setStep("ai");
        const res = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: uploaded.public_id }),
        }).then((r) => r.json());
        if (res.error) throw new Error(res.error);
        if (res.warnings?.length) sessionStorage.setItem(`warn:${uploaded.public_id}`, JSON.stringify(res.warnings));

        setStep("done");
        router.push(`/listing/${uploaded.public_id}`);
      } catch (e) {
        setStep("error");
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [router],
  );

  const busy = step === "upload" || step === "ai" || step === "done";
  const activeIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
      {!busy ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) start(f);
          }}
          className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${
            dragging ? "border-brand bg-orange-50" : "border-stone-300 hover:border-brand hover:bg-orange-50/50"
          }`}
        >
          <span className="text-4xl">📸</span>
          <span className="mt-3 text-lg font-semibold">Drop a product photo, or tap to take one</span>
          <span className="mt-1 text-sm text-muted">A quick phone shot on any background is fine. JPG, PNG or HEIC.</span>
        </button>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your upload" className="aspect-square w-full rounded-xl object-cover" />
          )}
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      state === "done"
                        ? "bg-ok text-white"
                        : state === "active"
                          ? "animate-pulse bg-brand text-white"
                          : "bg-stone-200 text-muted"
                    }`}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className={state === "todo" ? "text-muted" : "font-medium"}>
                    {s.label}
                    {s.key === "upload" && state === "active" && ` · ${Math.round(progress * 100)}%`}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) start(f);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          {error}{" "}
          {step === "error" && (
            <button className="font-semibold underline" onClick={() => setStep("idle")}>
              Try again
            </button>
          )}
        </p>
      )}
    </div>
  );
}
