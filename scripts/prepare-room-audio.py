"""Rebuild the bundled CC0 room tracks (Python 3 + ffmpeg/ffprobe).

Downloads only public, licensed files/previews. Original sources and license
links are listed in docs/room-audio.md. No account or API key is required.
"""
from pathlib import Path
from array import array
import hashlib
import json
import subprocess
import tempfile
import urllib.request
import wave

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/assets/audio'
SOURCES = {
    'home.ogg': 'https://opengameart.org/sites/default/files/lofiagain.ogg',
    'cafe.mp3': 'https://cdn.freesound.org/previews/332/332271_2367065-lq.mp3',
    'room.mp3': 'https://cdn.freesound.org/previews/565/565535_10869493-lq.mp3',
    'page.mp3': 'https://cdn.freesound.org/previews/537/537872_11978831-lq.mp3',
    'birds.mp3': 'https://cdn.freesound.org/previews/520/520537_2282212-lq.mp3',
    'hall.mp3': 'https://cdn.freesound.org/previews/135/135097_658546-lq.mp3',
}


def run(*args):
    try:
        return subprocess.check_output(args, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as error:
        raise RuntimeError(error.stderr.decode(errors='replace')) from error


def duration(path):
    return float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                     '-of', 'default=noprint_wrappers=1:nokey=1', str(path)))


def loop(source, name, seconds=None, music=False):
    length = seconds or duration(source)
    # Blend the end into the first 0.6 seconds, then join at that exact point.
    # Unlike fading to silence, this keeps a steady bed across the loop boundary.
    pcm = source.parent / f'{name}-normalized.wav'
    run('ffmpeg', '-y', '-v', 'error', '-i', str(source), '-t', str(length),
        '-af', 'loudnorm=I=-23:TP=-8:LRA=8', '-ar', '32000',
        '-ac', '2' if music else '1', '-c:a', 'pcm_s16le', str(pcm))
    with wave.open(str(pcm), 'rb') as reader:
        channels, rate = reader.getnchannels(), reader.getframerate()
        samples = array('h', reader.readframes(reader.getnframes()))
    blend_frames = round(.6 * rate)
    blend_samples = blend_frames * channels
    assert len(samples) > blend_samples * 2
    body = samples[blend_samples:]
    for frame in range(blend_frames):
        fraction = frame / (blend_frames - 1)
        for channel in range(channels):
            head = frame * channels + channel
            tail = len(body) - blend_samples + head
            body[tail] = round(body[tail] * (1 - fraction) + samples[head] * fraction)
    with wave.open(str(pcm), 'wb') as writer:
        writer.setnchannels(channels); writer.setsampwidth(2); writer.setframerate(rate)
        writer.writeframes(body.tobytes())
    dest = OUTPUT / f'{name}.mp3'
    run('ffmpeg', '-y', '-v', 'error', '-i', str(pcm),
        '-c:a', 'libmp3lame', '-b:a', '128k' if music else '64k', str(dest))
    assert abs(duration(dest) - (length - .6)) < .2, f'Invalid loop: {dest}'
    return dest


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='moodee-audio-') as tmp:
        source = Path(tmp)
        for name, url in SOURCES.items():
            urllib.request.urlretrieve(url, source / name)
        loop(source / 'home.ogg', 'home', music=True)
        loop(source / 'cafe.mp3', 'cafe', seconds=60)

        # Three quiet page turns in a 60-second room tone, not constant rustling.
        run('ffmpeg', '-y', '-v', 'error', '-stream_loop', '-1', '-i', str(source / 'room.mp3'),
            '-i', str(source / 'page.mp3'), '-filter_complex',
            '[0:a]atrim=end=60,asetpts=PTS-STARTPTS,loudnorm=I=-27:TP=-8:LRA=8[room];'
            '[1:a]volume=0.2,asplit=3[p1][p2][p3];'
            '[p1]adelay=6000:all=1[d1];[p2]adelay=24000:all=1[d2];[p3]adelay=46000:all=1[d3];'
            '[room][d1][d2][d3]amix=inputs=4:duration=first:normalize=0[out]',
            '-map', '[out]', '-t', '60', str(source / 'library.wav'))
        loop(source / 'library.wav', 'library')

        # Filter traffic rumble; a light room reflection gives the hall more space.
        run('ffmpeg', '-y', '-v', 'error', '-i', str(source / 'hall.mp3'), '-t', '45',
            '-af', 'highpass=f=100,lowpass=f=2400,aecho=0.8:0.9:130|270:0.12|0.06',
            str(source / 'museum.wav'))
        loop(source / 'museum.wav', 'museum')

        # A window-side room: natural wind and birds, softened as if heard indoors.
        run('ffmpeg', '-y', '-v', 'error', '-stream_loop', '-1', '-i', str(source / 'birds.mp3'),
            '-stream_loop', '-1', '-i', str(source / 'room.mp3'), '-filter_complex',
            '[0:a]atrim=end=45,lowpass=f=3800,volume=0.55[birds];'
            '[1:a]atrim=end=45,volume=0.2[room];'
            '[birds][room]amix=inputs=2:duration=first:normalize=0[out]',
            '-map', '[out]', '-t', '45', str(source / 'window.wav'))
        loop(source / 'window.wav', 'room')

    manifest = []
    for file in sorted(OUTPUT.glob('*.mp3')):
        manifest.append({'file': file.name, 'bytes': file.stat().st_size,
                         'seconds': round(duration(file), 3),
                         'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
