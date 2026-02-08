import { useState } from "react";

export type Platform = "macos" | "windows" | "linux";

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  return "linux";
}

let cachedPlatform: Platform | null = null;

export function getPlatform(): Platform {
  if (!cachedPlatform) {
    cachedPlatform = detectPlatform();
  }
  return cachedPlatform;
}

export function usePlatform(): Platform {
  const [platform] = useState(getPlatform);
  return platform;
}

export function isMacOS(): boolean {
  return getPlatform() === "macos";
}
