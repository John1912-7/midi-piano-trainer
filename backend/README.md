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

This Space runs the optional backend for MIDI Piano Trainer. It accepts a user-uploaded audio file, converts it to MIDI with Basic Pitch, and returns a `.mid` file.

Public frontend:

- https://john1912-7.github.io/midi-piano-trainer/
- https://john1912-7.github.io/midi-piano-trainer/en/audio-to-midi/

## API

- `GET /health` - health check
- `POST /convert` - accepts `multipart/form-data` with `file`, returns `.mid`

Supported input formats:

- MP3
- WAV
- OGG
- FLAC
- M4A

Default file limit: 25 MB.

Quality note: Basic Pitch works best with short, clean, single-instrument recordings. Full songs with drums, vocals, bass, and multiple instruments may produce noisy or inaccurate MIDI.

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
