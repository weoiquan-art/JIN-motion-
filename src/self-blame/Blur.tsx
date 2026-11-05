import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";
import { BLUR_HITS } from "./timeline.ts";

// Film-style motion blur (docs/remotion/动效.md §4): render the children at
// several sub-frame times and average them (plus-lighter at 1/N each). Only the
// first frames of each camera move get it; every other frame renders once.
// This film has no hard cuts, so no sample needs clamping to one side of a cut.
export const shutter = (f: number): number[] => {
  const since = Math.min(...BLUR_HITS.map((h) => (f >= h ? f - h : Infinity)));
  // the pans move ~200 px a frame at first: many samples there, fewer as they slow
  if (since > 14) return [0];
  const n = since <= 4 ? 16 : since <= 9 ? 12 : 6;
  return new Array(n).fill(0).map((_, i) => -0.25 + (0.5 * i) / (n - 1));
};

export const Blur: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const offsets = shutter(frame);
  if (offsets.length <= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {offsets.map((o, i) => (
        <AbsoluteFill key={i} style={{ mixBlendMode: "plus-lighter", filter: `opacity(${1 / offsets.length})` }}>
          <Freeze frame={frame + o}>{children}</Freeze>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
