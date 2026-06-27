export class InputHandler {
  constructor({ piano, onNoteDown, onNoteUp, onKeyboardChange }) {
    this.piano = piano;
    this.onNoteDown = onNoteDown;
    this.onNoteUp = onNoteUp;
    this.onKeyboardChange = onKeyboardChange;
    this.pressed = new Set();
    this.codeToNote = new Map();
  }

  setKeyMap(keyMap) {
    this.codeToNote = new Map(keyMap.map((key) => [key.code, key.note]));
  }

  bind() {
    window.addEventListener("keydown", async (event) => {
      if (!this.codeToNote.has(event.code) || this.pressed.has(event.code)) return;
      event.preventDefault();
      const note = this.codeToNote.get(event.code);
      this.pressed.add(event.code);
      await this.piano.resume();
      this.piano.noteOn(note, 0.85);
      this.onKeyboardChange(event.code, true);
      this.onNoteDown(note);
    });

    window.addEventListener("keyup", (event) => {
      if (!this.codeToNote.has(event.code)) return;
      event.preventDefault();
      const note = this.codeToNote.get(event.code);
      this.pressed.delete(event.code);
      this.piano.noteOff(note);
      this.onKeyboardChange(event.code, false);
      this.onNoteUp(note);
    });
  }
}
