import { PianoEngine } from "./audio/pianoEngine.js";
import { buildKeyMap, noteName } from "./config/keyMap.js";
import { TrainerGame } from "./game/trainerGame.js";
import { InputHandler } from "./game/inputHandler.js";
import { applyLanguage, detectLanguage, languageUrl, t } from "./i18n.js";
import { parseMidi } from "./midi/parseMidi.js";
import { KeyboardView } from "./ui/keyboardView.js";

const elements = {
  file: document.querySelector("#midiFile"),
  play: document.querySelector("#playButton"),
  pause: document.querySelector("#pauseButton"),
  restart: document.querySelector("#restartButton"),
  track: document.querySelector("#trackSelect"),
  speed: document.querySelector("#speedInput"),
  speedValue: document.querySelector("#speedValue"),
  language: document.querySelector("#languageSelect"),
  octaveDown: document.querySelector("#octaveDown"),
  octaveUp: document.querySelector("#octaveUp"),
  octaveLabel: document.querySelector("#octaveLabel"),
  songName: document.querySelector("#songName"),
  noteCount: document.querySelector("#noteCount"),
  hitCount: document.querySelector("#hitCount"),
  missCount: document.querySelector("#missCount"),
  accuracy: document.querySelector("#accuracy"),
  emptyState: document.querySelector("#emptyState"),
  keyboard: document.querySelector("#keyboard"),
  canvas: document.querySelector("#pianoRoll"),
};

let currentLanguage = applyLanguage(detectLanguage());
const piano = new PianoEngine();
const keyboardView = new KeyboardView(elements.keyboard);
const game = new TrainerGame(elements.canvas, {
  piano,
  onStatsChange: updateStats,
});

let octaveOffset = 0;
let currentSong = null;

const input = new InputHandler({
  piano,
  onKeyboardChange: (code, isActive) => keyboardView.setActive(code, isActive),
  onNoteDown: (note) => game.judge(note),
  onNoteUp: () => {},
});

input.bind();
renderKeyboard();

elements.language.addEventListener("change", () => {
  window.location.href = languageUrl(elements.language.value);
});

elements.file.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const buffer = await file.arrayBuffer();
    currentSong = parseMidi(buffer);
    game.loadSong(currentSong, elements.track.value);
    fillTrackSelect(currentSong.tracks);
    elements.songName.textContent = file.name;
    elements.noteCount.textContent = currentSong.notes.length.toString();
    elements.emptyState.classList.add("hidden");
    setReady(true);
    autoFitKeyboard(currentSong.notes);
  } catch (error) {
    window.alert(error.message || t(currentLanguage, "readError"));
  }
});

elements.play.addEventListener("click", () => game.play());
elements.pause.addEventListener("click", () => game.pause());
elements.restart.addEventListener("click", () => game.restart(true));

elements.track.addEventListener("change", () => {
  if (!currentSong) return;
  game.pause();
  game.setTrack(elements.track.value);
  const count =
    elements.track.value === "all"
      ? currentSong.notes.length
      : currentSong.notes.filter((note) => note.trackIndex === Number(elements.track.value)).length;
  elements.noteCount.textContent = count.toString();
});

elements.speed.addEventListener("input", () => {
  const speed = Number(elements.speed.value);
  elements.speedValue.textContent = `${speed.toFixed(2)}x`;
  game.setSpeed(speed);
});

elements.octaveDown.addEventListener("click", () => {
  octaveOffset = Math.max(-3, octaveOffset - 1);
  renderKeyboard();
});

elements.octaveUp.addEventListener("click", () => {
  octaveOffset = Math.min(3, octaveOffset + 1);
  renderKeyboard();
});

function renderKeyboard() {
  const keyMap = buildKeyMap(octaveOffset);
  keyboardView.render(keyMap);
  input.setKeyMap(keyMap);
  game.setKeyMap(keyMap);
  elements.octaveLabel.textContent = `${noteName(keyMap[0].note)}-${noteName(keyMap.at(-1).note)}`;
}

function autoFitKeyboard(notes) {
  if (!notes.length) return;
  const medianNote = [...notes].sort((a, b) => a.note - b.note)[Math.floor(notes.length / 2)].note;
  octaveOffset = Math.max(-3, Math.min(3, Math.round((medianNote - 62) / 12)));
  renderKeyboard();
}

function fillTrackSelect(tracks) {
  elements.track.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = t(currentLanguage, "allTracks");
  elements.track.append(allOption);

  for (const track of tracks.filter((item) => item.noteCount > 0)) {
    const option = document.createElement("option");
    option.value = track.index.toString();
    option.textContent = `${track.name} (${track.noteCount})`;
    elements.track.append(option);
  }
  elements.track.disabled = false;
  elements.track.value = "all";
}

function setReady(isReady) {
  elements.play.disabled = !isReady;
  elements.pause.disabled = !isReady;
  elements.restart.disabled = !isReady;
}

function updateStats(stats) {
  elements.hitCount.textContent = stats.hits.toString();
  elements.missCount.textContent = stats.misses.toString();
  const judged = stats.hits + stats.misses + stats.wrong;
  const accuracy = judged ? Math.round((stats.hits / judged) * 100) : 0;
  elements.accuracy.textContent = `${accuracy}%`;
}
