export class PianoEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.active = new Map();
  }

  async resume() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.context.destination);
    }

    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  noteOn(note, velocity = 0.8) {
    if (!this.context || this.active.has(note)) return;

    const now = this.context.currentTime;
    const frequency = 440 * 2 ** ((note - 69) / 12);
    const output = this.context.createGain();
    const oscA = this.context.createOscillator();
    const oscB = this.context.createOscillator();

    oscA.type = "triangle";
    oscB.type = "sine";
    oscA.frequency.value = frequency;
    oscB.frequency.value = frequency * 2;

    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(Math.max(0.04, velocity * 0.28), now + 0.018);
    output.gain.exponentialRampToValueAtTime(Math.max(0.025, velocity * 0.18), now + 0.18);

    oscA.connect(output);
    oscB.connect(output);
    output.connect(this.master);
    oscA.start(now);
    oscB.start(now);

    this.active.set(note, { output, oscA, oscB });
  }

  noteOff(note) {
    const voice = this.active.get(note);
    if (!voice || !this.context) return;

    const now = this.context.currentTime;
    voice.output.gain.cancelScheduledValues(now);
    voice.output.gain.setValueAtTime(Math.max(voice.output.gain.value, 0.0001), now);
    voice.output.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    voice.oscA.stop(now + 0.22);
    voice.oscB.stop(now + 0.22);
    this.active.delete(note);
  }

  playNote(note, velocity = 0.75, duration = 0.22) {
    this.noteOn(note, velocity);
    window.setTimeout(() => this.noteOff(note), duration * 1000);
  }

  stopAll() {
    for (const note of this.active.keys()) {
      this.noteOff(note);
    }
  }
}
