"""Studio soundtrack generator for FotoOwl video reels."""

import subprocess
from pathlib import Path

out_dir = Path(__file__).resolve().parent
out_dir.mkdir(parents=True, exist_ok=True)

tracks = {
    "instagram_trending.wav": (
        # 128 BPM driving beat: kick, snap snare, 808 sub, arpeggiated synth hook
        "0.35*sin(2*PI*(70*exp(-18*mod(t,0.46875))+42)*t)*exp(-6*mod(t,0.46875)) + "
        "0.22*(2*random(0)-1)*exp(-14*mod(t+0.46875,0.9375)) + "
        "0.12*(2*random(0)-1)*exp(-24*mod(t,0.234375)) + "
        "0.25*sin(2*PI*(55 + 10*sin(2*PI*0.5*t))*t) + "
        "0.15*sin(2*PI*440*t)*exp(-3*mod(t,0.46875)) + "
        "0.12*sin(2*PI*554.37*t)*exp(-3*mod(t+0.234375,0.46875))"
    ),
    "instagram_lofi.wav": (
        # 85 BPM lo-fi chillhop: soft kick, vinyl crackle, rimshot, Rhodes Am7 chords
        "0.28*sin(2*PI*(50*exp(-14*mod(t,1.41176))+35)*t)*exp(-5*mod(t,1.41176)) + "
        "0.18*(2*random(0)-1)*exp(-12*mod(t+0.70588,1.41176)) + "
        "0.025*(2*random(0)-1) + "
        "0.14*sin(2*PI*220*t)*exp(-0.8*mod(t,2.8235)) + "
        "0.12*sin(2*PI*261.63*t)*exp(-0.8*mod(t,2.8235)) + "
        "0.10*sin(2*PI*329.63*t)*exp(-0.8*mod(t,2.8235)) + "
        "0.08*sin(2*PI*392.00*t)*exp(-0.8*mod(t,2.8235))"
    ),
    "wedding.wav": (
        # Romantic wedding acoustic harp & piano ballad (C -> G -> Am -> F)
        "0.22*sin(2*PI*261.63*t)*exp(-1.8*mod(t,2)) + "
        "0.18*sin(2*PI*329.63*t)*exp(-1.8*mod(t,2)) + "
        "0.15*sin(2*PI*392.00*t)*exp(-1.8*mod(t,2)) + "
        "0.14*sin(2*PI*493.88*t)*exp(-2.2*mod(t+0.5,2)) + "
        "0.11*sin(2*PI*523.25*t)*exp(-2.5*mod(t+1.0,2)) + "
        "0.09*sin(2*PI*659.25*t)*exp(-3.0*mod(t+1.5,2))"
    ),
    "nature.wav": (
        # Serene pastoral acoustic folk guitar & nature harmonics (G -> Em)
        "0.20*sin(2*PI*196.00*t)*exp(-1.5*mod(t,2.5)) + "
        "0.16*sin(2*PI*246.94*t)*exp(-1.5*mod(t,2.5)) + "
        "0.14*sin(2*PI*293.66*t)*exp(-1.5*mod(t,2.5)) + "
        "0.12*sin(2*PI*392.00*t)*exp(-1.8*mod(t+1.2,2.5)) + "
        "0.08*sin(2*PI*587.33*t)*exp(-2.2*mod(t+1.8,2.5))"
    ),
    "celebration.wav": (
        # Upbeat 124 BPM celebration party groove with brass pulses
        "0.28*sin(2*PI*110.00*t)*exp(-5.0*mod(t,0.484)) + "
        "0.20*sin(2*PI*220.00*t)*exp(-4.5*mod(t+0.242,0.484)) + "
        "0.16*sin(2*PI*440.00*t)*exp(-3.5*mod(t,0.968)) + "
        "0.14*sin(2*PI*554.37*t)*exp(-3.0*mod(t+0.484,0.968)) + "
        "0.10*sin(2*PI*659.25*t)*exp(-3.5*mod(t+0.726,0.968))"
    ),
    "cinematic.wav": (
        # Deep resonant cinematic orchestral swell
        "0.24*sin(2*PI*110.00*t) + "
        "0.18*sin(2*PI*164.81*t) + "
        "0.15*sin(2*PI*220.00*t) + "
        "0.11*sin(2*PI*329.63*t + 0.4*sin(2*PI*0.15*t)) + "
        "0.08*sin(2*PI*440.00*t)"
    ),
}

for name, expr in tracks.items():
    file_path = out_dir / name
    lavfi = f"aevalsrc='{expr}':d=60"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", lavfi,
        "-ac", "2",
        "-c:a", "pcm_s16le",
        str(file_path),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"Generated {name} successfully ({file_path.stat().st_size} bytes, stereo)")
    else:
        print(f"Error generating {name}: {res.stderr[:200]}")
