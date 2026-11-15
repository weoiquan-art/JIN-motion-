"""分析 bgm.wav 的拍点，写出同目录下的 拍点.json。

用法（要有 librosa、numpy、scipy）：
    python 分析脚本.py

做法（2026-11-09，Claude）：
  1. 速度：在 131.6–132.5 BPM 之间找让 onset 包络在网格上最集中的速度，
     结果是 132.000 BPM。每 4 秒一个窗口单独找相位，全曲只有“正拍”和
     “半拍”两种结果（差 227 ms），没有剪辑造成的跳拍。
  2. 哪一边是正拍：底鼓（30–150 Hz）在一组上强，高频镲（6 kHz 以上）在另一组上强；
     按“四拍底鼓、反拍镲”取底鼓那组当正拍。第一个底鼓在约 0.575 s，也是全曲最强的一下。
  3. 对到起音：在响的段落里，找每拍 ±40 ms 内高通（700 Hz）后
     “后 2 ms / 前 15 ms 能量比”的峰（和 scripts/check-*.ts 用的起音定义一样），
     取中位偏差整体平移网格。
  4. 小节线：按“和弦变化 + 底鼓”在 4 个相位里取最强的那个；段落按小节响度的跳变分。
"""

import hashlib
import json
from pathlib import Path

import librosa
import numpy as np
import scipy.signal

HERE = Path(__file__).resolve().parent
SRC = HERE / "bgm.wav"
OUT = HERE / "拍点.json"
SR = 22050
FPS = 30
BPM = 132.0
P = 60.0 / BPM


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-9))


y, sr = librosa.load(SRC, sr=SR, mono=True)
duration = len(y) / sr

# ---------------------------------------------------------------- music end
rms30 = librosa.feature.rms(y=y, frame_length=2048, hop_length=sr // FPS, center=True)[0]
rms30_db = db(rms30)
loud = np.where(rms30_db > -45)[0]
music_end = float(loud[-1] / FPS)

# ------------------------------------------------- 1. tempo check (comb on onsets)
HOP = 64
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP, n_fft=1024)
tt = librosa.frames_to_time(np.arange(len(env)), sr=sr, hop_length=HOP)


def comb(bpm, t0, t1, nph=200):
    per = 60 / bpm
    phases = np.linspace(0, per, nph, endpoint=False)
    sc = np.array([np.interp(np.arange(t0 + ph, t1, per), tt, env).mean() for ph in phases])
    k = int(np.argmax(sc))
    return phases[k], sc[k] / sc.mean()


best_bpm = max(np.arange(131.6, 132.5, 0.01), key=lambda b: comb(b, 0, music_end)[1])
phase_a, contrast = comb(BPM, 0, music_end)

# ------------------------------------------------- 2. which phase is the beat
S = np.abs(librosa.stft(y, n_fft=1024, hop_length=HOP))
fr = librosa.fft_frequencies(sr=sr, n_fft=1024)


def band_flux(lo, hi):
    b = np.log1p(S[(fr >= lo) & (fr < hi)].sum(axis=0) * 10)
    return np.maximum(0, np.diff(b, prepend=b[0]))


kick = band_flux(30, 150)
hats = band_flux(6000, 11000)
ga = np.arange(phase_a, music_end, P)
gb = ga + P / 2
kick_a, kick_b = np.interp(ga, tt, kick).mean(), np.interp(gb, tt, kick).mean()
beat_phase = phase_a + (P / 2 if kick_b > kick_a else 0.0)

# ------------------------------------------------- 3. move the grid onto the attacks
b_, a_ = scipy.signal.butter(4, 700, btype="highpass", fs=sr)
yh = scipy.signal.filtfilt(b_, a_, y)
e = yh.astype(np.float64) ** 2
c = np.concatenate([[0.0], np.cumsum(e)])
n_post, n_pre = int(0.002 * sr), int(0.015 * sr)
idx = np.arange(n_pre, len(e) - n_post)
ratio = np.zeros(len(e))
ratio[idx] = ((c[idx + n_post] - c[idx]) / n_post) / ((c[idx] - c[idx - n_pre]) / n_pre + 1e-10)


def attack_near(t, win=0.04):
    i0, i1 = max(int((t - win) * sr), n_pre), min(int((t + win) * sr), len(ratio) - n_post - 1)
    seg = ratio[i0:i1]
    k = int(np.argmax(seg))
    return (i0 + k) / sr, float(10 * np.log10(seg[k] + 1e-12))


first = beat_phase % P
grid0 = np.arange(first, music_end + 1e-6, P)
att = np.array([attack_near(t) for t in grid0])
off = att[:, 0] - grid0
clear = att[:, 1] > 10  # a real attack (≥ 10 dB)
shift = float(np.median(off[clear])) if clear.sum() > 8 else 0.0
grid = grid0 + shift
resid_ms = (att[:, 0] - grid) * 1000

# ------------------------------------------------- 4. bars and sections
hop = 512
chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
cf = np.clip(librosa.time_to_frames(grid, sr=sr, hop_length=hop), 0, chroma.shape[1] - 1)
cs = np.stack([chroma[:, cf[i]:max(cf[i + 1] if i + 1 < len(cf) else chroma.shape[1], cf[i] + 1)].mean(axis=1) for i in range(len(cf))], axis=1)
cn = cs / (np.linalg.norm(cs, axis=0, keepdims=True) + 1e-9)
chg = np.concatenate([[0], 1 - (cn[:, 1:] * cn[:, :-1]).sum(axis=0)])
k_at = np.interp(grid, tt, kick)
z = lambda x: (x - x.mean()) / (x.std() + 1e-9)
cue = z(chg) + 0.5 * z(k_at)
bar_scores = [float(cue[p::4].mean()) for p in range(4)]
bar_phase = int(np.argmax(bar_scores))

bars = []
for bi, gi in enumerate(range(bar_phase, len(grid), 4)):
    s = float(grid[gi])
    e_ = float(grid[gi + 4]) if gi + 4 < len(grid) else min(s + 4 * P, music_end)
    seg = y[int(s * sr):int(e_ * sr)]
    bars.append({"index": bi, "beat": gi, "start": round(s, 4), "end": round(e_, 4), "db": round(float(db(np.sqrt(np.mean(seg ** 2)))), 2)})

# Sections: split where the bar loudness jumps by ≥ 3 dB and stays there for 2 bars.
bar_db = np.array([b["db"] for b in bars])
cuts = [0]
for i in range(1, len(bars) - 1):
    if abs(bar_db[i] - bar_db[i - 1]) >= 3 and abs(np.mean(bar_db[i:i + 2]) - np.mean(bar_db[max(0, i - 2):i])) >= 3 and i - cuts[-1] >= 4:
        cuts.append(i)
cuts.append(len(bars))
sections = []
for a, b in zip(cuts[:-1], cuts[1:]):
    sections.append({
        "fromBar": a,
        "toBar": b,
        "start": bars[a]["start"],
        "end": bars[b - 1]["end"],
        "db": round(float(bar_db[a:b].mean()), 2),
    })

# Strongest bar-to-bar jump in the second half (the drop JIN mentioned at 1:32).
jumps = np.diff(bar_db)
half = len(bars) // 2
drop_bar = int(half + np.argmax(jumps[half - 1:]) + 0)  # bar that starts louder

energy = np.clip((rms30_db + 30.0) / 26.0, 0, 1)

out = {
    "about": "由 分析脚本.py 生成（2026-11-09）。时间单位是秒，从 bgm.wav 开头算。",
    "source": {
        "file": "bgm.wav",
        "original": "C:/Users/weoiq/Downloads/抖音2026119-498792.mp4 的音轨（AAC 44.1 kHz，用 ffmpeg 转成 48 kHz 16-bit WAV）",
        "sha256": hashlib.sha256(SRC.read_bytes()).hexdigest(),
        "duration": round(duration, 4),
        "musicEnd": round(music_end, 3),
    },
    "tempo": {
        "bpm": BPM,
        "bestCombBpm": round(float(best_bpm), 3),
        "period": round(P, 6),
        "framesPerBeat30fps": round(P * FPS, 4),
        "firstBeat": round(float(grid[0]), 4),
        "beatsPerBar": 4,
        "barPhase": bar_phase,
        "barPhaseScores": [round(s, 3) for s in bar_scores],
        "combContrast": round(float(contrast), 2),
        "kickOnBeatVsHalfBeat": [round(float(max(kick_a, kick_b)), 3), round(float(min(kick_a, kick_b)), 3)],
        "attackShiftMs": round(shift * 1000, 1),
        "attackResidualMs": {
            "beatsWithClearAttack": int(clear.sum()),
            "beatsTotal": int(len(grid)),
            "medianAbs": round(float(np.median(np.abs(resid_ms[clear]))), 2),
            "p95Abs": round(float(np.percentile(np.abs(resid_ms[clear]), 95)), 2),
        },
    },
    "beats": [round(float(t), 4) for t in grid],
    "beatFrames30fps": [int(round(t * FPS)) for t in grid],
    "bars": bars,
    "sections": sections,
    "drop": {"bar": drop_bar, "time": bars[drop_bar]["start"], "dbBefore": bars[drop_bar - 1]["db"], "dbAfter": bars[drop_bar]["db"]},
    "energy30fps": [round(float(v), 3) for v in energy],
}
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"wrote {OUT.name}: {len(grid)} beats, {len(bars)} bars, music end {music_end:.2f}s")
print(f"bpm {BPM} (comb best {best_bpm:.3f}, contrast {contrast:.2f}); first beat {grid[0]:.4f}s; attack shift {shift*1000:+.1f} ms")
print(f"kick on beat {max(kick_a, kick_b):.3f} vs half-beat {min(kick_a, kick_b):.3f}; bar phase {bar_phase} {[round(s, 3) for s in bar_scores]}")
print(f"attack residuals: {clear.sum()}/{len(grid)} beats with a clear attack, |resid| median {np.median(np.abs(resid_ms[clear])):.1f} ms, p95 {np.percentile(np.abs(resid_ms[clear]), 95):.1f} ms")
for s in sections:
    print(f"  bars {s['fromBar']:3d}-{s['toBar']:3d}  {s['start']:7.2f}-{s['end']:7.2f}s  {s['db']:6.1f} dB")
print(f"drop: bar {drop_bar} at {bars[drop_bar]['start']:.3f}s ({bars[drop_bar - 1]['db']} -> {bars[drop_bar]['db']} dB)")
