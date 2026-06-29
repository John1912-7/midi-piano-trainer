import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response


MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
ALLOWED_SUFFIXES = {".mp3", ".wav", ".ogg", ".flac", ".m4a"}

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
    expose_headers=["X-Midi-Filename", "X-Note-Count"],
)


@app.get("/")
def root():
    return {"ok": True, "service": "midi-piano-trainer-backend"}


@app.get("/health")
def health():
    return {"ok": True, "max_upload_mb": MAX_UPLOAD_MB}


@app.post("/convert")
async def convert(file: UploadFile = File(...)):
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

        try:
            from basic_pitch.inference import predict

            _, midi_data, note_events = predict(str(input_path))
            midi_data.write(str(output_path))
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
                "X-Note-Count": str(len(note_events)),
            },
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


def safe_stem(filename: str | None) -> str:
    stem = Path(filename or "converted").stem
    cleaned = "".join(char if char.isalnum() or char in "-_." else "-" for char in stem).strip("-")
    return cleaned or "converted"
