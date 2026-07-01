# Project Plan for Codex

This project is the first official tool in the Open Free Tools ecosystem.

Before making major changes, keep the project aligned with:

1. free/open-source browser-first tools;
2. English, Russian, German, Spanish, and Armenian SEO;
3. AdSense-safe monetization;
4. legal separation from paid services;
5. early user acquisition through feedback-first community launches.

## Relationship to Open Free Tools

- Main hub: `../open-free-tools`
- Public hub URL: `https://john1912-7.github.io/open-free-tools/`
- MIDI Piano Trainer stays a standalone project and should not be renamed for now.
- Audio-to-MIDI remains part of MIDI Piano Trainer for now.
- Future Open Transcription Studio should be a separate tool, not part of this codebase.

## Current Product

MIDI Piano Trainer lets users upload `.mid` files in the browser, follow falling notes, select tracks, and practice on a PC keyboard.

Audio-to-MIDI is an experimental MVP. It accepts user-uploaded audio, sends it to an optional backend, returns a MIDI file, and can open the result in the trainer.

Quality work should use legal reference MIDI files. A reference can come from a user's own manual transcription, DAW export, notation app, or a service export the user is allowed to use. Do not automate private paid services or bypass limits. Use `npm run benchmark:audio -- audio.wav reference.mid` to test our backend presets against the same reference.

Current audio-to-MIDI engine decision:

- Use Transkun as the primary piano audio-to-MIDI engine for clean, normal, and weak/noisy piano recordings.
- Use Transkun preprocessing profiles before inference: `clean` = none, `balanced` = light normalization, `sensitive` = weak/noisy piano preprocessing.
- Keep Basic Pitch only as an optional legacy/fallback experiment through `AUDIO_TO_MIDI_ENGINE=basic-pitch`.
- Treat Magenta Onsets and Frames as rejected for now: official demo/backend setup was too slow and fragile for this free SaaS path.
- Benchmark every engine change against legal reference MIDI before replacing Transkun.
- Use `npm run benchmark:weak-pack` to generate weak piano variants from the legal local MAESTRO clip, then `npm run benchmark:regression` for slow full backend regression checks.

## Rules

- Do not make backend required for the trainer.
- Do not download YouTube audio directly.
- Do not automate paid/private transcription services without an official allowed API.
- Do not place ads near upload, play, convert, editor, or download controls.
- Keep pages useful without ads.
- Keep sitemap, canonical, title, description, and hreflang updated.
- Use language-only hreflang values: `en`, `ru`, `de`, `es`, `hy`, plus `x-default`.

## Next Priorities

- Product focus now: make the public MVP look and feel usable as soon as possible, then start finding first real users instead of waiting for Google SEO traffic.
- Treat "good enough for first users" as the next milestone: clear UI, understandable audio-to-MIDI flow, honest quality warnings, working download/open-in-trainer path, and a simple feedback route.
- Start early user acquisition in parallel with product polish: Reddit, Discord, short demo videos, GitHub issues/releases, Show HN/Product Hunt later, and direct feedback-first posts. Always disclose that the project is ours and ask for feedback, not spam.
- Keep README current.
- Improve audio-to-MIDI UX as a real tool page, not a planning note.
- Add launch materials for Reddit, Discord, short-form video, Show HN, Product Hunt, AlternativeTo, and GitHub.
- Link back to Open Free Tools from public pages.

## Public MVP Definition of Done

Do not polish forever. The next release is "normal enough for first users" when all items below are true:

1. A new user can open the public Audio-to-MIDI page, upload a short audio file, understand that conversion may take minutes, and see clear queued/processing/done/failed states.
2. The user can download the generated MIDI and open it in MIDI Piano Trainer without reading developer notes.
3. The page clearly explains limits: 25 MB upload, 60 seconds audio, piano/single-instrument audio works best, full songs/noisy recordings may be inaccurate, free backend may be slow.
4. Failure states are understandable: backend sleeping, file too large, unsupported file, conversion failed, or stopped waiting.
5. There is a visible feedback path: GitHub issue/link or contact route for bad results and feature requests.
6. README has the live site link, backend link, known limitations, and how to run/check the project.
7. Playwright tests pass for the trainer, audio-to-MIDI page, queue flow, and benchmark page.
8. The public page has acceptable SEO basics: title, description, h1, canonical, sitemap entry, mobile layout.
9. There is a first-user launch kit: short pitch, one screenshot/GIF/video plan, Reddit/Discord post drafts, and GitHub feedback issue text.

After these are done, stop broad UI polishing and move to first-user outreach. Only fix bugs, confusing blockers, or quality issues found by real users.
