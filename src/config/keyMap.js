const BASE_KEYS = [
  ["KeyZ", 48, "Z"],
  ["KeyS", 49, "S"],
  ["KeyX", 50, "X"],
  ["KeyD", 51, "D"],
  ["KeyC", 52, "C"],
  ["KeyV", 53, "V"],
  ["KeyG", 54, "G"],
  ["KeyB", 55, "B"],
  ["KeyH", 56, "H"],
  ["KeyN", 57, "N"],
  ["KeyJ", 58, "J"],
  ["KeyM", 59, "M"],
  ["KeyQ", 60, "Q"],
  ["Digit2", 61, "2"],
  ["KeyW", 62, "W"],
  ["Digit3", 63, "3"],
  ["KeyE", 64, "E"],
  ["KeyR", 65, "R"],
  ["Digit5", 66, "5"],
  ["KeyT", 67, "T"],
  ["Digit6", 68, "6"],
  ["KeyY", 69, "Y"],
  ["Digit7", 70, "7"],
  ["KeyU", 71, "U"],
  ["KeyI", 72, "I"],
  ["Digit9", 73, "9"],
  ["KeyO", 74, "O"],
  ["Digit0", 75, "0"],
  ["KeyP", 76, "P"],
];

export const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);

export function buildKeyMap(octaveOffset = 0) {
  const semitoneOffset = octaveOffset * 12;
  return BASE_KEYS.map(([code, note, label]) => ({
    code,
    note: note + semitoneOffset,
    label,
    isBlack: BLACK_CLASSES.has((note + semitoneOffset) % 12),
  }));
}

export function noteName(note) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
}
