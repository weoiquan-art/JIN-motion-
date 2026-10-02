import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";
import { FONT } from "./intro/fonts";

export const TestComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b0b" }}>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 180,
          color: "#ffffff",
          fontSize: 240,
          fontWeight: 900,
          fontFamily: FONT,
          lineHeight: 1.1,
        }}
      >
        我是 JIN
      </div>

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 640,
          display: "flex",
          alignItems: "center",
          gap: 80,
        }}
      >
        <Img
          src={staticFile("claude.png")}
          style={{ height: 200, width: "auto" }}
        />
        <Img
          src={staticFile("gemini.png")}
          style={{ height: 200, width: "auto" }}
        />
      </div>

      <OffthreadVideo
        src={staticFile("clips/clip-portrait.mp4")}
        muted
        style={{
          position: "absolute",
          right: 120,
          top: 60,
          height: 960,
          width: 540,
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
};
