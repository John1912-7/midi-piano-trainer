import { noteName } from "../config/keyMap.js";

export class KeyboardView {
  constructor(root) {
    this.root = root;
    this.elements = new Map();
    this.noteElements = new Map();
  }

  render(keyMap) {
    this.root.innerHTML = "";
    this.elements.clear();
    this.noteElements.clear();
    this.root.style.setProperty("--key-count", keyMap.length.toString());

    for (const key of keyMap) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `key${key.isBlack ? " black" : ""}`;
      element.dataset.code = key.code;
      element.innerHTML = `<strong>${key.label}</strong><small>${noteName(key.note)}</small>`;
      this.root.append(element);
      this.elements.set(key.code, element);
      if (!this.noteElements.has(key.note)) this.noteElements.set(key.note, []);
      this.noteElements.get(key.note).push(element);
    }
  }

  setActive(code, isActive) {
    this.elements.get(code)?.classList.toggle("active", isActive);
  }

  setNoteActive(note, isActive) {
    for (const element of this.noteElements.get(note) || []) {
      element.classList.toggle("active", isActive);
    }
  }
}
