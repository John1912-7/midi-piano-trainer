#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { compareMidiFiles } from "./compare-midi.mjs";
import { formatSetReport } from "../src/midi/compareMidi.js";

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

function printUsage() {
  console.log(
    "Usage: node scripts/compare-midi-set.mjs --reference official.mid --candidate \"Service=service.mid\" --candidate \"Ours=ours.mid\" [--markdown report.md] [--json report.json]",
  );
}
