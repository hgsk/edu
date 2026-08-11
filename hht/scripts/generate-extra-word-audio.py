"""Generate compact VOICEVOX audio for the 80 extended vocabulary items."""

from __future__ import annotations

import json
import re
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ITEMS_FILE = ROOT / "typing-app" / "extra-items.js"
AUDIO_DIR = ROOT / "typing-app" / "audio"
ENGINE = "http://127.0.0.1:50021"
SPEAKER = 68  # VOICEVOX:あいえるたん（ノーマル）


def post_json(path: str, body: dict | None = None) -> bytes:
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else b""
    request = urllib.request.Request(
        f"{ENGINE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main() -> None:
    source = ITEMS_FILE.read_text(encoding="utf-8")
    readings = re.findall(r'course: "words".*?reading: "([^"]+)"', source)
    if len(readings) != 80:
        raise RuntimeError(f"Expected 80 extended-vocabulary readings; found {len(readings)}")

    wav_path = AUDIO_DIR / "voicevox-extra-temp.wav"
    try:
        for offset, reading in enumerate(readings):
            number = 64 + offset
            query_path = (
                "/audio_query?"
                + urllib.parse.urlencode({"text": reading, "speaker": SPEAKER})
            )
            query = json.loads(post_json(query_path))
            query["speedScale"] = 1.12
            wav_path.write_bytes(
                post_json(f"/synthesis?speaker={SPEAKER}", query)
            )
            output = AUDIO_DIR / f"{number:03}.webm"
            subprocess.run(
                [
                    "ffmpeg",
                    "-loglevel",
                    "error",
                    "-y",
                    "-i",
                    str(wav_path),
                    "-c:a",
                    "libopus",
                    "-b:a",
                    "24k",
                    "-ac",
                    "1",
                    "-ar",
                    "24000",
                    str(output),
                ],
                check=True,
            )
            print(f"VOICE {number:03}/143")
    finally:
        wav_path.unlink(missing_ok=True)

    print("VOICEVOX 80 FILES: PASS")


if __name__ == "__main__":
    main()
