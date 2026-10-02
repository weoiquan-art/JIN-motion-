import { Freeze, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, easeOut, hash, inv, lerp, springAt } from "../math";
import { GRAY, GREEN, RED, WHITE } from "../theme";
import {
  type CardDef,
  CARDS,
  cardH,
  cardLand,
  CLIPS,
  FAILS,
  REROLL_HOLD,
  SLOTS,
  T,
  timecode,
} from "../timeline";

// ---------------------------------------------------------------- state

const FAILS_N = FAILS.map((x, i) => ({ ...x, n: i + 1 }));

// Monotonic progress with stalls: u - sin(2πnu)/(2πn) has zero slope at u = k/n.
const genProgress = (t: number, dur: number) => {
  const u = clamp(t / dur);
  const n = 4;
  return clamp(100 * (u - Math.sin(2 * Math.PI * n * u) / (2 * Math.PI * n)), 0, 100);
};

// How long an attempt would take to reach 100%. Failing attempts are tuned
// so the bar visibly gets somewhere first: full ones hit 100% 3 frames before
// the strike, midway ones die at 35–75%. Unscheduled attempts are slow and
// are still generating when the brake freezes them.
const attemptDur = (c: CardDef, attempt: number, start: number, fail: (typeof FAILS_N)[number] | undefined) => {
  if (!fail) return 220 + 80 * hash(c.shot * 7 + attempt * 13);
  if (fail.full) return Math.max(4, fail.f - start - 3);
  return Math.max(3, fail.f - start) / (0.35 + 0.4 * hash(fail.n * 3.7));
};

export const cardState = (c: CardDef, f: number) => {
  const fe = Math.min(f, T.brake); // the brake freezes all generation
  const fails = FAILS_N.filter((x) => x.shot === c.shot);
  let start = cardLand(c);
  let attempt = 0;
  let rerollN = 0;
  let lastFail = -1;
  let failed = false;
  let endsAt = fe;
  let next = fails[0];
  for (const fl of fails) {
    next = fl;
    if (fe < fl.f) break; // generating; this attempt will fail at fl.f
    rerollN = fl.n;
    lastFail = fl.f;
    if (fe < fl.f + REROLL_HOLD) {
      failed = true; // struck, waiting to reroll
      endsAt = fl.f;
      break;
    }
    start = fl.f + REROLL_HOLD;
    attempt++;
    next = fails[attempt];
  }
  const dur = attemptDur(c, attempt, start, next);
  return { progress: genProgress(endsAt - start, dur), failed, failF: lastFail, rerollN, lastFail, attempt };
};

// ---------------------------------------------------------------- visuals

const label = { fontFamily: FONT, whiteSpace: "nowrap" as const };

const phBackground = (hue: number, f: number, seed: number) => {
  const bx = 30 + 24 * Math.sin(f * 0.05 + seed);
  const by = 40 + 20 * Math.cos(f * 0.043 + seed * 2);
  const ang = (f * 0.7 + seed * 40) % 360;
  return [
    `radial-gradient(circle at ${bx}% ${by}%, hsla(${(hue + 200) % 360},90%,72%,0.55), transparent 46%)`,
    `radial-gradient(circle at ${100 - bx}% ${100 - by}%, hsla(${(hue + 40) % 360},85%,62%,0.6), transparent 52%)`,
    `linear-gradient(${ang}deg, hsl(${hue},70%,34%), hsl(${(hue + 40) % 360},65%,13%))`,
  ].join(",");
};

const Placeholder: React.FC<{ c: CardDef; f: number; w: number; h: number }> = ({ c, f, w, h }) => {
  const s = cardState(c, f);
  const hue = (c.hue + s.attempt * 67) % 360;
  const pct = Math.floor(s.progress);
  const strike = s.failed ? f - s.failF : -1;
  const pad = Math.max(10, w * 0.04);
  const shimmer = ((f * 9 + c.shot * 50) % (w * 2.2)) - w * 0.6;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 6 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: phBackground(hue, f, c.shot),
          filter: s.failed ? "grayscale(0.85) brightness(0.5)" : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 5px)",
        }}
      />
      {!s.failed && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: shimmer,
            width: w * 0.35,
            background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.2), transparent)",
          }}
        />
      )}
      <div style={{ position: "absolute", left: pad, right: pad, bottom: pad }}>
        <div
          style={{
            ...label,
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: "0.14em",
            color: s.failed ? RED : WHITE,
            marginBottom: 8,
            fontVariantNumeric: "tabular-nums",
            // dark backing keeps FAILED readable on top of the red strike
            display: "inline-block",
            position: "relative",
            zIndex: 1,
            padding: s.failed ? "2px 7px" : 0,
            marginLeft: s.failed ? -7 : 0,
            borderRadius: 3,
            background: s.failed ? "rgba(11,11,11,0.85)" : "transparent",
          }}
        >
          {s.failed ? `FAILED ${pct}%` : `GENERATING ${pct}%`}
        </div>
        <div style={{ height: 9, borderRadius: 5, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
          <div style={{ width: `${s.progress}%`, height: "100%", background: s.failed ? RED : WHITE }} />
        </div>
      </div>
      {strike >= 0 && (
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
          {[
            [0, 0, w, h],
            [w, 0, 0, h],
          ].map(([x1, y1, x2, y2], i) => {
            const len = Math.hypot(w, h);
            const draw = easeOut(inv(i * 2, i * 2 + 3, strike));
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={RED}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - draw)}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};

const RealFootage: React.FC<{ c: CardDef }> = ({ c }) => {
  const clip = c.kind === "portrait" ? CLIPS.portrait : CLIPS.wide;
  // Motion-blur samples are ±0.25 frame apart; pin the footage to the whole
  // frame so every sample shows the same source frame (no double exposure
  // between 24fps frames). The card itself still moves with the blur.
  const frame = Math.round(useCurrentFrame());
  return (
    <Freeze frame={frame}>
      <Sequence from={cardLand(c)} layout="none">
        <Loop durationInFrames={clip.frames} layout="none">
          <OffthreadVideo
            src={staticFile(clip.src)}
            muted
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
          />
        </Loop>
      </Sequence>
    </Freeze>
  );
};

const Check: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 16 16" style={{ marginRight: 6 }}>
    <path d="M2.5 8.5 L6.5 12 L13.5 4" fill="none" stroke="#0b0b0b" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShotCard: React.FC<{ c: CardDef; i: number }> = ({ c, i }) => {
  const f = useCurrentFrame();
  const land = cardLand(c);
  if (f < land) return null;

  const w = c.w;
  const h = cardH(c);
  const real = c.kind !== "ph";

  // spawn pop, then the brake snaps everything onto the timeline
  const spawn = lerp(0.18, 1, springAt(f - land, 280, 14, 0.6));
  const snap = springAt(f - T.brake, 420, 26, 0.8);
  const slot = SLOTS[i];
  const x = lerp(c.x, slot.x, snap);
  const y = lerp(c.y, slot.y, snap);
  const scale = spawn * lerp(1, slot.scale, snap);
  const opacity = 1 - inv(T.end - 1, T.end + 13, f);
  const flash = 1 - inv(land, land + 6, f);

  const s = real ? null : cardState(c, f);
  const tagIn = s && s.rerollN > 0 ? springAt(f - s.lastFail, 400, 14, 0.5) : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: h + 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
          ...label,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: "0.12em", color: WHITE }}>
          {`SHOT ${String(c.shot).padStart(2, "0")}`}
        </span>
        <span style={{ fontWeight: 600, fontSize: 17, color: GRAY, fontVariantNumeric: "tabular-nums" }}>
          {timecode(land)}
        </span>
        {real && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              background: GREEN,
              color: "#0b0b0b",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "0.12em",
              padding: "4px 10px 4px 8px",
              borderRadius: 4,
            }}
          >
            <Check />
            DONE
          </span>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: real ? 0 : 6,
          boxShadow: `0 0 0 ${real ? 3 : 2}px ${real ? GREEN : "rgba(255,255,255,0.35)"}, 0 0 ${40 * flash}px rgba(255,255,255,${flash})`,
          background: real ? "#000" : undefined,
        }}
      >
        {real ? <RealFootage c={c} /> : <Placeholder c={c} f={f} w={w} h={h} />}
      </div>

      {s && s.rerollN > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: h + 14,
            transformOrigin: "left top",
            transform: `rotate(-4deg) scale(${lerp(1.9, 1, tagIn)})`,
            opacity: clamp(tagIn * 3),
            background: RED,
            color: WHITE,
            ...label,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: "0.12em",
            padding: "5px 12px",
            borderRadius: 4,
          }}
        >
          {`REROLL ×${s.rerollN}`}
        </div>
      )}
    </div>
  );
};

export const ShotCards: React.FC = () => (
  <div style={{ position: "absolute", left: 0, top: 0, zIndex: 10 }}>
    {CARDS.map((c, i) => (
      <ShotCard key={c.shot} c={c} i={i} />
    ))}
  </div>
);
