#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const DEFAULT_MANIFEST = "benchmarks/runs/weak-piano-pack/manifest.json";
const DEFAULT_OUT = "benchmarks/runs/regression";
const DEFAULT_BACKEND = "https://vanya1912-midi-piano-trainer-backend.hf.space";

const result = await main(process.argv.slice(2)).catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
if (result) process.exitCode = result;

async function main(args) {
  const options = parseArgs(args);
  const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  await mkdir(options.out, { recursive: true });

  const rows = [];
  for (const variant of manifest.variants) {
    const variantOut = join(options.out, variant.id);
    await mkdir(variantOut, { recursive: true });
    console.log(`Benchmarking ${variant.id}: ${variant.title}`);
    await runNode([
      "scripts/benchmark-audio-midi.mjs",
      variant.audio,
      variant.referenceMidi,
      "--backend",
      options.backend,
      "--quality",
      options.quality,
      "--out",
      variantOut,
    ]);

    const summaryPath = join(variantOut, `${options.quality}.compare.json`);
    const report = JSON.parse(await readFile(summaryPath, "utf8"));
    rows.push({
      id: variant.id,
      title: variant.title,
      overall: report.summary.overallMatchPercent,
      notes: report.summary.noteCorrectnessPercent,
      timing: report.summary.timingAccuracyPercent,
      duration: report.summary.noteDurationAccuracyPercent,
      missed: report.summary.missedNotes,
      extra: report.summary.extraNotes,
      avgOnsetMs: report.summary.averageAbsoluteOnsetErrorMs,
    });
  }

  const summary = formatSummary({ manifest, options, rows });
  await writeFile(join(options.out, "summary.md"), summary, "utf8");
  await writeFile(join(options.out, "summary.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(summary);
  return 0;
}

function parseArgs(args) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    out: DEFAULT_OUT,
    backend: DEFAULT_BACKEND,
    quality: "balanced",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--manifest") options.manifest = args[++index];
    else if (arg === "--out") options.out = args[++index];
    else if (arg === "--backend") options.backend = args[++index];
    else if (arg === "--quality") options.quality = args[++index];
    else if (arg === "--help") {
      printUsage();
      return options;
    }
  }
  return options;
}

function printUsage() {
  console.log("Usage: node scripts/benchmark-regression-pack.mjs [--manifest benchmarks/runs/weak-piano-pack/manifest.json] [--quality balanced] [--backend URL] [--out benchmarks/runs/regression]");
}

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}: node ${args.join(" ")}`));
    });
    child.on("error", reject);
  });
}

function formatSummary({ manifest, options, rows }) {
  const tableRows = rows.map((row) => [
    `| ${row.id}`,
    row.title,
    `${row.overall}%`,
    `${row.notes}%`,
    `${row.timing}%`,
    `${row.duration}%`,
    row.missed,
    row.extra,
    `${row.avgOnsetMs} ms |`,
  ].join(" | ")).join("\n");

  return [
    "# Audio-to-MIDI Regression Benchmark",
    "",
    `Manifest: ${options.manifest}`,
    `Backend: ${options.backend}`,
    `Quality profile: ${options.quality}`,
    `Source audio: ${manifest.sourceAudio}`,
    `Reference MIDI: ${manifest.referenceMidi}`,
    "",
    "| Variant | Title | Overall | Notes | Timing | Note duration | Missed | Extra | Avg onset error |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    tableRows,
    "",
  ].join("\n");
}
