import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";

// Film-style motion blur: renders the children at several sub-frame times and
// averages them (plus-lighter at 1/N each). The sample times come from
// timeline-aware code (shutter.ts) so a sample never crosses a hard cut.
export const Blur: React.FC<{ offsets: number[]; children: React.ReactNode }> = ({ offsets, children }) => {
  const frame = useCurrentFrame();
  if (offsets.length <= 1) {
    return (
      <AbsoluteFill>
        <Freeze frame={frame + (offsets[0] ?? 0)}>{children}</Freeze>
      </AbsoluteFill>
    );
  }
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
