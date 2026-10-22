"""Analyse the PenangBridge BGM and write public/data/penang-bgm.json.

Run from the repo root:
    python3 scripts/penang/analyze-bgm.py [public/penang/audio/bgm.mp3]

What it does (all times in seconds from the start of the mp3):
  1. librosa's default beat tracker (sr 22050, hop 512) for a first grid.
  2. Each beat is moved to the attack of the nearest transient, found on a
     high-passed signal with a 2 ms / 15 ms energy ratio, and checked against
     a high-resolution onset envelope (hop 128, n_fft 1024). The default
     grid lands late on this song (JIN measured about 18 ms).
  3. A straight line t = t0 + k * period is fitted to the refined beats
     (the song does not change tempo). The fitted grid is what the video
     uses; per-beat residuals are kept for the check.
  4. Bar lines (4/4): the phase whose beats carry the largest chord change
     and low-end hit, then cross-checked against the section starts.
  5. Accents, sections (bar-level loudness + novelty), the music end, and a
     30 fps loudness curve for the light effects.
"""

import hashlib
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import scipy.signal

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "public/penang/audio/bgm.mp3")
OUT = Path("public/data/penang-bgm.json")
FPS = 30
SR = 22050


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-9))


y, sr = librosa.load(SRC, sr=SR, mono=True)
duration = len(y) / sr

# ---------------------------------------------------------------- music end
# Short-time RMS at 30 fps. The music fades out near the end, then there is
# a gap of digital silence and a short closing sound (about 3:10) that is not
# part of the song: the end is the last frame above -45 dBFS before the gap.
hop30 = sr // FPS
rms30 = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop30, center=True)[0]
rms30_db = db(rms30)
t30 = np.arange(len(rms30)) / FPS
silent = rms30_db < -60
# first run of >= 1 s of silence after the first minute
music_end = duration
run = 0
for i in range(len(silent)):
    if t30[i] < 60:
        continue
    run = run + 1 if silent[i] else 0
    if run >= FPS:
        start_gap = i - run + 1
        loud = np.where(rms30_db[:start_gap] > -45)[0]
        music_end = float(t30[loud[-1]]) if len(loud) else float(t30[start_gap])
        break

# ------------------------------------------------- 1. default beat tracking
tempo_default, beats_default = librosa.beat.beat_track(y=y, sr=sr, hop_length=512, units="time")
beats_default = beats_default[beats_default < music_end]

# ------------------------------------------ 2. refine beats to the attacks
# High-resolution onset envelope (spectral flux).
HOP_HI = 128
env_hi = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP_HI, n_fft=1024)
t_hi = librosa.frames_to_time(np.arange(len(env_hi)), sr=sr, hop_length=HOP_HI)

# Time-domain attack detector: high-pass at 700 Hz (keeps kick click, snare,
# hats; drops the bass), then energy in the next 2 ms over energy in the
# previous 15 ms. Peaks of that ratio are attack starts.
b, a = scipy.signal.butter(4, 700, btype="highpass", fs=sr)
yh = scipy.signal.filtfilt(b, a, y)
e = yh.astype(np.float64) ** 2
c = np.concatenate([[0.0], np.cumsum(e)])
n_post = int(0.002 * sr)
n_pre = int(0.015 * sr)
idx = np.arange(n_pre, len(e) - n_post)
post = (c[idx + n_post] - c[idx]) / n_post
pre = (c[idx] - c[idx - n_pre]) / n_pre
ratio = np.zeros(len(e))
ratio[idx] = post / (pre + 1e-10)


def refine(t, win=0.045):
    """Attack time near t: the strongest ratio peak within +-win seconds."""
    i0 = max(int((t - win) * sr), n_pre)
    i1 = min(int((t + win) * sr), len(ratio) - n_post - 1)
    seg = ratio[i0:i1]
    if len(seg) == 0:
        return t, 0.0
    k = int(np.argmax(seg))
    return (i0 + k) / sr, float(seg[k])


ref = np.array([refine(t) for t in beats_default])
beats_refined = ref[:, 0]
attack_strength = ref[:, 1]

# ------------------------------------------------------ 3. fit a fixed grid
k = np.arange(len(beats_refined))
# Robust fit: start with least squares, then drop beats whose residual is
# over 25 ms (beats in quiet bars without a clear transient) and refit.
mask = np.ones(len(k), bool)
for _ in range(4):
    A = np.vstack([np.ones(mask.sum()), k[mask]]).T
    (t0, period), *_ = np.linalg.lstsq(A, beats_refined[mask], rcond=None)
    resid = beats_refined - (t0 + period * k)
    mask = np.abs(resid) < 0.025
bpm = 60.0 / period
grid = t0 + period * k
# extend / trim so the grid covers the music from the first beat to the end
first = t0
while first - period > 0:
    first -= period
n_grid = int(np.floor((music_end - first) / period)) + 1
grid = first + period * np.arange(n_grid)
resid_ms = (beats_refined - (t0 + period * k)) * 1000

# Global offset check: average high-res onset strength around every grid
# beat, as a function of a shift. The peak should sit at 0 ms.
shifts_ms = np.arange(-60, 61, 2)
prof = []
for s in shifts_ms:
    tt = grid + s / 1000.0
    vals = np.interp(tt, t_hi, env_hi)
    prof.append(float(vals.mean()))
prof = np.array(prof)
best_shift_ms = int(shifts_ms[int(np.argmax(prof))])

# Same check for the default grid, to see how late it is.
def mean_offset_ms(beats):
    offs = []
    for t in beats:
        tr, _ = refine(t)
        offs.append(tr - t)
    return float(np.median(offs) * 1000)

default_offset_ms = mean_offset_ms(beats_default)

# ------------------------------------------------------------ 4. bar lines
# Beat-synchronous features on the fitted grid.
hop = 512
chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
low = S[(freqs >= 30) & (freqs <= 150)].sum(axis=0)
high = S[freqs >= 5000].sum(axis=0)
frames_grid = librosa.time_to_frames(grid, sr=sr, hop_length=hop)
frames_grid = np.clip(frames_grid, 0, chroma.shape[1] - 1)
bounds = np.concatenate([frames_grid, [chroma.shape[1]]])
csync = np.stack([chroma[:, bounds[i]:max(bounds[i + 1], bounds[i] + 1)].mean(axis=1) for i in range(len(grid))], axis=1)
cnorm = csync / (np.linalg.norm(csync, axis=0, keepdims=True) + 1e-9)
chord_change = np.concatenate([[0], 1 - (cnorm[:, 1:] * cnorm[:, :-1]).sum(axis=0)])


def at_grid(series, times_hop):
    return np.array([series[min(f, len(series) - 1)] for f in librosa.time_to_frames(times_hop, sr=sr, hop_length=hop)])


low_hit = at_grid(low, grid)
low_flux = np.concatenate([[0], np.maximum(0, np.diff(np.log1p(low_hit)))])
high_hit = at_grid(high, grid)

beat_rms = []
for i in range(len(grid)):
    i0 = int(grid[i] * sr)
    i1 = int((grid[i] + period) * sr)
    beat_rms.append(float(np.sqrt(np.mean(y[i0:i1] ** 2))))
beat_rms = np.array(beat_rms)
beat_db = db(beat_rms)


def z(x):
    x = np.asarray(x, float)
    return (x - x.mean()) / (x.std() + 1e-9)


cue = z(chord_change) + 0.5 * z(low_flux) + 0.5 * z(high_hit)
phase_scores = [float(cue[p::4].mean()) for p in range(4)]
phase = int(np.argmax(phase_scores))

# ------------------------------------------------------------- 5. sections
# Bar-level loudness and novelty (checkerboard kernel on bar features).
bar_starts = np.arange(phase, len(grid), 4)
bars = []
for bi, gi in enumerate(bar_starts):
    s = grid[gi]
    e_ = grid[gi + 4] if gi + 4 < len(grid) else min(s + 4 * period, music_end)
    i0, i1 = int(s * sr), int(e_ * sr)
    bars.append({
        "index": bi,
        "beat": int(gi),
        "start": round(float(s), 4),
        "end": round(float(e_), 4),
        "db": round(float(db(np.sqrt(np.mean(y[i0:i1] ** 2)))), 2),
    })
mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
feat = np.vstack([z(mfcc), z(chroma)])
bar_feat = []
for bar in bars:
    f0 = librosa.time_to_frames(bar["start"], sr=sr, hop_length=hop)
    f1 = max(librosa.time_to_frames(bar["end"], sr=sr, hop_length=hop), f0 + 1)
    bar_feat.append(feat[:, f0:f1].mean(axis=1))
bar_feat = np.array(bar_feat)
bar_feat = bar_feat / (np.linalg.norm(bar_feat, axis=1, keepdims=True) + 1e-9)
ssm = bar_feat @ bar_feat.T
L = 4
kern = np.kron(np.array([[1, -1], [-1, 1]]), np.ones((L, L)))
novelty = np.zeros(len(bars))
for i in range(L, len(bars) - L):
    novelty[i] = float((ssm[i - L:i + L, i - L:i + L] * kern).sum())
bar_db = np.array([b_["db"] for b_ in bars])
db_jump = np.concatenate([[0], np.diff(bar_db)])

# ------------------------------------------------------------ accents
# Per-beat accent = attack ratio + high-res onset strength at the beat,
# normalised to 0..1 over the song.
on_at = np.interp(grid, t_hi, env_hi)
att_at = np.array([refine(t, 0.02)[1] for t in grid])
acc = 0.5 * (on_at / on_at.max()) + 0.5 * (np.log1p(att_at) / np.log1p(att_at).max())

# Strongest single hits anywhere (not only on the grid): high-res onset peaks.
peaks, _ = scipy.signal.find_peaks(env_hi, distance=int(0.25 * sr / HOP_HI))
peaks = peaks[t_hi[peaks] < music_end]
top = peaks[np.argsort(env_hi[peaks])[::-1][:12]]
top_hits = sorted(
    ({"t": round(float(t_hi[p]), 3), "strength": round(float(env_hi[p] / env_hi.max()), 3)} for p in top),
    key=lambda h: h["t"],
)

# ------------------------------------------------------- energy, 30 fps
lo_db, hi_db = -30.0, -4.0
energy = np.clip((rms30_db - lo_db) / (hi_db - lo_db), 0, 1)

out = {
    "about": "Generated by scripts/penang/analyze-bgm.py. Times in seconds from the start of bgm.mp3.",
    "source": {
        "file": "public/penang/audio/bgm.mp3",
        "sha256": hashlib.sha256(SRC.read_bytes()).hexdigest(),
        "duration": round(duration, 4),
        "musicEnd": round(music_end, 3),
    },
    "tempo": {
        "bpm": round(bpm, 4),
        "period": round(float(period), 6),
        "firstBeat": round(float(first), 4),
        "beatsPerBar": 4,
        "downbeatPhase": phase,
        "phaseScores": [round(s, 3) for s in phase_scores],
        "librosaDefaultBpm": round(float(np.atleast_1d(tempo_default)[0]), 3),
        "librosaDefaultLateMs": round(default_offset_ms, 1),
        "gridFit": {
            "beatsUsed": int(mask.sum()),
            "beatsTotal": int(len(mask)),
            "residualMsMedianAbs": round(float(np.median(np.abs(resid_ms[mask]))), 2),
            "residualMsP95Abs": round(float(np.percentile(np.abs(resid_ms[mask]), 95)), 2),
        },
        "offsetCheck": {
            "shiftsMs": shifts_ms.tolist(),
            "meanOnset": [round(v, 4) for v in prof.tolist()],
            "bestShiftMs": best_shift_ms,
        },
    },
    "beats": [round(float(t), 4) for t in grid],
    "beatAccent": [round(float(v), 3) for v in acc],
    "beatDb": [round(float(v), 2) for v in beat_db],
    "bars": bars,
    "barNovelty": [round(float(v), 3) for v in novelty],
    "barDbJump": [round(float(v), 2) for v in db_jump],
    "topHits": top_hits,
    "energy": {"fps": FPS, "lowDb": lo_db, "highDb": hi_db, "values": [round(float(v), 3) for v in energy]},
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
print(f"duration {duration:.3f}s  musicEnd {music_end:.3f}s")
print(f"bpm {bpm:.4f}  period {period:.6f}s  firstBeat {first:.4f}s  t0(fit) {t0:.4f}")
print(f"librosa default bpm {float(np.atleast_1d(tempo_default)[0]):.3f}; default beats late by median {default_offset_ms:.1f} ms")
print(f"grid fit: {mask.sum()}/{len(mask)} beats, |resid| median {np.median(np.abs(resid_ms[mask])):.2f} ms, p95 {np.percentile(np.abs(resid_ms[mask]), 95):.2f} ms")
print(f"offset check best shift {best_shift_ms} ms")
print(f"downbeat phase {phase} scores {[round(s, 3) for s in phase_scores]}")
print("top hits:", top_hits)
