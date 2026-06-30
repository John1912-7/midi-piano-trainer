#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { compareMidiBuffers, formatReport } from "../src/midi/compareMidi.js";

export { formatReport } from "../src/midi/compareMidi.js";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await main(process.argv.slice(2)).catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
  if (result) process.exitCode = result;
}

export async function main(args) {
  const options = parseArgs(args);
  if (!options.reference || !options.candidate) {
    printUsage();
    return 1;
  }

  const report = await compareMidiFiles(options.reference, options.candidate, options);
  const text = formatReport(report);
  console.log(text);

  if (options.json) {
    await writeFile(options.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (options.markdown) {
    await writeFile(options.markdown, text, "utf8");
  }

  return 0;
}

export async function compareMidiFiles(referencePath, candidatePath, options = {}) {
  const [referenceBuffer, candidateBuffer] = await Promise.all([
    readFile(referencePath),
    readFile(candidatePath),
  ]);

  return compareMidiBuffers(referenceBuffer, candidateBuffer, {
    ...options,
    referenceName: basename(referencePath),
    candidateName: basename(candidatePath),
  });
}

function parseArgs(args) {
  const options = {};
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--onset") options.onsetTolerance = Number(args[++index]);
    else if (arg === "--duration") options.durationTolerance = Number(args[++index]);
    else if (arg === "--pitch") options.pitchTolerance = Number(args[++index]);
    else if (arg === "--json") options.json = args[++index];
    else if (arg === "--markdown") options.markdown = args[++index];
    else positional.push(arg);
  }

  [options.reference, options.candidate] = positional;
  return options;
}

function printUsage() {
  console.log("Usage: node scripts/compare-midi.mjs reference.mid candidate.mid [--onset 0.12] [--pitch 0] [--json report.json] [--markdown report.md]");
}
