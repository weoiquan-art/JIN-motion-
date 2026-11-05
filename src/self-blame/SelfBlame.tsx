import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import "./fonts";
import { hash, inv, mix, noise1, pop, whip } from "./anim.ts";
import { DURATION, HEIGHT, WIDTH } from "./beat.ts";
import { Blur } from "./Blur";
import { camAt, camTransform, shakeAt } from "./camera.ts";
import { CONTENT } from "./content.ts";
import { EN, ZH } from "./fonts";
import { Ending } from "./scenes/Ending";
import { Hook } from "./scenes/Hook";
import { Practice1, Practice2 } from "./scenes/Practice";
import { Reason1, Reason2, Reason3 } from "./scenes/Reasons";
import { Steps } from "./scenes/Steps";
import { BG, C } from "./theme.ts";
import { CAPTIONS, CHIPS, ST, T } from "./timeline.ts";

// Stations in world order, with how far their drawings reach left / right.
const STATIONS: { x: number; bg: string; reach: [number, number]; El: React.FC }[] = [
  { x: ST.hook, bg: BG.hook, reach: [-900, 900], El: Hook },
  { x: ST.steps, bg: BG.steps, reach: [-900, 900], El: Steps },
  { x: ST.r1, bg: BG.r1, reach: [-900, 900], El: Reason1 },
  { x: ST.r2, bg: BG.r2, reach: [-900, 2300], El: Reason2 },
  { x: ST.r3, bg: BG.r3, reach: [-950, 950], El: Reason3 },
  { x: ST.p1, bg: BG.p1, reach: [-900, 900], El: Practice1 },
  { x: ST.p2, bg: BG.p2, reach: [-900, 900], El: Practice2 },
  { x: ST.end, bg: BG.end, reach: [-1700, 1700], El: Ending },
];

const bgAt = (x: number) => {
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const a = STATIONS[i];
    const b = STATIONS[i + 1];
    if (x <= b.x) return mix(a.bg, b.bg, inv(a.x, b.x, x));
  }
  return mix(STATIONS[STATIONS.length - 1].bg, STATIONS[STATIONS.length - 1].bg, 0);
};

const HITS = [
  { f: T.shatter, amp: 0.22 },
  { f: T.blame, amp: 0.38 },
];

// Floating dust in the world: drifts smoothly (never jumps), gives the camera
// moves something to move past.
const MOTES = new Array(170).fill(0).map((_, i) => ({
  x: -1300 + hash(i * 1.37) * 21800,
  y: -650 + hash(i * 2.71) * 1800,
  r: 1.4 + hash(i * 3.3) * 3,
  a: 0.08 + hash(i * 4.9) * 0.22,
}));

const World: React.FC = () => {
  const s = useCurrentFrame();
  const cam = camAt(s);
  const sh = shakeAt(s, HITS);
  const half = WIDTH / 2 / cam.z + 80;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transform: camTransform(cam, sh), transformOrigin: "0 0" }}>
        <svg style={{ position: "absolute", left: cam.x - half, top: cam.y - HEIGHT, overflow: "visible" }} width={half * 2} height={HEIGHT * 2} viewBox={`${cam.x - half} ${cam.y - HEIGHT} ${half * 2} ${HEIGHT * 2}`}>
          {MOTES.map((m, i) => {
            const x = m.x + noise1(s * 0.006, i) * 90;
            if (Math.abs(x - cam.x) > half + 20) return null;
            const y = m.y + noise1(s * 0.008, i + 300) * 70;
            return <circle key={i} cx={x} cy={y} r={m.r} fill="#fff4e0" opacity={m.a * (0.7 + 0.3 * noise1(s * 0.02, i + 700))} />;
          })}
        </svg>
        {STATIONS.map(({ x, reach, El }, i) =>
          cam.x + half > x + reach[0] && cam.x - half < x + reach[1] ? <El key={i} /> : null,
        )}
      </div>
    </AbsoluteFill>
  );
};

// Narration at the bottom: Chinese, English, and the source in small print.
const Captions: React.FC = () => {
  const s = useCurrentFrame();
  return (
    <AbsoluteFill>
      {CAPTIONS.map(({ from, to, line }, i) => {
        if (s < from - 0.75 || s >= to) return null;
        const o = pop(s - from) * (1 - inv(to - 5, to - 1, s));
        const dy = (1 - whip(s - from, 0.4, 10)) * 14;
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 846, textAlign: "center", opacity: o, transform: `translateY(${dy}px)` }}>
            <div style={{ fontFamily: ZH, fontSize: 44, fontWeight: 500, color: C.ink, letterSpacing: 1, textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}>{line.zh}</div>
            <div style={{ fontFamily: EN, fontSize: 24, color: C.sub, marginTop: 10, textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>{line.en}</div>
            {line.cite ? <div style={{ fontFamily: EN, fontSize: 17, color: C.faint, marginTop: 10, letterSpacing: 0.4 }}>— {line.cite}</div> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Which reason / practice we are in (top-left).
const Chips: React.FC = () => {
  const s = useCurrentFrame();
  const note = CONTENT.reasons.note;
  const inReasons = s >= T.r1 - 0.75 && s < T.p1;
  const noteO = pop(s - T.r1) * (1 - inv(T.p1 - 6, T.p1 - 1, s));
  return (
    <AbsoluteFill>
      {inReasons ? (
        <div style={{ position: "absolute", left: 72, top: 52, opacity: noteO * 0.9, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: ZH, fontSize: 20, color: C.sub, letterSpacing: 1 }}>{note.zh}</span>
          <span style={{ fontFamily: EN, fontSize: 15, color: C.faint, marginLeft: 12 }}>{note.en}</span>
        </div>
      ) : null}
      {CHIPS.map(({ from, to, index, line }, i) => {
        if (s < from - 0.75 || s >= to) return null;
        const o = pop(s - from) * (1 - inv(to - 6, to - 1, s));
        const dx = (1 - whip(s - from, 0.5, 10)) * -20;
        return (
          <div key={i} style={{ position: "absolute", left: 72, top: 90, opacity: o, transform: `translateX(${dx}px)`, display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: EN, fontSize: 18, fontWeight: 700, color: C.night, background: C.guilt, borderRadius: 999, padding: "4px 12px" }}>{index}</div>
            <div style={{ fontFamily: ZH, fontSize: 32, fontWeight: 700, color: C.ink }}>{line.zh}</div>
            <div style={{ fontFamily: EN, fontSize: 18, color: C.sub }}>{line.en}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const SelfBlame: React.FC = () => {
  const s = useCurrentFrame();
  const cam = camAt(s);
  const fade = Math.max(1 - inv(0, 12, s), inv(T.fade, DURATION - 1, s));
  return (
    <AbsoluteFill style={{ backgroundColor: bgAt(cam.x) }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(120,135,200,0.10), rgba(0,0,0,0) 70%)" }} />
      <Blur>
        <World />
      </Blur>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 72%, rgba(0,0,0,0.32) 100%)" }} />
      <Captions />
      <Chips />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: fade }} />
      <Html5Audio src={staticFile("audio/self-blame.wav")} />
    </AbsoluteFill>
  );
};
