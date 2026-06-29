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

## Rules

- Do not make backend required for the trainer.
- Do not download YouTube audio directly.
- Do not place ads near upload, play, convert, editor, or download controls.
- Keep pages useful without ads.
- Keep sitemap, canonical, title, description, and hreflang updated.
- Use language-only hreflang values: `en`, `ru`, `de`, `es`, `hy`, plus `x-default`.

## Next Priorities

- Keep README current.
- Improve audio-to-MIDI UX as a real tool page, not a planning note.
- Add launch materials for Reddit, Discord, short-form video, Show HN, Product Hunt, AlternativeTo, and GitHub.
- Link back to Open Free Tools from public pages.
