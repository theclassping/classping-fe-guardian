"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

// Presigned photo URLs can reach the browser with as little as ten minutes left.
// When one has expired (403), refresh the page data to get fresh URLs. Refreshes
// are spaced out so a photo that is genuinely missing cannot cause a loop.
const REFRESH_COOLDOWN_MS = 60_000;
let lastRefreshAt = 0;

export default function PresignedImage({ onError, alt, ...props }: ComponentProps<"img">) {
  const router = useRouter();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      onError={(event) => {
        onError?.(event);
        if (Date.now() - lastRefreshAt < REFRESH_COOLDOWN_MS) return;
        lastRefreshAt = Date.now();
        router.refresh();
      }}
    />
  );
}
