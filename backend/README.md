---
title: MIDI Piano Trainer Backend
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# MIDI Piano Trainer Backend

Backend MVP for audio-to-MIDI conversion.

This Space runs the optional backend for MIDI Piano Trainer. It accepts a user-uploaded audio file, converts piano audio to MIDI with Transkun, and returns a `.mid` file.

Public frontend:

- https://john1912-7.github.io/midi-piano-trainer/
- https://john1912-7.github.io/midi-piano-trainer/en/audio-to-midi/

## API

- `GET /health` - health check
- `POST /convert` - accepts `multipart/form-data` with `file`, returns `.mid`
- `POST /jobs` - accepts `multipart/form-data` with `file`, returns a queued job
- `GET /jobs/{job_id}` - returns queued/processing/done/failed status
- `GET /jobs/{job_id}/midi` - returns the finished `.mid`

The `/jobs` API is the preferred public path because Transkun can be slow on free CPU hosting. The older `/convert` endpoint stays available for compatibility and benchmark scripts.

Supported input formats:

- MP3
- WAV
- OGG
- FLAC
- M4A

Default file limit: 25 MB.
Default duration limit: 60 seconds.

Quality note: Transkun is the primary engine for piano recordings, including weaker/noisier piano recordings. It is not a general full-mix song transcriber: drums, vocals, bass, and multiple instruments may still produce noisy or inaccurate MIDI. CPU inference can be slow on free hosting, so short clips are required for the MVP.

The backend accepts the `quality` field as a preprocessing profile before Transkun runs:

- `clean` - no preprocessing, baseline behavior.
- `balanced` - light high-pass filtering and volume normalization.
- `sensitive` - experimental rescue mode for very noisy recordings; it can hurt clean recordings.

To run the old Basic Pitch path as a local experiment, set:

```text
AUDIO_TO_MIDI_ENGINE=basic-pitch
```

That fallback requires installing Basic Pitch separately.

## Local Docker

```bash
docker build -t midi-piano-backend .
docker run --rm -p 7860:7860 midi-piano-backend
```

Then use this backend URL in the site:

```text
http://127.0.0.1:7860
```

## Hugging Face Spaces

Create a Docker Space and upload the files from this `backend` folder as the Space root:

- `app.py`
- `requirements.txt`
- `Dockerfile`
- `README.md`

After deployment, paste the Space URL into the `Audio to MIDI` tab.

Example Space URL:

```text
https://YOUR_USERNAME-midi-piano-trainer-backend.hf.space
```

The frontend should use the Space URL without a trailing slash.

## Render

The repository root includes `render.yaml`.
Create a Render Blueprint/Web Service from the GitHub repository.
Render will build the Docker backend from `backend/Dockerfile` and check `/health`.
