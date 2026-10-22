"""Beat-sync self-check for a rendered PenangBridge video.

    python3 scripts/penang/check-sync.py out/penang-bridge-720p.mp4 [--click out/penang-bridge-720p-click.mp4]

1. Audio: on the video's own soundtrack, find the attack nearest to every
   beat of the grid (public/data/penang-bgm.json, shifted by the film's
   start) and report the offset. A constant offset would mean the music and
   the beat grid (and so every cut) are out of step.
2. Picture: frame differences on a 160x90 grey copy. Every shot change in
   src/Root.tsx (`shots[].at`, in beats) should be the biggest jump within
   +-3 frames of its beat frame.
3. With --click, writes a copy of the video whose soundtrack has a click on
   every beat (higher click on bar lines) so the sync can be checked by ear.

The film window must match the composition: --start-bar / --pre-roll
default to the values in src/Root.tsx.
"""

import argparse
import json
import math
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import scipy.signal

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--click", default=None)
ap.add_argument("--start-bar", type=int, default=None)
ap.add_argument("--bars", type=int, default=None)
ap.add_argument("--pre-roll", type=float, default=None)
args = ap.parse_args()

root = Path("src/Root.tsx").read_text()
block = root[root.index('id="PenangBridge"'):]


def prop(name, cast, default):
    m = re.search(rf"\b{name}: ([0-9.]+)", block)
    return cast(m.group(1)) if m else default


start_bar = args.start_bar if args.start_bar is not None else prop("startBar", int, 40)
n_bars = args.bars if args.bars is not None else prop("bars", int, 28)
pre_roll = args.pre_roll if args.pre_roll is not None else prop("preRoll", float, 0.1)
shots_block = block[block.index("shots: ["):block.index("captions: [")]
cuts = [(float(a), e) for a, e in re.findall(r"\bat: ([0-9.]+),\s*\n\s*beats: [0-9.]+,\s*\n\s*enter: \"(\w+)\"", shots_block)]

bgm = json.loads(Path("public/data/penang-bgm.json").read_text())
beats = bgm["beats"]
b0 = bgm["bars"][start_bar]["beat"]
FPS = 30
trim = math.floor((beats[b0] - pre_roll) * FPS)
a0 = trim / FPS


def film_time(beat):
    k = math.floor(beat)
    fr = beat - k
    return beats[b0 + k] + fr * (beats[b0 + k + 1] - beats[b0 + k]) - a0


grid = np.array([film_time(i) for i in range(n_bars * 4 + 1)])

# ------------------------------------------------------------- 1. audio
SR = 22050
raw = subprocess.run(
    ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", args.video, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
    capture_output=True,
    check=True,
).stdout
y = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
b, a = scipy.signal.butter(4, 700, btype="highpass", fs=SR)
yh = scipy.signal.filtfilt(b, a, y)
e = yh**2
c = np.concatenate([[0.0], np.cumsum(e)])
n_post, n_pre = int(0.002 * SR), int(0.015 * SR)
idx = np.arange(n_pre, len(e) - n_post)
ratio = np.zeros(len(e))
ratio[idx] = ((c[idx + n_post] - c[idx]) / n_post) / ((c[idx] - c[idx - n_pre]) / n_pre + 1e-12)
offs = []
for t in grid:
    i0, i1 = int((t - 0.04) * SR), int((t + 0.04) * SR)
    if i0 < n_pre or i1 >= len(ratio) - n_post:
        continue
    seg = ratio[i0:i1]
    k = int(np.argmax(seg))
    if seg[k] > 4:  # a real attack, not noise
        offs.append(((i0 + k) / SR - t) * 1000)
offs = np.array(offs)
print(f"film window: song bar {start_bar} + {n_bars} bars, audio starts at {a0:.3f}s of bgm.mp3")
print(f"audio: {len(offs)}/{len(grid)} beats with a clear attack; attack - grid: median {np.median(offs):+.1f} ms, "
      f"IQR {np.percentile(offs, 25):+.1f}..{np.percentile(offs, 75):+.1f} ms")

# ----------------------------------------------------------- 2. picture
probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_frames",
                        "-of", "csv=p=0", args.video], capture_output=True, text=True, check=True).stdout.strip().split(",")
w, h = 160, 90
raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", args.video, "-vf", f"scale={w}:{h},format=gray",
                      "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w).astype(np.float32)
delta = np.concatenate([[0], np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))])
print(f"video: {probe[0]}x{probe[1]}, {len(frames)} frames")
bad = 0
rows = []
for at, enter in cuts:
    f = round(film_time(at) * FPS)
    lo, hi = max(1, f - 3), min(len(delta) - 1, f + 3)
    peak = lo + int(np.argmax(delta[lo:hi + 1]))
    ok = peak == f or (enter in ("leak", "fade") and abs(peak - f) <= 3)
    bad += 0 if ok else 1
    rows.append(f"  beat {at:6.1f}  {enter:6s}  frame {f:5d}  biggest jump at {peak:5d} ({peak - f:+d})  {'ok' if ok else 'CHECK'}")
print("cuts (biggest frame difference within +-3 frames of the beat frame):")
print("\n".join(rows))
print(f"cuts off their beat frame: {bad} of {len(cuts)} (leak/fade crossfades may peak within +-3 frames)")

# ------------------------------------------------------------- 3. click
if args.click:
    sr = 48000
    dur = len(frames) / FPS
    track = np.zeros(int(dur * sr) + sr)
    for i, t in enumerate(grid):
        n = int(0.03 * sr)
        tt = np.arange(n) / sr
        freq = 1800 if i % 4 == 0 else 1100
        click = np.sin(2 * np.pi * freq * tt) * np.exp(-tt / 0.006) * (0.9 if i % 4 == 0 else 0.6)
        s0 = int(round(t * sr))
        track[s0:s0 + n] += click[: len(track) - s0]
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "click.wav"
        pcm = (np.clip(track, -1, 1) * 32767).astype("<i2")
        import wave

        with wave.open(str(wav), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", args.video, "-i", str(wav),
                        "-filter_complex", "[0:a]volume=0.8[m];[1:a]volume=0.9[c];[m][c]amix=inputs=2:duration=first:normalize=0[a]",
                        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", args.click], check=True)
    print(f"wrote {args.click}")
