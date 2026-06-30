import { compareMidiBuffers, formatSetReport } from "./midi/compareMidi.js";

const elements = {
  audio: document.querySelector("#audioFile"),
  reference: document.querySelector("#referenceMidi"),
  external: document.querySelector("#externalMidi"),
  ours: document.querySelector("#oursMidi"),
  previous: document.querySelector("#previousMidi"),
  audioMeta: document.querySelector("#audioMeta"),
  onset: document.querySelector("#onsetTolerance"),
  duration: document.querySelector("#durationTolerance"),
  pitch: document.querySelector("#pitchTolerance"),
  compare: document.querySelector("#compareButton"),
  status: document.querySelector("#benchmarkStatus"),
  referenceNotes: document.querySelector("#referenceNotes"),
  bestCandidate: document.querySelector("#bestCandidate"),
  ourScore: document.querySelector("#ourScore"),
  results: document.querySelector("#benchmarkResults"),
  rows: document.querySelector("#summaryRows"),
  cards: document.querySelector("#diagnosticCards"),
  markdown: document.querySelector("#downloadMarkdown"),
  json: document.querySelector("#downloadJson"),
};

let latestMarkdown = "";
let latestJson = "";

elements.audio.addEventListener("change", () => {
  const file = elements.audio.files?.[0];
  elements.audioMeta.textContent = file
    ? `${file.name} - ${formatBytes(file.size)}`
    : "Optional, used for context only";
});

elements.compare.addEventListener("click", async () => {
  try {
    setStatus("Reading files...");
    const referenceFile = requiredFile(elements.reference, "Add the official/reference MIDI first.");
    const oursFile = requiredFile(elements.ours, "Add our generated MIDI first.");
    const options = readOptions();
    const referenceBuffer = await referenceFile.arrayBuffer();
    const candidates = [
      {
        label: "Official reference",
        file: referenceFile,
        buffer: referenceBuffer,
      },
    ];

    if (elements.external.files?.[0]) {
      candidates.push({
        label: "External service",
        file: elements.external.files[0],
        buffer: await elements.external.files[0].arrayBuffer(),
      });
    }

    candidates.push({
      label: "Our MIDI",
      file: oursFile,
      buffer: await oursFile.arrayBuffer(),
    });

    if (elements.previous.files?.[0]) {
      candidates.push({
        label: "Previous our MIDI",
        file: elements.previous.files[0],
        buffer: await elements.previous.files[0].arrayBuffer(),
      });
    }

    const reports = candidates.map((candidate) => ({
      label: candidate.label,
      report: compareMidiBuffers(referenceBuffer, candidate.buffer, {
        ...options,
        referenceName: referenceFile.name,
        candidateName: candidate.file.name,
      }),
    }));

    renderReports({ referenceFile, reports });
    setStatus("Comparison ready");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not compare MIDI files");
  }
});

elements.markdown.addEventListener("click", () => {
  downloadText("midi-quality-comparison.md", latestMarkdown, "text/markdown");
});

elements.json.addEventListener("click", () => {
  downloadText("midi-quality-comparison.json", latestJson, "application/json");
});

function renderReports({ referenceFile, reports }) {
  const candidateReports = reports.filter((item) => item.label !== "Official reference");
  const best = [...candidateReports].sort(
    (a, b) => b.report.summary.overallMatchPercent - a.report.summary.overallMatchPercent,
  )[0];
  const ours = reports.find((item) => item.label === "Our MIDI");
  const reference = reports[0]?.report.summary;

  elements.referenceNotes.textContent = reference?.referenceNotes?.toString() || "0";
  elements.bestCandidate.textContent = best
    ? `${best.label} ${best.report.summary.overallMatchPercent}%`
    : "-";
  elements.ourScore.textContent = ours ? `${ours.report.summary.overallMatchPercent}%` : "-";

  elements.rows.innerHTML = reports.map(formatSummaryRow).join("");
  elements.cards.innerHTML = candidateReports.map(formatDiagnosticCard).join("");
  elements.results.hidden = false;

  latestMarkdown = formatSetReport({
    reference: referenceFile.name,
    reports,
  });
  latestJson = `${JSON.stringify({ reference: referenceFile.name, reports }, null, 2)}\n`;
}

function formatSummaryRow({ label, report }) {
  const { summary } = report;
  const isReference = label === "Official reference";
  return `
    <tr class="${isReference ? "reference-row" : ""}">
      <th scope="row">${escapeHtml(label)}</th>
      <td>${score(summary.overallMatchPercent)}</td>
      <td>${score(summary.noteCorrectnessPercent)}</td>
      <td>${score(summary.extraNoteControlPercent)}</td>
      <td>${score(summary.timingAccuracyPercent)}</td>
      <td>${score(summary.noteDurationAccuracyPercent)}</td>
      <td>${score(summary.totalDurationSimilarityPercent)}</td>
      <td>${summary.tempoSimilarityPercent === null ? "unknown" : score(summary.tempoSimilarityPercent)}</td>
      <td>${summary.missedNotes}</td>
      <td>${summary.extraNotes}</td>
    </tr>
  `;
}

function formatDiagnosticCard({ label, report }) {
  const { summary, diagnostics, timing } = report;
  const problems = [
    problemLine("Missed notes", summary.missedNotes, diagnostics.mostMissedPitches),
    problemLine("Extra notes", summary.extraNotes, diagnostics.mostExtraPitches),
    `Wrong-pitch near onset: ${summary.wrongPitchNearOnset}`,
    `Average onset error: ${summary.averageAbsoluteOnsetErrorMs} ms`,
    `Average duration error: ${summary.averageAbsoluteDurationErrorMs} ms`,
    `Duration delta: ${timing.durationDeltaSeconds}s`,
  ];

  return `
    <article class="diagnostic-card">
      <h3>${escapeHtml(label)} - ${summary.overallMatchPercent}% overall</h3>
      <div class="metric-bars">
        ${metricBar("Notes", summary.noteCorrectnessPercent)}
        ${metricBar("Extra control", summary.extraNoteControlPercent)}
        ${metricBar("Timing", summary.timingAccuracyPercent)}
        ${metricBar("Duration", summary.noteDurationAccuracyPercent)}
      </div>
      <ul>
        ${problems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function metricBar(label, value) {
  const width = Math.max(0, Math.min(100, value));
  return `
    <div class="metric-bar">
      <span>${escapeHtml(label)}</span>
      <strong>${value}%</strong>
      <i style="width: ${width}%"></i>
    </div>
  `;
}

function problemLine(label, count, histogram) {
  const detail = histogram?.length
    ? histogram.map((item) => `${item.name} (${item.count})`).join(", ")
    : "none";
  return `${label}: ${count}. Most common: ${detail}`;
}

function requiredFile(input, message) {
  const file = input.files?.[0];
  if (!file) throw new Error(message);
  return file;
}

function readOptions() {
  return {
    onsetTolerance: Number(elements.onset.value) || 0.12,
    durationTolerance: Number(elements.duration.value) || 0.25,
    pitchTolerance: Number(elements.pitch.value) || 0,
  };
}

function score(value) {
  const className = value >= 85 ? "good-score" : value >= 60 ? "warn-score" : "bad-score";
  return `<span class="${className}">${value}%</span>`;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function downloadText(filename, text, type) {
  if (!text) return;
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
