"""Loudness per section of the JinmyPromo soundtrack.

The film's sound is the music (public/audio/jinmy.wav) plus the sample clips'
own sound, mixed by Remotion with the gain curves in src/jinmy/scenes.tsx.
This script either measures a rendered file, or mixes the same thing offline
with numpy so clip gains can be tried without rendering (the offline mix
matched the render within 0.1 LU).

  python3 scripts/jinmy/mix-check.py --measure out/jinmyaigc-promo.mp4
  python3 scripts/jinmy/mix-check.py --gains 2.5 2.0 0.8 1.0 [--music other.wav] [--out mix.wav]

--gains are CLIP_GAIN in src/jinmy/timeline.ts: hook, height, heightUnder,
duo. Needs ffmpeg on PATH and numpy; the clips must be in public/jinmy/clips.
Keep the frame numbers below in step with timeline.ts.
"""

import argparse
import subprocess
import tempfile
import wave

import numpy as np

SR = 48000
SECTIONS = [(0, 4, "hook"), (4, 6, "photo"), (6, 10, "upload"), (10, 14, "pick"), (14, 18, "result"), (18, 20, "result+2"), (20, 26, "cta")]
# frames (30 fps) from timeline.ts
HOOK_TO, EXPAND, SECOND, CTA = 120, 420, 540, 600
CLIP_FROM = {"hook": 0.0, "height": 4.6, "duo": 3.6}


def loudness(path, ss=None, to=None):
    cmd = ["ffmpeg", "-nostats", "-hide_banner"]
    if ss is not None:
        cmd += ["-ss", str(ss), "-to", str(to)]
    cmd += ["-i", path, "-vn", "-filter_complex", "ebur128=peak=true", "-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    summary = err[err.rfind("Summary:"):]
    i = summary.split(" I:")[1].split("LUFS")[0].strip()
    peak = summary.split("Peak:")[1].split("dBFS")[0].strip()
    return f"{float(i):6.1f} LUFS  true peak {float(peak):5.1f} dBFS"


def report(path):
    print(f"whole      {loudness(path)}")
    for a, b, name in SECTIONS:
        print(f"{name:<10} {loudness(path, a, b)}   ({a}–{b} s)")


def load(path, ss=None, t=None):
    cmd = ["ffmpeg", "-loglevel", "error"]
    if ss is not None:
        cmd += ["-ss", str(ss), "-t", str(t)]
    cmd += ["-i", path, "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def inv(a, b, v):
    return np.clip((v - a) / (b - a), 0, 1)


def simulate(gains, music_path, out_path):
    g_hook, g_height, g_under, g_duo = gains
    mix = load(music_path)
    n_all = len(mix)

    def place(clip, at_frame, gain):
        start = round(at_frame / 30 * SR)
        n = min(len(clip), n_all - start)
        frames = at_frame + np.arange(n) / SR * 30
        mix[start:start + n] += clip[:n] * gain(frames)[:, None]

    fade_out = lambda f: 1 - inv(CTA - 10, CTA, f)
    place(load("public/jinmy/clips/clip1.mp4", CLIP_FROM["hook"], HOOK_TO / 30), 0, lambda f: g_hook * np.clip((HOOK_TO - f) / 6, 0, 1))
    place(load("public/jinmy/clips/clip3.mp4", CLIP_FROM["height"], (CTA - EXPAND) / 30), EXPAND,
          lambda f: (g_height + (g_under - g_height) * inv(SECOND - 2, SECOND + 6, f)) * fade_out(f))
    place(load("public/jinmy/clips/clip4.mp4", CLIP_FROM["duo"], (CTA - SECOND) / 30), SECOND, lambda f: g_duo * fade_out(f))
    print(f"sample peak {20 * np.log10(np.abs(mix).max()):.2f} dBFS")
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    report(out_path)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--measure")
    p.add_argument("--gains", nargs=4, type=float, default=[2.5, 2.0, 0.8, 1.0])
    p.add_argument("--music", default="public/audio/jinmy.wav")
    p.add_argument("--out")
    args = p.parse_args()
    if args.measure:
        report(args.measure)
    else:
        out = args.out or tempfile.mkstemp(suffix=".wav")[1]
        simulate(args.gains, args.music, out)
