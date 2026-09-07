"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPriceListImage } from "../_lib/price-list";

type PriceListImageProps = {
  filename?: string;
  alt: string;
  className?: string;
};

function PriceListImagePlaceholder({ className }: { className: string }) {
  return (
    <span className={`flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 ${className}`}>
      <ImageIcon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function PrivatePriceListImage({ filename, alt, className }: Required<PriceListImageProps>) {
  const [loaded, setLoaded] = useState({ filename: "", src: "" });

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    void fetchPriceListImage(filename)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ filename, src: objectUrl });
      })
      .catch(() => { if (active) setLoaded({ filename, src: "" }); });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename]);

  const src = loaded.filename === filename ? loaded.src : "";
  if (!src) {
    return <PriceListImagePlaceholder className={className} />;
  }

  // Blob URL dibuat dari endpoint privat yang telah melewati Bearer authentication.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className}`} />;
}

export function PriceListImage({ filename = "", alt, className = "" }: PriceListImageProps) {
  if (!filename) {
    return <PriceListImagePlaceholder className={className} />;
  }

  if (/^https:\/\/res\.cloudinary\.com\//i.test(filename)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={filename} alt={alt} className={`object-cover ${className}`} />;
  }

  return <PrivatePriceListImage filename={filename} alt={alt} className={className} />;
}
