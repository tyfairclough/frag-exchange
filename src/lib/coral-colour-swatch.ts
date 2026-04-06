import type { CSSProperties } from "react";

/** Background for the explore colour filter swatch (solid or gradient). */
export function coralExploreSwatchStyle(colour: string): CSSProperties {
  const gradients: Record<string, string> = {
    Rainbow: "conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
    "Multi-colour": "linear-gradient(135deg, #f472b6 0%, #818cf8 40%, #38bdf8 75%, #4ade80 100%)",
  };
  const g = gradients[colour];
  if (g) {
    return { background: g };
  }

  const solids: Record<string, string> = {
    Black: "#171717",
    Blue: "#2563eb",
    Brown: "#92400e",
    Cream: "#f5e6c8",
    Gold: "#c9a227",
    Green: "#16a34a",
    Grey: "#6b7280",
    Orange: "#ea580c",
    Pink: "#ec4899",
    Purple: "#9333ea",
    Red: "#dc2626",
    Tan: "#c4a574",
    White: "#ffffff",
    Yellow: "#facc15",
  };
  const hex = solids[colour];
  if (hex) {
    return { backgroundColor: hex };
  }

  return { backgroundColor: "#cbd5e1" };
}

/** Checkmark stroke: light swatches need a dark tick for contrast. */
export function coralExploreSwatchCheckClass(colour: string): string {
  if (colour === "White" || colour === "Cream" || colour === "Yellow" || colour === "Tan") {
    return "text-emerald-800";
  }
  if (colour === "Rainbow" || colour === "Multi-colour") {
    return "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)]";
  }
  return "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]";
}
