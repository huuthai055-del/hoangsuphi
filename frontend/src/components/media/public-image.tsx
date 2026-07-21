"use client";

import Image, { type ImageLoaderProps, type ImageProps } from "next/image";
import { useState } from "react";
import { MediaFallback } from "@/components/media/media-fallback";
import { cn } from "@/lib/cn";

export interface PublicImageProps
  extends Omit<ImageProps, "onError" | "alt" | "width" | "height"> {
  alt: string;
  width: number;
  height: number;
  fallbackLabel?: string;
  wrapperClassName?: string;
}

function passthroughImageLoader({ src }: ImageLoaderProps): string {
  return src;
}

export function PublicImage({
  alt,
  width,
  height,
  fallbackLabel,
  wrapperClassName,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  style,
  ...props
}: Readonly<PublicImageProps>) {
  const [hasError, setHasError] = useState(false);
  const aspectRatio = `${width} / ${height}`;

  if (hasError) {
    return (
      <MediaFallback
        decorative={alt === ""}
        label={fallbackLabel ?? (alt ? `Không tải được ảnh: ${alt}` : "Không tải được hình ảnh")}
        className={wrapperClassName}
        style={{ aspectRatio }}
      />
    );
  }

  return (
    <span
      className={cn("block overflow-hidden bg-muted", wrapperClassName)}
      style={{ aspectRatio }}
    >
      <Image
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loader={passthroughImageLoader}
        unoptimized
        className={cn("h-full w-full object-cover", className)}
        style={style}
        onError={() => setHasError(true)}
        {...props}
      />
    </span>
  );
}
