import os
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response


MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
ALLOWED_SUFFIXES = {".mp3", ".wav", ".ogg", ".flac", ".m4a"}
DEFAULT_ENGINE = os.getenv("AUDIO_TO_MIDI_ENGINE", "transkun").strip().lower()
TRANSKUN_DEVICE = os.getenv("TRANSKUN_DEVICE", "cpu").strip() or "cpu"
MAX_CONVERSION_SECONDS = int(os.getenv("MAX_CONVERSION_SECONDS", "900"))
MAX_AUDIO_SECONDS = float(os.getenv("MAX_AUDIO_SECONDS", "60"))
PREPROCESS_VERSION = "2026-07-01-format-explicit"

app = FastAPI(title="MIDI Piano Trainer Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
        "https://john1912-7.github.io",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=[
        "X-Midi-Filename",
        "X-Note-Count",
        "X-Quality-Preset",
        "X-Transcription-Engine",
        "X-Audio-Preprocess",
    ],
)


@app.get("/")
def root():
    return {"ok": True, "service": "midi-piano-trainer-backend"}


@app.get("/health")
def health():
    return {
        "ok": True,
        "engine": selected_engine(),
        "max_upload_mb": MAX_UPLOAD_MB,
        "max_audio_seconds": MAX_AUDIO_SECONDS,
        "quality_presets": list(QUALITY_PRESETS),
        "preprocess_profiles": list(PREPROCESS_PROFILES),
        "preprocess_version": PREPROCESS_VERSION,
    }


@app.post("/convert")
async def convert(file: UploadFile = File(...), quality: str = Form("clean")):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Only MP3, WAV, OGG, FLAC and M4A files are supported.",
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_path = temp_path / f"input{suffix}"
        output_path = temp_path / "converted.mid"

        size = 0
        with input_path.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"The file is too large. MVP limit: {MAX_UPLOAD_MB} MB.",
                    )
                output.write(chunk)

        duration_seconds = audio_duration_seconds(input_path)
        if duration_seconds and duration_seconds > MAX_AUDIO_SECONDS:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"The audio is too long for this MVP. "
                    f"Limit: {format_seconds(MAX_AUDIO_SECONDS)}."
                ),
            )

        preset_name = quality if quality in QUALITY_PRESETS else "balanced"
        engine = selected_engine()
        preprocess_name = "none"

        try:
            if engine == "basic-pitch":
                cleaned_note_count = transcribe_with_basic_pitch(input_path, output_path, preset_name)
            else:
                transkun_input, preprocess_name = prepare_audio_for_transkun(
                    input_path,
                    temp_path / "preprocessed.wav",
                    preset_name,
                )
                transcribe_with_transkun(transkun_input, output_path)
                cleaned_note_count = count_midi_notes(output_path)
        except subprocess.TimeoutExpired as error:
            raise HTTPException(
                status_code=504,
                detail=(
                    "Audio-to-MIDI conversion took too long. "
                    "Try a shorter piano clip or a faster backend."
                ),
            ) from error
        except Exception as error:
            raise HTTPException(status_code=500, detail=f"Could not create MIDI: {error}") from error

        public_name = f"{safe_stem(file.filename)}.mid"
        midi_bytes = output_path.read_bytes()

        return Response(
            content=midi_bytes,
            media_type="audio/midi",
            headers={
                "Content-Disposition": f'attachment; filename="{public_name}"',
                "X-Midi-Filename": public_name,
                "X-Note-Count": str(cleaned_note_count),
                "X-Quality-Preset": preset_name,
                "X-Transcription-Engine": engine,
                "X-Audio-Preprocess": preprocess_name,
            },
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


def safe_stem(filename: str | None) -> str:
    stem = Path(filename or "converted").stem
    cleaned = "".join(char if char.isalnum() or char in "-_." else "-" for char in stem).strip("-")
    return cleaned or "converted"


QUALITY_PRESETS = {
    "clean": {
        "onset_threshold": 0.68,
        "frame_threshold": 0.45,
        "minimum_note_length_ms": 180.0,
        "minimum_frequency": 55.0,
        "maximum_frequency": 2200.0,
        "min_duration_seconds": 0.09,
        "min_velocity": 24,
        "merge_gap_seconds": 0.035,
    },
    "balanced": {
        "onset_threshold": 0.55,
        "frame_threshold": 0.35,
        "minimum_note_length_ms": 130.0,
        "minimum_frequency": 45.0,
        "maximum_frequency": 3000.0,
        "min_duration_seconds": 0.055,
        "min_velocity": 18,
        "merge_gap_seconds": 0.025,
    },
    "sensitive": {
        "onset_threshold": 0.45,
        "frame_threshold": 0.25,
        "minimum_note_length_ms": 90.0,
        "minimum_frequency": 35.0,
        "maximum_frequency": 4200.0,
        "min_duration_seconds": 0.035,
        "min_velocity": 10,
        "merge_gap_seconds": 0.015,
    },
}


PREPROCESS_PROFILES = {
    "clean": "none",
    "balanced": "normalize",
    "sensitive": "weak-piano",
}


def selected_engine() -> str:
    if DEFAULT_ENGINE in {"basic-pitch", "basic_pitch", "basicpitch"}:
        return "basic-pitch"
    return "transkun"


def prepare_audio_for_transkun(input_path: Path, output_path: Path, preset_name: str) -> tuple[Path, str]:
    profile = PREPROCESS_PROFILES.get(preset_name, "normalize")
    if profile == "none":
        return input_path, profile

    import torchaudio.functional as audio_functional

    try:
        waveform, sample_rate = load_audio_for_preprocessing(input_path)
    except ValueError:
        return input_path, "none"

    if profile == "weak-piano":
        waveform = waveform.mean(dim=0, keepdim=True)
        waveform = audio_functional.highpass_biquad(waveform, sample_rate, cutoff_freq=80)
        waveform = audio_functional.lowpass_biquad(waveform, sample_rate, cutoff_freq=7200)
        waveform = compress_waveform(waveform, strength=0.68)
        waveform = normalize_waveform(waveform, target_rms_db=-16.0)
    else:
        waveform = audio_functional.highpass_biquad(waveform, sample_rate, cutoff_freq=35)
        waveform = normalize_waveform(waveform, target_rms_db=-20.0)

    waveform = limit_peak(waveform, peak=0.98)
    save_pcm_wav(output_path, waveform, sample_rate)
    return output_path, profile


def load_audio_for_preprocessing(input_path: Path):
    if input_path.suffix.lower() == ".wav":
        return load_pcm_wav(input_path)
    try:
        import torch
        import torchaudio

        waveform, sample_rate = torchaudio.load(str(input_path), format=audio_format(input_path))
        return waveform.to(torch.float32), sample_rate
    except Exception as error:
        raise ValueError("Audio format is not available for preprocessing.") from error


def load_pcm_wav(input_path: Path):
    import torch

    with wave.open(str(input_path), "rb") as wav_file:
        channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        sample_rate = wav_file.getframerate()
        frame_count = wav_file.getnframes()
        compression = wav_file.getcomptype()
        if compression != "NONE" or sample_width != 2:
            raise ValueError("Only 16-bit PCM WAV can be preprocessed without an audio backend.")
        raw = wav_file.readframes(frame_count)

    audio = torch.frombuffer(raw, dtype=torch.int16).clone().reshape(-1, channels)
    waveform = audio.transpose(0, 1).to(torch.float32) / 32768.0
    return waveform, sample_rate


def save_pcm_wav(output_path: Path, waveform, sample_rate: int) -> None:
    import torch

    pcm = (
        waveform.detach()
        .cpu()
        .clamp(-1, 1)
        .transpose(0, 1)
        .contiguous()
        .mul(32767)
        .round()
        .to(dtype=torch.int16)
        .numpy()
        .tobytes()
    )
    with wave.open(str(output_path), "wb") as wav_file:
        wav_file.setnchannels(int(waveform.shape[0]))
        wav_file.setsampwidth(2)
        wav_file.setframerate(int(sample_rate))
        wav_file.writeframes(pcm)


def normalize_waveform(waveform, target_rms_db: float):
    import torch

    rms = torch.sqrt(torch.mean(waveform.square()) + 1e-10)
    target_rms = 10 ** (target_rms_db / 20)
    return waveform * min(target_rms / float(rms), 24.0)


def compress_waveform(waveform, strength: float):
    import torch

    return torch.sign(waveform) * torch.pow(torch.abs(waveform).clamp_min(1e-8), strength)


def limit_peak(waveform, peak: float):
    current_peak = float(waveform.abs().max())
    if current_peak <= peak or current_peak == 0:
        return waveform
    return waveform * (peak / current_peak)


def transcribe_with_transkun(input_path: Path, output_path: Path) -> None:
    command = [
        sys.executable,
        "-m",
        "transkun.transcribe",
        str(input_path),
        str(output_path),
        "--device",
        TRANSKUN_DEVICE,
    ]
    result = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        timeout=MAX_CONVERSION_SECONDS,
    )
    if result.returncode != 0:
        details = (result.stderr or result.stdout or "Transkun failed.").strip()
        raise RuntimeError(details[-1200:])
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("Transkun did not create a MIDI file.")


def transcribe_with_basic_pitch(input_path: Path, output_path: Path, preset_name: str) -> int:
    from basic_pitch.inference import predict

    preset = QUALITY_PRESETS[preset_name]
    _, midi_data, _note_events = predict(
        str(input_path),
        onset_threshold=preset["onset_threshold"],
        frame_threshold=preset["frame_threshold"],
        minimum_note_length=preset["minimum_note_length_ms"],
        minimum_frequency=preset["minimum_frequency"],
        maximum_frequency=preset["maximum_frequency"],
        melodia_trick=True,
        midi_tempo=120,
    )
    cleaned_note_count = clean_midi(midi_data, preset)
    midi_data.write(str(output_path))
    return cleaned_note_count


def audio_duration_seconds(input_path: Path) -> float:
    if input_path.suffix.lower() == ".wav":
        try:
            with wave.open(str(input_path), "rb") as wav_file:
                if not wav_file.getframerate():
                    return 0
                return wav_file.getnframes() / wav_file.getframerate()
        except Exception:
            return 0

    try:
        import torchaudio

        info = torchaudio.info(str(input_path), format=audio_format(input_path))
        if not info.sample_rate:
            return 0
        return info.num_frames / info.sample_rate
    except Exception:
        return 0


def format_seconds(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:g} seconds"
    minutes = seconds / 60
    return f"{minutes:g} minutes"


def audio_format(input_path: Path) -> str | None:
    extension = input_path.suffix.lower().lstrip(".")
    if extension == "m4a":
        return "mp4"
    return extension or None


def count_midi_notes(midi_path: Path) -> int:
    try:
        import pretty_midi

        midi = pretty_midi.PrettyMIDI(str(midi_path))
        return sum(len(instrument.notes) for instrument in midi.instruments)
    except Exception:
        return 0


def clean_midi(midi_data, preset: dict[str, float]) -> int:
    total = 0
    for instrument in midi_data.instruments:
        notes = [
            note
            for note in instrument.notes
            if note.end - note.start >= preset["min_duration_seconds"]
            and note.velocity >= preset["min_velocity"]
        ]
        instrument.notes = merge_repeated_notes(notes, preset["merge_gap_seconds"])
        total += len(instrument.notes)
    return total


def merge_repeated_notes(notes, merge_gap_seconds: float):
    merged = []
    for note in sorted(notes, key=lambda item: (item.pitch, item.start, item.end)):
        if (
            merged
            and merged[-1].pitch == note.pitch
            and note.start - merged[-1].end <= merge_gap_seconds
        ):
            merged[-1].end = max(merged[-1].end, note.end)
            merged[-1].velocity = max(merged[-1].velocity, note.velocity)
        else:
            merged.append(note)
    return sorted(merged, key=lambda item: (item.start, item.pitch))
