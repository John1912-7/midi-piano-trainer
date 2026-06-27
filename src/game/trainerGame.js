import { GOOD_WINDOW, HIT_WINDOW, LOOKAHEAD_SECONDS, PIXELS_PER_SECOND } from "../config/constants.js";
import { BLACK_CLASSES, noteName } from "../config/keyMap.js";

export class TrainerGame {
  constructor(canvas, { piano, onStatsChange }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.piano = piano;
    this.onStatsChange = onStatsChange;
    this.allNotes = [];
    this.notes = [];
    this.duration = 0;
    this.speed = 1;
    this.position = 0;
    this.startedAt = 0;
    this.isPlaying = false;
    this.animationId = null;
    this.stats = { hits: 0, misses: 0, perfect: 0, good: 0, wrong: 0 };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement);
    this.resize();
  }

  loadSong(song, trackIndex = "all") {
    this.allNotes = song.notes;
    this.duration = song.duration;
    this.setTrack(trackIndex);
    this.restart(false);
  }

  setTrack(trackIndex) {
    const nextNotes =
      trackIndex === "all"
        ? this.allNotes
        : this.allNotes.filter((note) => note.trackIndex === Number(trackIndex));

    this.notes = nextNotes.map((note, index) => ({
      ...note,
      id: `${note.id}-${index}`,
      status: "pending",
      judgedAt: null,
    }));
    this.resetStats();
    this.draw();
  }

  setSpeed(speed) {
    if (this.isPlaying) {
      this.position = this.getPosition();
      this.startedAt = performance.now() / 1000 - this.position / speed;
    }
    this.speed = speed;
  }

  async play() {
    if (!this.notes.length || this.isPlaying) return;
    await this.piano.resume();
    this.startedAt = performance.now() / 1000 - this.position / this.speed;
    this.isPlaying = true;
    this.loop();
  }

  pause() {
    if (!this.isPlaying) return;
    this.position = this.getPosition();
    this.isPlaying = false;
    this.piano.stopAll();
    cancelAnimationFrame(this.animationId);
    this.draw();
  }

  restart(autoplay = true) {
    this.position = 0;
    this.isPlaying = false;
    this.piano.stopAll();
    this.notes.forEach((note) => {
      note.status = "pending";
      note.judgedAt = null;
    });
    this.resetStats();
    cancelAnimationFrame(this.animationId);
    this.draw();
    if (autoplay) this.play();
  }

  judge(noteNumber) {
    if (!this.notes.length) return;
    const currentTime = this.getPosition();
    let best = null;
    let bestDistance = Infinity;

    for (const note of this.notes) {
      if (note.status !== "pending" || note.note !== noteNumber) continue;
      const distance = Math.abs(note.start - currentTime);
      if (distance < bestDistance && distance <= HIT_WINDOW) {
        best = note;
        bestDistance = distance;
      }
    }

    if (!best) {
      this.stats.wrong += 1;
      this.emitStats();
      return;
    }

    best.status = bestDistance <= GOOD_WINDOW ? "perfect" : "good";
    best.judgedAt = currentTime;
    this.stats.hits += 1;
    this.stats[best.status] += 1;
    this.emitStats();
  }

  getPosition() {
    if (!this.isPlaying) return this.position;
    return Math.min(this.duration + 1, (performance.now() / 1000 - this.startedAt) * this.speed);
  }

  resetStats() {
    this.stats = { hits: 0, misses: 0, perfect: 0, good: 0, wrong: 0 };
    this.emitStats();
  }

  emitStats() {
    this.onStatsChange({ ...this.stats, total: this.notes.length });
  }

  loop() {
    this.position = this.getPosition();
    this.updateMisses();
    this.draw();

    if (this.position >= this.duration + 0.8) {
      this.isPlaying = false;
      this.piano.stopAll();
      return;
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  updateMisses() {
    const currentTime = this.getPosition();
    let changed = false;

    for (const note of this.notes) {
      if (note.status === "pending" && note.start < currentTime - HIT_WINDOW) {
        note.status = "miss";
        note.judgedAt = currentTime;
        this.stats.misses += 1;
        changed = true;
      }
    }

    if (changed) this.emitStats();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.draw();
  }

  draw() {
    const { width, height } = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height);

    if (!this.notes.length) return;

    const currentTime = this.getPosition();
    const hitY = height - 92;
    const range = this.getVisibleRange();
    const laneWidth = width / (range.max - range.min + 1);

    for (const note of this.notes) {
      const y = hitY - (note.start - currentTime) * PIXELS_PER_SECOND;
      const noteHeight = Math.max(10, note.duration * PIXELS_PER_SECOND);
      if (y < -noteHeight || y > height + 80) continue;
      if (note.start < currentTime - 1 || note.start > currentTime + LOOKAHEAD_SECONDS) continue;

      const x = (note.note - range.min) * laneWidth;
      this.drawNote(ctx, note, x, y - noteHeight, Math.max(4, laneWidth - 2), noteHeight);
    }

    this.drawHitLine(ctx, width, hitY);
    this.drawTime(ctx, width, currentTime);
  }

  getVisibleRange() {
    const visible = this.notes.filter((note) => {
      const currentTime = this.getPosition();
      return note.start > currentTime - 2 && note.start < currentTime + LOOKAHEAD_SECONDS;
    });
    const source = visible.length ? visible : this.notes;
    const min = Math.max(21, Math.min(...source.map((note) => note.note)) - 2);
    const max = Math.min(108, Math.max(...source.map((note) => note.note)) + 2);
    return { min, max };
  }

  drawBackground(ctx, width, height) {
    ctx.fillStyle = "#0d0f12";
    ctx.fillRect(0, 0, width, height);

    const range = this.notes.length ? this.getVisibleRange() : { min: 48, max: 76 };
    const laneWidth = width / (range.max - range.min + 1);
    for (let note = range.min; note <= range.max; note += 1) {
      ctx.fillStyle = BLACK_CLASSES.has(note % 12) ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.018)";
      ctx.fillRect((note - range.min) * laneWidth, 0, laneWidth, height);
    }
  }

  drawNote(ctx, note, x, y, width, height) {
    const colors = {
      pending: "#28d7b2",
      perfect: "#7bd88f",
      good: "#ffd166",
      miss: "#ff6b6b",
    };
    ctx.fillStyle = colors[note.status] || colors.pending;
    ctx.globalAlpha = note.status === "miss" ? 0.42 : 0.92;
    roundedRect(ctx, x + 1, y, width, height, 6);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (width > 28 && height > 16) {
      ctx.fillStyle = "#07110f";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(noteName(note.note), x + width / 2, y + Math.min(height - 4, 16));
    }
  }

  drawHitLine(ctx, width, hitY) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(width, hitY);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 209, 102, 0.12)";
    ctx.fillRect(0, hitY - 18, width, 36);
  }

  drawTime(ctx, width, currentTime) {
    ctx.fillStyle = "#f4f7f8";
    ctx.font = "13px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`${formatTime(currentTime)} / ${formatTime(this.duration)}`, width - 14, 24);
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${rest}`;
}
