#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { parseMidi } from "../src/midi/parseMidi.js";

const DEFAULTS = {
  onsetTolerance: 0.12,
  durationTolerance: 0.25,
  pitchTolerance: 0,
};

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

  const referenceSong = parseMidi(bufferToArrayBuffer(referenceBuffer));
  const candidateSong = parseMidi(bufferToArrayBuffer(candidateBuffer));

  return compareSongs(referenceSong, candidateSong, {
    ...DEFAULTS,
    ...options,
    referencePath,
    candidatePath,
    referenceTempo: readTempoSummary(referenceBuffer) || defaultTempoSummary(),
    candidateTempo: readTempoSummary(candidateBuffer) || defaultTempoSummary(),
  });
}

export function compareSongs(referenceSong, candidateSong, options = {}) {
  const settings = { ...DEFAULTS, ...options };
  const referenceNotes = normalizeNotes(referenceSong.notes);
  const candidateNotes = normalizeNotes(candidateSong.notes);
  const usedCandidates = new Set();
  const matches = [];
  const missed = [];

  for (const reference of referenceNotes) {
    let best = null;
    let bestScore = Infinity;

    for (const candidate of candidateNotes) {
      if (usedCandidates.has(candidate.index)) continue;
      const pitchDelta = Math.abs(candidate.note - reference.note);
      const onsetDelta = Math.abs(candidate.start - reference.start);
      if (pitchDelta > settings.pitchTolerance) continue;
      if (onsetDelta > settings.onsetTolerance) continue;

      const durationDelta = Math.abs(candidate.duration - reference.duration);
      const score = onsetDelta + pitchDelta * 0.5 + durationDelta * 0.2;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    if (best) {
      usedCandidates.add(best.index);
      matches.push({
        reference,
        candidate: best,
        pitchDelta: best.note - reference.note,
        onsetDelta: best.start - reference.start,
        durationDelta: best.duration - reference.duration,
      });
    } else {
      missed.push(reference);
    }
  }

  const extra = candidateNotes.filter((note) => !usedCandidates.has(note.index));
  const wrongPitchNearOnset = countWrongPitchNearOnset(referenceNotes, extra, settings.onsetTolerance);
  const precision = safeRatio(matches.length, candidateNotes.length);
  const recall = safeRatio(matches.length, referenceNotes.length);
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const averageAbsoluteOnsetErrorSeconds = average(matches.map((match) => Math.abs(match.onsetDelta)));
  const averageAbsoluteDurationErrorSeconds = average(matches.map((match) => Math.abs(match.durationDelta)));
  const durationSimilarity = similarity(referenceSong.duration, candidateSong.duration);
  const tempoSimilarity = settings.referenceTempo && settings.candidateTempo
    ? similarity(settings.referenceTempo.primaryBpm, settings.candidateTempo.primaryBpm)
    : null;
  const timingAccuracy = matches.length
    ? clamp01(1 - averageAbsoluteOnsetErrorSeconds / settings.onsetTolerance)
    : 0;
  const noteDurationAccuracy = matches.length
    ? clamp01(1 - averageAbsoluteDurationErrorSeconds / settings.durationTolerance)
    : 0;

  return {
    files: {
      reference: settings.referencePath ? basename(settings.referencePath) : "reference",
      candidate: settings.candidatePath ? basename(settings.candidatePath) : "candidate",
    },
    settings: {
      onsetToleranceSeconds: settings.onsetTolerance,
      durationToleranceSeconds: settings.durationTolerance,
      pitchToleranceSemitones: settings.pitchTolerance,
    },
    timing: {
      referenceDurationSeconds: round(referenceSong.duration, 3),
      candidateDurationSeconds: round(candidateSong.duration, 3),
      durationDeltaSeconds: round(candidateSong.duration - referenceSong.duration, 3),
      referenceTempoBpm: settings.referenceTempo?.primaryBpm ?? null,
      candidateTempoBpm: settings.candidateTempo?.primaryBpm ?? null,
      referenceTempoEvents: settings.referenceTempo?.eventCount ?? null,
      candidateTempoEvents: settings.candidateTempo?.eventCount ?? null,
    },
    summary: {
      referenceNotes: referenceNotes.length,
      candidateNotes: candidateNotes.length,
      matchedNotes: matches.length,
      missedNotes: missed.length,
      extraNotes: extra.length,
      wrongPitchNearOnset,
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
      overallMatchPercent: round(f1 * 100, 1),
      noteCorrectnessPercent: round(recall * 100, 1),
      extraNoteControlPercent: round(precision * 100, 1),
      timingAccuracyPercent: round(timingAccuracy * 100, 1),
      noteDurationAccuracyPercent: round(noteDurationAccuracy * 100, 1),
      totalDurationSimilarityPercent: round(durationSimilarity * 100, 1),
      tempoSimilarityPercent: tempoSimilarity === null ? null : round(tempoSimilarity * 100, 1),
      averageAbsoluteOnsetErrorMs: round(averageAbsoluteOnsetErrorSeconds * 1000, 1),
      averageAbsoluteDurationErrorMs: round(averageAbsoluteDurationErrorSeconds * 1000, 1),
    },
    diagnostics: {
      mostMissedPitches: pitchHistogram(missed).slice(0, 10),
      mostExtraPitches: pitchHistogram(extra).slice(0, 10),
      largestOnsetErrors: [...matches]
        .sort((a, b) => Math.abs(b.onsetDelta) - Math.abs(a.onsetDelta))
        .slice(0, 10)
        .map((match) => serializeMatch(match)),
      sampleMissedNotes: missed.slice(0, 12).map(serializeNote),
      sampleExtraNotes: extra.slice(0, 12).map(serializeNote),
    },
  };
}

export function formatReport(report) {
  const { summary, files, settings, diagnostics, timing } = report;
  return [
    `# MIDI Compare Report`,
    ``,
    `Reference: ${files.reference}`,
    `Candidate: ${files.candidate}`,
    ``,
    `## Summary`,
    ``,
    `- Reference notes: ${summary.referenceNotes}`,
    `- Candidate notes: ${summary.candidateNotes}`,
    `- Matched notes: ${summary.matchedNotes}`,
    `- Missed notes: ${summary.missedNotes}`,
    `- Extra notes: ${summary.extraNotes}`,
    `- Wrong-pitch notes near reference onsets: ${summary.wrongPitchNearOnset}`,
    `- Precision: ${percent(summary.precision)}`,
    `- Recall: ${percent(summary.recall)}`,
    `- F1: ${percent(summary.f1)}`,
    `- Overall match: ${summary.overallMatchPercent}%`,
    `- Note correctness: ${summary.noteCorrectnessPercent}%`,
    `- Extra-note control: ${summary.extraNoteControlPercent}%`,
    `- Timing accuracy: ${summary.timingAccuracyPercent}%`,
    `- Note duration accuracy: ${summary.noteDurationAccuracyPercent}%`,
    `- Total duration similarity: ${summary.totalDurationSimilarityPercent}%`,
    `- Tempo similarity: ${summary.tempoSimilarityPercent === null ? "unknown" : `${summary.tempoSimilarityPercent}%`}`,
    `- Avg onset error: ${summary.averageAbsoluteOnsetErrorMs} ms`,
    `- Avg duration error: ${summary.averageAbsoluteDurationErrorMs} ms`,
    ``,
    `## Timing / Tempo`,
    ``,
    `- Reference duration: ${timing.referenceDurationSeconds}s`,
    `- Candidate duration: ${timing.candidateDurationSeconds}s`,
    `- Duration delta: ${timing.durationDeltaSeconds}s`,
    `- Reference tempo: ${timing.referenceTempoBpm ?? "unknown"} BPM`,
    `- Candidate tempo: ${timing.candidateTempoBpm ?? "unknown"} BPM`,
    ``,
    `## Settings`,
    ``,
    `- Onset tolerance: ${settings.onsetToleranceSeconds}s`,
    `- Pitch tolerance: ${settings.pitchToleranceSemitones} semitones`,
    ``,
    `## Diagnostics`,
    ``,
    `Most missed pitches: ${formatHistogram(diagnostics.mostMissedPitches)}`,
    `Most extra pitches: ${formatHistogram(diagnostics.mostExtraPitches)}`,
    ``,
    `Largest onset errors:`,
    ...diagnostics.largestOnsetErrors.map(
      (item) => `- ${item.reference.name} ref=${item.reference.start}s cand=${item.candidate.start}s delta=${item.onsetDeltaMs}ms`,
    ),
    ``,
    `Sample missed notes: ${diagnostics.sampleMissedNotes.map(formatNote).join(", ") || "none"}`,
    `Sample extra notes: ${diagnostics.sampleExtraNotes.map(formatNote).join(", ") || "none"}`,
    ``,
  ].join("\n");
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

function normalizeNotes(notes) {
  return notes.map((note, index) => ({
    index,
    note: note.note,
    name: note.name,
    start: note.start,
    duration: note.duration,
    end: note.start + note.duration,
    velocity: note.velocity ?? 0,
  }));
}

function countWrongPitchNearOnset(referenceNotes, extraNotes, onsetTolerance) {
  let count = 0;
  for (const extra of extraNotes) {
    if (referenceNotes.some((reference) => reference.note !== extra.note && Math.abs(reference.start - extra.start) <= onsetTolerance)) {
      count += 1;
    }
  }
  return count;
}

function pitchHistogram(notes) {
  const counts = new Map();
  for (const note of notes) {
    counts.set(note.name, (counts.get(note.name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function serializeNote(note) {
  return {
    name: note.name,
    start: round(note.start, 3),
    duration: round(note.duration, 3),
  };
}

function serializeMatch(match) {
  return {
    reference: serializeNote(match.reference),
    candidate: serializeNote(match.candidate),
    onsetDeltaMs: round(match.onsetDelta * 1000, 1),
    durationDeltaMs: round(match.durationDelta * 1000, 1),
  };
}

function formatHistogram(items) {
  return items.length ? items.map((item) => `${item.name} (${item.count})`).join(", ") : "none";
}

function formatNote(note) {
  return `${note.name}@${note.start}s`;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function similarity(reference, candidate) {
  if (!Number.isFinite(reference) || !Number.isFinite(candidate)) return 0;
  if (reference <= 0 && candidate <= 0) return 1;
  if (reference <= 0 || candidate <= 0) return 0;
  return clamp01(Math.min(reference, candidate) / Math.max(reference, candidate));
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeRatio(value, total) {
  return total ? value / total : 0;
}

function percent(value) {
  return `${round(value * 100, 1)}%`;
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function bufferToArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function readTempoSummary(buffer) {
  const view = new DataView(bufferToArrayBuffer(buffer));
  let offset = 0;
  const readString = (length) => {
    let value = "";
    for (let index = 0; index < length; index += 1) value += String.fromCharCode(view.getUint8(offset++));
    return value;
  };
  const readUint16 = () => {
    const value = view.getUint16(offset);
    offset += 2;
    return value;
  };
  const readUint32 = () => {
    const value = view.getUint32(offset);
    offset += 4;
    return value;
  };
  const readVarLength = () => {
    let value = 0;
    while (offset < view.byteLength) {
      const byte = view.getUint8(offset++);
      value = (value << 7) | (byte & 0x7f);
      if ((byte & 0x80) === 0) break;
    }
    return value;
  };

  if (readString(4) !== "MThd") return null;
  const headerLength = readUint32();
  offset += 2;
  const trackCount = readUint16();
  offset += 2;
  offset = 8 + headerLength;

  const tempos = [];
  for (let trackIndex = 0; trackIndex < trackCount && offset < view.byteLength; trackIndex += 1) {
    if (readString(4) !== "MTrk") return null;
    const endOffset = offset + readUint32();
    let runningStatus = null;

    while (offset < endOffset) {
      readVarLength();
      let status = view.getUint8(offset++);
      if (status < 0x80) {
        offset -= 1;
        if (runningStatus === null) break;
        status = runningStatus;
      } else if (status < 0xf0) {
        runningStatus = status;
      }

      if (status === 0xff) {
        const type = view.getUint8(offset++);
        const length = readVarLength();
        if (type === 0x51 && length === 3) {
          const microsecondsPerQuarter =
            (view.getUint8(offset) << 16) |
            (view.getUint8(offset + 1) << 8) |
            view.getUint8(offset + 2);
          tempos.push(round(60000000 / microsecondsPerQuarter, 3));
        }
        offset += length;
      } else if (status === 0xf0 || status === 0xf7) {
        offset += readVarLength();
      } else {
        const eventType = status >> 4;
        offset += [0xc, 0xd].includes(eventType) ? 1 : 2;
      }
    }
    offset = endOffset;
  }

  const primaryBpm = tempos.length ? tempos[0] : 120;
  return {
    primaryBpm,
    eventCount: tempos.length,
    uniqueBpm: [...new Set(tempos)].slice(0, 12),
  };
}

function defaultTempoSummary() {
  return {
    primaryBpm: 120,
    eventCount: 0,
    uniqueBpm: [120],
  };
}
