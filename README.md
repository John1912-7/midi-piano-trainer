# MIDI Piano Trainer

Free browser-first piano practice tool for MIDI files, plus an experimental Audio to MIDI converter.

Site: https://john1912-7.github.io/midi-piano-trainer/

Part of the Open Free Tools ecosystem: https://john1912-7.github.io/open-free-tools/

Before major changes, read `PROJECT_PLAN_FOR_CODEX.md`.

## What Works

- Upload `.mid` / `.midi` files directly in the browser.
- Parse MIDI format 0/1 files with tempo events.
- Show falling notes aligned with the PC keyboard lanes.
- Select MIDI tracks.
- Auto-fit the playable keyboard octave range.
- Track hits, misses, and accuracy.
- Play notes through the Web Audio API.
- Open generated MIDI from the Audio to MIDI page.
- SEO pages for English, Russian, German, Spanish, and Armenian.
- Google Analytics and Search Console verification tags.

## Audio to MIDI MVP

Audio to MIDI is a working MVP page, not a built-in GitHub Pages backend.

Supported user flow:

1. User uploads their own MP3, WAV, OGG, FLAC, or M4A file.
2. User enters a compatible backend API URL.
3. The page sends the audio file to `POST /convert`.
4. The backend returns a `.mid` file.
5. The user downloads the MIDI or opens it in MIDI Piano Trainer.

Rules:

- Do not download YouTube audio directly.
- Do not make the backend required for the normal MIDI trainer.
- Keep the file limit visible. Current MVP limit: 25 MB.
- Keep the duration limit visible. Current backend MVP limit: 60 seconds.
- Keep the backend URL user-configurable.

Audio to MIDI pages:

- https://john1912-7.github.io/midi-piano-trainer/en/audio-to-midi/
- https://john1912-7.github.io/midi-piano-trainer/ru/audio-to-midi/
- https://john1912-7.github.io/midi-piano-trainer/de/audio-to-midi/
- https://john1912-7.github.io/midi-piano-trainer/es/audio-to-midi/
- https://john1912-7.github.io/midi-piano-trainer/hy/audio-to-midi/

## Backend API

The optional backend lives in `backend/`.

Current engine decision: Transkun is the primary audio-to-MIDI engine for piano recordings, including weak/noisy piano recordings. Basic Pitch is kept only as an optional legacy/fallback experiment, and Magenta Onsets and Frames is rejected for now because the official demo/Docker path was too slow and fragile for this free backend plan.

Live MVP backend:

```text
https://vanya1912-midi-piano-trainer-backend.hf.space
```

Endpoints:

- `GET /health`
- `POST /convert` with `multipart/form-data` fields `file` and optional `quality`

Quality presets:

- `clean` - Transkun without preprocessing, useful as a baseline.
- `balanced` - Transkun with light high-pass filtering and volume normalization.
- `sensitive` - experimental rescue mode for very noisy recordings; it can improve the worst phone/noise case slightly, but it hurts clean and normal recordings.

Transkun is used for every profile. The `quality` field now selects the preprocessing profile before Transkun runs.

Current weak-piano benchmark finding:

- `balanced` is the safest default. It preserves clean recordings and slightly improves some phone/compressed variants.
- `sensitive` improved the worst `weak-phone-noisy` case from 76.1% to 78.2%, but reduced clean/quiet recordings from about 97.7% to 94.9%. Do not make it the default.

Current backend limits:

- 25 MB maximum upload size.
- 60 seconds maximum audio duration by default, configurable with `MAX_AUDIO_SECONDS`.
- 900 seconds maximum conversion time by default, configurable with `MAX_CONVERSION_SECONDS`.

Expected response headers:

- `X-Midi-Filename`
- `X-Note-Count`
- `X-Quality-Preset`
- `X-Transcription-Engine`
- `X-Audio-Preprocess`

## Audio to MIDI Quality Checks

Use a legal reference MIDI exported from a service, notation app, DAW, or manual transcription. Do not automate private paid services or bypass their limits.

Browser comparison tool:

```text
https://john1912-7.github.io/midi-piano-trainer/benchmark/
```

Use it to upload:

- the original audio for context;
- the official/reference MIDI;
- a MIDI from another service;
- our generated MIDI;
- optionally, a previous version of our MIDI for before/after regression checks.

Compare two MIDI files:

```bash
npm run compare:midi -- reference.mid converted.mid --markdown report.md --json report.json
```

Compare an official MIDI against multiple candidates, for example an external service and our backend:

```bash
npm run compare:midi-set -- --reference official.mid --candidate "External=external.mid" --candidate "Ours=ours.mid" --markdown summary.md
```

Benchmark our backend against one audio file and one reference MIDI:

```bash
npm run benchmark:audio -- audio.wav reference.mid
```

The benchmark converts the same audio with `clean`, `balanced`, and `sensitive`, then writes reports under `benchmarks/runs/`. These run folders are ignored by git because they can contain large generated files.

Generate a weak-piano regression pack from the local MAESTRO benchmark clip:

```bash
npm run benchmark:weak-pack
```

This creates quiet, noisy, phone-filtered, compressed, room-echo, and combined weak-phone variants under `benchmarks/runs/weak-piano-pack/`.

Run the regression pack against the live or local backend:

```bash
npm run benchmark:regression -- --backend https://vanya1912-midi-piano-trainer-backend.hf.space
```

Transkun CPU inference can be slow, so the full regression run may take a long time. Use this before replacing or tuning the engine, not on every tiny UI edit.

The report focuses on:

- matched, missed, extra, and near-onset wrong-pitch notes;
- overall match, note correctness, extra-note control, timing, note duration, total duration, and tempo similarity;
- average onset and duration error;
- most missed and most extra pitches.

## Local Site

```bash
npm install
npm test
```

The Playwright test command starts a local static server automatically.

## Local Backend

```bash
cd backend
docker build -t midi-piano-backend .
docker run --rm -p 7860:7860 midi-piano-backend
```

Then use this backend URL on the Audio to MIDI page:

```text
http://127.0.0.1:7860
```

## Deployment Notes

The repository includes `render.yaml` for a Render free-plan backend experiment.

Free backend hosting can sleep, throttle, or run out of memory. Keep this optional and explain delays in the UI.

## Analytics and SEO

- Google Analytics ID: `G-EFDCRJY776`
- Search Console property: `https://john1912-7.github.io/midi-piano-trainer/`
- Sitemap: `https://john1912-7.github.io/midi-piano-trainer/sitemap.xml`

Every public page should keep:

- unique title;
- unique meta description;
- one clear h1;
- canonical URL;
- language-only hreflang links;
- useful text content;
- mobile-friendly layout.

## Project Rules

- Core functionality stays free and open-source.
- Ads must not be placed near upload, play, convert, editor, or download controls.
- Do not copy paid services' logos, UI, text, private APIs, gated content, or protected behavior.
- Keep Open Transcription Studio as a separate future tool, not inside this MIDI codebase.
