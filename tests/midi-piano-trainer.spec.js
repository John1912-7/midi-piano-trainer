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

function createMidiFile(notes) {
  const header = [
    ...ascii("MThd"),
    ...uint32(6),
    ...uint16(0),
    ...uint16(1),
    ...uint16(480),
  ];
  const events = [
    0x00,
    0xff,
    0x03,
    0x09,
    ...ascii("Lane Test"),
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

  return Buffer.from([
    ...header,
    ...ascii("MTrk"),
    ...uint32(events.length),
    ...events,
  ]);
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
