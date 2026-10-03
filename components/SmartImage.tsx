"use client";

import { useEffect, useState } from "react";

// Generative transformations are rendered on first request and can take a few
// seconds; Cloudinary may answer 423 while the derived image is being made.
// This retries with backoff and shows a placeholder until the image is ready.
export default function SmartImage({
  src,
  alt,
  className = "",
  aspect = "aspect-square",
  label = "Generating with Cloudinary AI…",
}: {
  src: string;
  alt: string;
  className?: string;
  aspect?: string;
  label?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const onError = () => {
    if (attempt >= 6) return setFailed(true);
    const delay = Math.min(2000 * 2 ** attempt, 15000);
    setTimeout(() => setAttempt((a) => a + 1), delay);
  };

  const url = attempt ? `${src}${src.includes("?") ? "&" : "?"}r=${attempt}` : src;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-stone-100 ${aspect} ${className}`}>
      {!loaded && !failed && (
        <div className="skeleton absolute inset-0 grid place-items-center p-3 text-center text-xs font-medium text-muted">
          {label}
        </div>
      )}
      {failed ? (
        <div className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-muted">
          This transformation is not available on this Cloudinary plan yet.
          <button
            className="mt-2 rounded-md border border-line bg-white px-2 py-1 font-medium text-ink"
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={onError}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
