import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";

// Film-style motion blur: renders the children at several sub-frame times
// centred on the current frame and averages them (plus-lighter at 1/N each).
// Same idea as @remotion/motion-blur's CameraMotionBlur, but centred so the
// picture stays in sync with the audio cues.
export const MotionBlur: React.FC<{
  samples: number;
  shutter?: number; // fraction of a frame the shutter stays open
  children: React.ReactNode;
}> = ({ samples, shutter = 0.5, children }) => {
  const frame = useCurrentFrame();
  if (samples <= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {new Array(samples).fill(true).map((_, i) => {
        const offset = shutter * (i / (samples - 1) - 0.5);
        return (
          <AbsoluteFill
            key={i}
            style={{ mixBlendMode: "plus-lighter", filter: `opacity(${1 / samples})` }}
          >
            <Freeze frame={frame + offset}>{children}</Freeze>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
