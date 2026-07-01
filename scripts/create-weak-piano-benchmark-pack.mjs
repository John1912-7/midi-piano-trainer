#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const DEFAULT_SOURCE = "benchmarks/external-service/maestro/chopin-op25-first20s.wav";
const DEFAULT_REFERENCE = "benchmarks/external-service/maestro/chopin-op25-reference-first20s.mid";
const DEFAULT_OUT = "benchmarks/runs/weak-piano-pack";

const variants = [
  {
    id: "clean",
    title: "Clean reference audio",
    description: "Original source audio copied into the pack.",
    apply: (samples) => samples,
  },
  {
    id: "quiet",
    title: "Very quiet piano",
    description: "Lower input level, simulating a distant or quiet recording.",
    apply: (samples) => transformSamples(samples, (sample) => sample * dbToGain(-18)),
  },
  {
    id: "room-noise",
    title: "Piano with room noise",
    description: "Adds deterministic broadband noise and low hum.",
    apply: (samples, context) => addNoiseAndHum(samples, context, { noiseDb: -26, humDb: -34 }),
  },
  {
    id: "phone-filter",
    title: "Phone-like piano",
    description: "Band-limits the recording to imitate a weak phone microphone.",
    apply: (samples, context) => phoneFilter(samples, context.sampleRate),
  },
  {
    id: "compressed",
    title: "Over-compressed piano",
    description: "Adds strong dynamic compression and slight saturation.",
    apply: (samples) => transformSamples(samples, (sample) => Math.tanh(sample * 3.2) * 0.72),
  },
  {
    id: "small-room",
    title: "Small room echo",
    description: "Adds short reflections, simulating a room recording.",
    apply: (samples, context) => addEcho(samples, context, [
      { delaySeconds: 0.045, gain: 0.22 },
      { delaySeconds: 0.092, gain: 0.14 },
      { delaySeconds: 0.136, gain: 0.09 },
    ]),
  },
  {
    id: "weak-phone-noisy",
    title: "Weak noisy phone recording",
    description: "Quiet, phone-filtered, noisy piano recording.",
    apply: (samples, context) => {
      const quiet = transformSamples(samples, (sample) => sample * dbToGain(-10));
      const filtered = phoneFilter(quiet, context.sampleRate);
      return addNoiseAndHum(filtered, context, { noiseDb: -24, humDb: -32 });
    },
  },
];

const result = await main(process.argv.slice(2)).catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
if (result) process.exitCode = result;

async function main(args) {
  const options = parseArgs(args);
  await mkdir(options.out, { recursive: true });

  const wav = decodeWav(await readFile(options.source));
  const manifest = {
    createdAt: new Date().toISOString(),
    sourceAudio: options.source,
    referenceMidi: options.reference,
    outputFolder: options.out,
    sampleRate: wav.sampleRate,
    channels: wav.channels,
    variants: [],
  };

  for (const variant of variants) {
    const processed = normalizeSoftClip(variant.apply(copySamples(wav.samples), wav));
    const fileName = `${safeStem(options.source)}.${variant.id}.wav`;
    const outputPath = join(options.out, fileName);
    await writeFile(outputPath, encodeWav({ ...wav, samples: processed }));
    manifest.variants.push({
      id: variant.id,
      title: variant.title,
      description: variant.description,
      audio: outputPath.replaceAll("\\", "/"),
      referenceMidi: options.reference.replaceAll("\\", "/"),
    });
  }

  const manifestPath = join(options.out, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(join(options.out, "README.md"), formatReadme(manifest), "utf8");

  console.log(`Weak piano benchmark pack created: ${options.out}`);
  console.log(`Manifest: ${manifestPath}`);
  return 0;
}

function parseArgs(args) {
  const options = {
    source: DEFAULT_SOURCE,
    reference: DEFAULT_REFERENCE,
    out: DEFAULT_OUT,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") options.source = args[++index];
    else if (arg === "--reference") options.reference = args[++index];
    else if (arg === "--out") options.out = args[++index];
    else if (arg === "--help") {
      printUsage();
      return options;
    }
  }
  return options;
}

function printUsage() {
  console.log("Usage: node scripts/create-weak-piano-benchmark-pack.mjs [--source audio.wav] [--reference reference.mid] [--out benchmarks/runs/weak-piano-pack]");
}

function decodeWav(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Only RIFF/WAVE files are supported.");
  }

  let offset = 12;
  let fmt = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === "fmt ") fmt = parseFmt(buffer.subarray(start, start + size));
    if (id === "data") data = buffer.subarray(start, start + size);
    offset = start + size + (size % 2);
  }

  if (!fmt || !data) throw new Error("WAV file is missing fmt or data chunk.");
  if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error("Only 16-bit PCM WAV files are supported for this benchmark pack.");
  }

  const frameCount = data.length / (fmt.channels * 2);
  const samples = Array.from({ length: fmt.channels }, () => new Float32Array(frameCount));
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < fmt.channels; channel += 1) {
      const value = data.readInt16LE((frame * fmt.channels + channel) * 2);
      samples[channel][frame] = value / 32768;
    }
  }

  return {
    audioFormat: fmt.audioFormat,
    bitsPerSample: fmt.bitsPerSample,
    channels: fmt.channels,
    sampleRate: fmt.sampleRate,
    samples,
  };
}

function parseFmt(buffer) {
  return {
    audioFormat: buffer.readUInt16LE(0),
    channels: buffer.readUInt16LE(2),
    sampleRate: buffer.readUInt32LE(4),
    bitsPerSample: buffer.readUInt16LE(14),
  };
}

function encodeWav(wav) {
  const frameCount = wav.samples[0].length;
  const dataSize = frameCount * wav.channels * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(wav.channels, 22);
  buffer.writeUInt32LE(wav.sampleRate, 24);
  buffer.writeUInt32LE(wav.sampleRate * wav.channels * 2, 28);
  buffer.writeUInt16LE(wav.channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < wav.channels; channel += 1) {
      const sample = clamp(wav.samples[channel][frame], -1, 1);
      buffer.writeInt16LE(Math.round(sample * 32767), 44 + (frame * wav.channels + channel) * 2);
    }
  }
  return buffer;
}

function copySamples(samples) {
  return samples.map((channel) => new Float32Array(channel));
}

function transformSamples(samples, transform) {
  return samples.map((channel) => channel.map(transform));
}

function dbToGain(db) {
  return 10 ** (db / 20);
}

function addNoiseAndHum(samples, context, { noiseDb, humDb }) {
  const noiseGain = dbToGain(noiseDb);
  const humGain = dbToGain(humDb);
  let seed = 0x12345678;
  return samples.map((channel, channelIndex) => {
    const output = new Float32Array(channel.length);
    for (let index = 0; index < channel.length; index += 1) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const noise = ((seed / 0xffffffff) * 2 - 1) * noiseGain;
      const hum = Math.sin((2 * Math.PI * 50 * index) / context.sampleRate + channelIndex) * humGain;
      output[index] = channel[index] + noise + hum;
    }
    return output;
  });
}

function phoneFilter(samples, sampleRate) {
  return samples.map((channel) => {
    const highPassed = onePoleHighPass(channel, sampleRate, 180);
    return onePoleLowPass(highPassed, sampleRate, 3400);
  });
}

function onePoleLowPass(channel, sampleRate, cutoff) {
  const output = new Float32Array(channel.length);
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  let previous = channel[0] || 0;
  for (let index = 0; index < channel.length; index += 1) {
    previous += alpha * (channel[index] - previous);
    output[index] = previous;
  }
  return output;
}

function onePoleHighPass(channel, sampleRate, cutoff) {
  const output = new Float32Array(channel.length);
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sampleRate;
  const alpha = rc / (rc + dt);
  let previousOutput = 0;
  let previousInput = channel[0] || 0;
  for (let index = 0; index < channel.length; index += 1) {
    const current = alpha * (previousOutput + channel[index] - previousInput);
    output[index] = current;
    previousOutput = current;
    previousInput = channel[index];
  }
  return output;
}

function addEcho(samples, context, taps) {
  return samples.map((channel) => {
    const output = new Float32Array(channel);
    for (const tap of taps) {
      const delay = Math.round(tap.delaySeconds * context.sampleRate);
      for (let index = delay; index < output.length; index += 1) {
        output[index] += channel[index - delay] * tap.gain;
      }
    }
    return output;
  });
}

function normalizeSoftClip(samples) {
  let peak = 0;
  for (const channel of samples) {
    for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
  }
  const gain = peak > 0.98 ? 0.98 / peak : 1;
  return samples.map((channel) => channel.map((sample) => clamp(sample * gain, -0.98, 0.98)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeStem(path) {
  return basename(path).replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}._-]+/gu, "-") || "audio";
}

function formatReadme(manifest) {
  const rows = manifest.variants.map((variant) => `| ${variant.id} | ${variant.title} | ${variant.description} | ${variant.audio} |`).join("\n");
  return [
    "# Weak Piano Benchmark Pack",
    "",
    "Generated test audio variants for audio-to-MIDI regression checks.",
    "",
    `Source audio: \`${manifest.sourceAudio}\``,
    `Reference MIDI: \`${manifest.referenceMidi}\``,
    "",
    "| ID | Title | Description | Audio |",
    "| --- | --- | --- | --- |",
    rows,
    "",
    "These files are generated under `benchmarks/runs/` and are intentionally ignored by git.",
    "",
  ].join("\n");
}
