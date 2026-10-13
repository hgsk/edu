"""Generate Japanese VOICEVOX parts and join them with prepared English parts."""
import argparse
import io
import json
from pathlib import Path
import re
import subprocess
import time
import wave


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--voicevox-root', type=Path, required=True)
    parser.add_argument('--ffmpeg', required=True)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text(encoding='utf-8-sig'))
    if len(catalog) != 200:
        raise ValueError('Expected 200 questions')
    from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile
    root = args.voicevox_root.resolve()
    parts_root = root / 'parts'
    parts_root.mkdir(exist_ok=True)
    ort = root / 'runtime/voicevox_onnxruntime-win-x64-1.23.2/lib/voicevox_onnxruntime.dll'
    synth = Synthesizer(Onnxruntime.load_once(filename=str(ort)), OpenJtalk(str(root / 'dict/open_jtalk_dic_utf_8-1.11')), acceleration_mode='CPU', cpu_num_threads=4)
    with VoiceModelFile.open(root / '14.vvm') as model:
        synth.load_voice_model(model)
    owners = [meta.name for meta in synth.metas() if any(style.id == 68 for style in meta.styles)]
    if owners != ['あいえるたん']:
        raise ValueError('Style 68 must belong to あいえるたん')
    deadline = time.monotonic() + 900
    audio_root = args.catalog.resolve().parent
    for index, (key, entry) in enumerate(catalog.items(), 1):
        filename = Path(entry['src']).name
        if not re.fullmatch(r'course-[a-f0-9]{16}\.webm', filename):
            raise ValueError('Invalid audio filename')
        output = audio_root / filename
        if output.exists() and not args.force:
            if output.read_bytes()[:4] == bytes.fromhex('1a45dfa3'):
                continue
        frames = []
        for part in entry['parts']:
            if time.monotonic() > deadline:
                raise TimeoutError('Audio generation exceeded 15 minutes')
            if not re.fullmatch(r'(aier|zira)-[a-f0-9]{16}\.wav', part['file']):
                raise ValueError('Invalid part filename')
            part_path = parts_root / part['file']
            if part['voice'] == 'VOICEVOX:あいえるたん':
                if not part_path.exists() or args.force:
                    query = synth.create_audio_query(part['text'], 68)
                    query.speed_scale = 1.12
                    data = synth.synthesis(query, 68)
                    temp = part_path.with_suffix('.tmp')
                    temp.write_bytes(data)
                    temp.replace(part_path)
            elif part['voice'] != 'Microsoft Zira Desktop':
                raise ValueError('Unexpected narrator')
            with wave.open(str(part_path), 'rb') as wav:
                if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) != (1, 2, 24000):
                    raise ValueError(f'Unexpected PCM format: {part_path.name}')
                frames.append(wav.readframes(wav.getnframes()))
                frames.append(b'\0' * 3840)
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav:
            wav.setparams((1, 2, 24000, 0, 'NONE', 'not compressed'))
            wav.writeframes(b''.join(frames))
        temp = output.with_suffix('.partial.webm')
        try:
            subprocess.run([args.ffmpeg, '-nostdin', '-loglevel', 'error', '-y', '-i', 'pipe:0', '-c:a', 'libopus', '-b:a', '24k', str(temp)], input=wav_buffer.getvalue(), check=True, timeout=30, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            temp.replace(output)
        finally:
            temp.unlink(missing_ok=True)
        if index % 20 == 0:
            print(f'AIER AUDIO {index}/200', flush=True)
    print('AIER GENERATION: PASS (verified speaker 68)', flush=True)


if __name__ == '__main__':
    main()
