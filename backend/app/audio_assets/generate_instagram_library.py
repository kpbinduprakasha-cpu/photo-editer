"""Generate Instagram & Video Reel Music Library."""

import subprocess
from pathlib import Path

out_dir = Path(__file__).resolve().parent
out_dir.mkdir(parents=True, exist_ok=True)

songs = {
    'inspire_the_world.wav': (
        # Uplifting inspiring acoustic chords & strings
        '0.25*sin(2*PI*261.63*t)*exp(-1.5*mod(t\\,2)) + '
        '0.20*sin(2*PI*329.63*t)*exp(-1.5*mod(t\\,2)) + '
        '0.18*sin(2*PI*392.00*t)*exp(-1.5*mod(t\\,2)) + '
        '0.15*sin(2*PI*523.25*t)*exp(-1.8*mod(t+0.5\\,2)) + '
        '0.12*sin(2*PI*659.25*t)*exp(-2.0*mod(t+1.0\\,2))'
    ),
    'golden_hour.wav': (
        # Tender emotional piano arpeggio (JVKE - golden hour style)
        '0.28*sin(2*PI*349.23*t)*exp(-3.5*mod(t\\,0.25)) + '
        '0.22*sin(2*PI*440.00*t)*exp(-3.5*mod(t+0.0625\\,0.25)) + '
        '0.18*sin(2*PI*523.25*t)*exp(-3.5*mod(t+0.125\\,0.25)) + '
        '0.15*sin(2*PI*659.25*t)*exp(-3.5*mod(t+0.1875\\,0.25)) + '
        '0.20*sin(2*PI*174.61*t)*exp(-0.8*mod(t\\,2.0))'
    ),
    'roi_instrumental.wav': (
        # Melodic ambient piano & soft strings
        '0.22*sin(2*PI*220.00*t)*exp(-1.2*mod(t\\,1.5)) + '
        '0.18*sin(2*PI*277.18*t)*exp(-1.2*mod(t\\,1.5)) + '
        '0.15*sin(2*PI*329.63*t)*exp(-1.2*mod(t\\,1.5)) + '
        '0.12*sin(2*PI*440.00*t)*exp(-1.5*mod(t+0.75\\,1.5))'
    ),
    'roi_slowed.wav': (
        # Slowed + reverb lo-fi aesthetic
        '0.25*sin(2*PI*110.00*t)*exp(-0.5*mod(t\\,2.5)) + '
        '0.18*sin(2*PI*138.59*t)*exp(-0.5*mod(t\\,2.5)) + '
        '0.15*sin(2*PI*164.81*t)*exp(-0.5*mod(t\\,2.5)) + '
        '0.03*(2*random(0)-1)'
    ),
    'let_him_cook.wav': (
        # 130 BPM drift phonk & 808 cowbell drop
        '0.35*sin(2*PI*(80*exp(-20*mod(t\\,0.4615))+40)*t)*exp(-6*mod(t\\,0.4615)) + '
        '0.25*(2*random(0)-1)*exp(-15*mod(t+0.4615\\,0.923)) + '
        '0.20*sin(2*PI*587.33*t)*exp(-8*mod(t\\,0.2307)) + '
        '0.18*sin(2*PI*659.25*t)*exp(-8*mod(t+0.115\\,0.2307))'
    ),
    'the_all_seeing_eye.wav': (
        # Meditative Tibetan singing bowl & drone
        '0.26*sin(2*PI*108.0*t) + '
        '0.18*sin(2*PI*216.0*t + 0.3*sin(2*PI*0.1*t)) + '
        '0.12*sin(2*PI*432.0*t)*exp(-0.8*mod(t\\,4.0))'
    ),
    'dreamcore.wav': (
        # Ethereal nostalgic synthwave dream
        '0.22*sin(2*PI*196.00*t)*exp(-0.8*mod(t\\,2.0)) + '
        '0.18*sin(2*PI*246.94*t)*exp(-0.8*mod(t\\,2.0)) + '
        '0.15*sin(2*PI*293.66*t)*exp(-0.8*mod(t\\,2.0)) + '
        '0.12*sin(2*PI*392.00*t)*exp(-1.0*mod(t+1.0\\,2.0))'
    ),
    'aarohanam.wav': (
        # Carnatic acoustic flute & raga melody
        '0.24*sin(2*PI*293.66*t + 0.5*sin(2*PI*5.0*t))*exp(-1.0*mod(t\\,1.8)) + '
        '0.20*sin(2*PI*369.99*t + 0.4*sin(2*PI*5.0*t))*exp(-1.0*mod(t+0.45\\,1.8)) + '
        '0.16*sin(2*PI*440.00*t + 0.4*sin(2*PI*5.0*t))*exp(-1.0*mod(t+0.9\\,1.8)) + '
        '0.12*sin(2*PI*587.33*t)*exp(-1.2*mod(t+1.35\\,1.8))'
    ),
    'durgashtakam.wav': (
        # Sacred rhythmic temple chimes & spiritual percussion
        '0.28*sin(2*PI*146.83*t)*exp(-4.0*mod(t\\,0.5)) + '
        '0.20*sin(2*PI*293.66*t)*exp(-3.0*mod(t\\,1.0)) + '
        '0.15*sin(2*PI*880.00*t)*exp(-6.0*mod(t\\,2.0)) + '
        '0.12*sin(2*PI*1174.66*t)*exp(-8.0*mod(t+0.5\\,2.0))'
    ),
    'hotline_bling.wav': (
        # Catchy R&B groove and synth bounce
        '0.30*sin(2*PI*(65*exp(-15*mod(t\\,0.6))+45)*t)*exp(-5*mod(t\\,0.6)) + '
        '0.18*(2*random(0)-1)*exp(-14*mod(t+0.3\\,0.6)) + '
        '0.16*sin(2*PI*329.63*t)*exp(-2.0*mod(t\\,0.6)) + '
        '0.14*sin(2*PI*392.00*t)*exp(-2.0*mod(t+0.3\\,0.6))'
    ),
    'veena_dreams.wav': (
        # Carnatic Veena classical plucking
        '0.26*sin(2*PI*196.00*t + 0.3*sin(2*PI*6*t))*exp(-3.0*mod(t\\,0.6)) + '
        '0.22*sin(2*PI*246.94*t + 0.3*sin(2*PI*6*t))*exp(-3.0*mod(t+0.15\\,0.6)) + '
        '0.18*sin(2*PI*293.66*t)*exp(-3.0*mod(t+0.3\\,0.6)) + '
        '0.14*sin(2*PI*392.00*t)*exp(-3.5*mod(t+0.45\\,0.6))'
    ),
    'richi_theme.wav': (
        # Dramatic South cinema brass & mass BGM
        '0.32*sin(2*PI*98.00*t)*exp(-4.0*mod(t\\,0.45)) + '
        '0.24*sin(2*PI*196.00*t)*exp(-3.5*mod(t+0.225\\,0.45)) + '
        '0.20*sin(2*PI*392.00*t) + '
        '0.16*sin(2*PI*493.88*t)*exp(-2.5*mod(t\\,0.9))'
    ),
}

for name, expr in songs.items():
    fp = out_dir / name
    cmd = [
        'ffmpeg', '-y',
        '-f', 'lavfi',
        '-i', f'aevalsrc={expr}',
        '-t', '30',
        '-ac', '2',
        '-c:a', 'pcm_s16le',
        str(fp),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0:
        print(f'Successfully generated {name} ({fp.stat().st_size} bytes)')
    else:
        print(f'Error generating {name}: {r.stderr[-200:]}')
