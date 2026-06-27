import { noteName } from "../config/keyMap.js";

export class KeyboardView {
  constructor(root) {
    this.root = root;
    this.elements = new Map();
  }

  render(keyMap) {
    this.root.innerHTML = "";
    this.elements.clear();

    for (const key of keyMap) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `key${key.isBlack ? " black" : ""}`;
      element.dataset.code = key.code;
      element.innerHTML = `<strong>${key.label}</strong><small>${noteName(key.note)}</small>`;
      this.root.append(element);
      this.elements.set(key.code, element);
    }
  }

  setActive(code, isActive) {
    this.elements.get(code)?.classList.toggle("active", isActive);
  }
}
