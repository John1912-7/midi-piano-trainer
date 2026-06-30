import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

test("loads a MIDI file and aligns falling notes with keyboard lanes", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("#midiFile")).toBeAttached();

  await page.locator("#midiFile").setInputFiles({
    name: "lane-test.mid",
    mimeType: "audio/midi",
    buffer: createMidiFile([57, 64]),
  });

  await expect(page.locator("#songName")).toHaveText("lane-test.mid");
  await expect(page.locator("#noteCount")).toHaveText("2");
  await expect(page.locator("#playButton")).toBeEnabled();
  await expect(page.locator("#listenButton")).toBeEnabled();
  await expect(page.locator("#emptyState")).toHaveClass(/hidden/);

  const alignment = await page.evaluate(() => {
    const keys = [...document.querySelectorAll(".key")];
    const canvas = document.querySelector("#pianoRoll");
    const canvasRect = canvas.getBoundingClientRect();
    const keyboardRect = document.querySelector("#keyboard").getBoundingClientRect();
    const laneWidth = canvasRect.width / keys.length;
    const keyCenters = keys.map((key) => {
      const rect = key.getBoundingClientRect();
      return rect.left - keyboardRect.left + rect.width / 2;
    });

    return {
      keyCount: keys.length,
      a3LaneCenter: laneWidth * 9 + laneWidth / 2,
      e4LaneCenter: laneWidth * 16 + laneWidth / 2,
      a3KeyCenter: keyCenters[9],
      e4KeyCenter: keyCenters[16],
      laneWidth,
    };
  });

  expect(alignment.keyCount).toBe(29);
  expect(Math.abs(alignment.a3LaneCenter - alignment.a3KeyCenter)).toBeLessThan(2);
  expect(Math.abs(alignment.e4LaneCenter - alignment.e4KeyCenter)).toBeLessThan(2);
  expect(consoleErrors).toEqual([]);
});

test("listens to the selected MIDI file through the piano engine", async ({ page }) => {
  await page.addInitScript(() => {
    window.__midiStartedOscillators = 0;

    class FakeAudioNode {
      constructor() {
        this.gain = {
          value: 0.45,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          cancelScheduledValues() {},
        };
        this.frequency = { value: 0 };
      }

      connect() {}

      start() {
        window.__midiStartedOscillators += 1;
      }

      stop() {}
    }

    class FakeAudioContext {
      constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.state = "running";
      }

      createGain() {
        return new FakeAudioNode();
      }

      createOscillator() {
        return new FakeAudioNode();
      }

      resume() {
        this.state = "running";
        return Promise.resolve();
      }
    }

    window.AudioContext = FakeAudioContext;
  });

  await page.goto("/");
  await page.locator("#midiFile").setInputFiles({
    name: "listen-test.mid",
    mimeType: "audio/midi",
    buffer: createMidiFile([60]),
  });

  await expect(page.locator("#listenButton")).toBeEnabled();
  await page.locator("#listenButton").click();
  await expect(page.locator("#listenButton")).toHaveText("Stop");
  await expect
    .poll(() => page.evaluate(() => window.__midiStartedOscillators))
    .toBeGreaterThan(0);
});

test("warns when the selected notes are wider than the PC keyboard range", async ({ page }) => {
  await page.goto("/");

  await page.locator("#midiFile").setInputFiles({
    name: "wide-range.mid",
    mimeType: "audio/midi",
    buffer: createMidiFile([
      { name: "Low", notes: [36] },
      { name: "High", notes: [84] },
      { name: "Melody", notes: [64, 67] },
    ]),
  });

  await expect(page.locator("#songName")).toHaveText("wide-range.mid");
  await expect(page.locator("#noteCount")).toHaveText("4");
  await expect(page.locator("#rangeNotice")).toBeVisible();
  await expect(page.locator("#rangeNotice")).toContainText("C2-C6");

  await page.locator("#trackSelect").selectOption({ label: "Melody (2)" });

  await expect(page.locator("#noteCount")).toHaveText("2");
  await expect(page.locator("#rangeNotice")).toBeHidden();
  await expect(page.locator("#octaveLabel")).toHaveText(/C[34]-E[56]/);
});

test("opens the audio-to-midi page and checks backend health", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/ru/");

  await expect(page.locator(".site-tabs")).toBeVisible();
  await page.locator('.site-tabs a[href="./audio-to-midi/"]').click();

  await expect(page).toHaveURL(/\/ru\/audio-to-midi\/$/);
  await expect(page.locator(".site-tabs a.active")).toHaveAttribute("href", "./");
  await expect(page.getByRole("heading", { name: "Бесплатный конвертер аудио в MIDI" })).toBeVisible();
  await expect(page.locator("#backendUrl")).toBeAttached();
  await expect(page.locator("#audioFile")).toBeAttached();
  await expect(page.locator("#qualityPreset")).toHaveValue("clean");
  await expect(page.locator("#checkBackendButton")).toBeEnabled();
  await expect(page.locator("#convertAudioButton")).toBeDisabled();
  await expect(page.locator("#conversionProgress")).toHaveAttribute("value", "0");
  await expect(page.locator("#conversionStatus")).toContainText("Выберите аудиофайл");

  await page.route("http://127.0.0.1:7860/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.locator("#backendUrl").fill("http://127.0.0.1:7860");
  await expect(page.locator("#checkBackendButton")).toBeEnabled();
  await page.locator("#checkBackendButton").click();
  await expect(page.locator("#conversionStatus")).toContainText("Backend доступен");

  await page.locator("#audioFile").setInputFiles({
    name: "test-tone.wav",
    mimeType: "audio/wav",
    buffer: createWavFile(),
  });

  await expect(page.locator("#convertAudioButton")).toBeEnabled();
  await expect(page.locator("#conversionStatus")).toContainText("test-tone.wav");
  expect(errors).toEqual([]);
});

test("converts audio through backend and opens the generated MIDI in the trainer", async ({ page }) => {
  const midi = createMidiFile([60, 64, 67]);
  let convertBody = "";

  await page.route("http://127.0.0.1:7860/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("http://127.0.0.1:7860/convert", async (route) => {
    convertBody = route.request().postDataBuffer()?.toString("utf8") || "";
    await route.fulfill({
      status: 200,
      contentType: "audio/midi",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "X-Midi-Filename, X-Note-Count",
        "X-Midi-Filename": "test-tone.mid",
        "X-Note-Count": "3",
      },
      body: midi,
    });
  });

  await page.goto("/ru/audio-to-midi/");
  await page.locator("#backendUrl").fill("http://127.0.0.1:7860");
  await page.locator("#qualityPreset").selectOption("balanced");
  await page.locator("#audioFile").setInputFiles({
    name: "test-tone.wav",
    mimeType: "audio/wav",
    buffer: createWavFile(),
  });

  await page.locator("#convertAudioButton").click();
  expect(convertBody).toContain('name="quality"');
  expect(convertBody).toContain("balanced");
  await expect(page.locator("#conversionStatus")).toContainText("MIDI готов");
  await expect(page.locator("#generatedFileName")).toHaveText("test-tone.mid");
  await expect(page.locator("#generatedNoteCount")).toHaveText("3");
  await expect(page.locator("#downloadMidiButton")).toHaveAttribute("download", "test-tone.mid");

  await page.locator("#openTrainerButton").click();
  await expect(page).toHaveURL(/\/ru\/$/);
  await expect(page.locator("#songName")).toHaveText("test-tone.mid");
  await expect(page.locator("#noteCount")).toHaveText("3");
  await expect(page.locator("#playButton")).toBeEnabled();
  await expect(page.locator("#listenButton")).toBeEnabled();
});

test("opens generated MIDI from the audio-to-midi tab in the trainer", async ({ page }) => {
  await page.goto("/");
  const midiBytes = [...createMidiFile([60, 64, 67])];

  await page.evaluate((bytes) => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    sessionStorage.setItem(
      "midiPianoTrainerGeneratedMidi",
      JSON.stringify({
        name: "generated-test.mid",
        bytes: btoa(binary),
      }),
    );
  }, midiBytes);

  await page.goto("/ru/?generatedMidi=1");

  await expect(page.locator("#songName")).toHaveText("generated-test.mid");
  await expect(page.locator("#noteCount")).toHaveText("3");
  await expect(page.locator("#playButton")).toBeEnabled();
  await expect(page.locator("#listenButton")).toBeEnabled();
});

test("compares official, external, and generated MIDI files in the benchmark tool", async ({ page }) => {
  const files = {
    audio: resolve("benchmarks/external-service/maestro/chopin-op25-first20s.wav"),
    reference: resolve("benchmarks/external-service/maestro/chopin-op25-reference-first20s.mid"),
    external: resolve("benchmarks/external-service/maestro/eldoraudio-chopin-op25-first20s.mid"),
    ours: resolve("benchmarks/runs/maestro-chopin-op25-20s/chopin-op25-first20s.balanced.mid"),
  };
  test.skip(
    !Object.values(files).every((file) => existsSync(file)),
    "Requires local MAESTRO/Eldoraudio benchmark files.",
  );

  await page.goto("/benchmark/");

  await expect(page.getByRole("heading", { name: "MIDI Quality Benchmark" })).toBeVisible();
  await page.locator("#audioFile").setInputFiles(files.audio);
  await page.locator("#referenceMidi").setInputFiles(files.reference);
  await page.locator("#externalMidi").setInputFiles(files.external);
  await page.locator("#oursMidi").setInputFiles(files.ours);

  await page.locator("#compareButton").click();

  await expect(page.locator("#benchmarkStatus")).toHaveText("Comparison ready");
  await expect(page.locator("#referenceNotes")).toHaveText("303");
  await expect(page.locator("#bestCandidate")).toContainText("External service 91.8%");
  await expect(page.locator("#ourScore")).toHaveText("50.5%");
  await expect(page.locator("#summaryRows")).toContainText("Official reference");
  await expect(page.locator("#summaryRows")).toContainText("Our MIDI");
  await expect(page.locator("#diagnosticCards")).toContainText("Missed notes: 193");
});

function createMidiFile(notesOrTracks) {
  const tracks = Array.isArray(notesOrTracks[0])
    ? notesOrTracks.map((notes, index) => ({ name: `Track ${index + 1}`, notes }))
    : notesOrTracks[0]?.notes
      ? notesOrTracks
      : [{ name: "Lane Test", notes: notesOrTracks }];

  const header = [
    ...ascii("MThd"),
    ...uint32(6),
    ...uint16(tracks.length > 1 ? 1 : 0),
    ...uint16(tracks.length),
    ...uint16(480),
  ];
  const trackChunks = tracks.flatMap((track) => createTrackChunk(track.name, track.notes));

  return Buffer.from([...header, ...trackChunks]);
}

function createTrackChunk(name, notes) {
  const events = [
    0x00,
    0xff,
    0x03,
    name.length,
    ...ascii(name),
    0x00,
    0xff,
    0x51,
    0x03,
    0x07,
    0xa1,
    0x20,
  ];

  for (const note of notes) {
    events.push(0x00, 0x90, note, 0x64);
    events.push(...varLength(480), 0x80, note, 0x40);
  }

  events.push(0x00, 0xff, 0x2f, 0x00);

  return [
    ...ascii("MTrk"),
    ...uint32(events.length),
    ...events,
  ];
}

function ascii(value) {
  return [...value].map((char) => char.charCodeAt(0));
}

function uint16(value) {
  return [(value >> 8) & 0xff, value & 0xff];
}

function uint32(value) {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function varLength(value) {
  let buffer = value & 0x7f;

  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  const bytes = [];
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
  return bytes;
}

function createWavFile() {
  const sampleRate = 8000;
  const durationSeconds = 0.2;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 12000);
    buffer.writeInt16LE(sample, 44 + index * 2);
  }

  return buffer;
}
