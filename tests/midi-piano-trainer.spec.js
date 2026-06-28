import { expect, test } from "@playwright/test";

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

test("opens the audio-to-midi planning page from the Russian home page", async ({ page }) => {
  await page.goto("/ru/");

  await page.getByRole("link", { name: "Обсудить функцию: аудио или YouTube в MIDI" }).click();

  await expect(page).toHaveURL(/\/ru\/audio-to-midi\/$/);
  await expect(page.getByRole("heading", { name: "Аудио или YouTube в MIDI" })).toBeVisible();
  await expect(page.getByText("Да, такую функцию можно сделать.")).toBeVisible();
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
