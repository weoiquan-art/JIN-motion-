import type { CSSProperties } from "react";

export const BG = "#0b0b0b";
export const WHITE = "#f5f5f5";
export const GRAY = "#8e8e8e";
export const RED = "#ff3b30";
export const GREEN = "#30d158";

// Absolutely positioned and centred on a world point.
export const centred = (x: number, y: number, extra = ""): CSSProperties => ({
  position: "absolute",
  left: x,
  top: y,
  transform: `translate(-50%, -50%) ${extra}`,
});
