#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { compareMidiFiles } from "./compare-midi.mjs";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await main(process.argv.slice(2)).catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
  if (result) process.exitCode = result;
}

async function main(args) {
  const options = parseArgs(args);
  if (!options.reference || !options.candidates.length) {
    printUsage();
    return 1;
  }

  const reports = [];
  reports.push({
    label: options.referenceLabel || "Official reference",
    report: await compareMidiFiles(options.reference, options.reference, options),
  });

  for (const candidate of options.candidates) {
    reports.push({
      label: candidate.label,
      report: await compareMidiFiles(options.reference, candidate.path, options),
    });
  }

  const markdown = formatSetReport({
    reference: options.reference,
    reports,
  });
  console.log(markdown);

  if (options.markdown) {
    await writeFile(options.markdown, markdown, "utf8");
  }

  if (options.json) {
    await writeFile(
      options.json,
      `${JSON.stringify({
        reference: options.reference,
        reports,
      }, null, 2)}\n`,
      "utf8",
    );
  }

  return 0;
}

function parseArgs(args) {
  const options = {
    candidates: [],
    onsetTolerance: 0.12,
    durationTolerance: 0.25,
    pitchTolerance: 0,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--reference") options.reference = args[++index];
    else if (arg === "--reference-label") options.referenceLabel = args[++index];
    else if (arg === "--candidate") options.candidates.push(parseCandidate(args[++index]));
    else if (arg === "--onset") options.onsetTolerance = Number(args[++index]);
    else if (arg === "--duration") options.durationTolerance = Number(args[++index]);
    else if (arg === "--pitch") options.pitchTolerance = Number(args[++index]);
    else if (arg === "--json") options.json = args[++index];
    else if (arg === "--markdown") options.markdown = args[++index];
  }

  return options;
}

function parseCandidate(value) {
  const splitAt = value.indexOf("=");
  if (splitAt === -1) {
    return { label: basename(value), path: value };
  }
  return {
    label: value.slice(0, splitAt),
    path: value.slice(splitAt + 1),
  };
}

function formatSetReport({ reference, reports }) {
  const rows = reports
    .map(({ label, report }) => {
      const { summary, timing } = report;
      return [
        `| ${label}`,
        report.files.candidate,
        `${summary.overallMatchPercent}%`,
        `${summary.noteCorrectnessPercent}%`,
        `${summary.extraNoteControlPercent}%`,
        `${summary.timingAccuracyPercent}%`,
        `${summary.noteDurationAccuracyPercent}%`,
        `${summary.totalDurationSimilarityPercent}%`,
        summary.tempoSimilarityPercent === null ? "unknown" : `${summary.tempoSimilarityPercent}%`,
        summary.referenceNotes,
        summary.candidateNotes,
        summary.missedNotes,
        summary.extraNotes,
        `${summary.averageAbsoluteOnsetErrorMs} ms`,
        `${summary.averageAbsoluteDurationErrorMs} ms`,
        `${timing.candidateDurationSeconds}s |`,
      ].join(" | ");
    })
    .join("\n");

  return [
    `# MIDI Quality Comparison`,
    ``,
    `Reference: ${reference}`,
    ``,
    `| Source | File | Overall | Notes correct | Extra-note control | Timing | Note duration | Total duration | Tempo | Ref notes | Candidate notes | Missed | Extra | Avg onset error | Avg duration error | Duration |`,
    `| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
    rows,
    ``,
    `Overall is the note-level F1 score against the official reference MIDI.`,
    `Notes correct is recall: how many official reference notes were found.`,
    `Extra-note control is precision: how many candidate notes were not false positives.`,
    `Timing and note duration are calculated only on matched notes.`,
    ``,
  ].join("\n");
}

function printUsage() {
  console.log(
    "Usage: node scripts/compare-midi-set.mjs --reference official.mid --candidate \"Service=service.mid\" --candidate \"Ours=ours.mid\" [--markdown report.md] [--json report.json]",
  );
}
