# MIDI Piano Trainer Backend

Backend MVP for audio-to-MIDI conversion.

## API

- `GET /health` - health check
- `POST /convert` - accepts `multipart/form-data` with `file`, returns `.mid`

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

Create a Docker Space and upload the files from this `backend` folder:

- `app.py`
- `requirements.txt`
- `Dockerfile`

After deployment, paste the Space URL into the `Audio to MIDI` tab.
