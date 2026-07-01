import os
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import uuid
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
JOBS_DIR = Path(os.getenv("JOBS_DIR", "/tmp/midi-piano-jobs"))
MAX_STORED_JOBS = int(os.getenv("MAX_STORED_JOBS", "20"))

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()
job_queue: queue.Queue[str] = queue.Queue()
job_worker_started = False

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
        "X-Job-Id",
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
        "job_queue": True,
        "queued_jobs": job_queue.qsize(),
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

        await save_upload_to_path(file, input_path)
        validate_audio_duration(input_path)

        try:
            metadata = create_midi_from_audio(input_path, output_path, quality)
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
                "X-Note-Count": str(metadata["note_count"]),
                "X-Quality-Preset": metadata["quality"],
                "X-Transcription-Engine": metadata["engine"],
                "X-Audio-Preprocess": metadata["preprocess"],
            },
        )


@app.post("/jobs")
async def create_job(file: UploadFile = File(...), quality: str = Form("clean")):
    ensure_job_worker()
    cleanup_old_jobs()

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Only MP3, WAV, OGG, FLAC and M4A files are supported.",
        )

    job_id = uuid.uuid4().hex
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_dir / f"input{suffix}"
    output_path = job_dir / "converted.mid"
    public_name = f"{safe_stem(file.filename)}.mid"
    preset_name = quality if quality in QUALITY_PRESETS else "balanced"

    await save_upload_to_path(file, input_path)
    validate_audio_duration(input_path)

    job = {
        "job_id": job_id,
        "status": "queued",
        "progress": 5,
        "message": "Waiting for conversion.",
        "filename": public_name,
        "note_count": None,
        "quality": preset_name,
        "engine": selected_engine(),
        "preprocess": None,
        "error": None,
        "created_at": time.time(),
        "updated_at": time.time(),
        "input_path": str(input_path),
        "output_path": str(output_path),
    }

    with jobs_lock:
        jobs[job_id] = job

    job_queue.put(job_id)
    return JSONResponse(status_code=202, content=serialize_job(job))


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = find_job(job_id)
    return serialize_job(job)


@app.get("/jobs/{job_id}/midi")
def get_job_midi(job_id: str):
    job = find_job(job_id)
    if job["status"] != "done":
        raise HTTPException(status_code=409, detail="MIDI is not ready yet.")

    output_path = Path(job["output_path"])
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="MIDI file is no longer available.")

    return Response(
        content=output_path.read_bytes(),
        media_type="audio/midi",
        headers={
            "Content-Disposition": f'attachment; filename="{job["filename"]}"',
            "X-Job-Id": job_id,
            "X-Midi-Filename": job["filename"],
            "X-Note-Count": str(job["note_count"] or 0),
            "X-Quality-Preset": job["quality"],
            "X-Transcription-Engine": job["engine"],
            "X-Audio-Preprocess": job["preprocess"] or "none",
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


def safe_stem(filename: str | None) -> str:
    stem = Path(filename or "converted").stem
    cleaned = "".join(char if char.isalnum() or char in "-_." else "-" for char in stem).strip("-")
    return cleaned or "converted"


async def save_upload_to_path(file: UploadFile, input_path: Path) -> None:
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


def validate_audio_duration(input_path: Path) -> None:
    duration_seconds = audio_duration_seconds(input_path)
    if duration_seconds and duration_seconds > MAX_AUDIO_SECONDS:
        raise HTTPException(
            status_code=413,
            detail=(
                f"The audio is too long for this MVP. "
                f"Limit: {format_seconds(MAX_AUDIO_SECONDS)}."
            ),
        )


def create_midi_from_audio(input_path: Path, output_path: Path, quality: str) -> dict[str, str | int]:
    preset_name = quality if quality in QUALITY_PRESETS else "balanced"
    engine = selected_engine()
    preprocess_name = "none"

    if engine == "basic-pitch":
        cleaned_note_count = transcribe_with_basic_pitch(input_path, output_path, preset_name)
    else:
        transkun_input, preprocess_name = prepare_audio_for_transkun(
            input_path,
            output_path.parent / "preprocessed.wav",
            preset_name,
        )
        transcribe_with_transkun(transkun_input, output_path)
        cleaned_note_count = count_midi_notes(output_path)

    return {
        "note_count": cleaned_note_count,
        "quality": preset_name,
        "engine": engine,
        "preprocess": preprocess_name,
    }


def ensure_job_worker() -> None:
    global job_worker_started
    if job_worker_started:
        return

    with jobs_lock:
        if job_worker_started:
            return
        JOBS_DIR.mkdir(parents=True, exist_ok=True)
        worker = threading.Thread(target=job_worker_loop, name="midi-job-worker", daemon=True)
        worker.start()
        job_worker_started = True


def job_worker_loop() -> None:
    while True:
        job_id = job_queue.get()
        try:
            process_job(job_id)
        finally:
            job_queue.task_done()


def process_job(job_id: str) -> None:
    job = find_job(job_id)
    update_job(
        job_id,
        status="processing",
        progress=20,
        message="Converting audio to MIDI.",
        updated_at=time.time(),
    )

    try:
        metadata = create_midi_from_audio(
            Path(job["input_path"]),
            Path(job["output_path"]),
            str(job["quality"]),
        )
        update_job(
            job_id,
            status="done",
            progress=100,
            message="MIDI is ready.",
            note_count=metadata["note_count"],
            engine=metadata["engine"],
            preprocess=metadata["preprocess"],
            updated_at=time.time(),
        )
    except subprocess.TimeoutExpired:
        update_job(
            job_id,
            status="failed",
            progress=0,
            message="Conversion took too long.",
            error="Audio-to-MIDI conversion took too long. Try a shorter piano clip.",
            updated_at=time.time(),
        )
    except Exception as error:
        update_job(
            job_id,
            status="failed",
            progress=0,
            message="Conversion failed.",
            error=f"Could not create MIDI: {error}",
            updated_at=time.time(),
        )


def find_job(job_id: str) -> dict:
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        return dict(job)


def update_job(job_id: str, **changes) -> None:
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(changes)


def serialize_job(job: dict) -> dict:
    return {
        key: value
        for key, value in job.items()
        if key not in {"input_path", "output_path"}
    }


def cleanup_old_jobs() -> None:
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    with jobs_lock:
        removable = sorted(
            (
                job
                for job in jobs.values()
                if job.get("status") in {"done", "failed"}
            ),
            key=lambda item: item.get("updated_at", 0),
        )
        while len(jobs) >= MAX_STORED_JOBS and removable:
            job = removable.pop(0)
            jobs.pop(job["job_id"], None)
            shutil.rmtree(Path(job["input_path"]).parent, ignore_errors=True)


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
