#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { compareMidiFiles, formatReport } from "./compare-midi.mjs";

const DEFAULT_BACKEND = "https://vanya1912-midi-piano-trainer-backend.hf.space";
const DEFAULT_PRESETS = ["clean", "balanced", "sensitive"];

const result = await main(process.argv.slice(2)).catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
if (result) process.exitCode = result;

async function main(args) {
  const options = parseArgs(args);
  if (!options.audio || !options.reference) {
    printUsage();
    return 1;
  }

  const runId = new Date().toISOString().replaceAll(":", "-").replace(/\.\d+Z$/, "Z");
  const runDir = options.out || join("benchmarks", "runs", runId);
  await mkdir(runDir, { recursive: true });

  const summaries = [];
  for (const preset of options.presets) {
    console.log(`Converting with preset: ${preset}`);
    const midiPath = join(runDir, `${safeStem(options.audio)}.${preset}.mid`);
    await convertAudio({
      backend: options.backend,
      audioPath: options.audio,
      outputPath: midiPath,
      quality: preset,
    });

    const report = await compareMidiFiles(options.reference, midiPath, {
      onsetTolerance: options.onsetTolerance,
      pitchTolerance: options.pitchTolerance,
      referencePath: options.reference,
      candidatePath: midiPath,
    });

    const jsonPath = join(runDir, `${preset}.compare.json`);
    const mdPath = join(runDir, `${preset}.compare.md`);
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(mdPath, formatReport(report), "utf8");
    summaries.push({ preset, midiPath, jsonPath, mdPath, summary: report.summary });
  }

  const summaryText = formatBenchmarkSummary({
    audio: options.audio,
    reference: options.reference,
    backend: options.backend,
    runDir,
    summaries,
  });
  await writeFile(join(runDir, "summary.md"), summaryText, "utf8");
  console.log(summaryText);
  return 0;
}

async function convertAudio({ backend, audioPath, outputPath, quality }) {
  const audioBytes = await readFile(audioPath);
  const formData = new FormData();
  formData.append("quality", quality);
  formData.append(
    "file",
    new Blob([audioBytes], { type: mimeType(audioPath) }),
    basename(audioPath),
  );

  const response = await fetch(`${backend.replace(/\/+$/, "")}/convert`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
  }

  const midiBytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(outputPath, midiBytes);
}

function parseArgs(args) {
  const options = {
    backend: DEFAULT_BACKEND,
    presets: DEFAULT_PRESETS,
    onsetTolerance: 0.12,
    pitchTolerance: 0,
  };
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--backend") options.backend = args[++index];
    else if (arg === "--quality") options.presets = args[++index].split(",").map((item) => item.trim()).filter(Boolean);
    else if (arg === "--onset") options.onsetTolerance = Number(args[++index]);
    else if (arg === "--pitch") options.pitchTolerance = Number(args[++index]);
    else if (arg === "--out") options.out = args[++index];
    else positional.push(arg);
  }

  [options.audio, options.reference] = positional;
  return options;
}

function printUsage() {
  console.log("Usage: node scripts/benchmark-audio-midi.mjs audio.wav reference.mid [--quality clean,balanced,sensitive] [--backend URL] [--out benchmarks/runs/name]");
}

function formatBenchmarkSummary({ audio, reference, backend, runDir, summaries }) {
  const rows = summaries
    .map(({ preset, summary }) => [
      `| ${preset}`,
      `${summary.overallMatchPercent}%`,
      `${summary.noteCorrectnessPercent}%`,
      `${summary.extraNoteControlPercent}%`,
      `${summary.timingAccuracyPercent}%`,
      `${summary.noteDurationAccuracyPercent}%`,
      `${summary.totalDurationSimilarityPercent}%`,
      summary.tempoSimilarityPercent === null ? "unknown" : `${summary.tempoSimilarityPercent}%`,
      summary.missedNotes,
      summary.extraNotes,
      `${summary.averageAbsoluteOnsetErrorMs} ms |`,
    ].join(" | "))
    .join("\n");

  const best = [...summaries].sort((a, b) => b.summary.f1 - a.summary.f1)[0];
  return [
    `# Audio-to-MIDI Benchmark`,
    ``,
    `Audio: ${audio}`,
    `Reference MIDI: ${reference}`,
    `Backend: ${backend}`,
    `Run folder: ${runDir}`,
    ``,
    `Best preset by F1: ${best?.preset || "none"}`,
    ``,
    `| Preset | Overall | Notes | Extra-note control | Timing | Note duration | Total duration | Tempo | Missed | Extra | Avg onset error |`,
    `| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
    rows,
    ``,
  ].join("\n");
}

function safeStem(path) {
  return basename(path, extname(path)).replace(/[^\p{L}\p{N}._-]+/gu, "-") || "audio";
}

function mimeType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".wav") return "audio/wav";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".ogg") return "audio/ogg";
  if (extension === ".flac") return "audio/flac";
  if (extension === ".m4a") return "audio/mp4";
  return "application/octet-stream";
}
