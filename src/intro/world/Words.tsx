import { useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, easeIn, easeOut, inv, lerp, springAt } from "../math";
import { centred, GRAY, WHITE } from "../theme";
import { CARDS, cardPeel, charPos, FLIGHT, WORDS, type WordDef } from "../timeline";

const glyph = (fs: number) => ({
  fontFamily: FONT,
  fontWeight: 900,
  fontSize: fs,
  lineHeight: 1,
  color: WHITE,
  width: fs,
  textAlign: "center" as const,
});

const peelOf = (wi: number, ci: number) =>
  cardPeel(CARDS.find((c) => c.word === wi && c.char === ci) as (typeof CARDS)[number]);

// Per-word squash / tilt on top of the slam.
const wordTransform = (w: WordDef, f: number) => {
  const s = springAt(f - w.slam, 320, 15, 0.6);
  let sx = lerp(2.6, 1, s);
  let sy = sx;
  if (w.style === "squeeze") {
    const squeeze = easeIn(inv(w.slam + 5, w.slam + 11, f));
    const pop = springAt(f - (w.slam + 11), 380, 10, 0.5);
    const k = f < w.slam + 11 ? 1 - 0.34 * squeeze : 0.66 + 0.34 * pop;
    sx *= k;
    sy *= 1 + 0.6 * (1 - k);
  }
  return { sx, sy };
};

const Word: React.FC<{ w: WordDef; wi: number }> = ({ w, wi }) => {
  const f = useCurrentFrame();
  const chars = [...w.zh];
  const lastPeel = peelOf(wi, chars.length - 1);
  if (f < w.slam - 1 || f > lastPeel + 14) return null;

  const { sx, sy } = wordTransform(w, f);
  const opacity = clamp((f - w.slam + 1) / 2);
  const enIn = springAt(f - (w.slam + 3), 300, 18, 0.6);
  const enOut = 1 - inv(lastPeel + 2, lastPeel + 12, f);

  return (
    <>
      <div style={{ position: "absolute", left: w.x, top: w.y, transform: `scale(${sx}, ${sy})`, opacity }}>
        {chars.map((ch, ci) => {
          if (f >= peelOf(wi, ci)) return null;
          const p = charPos(w, ci);
          let extra = "";
          if (w.style === "pour") {
            const tip = easeIn(inv(w.slam + 4, peelOf(wi, ci), f));
            extra = `translateY(${tip * 30}px) rotate(${tip * 22 * (ci - 1 + 0.5)}deg)`;
          }
          return (
            <div key={ci} style={{ ...centred(p.x - w.x, 0, extra), ...glyph(w.fs) }}>
              {ch}
            </div>
          );
        })}
      </div>
      <div
        style={{
          ...centred(w.x + lerp(-80, 0, enIn), w.y + w.fs * 0.72),
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: Math.round(w.fs * 0.16),
          letterSpacing: "0.3em",
          color: GRAY,
          whiteSpace: "nowrap",
          opacity: clamp(enIn) * enOut,
        }}
      >
        {w.en}
      </div>
    </>
  );
};

export const Words: React.FC = () => (
  <div style={{ position: "absolute", left: 0, top: 0, zIndex: 20 }}>
    {WORDS.map((w, wi) => (
      <Word key={w.zh} w={w} wi={wi} />
    ))}
  </div>
);

// A peeled character flying to its card slot, where it turns into a shot card.
const flightPose = (ci: number, f: number) => {
  const c = CARDS[ci];
  const w = WORDS[c.word];
  const t = (f - cardPeel(c)) / FLIGHT;
  if (t < 0 || t >= 1) return null;
  const o = charPos(w, c.char);
  let x: number;
  let y: number;
  if (w.style === "pour") {
    x = lerp(o.x, c.x, easeOut(t));
    y = lerp(o.y, c.y, t * t);
  } else {
    const cx = (o.x + c.x) / 2;
    const cy = Math.min(o.y, c.y) - 320;
    const u = easeIn(t) * 0.5 + t * 0.5;
    x = (1 - u) * (1 - u) * o.x + 2 * (1 - u) * u * cx + u * u * c.x;
    y = (1 - u) * (1 - u) * o.y + 2 * (1 - u) * u * cy + u * u * c.y;
  }
  const dir = c.char % 2 === 0 ? 1 : -1;
  return { x, y, scale: lerp(1, 0.32, t), rot: dir * 220 * t, fs: w.fs, ch: [...w.zh][c.char] };
};

export const Flights: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 30 }}>
      {CARDS.map((c, ci) => {
        const p = flightPose(ci, f);
        if (!p) return null;
        return (
          <div key={c.shot}>
            {[3, 2, 1].map((k) => {
              const g = flightPose(ci, f - k * 0.8);
              return g ? (
                <div key={k} style={{ ...centred(g.x, g.y, `rotate(${g.rot}deg) scale(${g.scale})`), ...glyph(g.fs), opacity: 0.22 / k }}>
                  {g.ch}
                </div>
              ) : null;
            })}
            <div style={{ ...centred(p.x, p.y, `rotate(${p.rot}deg) scale(${p.scale})`), ...glyph(p.fs) }}>{p.ch}</div>
          </div>
        );
      })}
    </div>
  );
};
