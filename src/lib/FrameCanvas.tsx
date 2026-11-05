// A full-frame <canvas> redrawn on every render from a pure draw function of
// the frame. Drawing happens in useLayoutEffect, before Remotion takes the
// screenshot; nothing is kept between frames, so frames can render in any
// order and in parallel.

import React, { useLayoutEffect, useRef } from "react";

export const FrameCanvas: React.FC<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  style?: React.CSSProperties;
}> = ({ width, height, draw, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height);
  });
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height, ...style }} />;
};

/** an offscreen canvas of the same size (for blur / additive passes) */
export const offscreen = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  return { c, ctx };
};
