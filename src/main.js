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

const KEYBOARD_MIN_OFFSET = -3;
const KEYBOARD_MAX_OFFSET = 3;

let currentLanguage = applyLanguage(detectLanguage());
const piano = new PianoEngine();
const keyboardView = new KeyboardView(elements.keyboard);
const game = new TrainerGame(elements.canvas, {
  piano,
  onStatsChange: updateStats,
});

let octaveOffset = 0;
let currentSong = null;
let currentKeyMap = [];
const rangeNotice = createRangeNotice();

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
    fillTrackSelect(currentSong.tracks);
    elements.songName.textContent = file.name;
    elements.emptyState.classList.add("hidden");
    setReady(true);
    applySelectedTrack();
  } catch (error) {
    window.alert(error.message || t(currentLanguage, "readError"));
  }
});

elements.play.addEventListener("click", () => game.play());
elements.pause.addEventListener("click", () => game.pause());
elements.restart.addEventListener("click", () => game.restart(true));

elements.track.addEventListener("change", () => {
  if (!currentSong) return;
  applySelectedTrack();
});

elements.speed.addEventListener("input", () => {
  const speed = Number(elements.speed.value);
  elements.speedValue.textContent = `${speed.toFixed(2)}x`;
  game.setSpeed(speed);
});

elements.octaveDown.addEventListener("click", () => {
  octaveOffset = Math.max(KEYBOARD_MIN_OFFSET, octaveOffset - 1);
  renderKeyboard();
  updateRangeNotice(getSelectedNotes());
});

elements.octaveUp.addEventListener("click", () => {
  octaveOffset = Math.min(KEYBOARD_MAX_OFFSET, octaveOffset + 1);
  renderKeyboard();
  updateRangeNotice(getSelectedNotes());
});

function renderKeyboard() {
  const keyMap = buildKeyMap(octaveOffset);
  currentKeyMap = keyMap;
  keyboardView.render(keyMap);
  input.setKeyMap(keyMap);
  game.setKeyMap(keyMap);
  elements.octaveLabel.textContent = `${noteName(keyMap[0].note)}-${noteName(keyMap.at(-1).note)}`;
}

function autoFitKeyboard(notes) {
  if (!notes.length) return;
  const range = getNoteRange(notes);
  const keyCount = buildKeyMap(0).length;

  let bestOffset = octaveOffset;
  let bestScore = Infinity;

  for (let offset = KEYBOARD_MIN_OFFSET; offset <= KEYBOARD_MAX_OFFSET; offset += 1) {
    const keyMap = buildKeyMap(offset);
    const minPlayable = keyMap[0].note;
    const maxPlayable = keyMap.at(-1).note;
    const lowOverflow = Math.max(0, minPlayable - range.min);
    const highOverflow = Math.max(0, range.max - maxPlayable);
    const overflow = lowOverflow + highOverflow;
    const center = (range.min + range.max) / 2;
    const centerDistance = Math.abs((minPlayable + maxPlayable) / 2 - center) / keyCount;
    const score = overflow * 100 + centerDistance;

    if (score < bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  octaveOffset = bestOffset;
  renderKeyboard();
}

function applySelectedTrack() {
  game.pause();

  const notes = getSelectedNotes();
  elements.noteCount.textContent = notes.length.toString();
  autoFitKeyboard(notes);

  if (currentSong) {
    game.loadSong(currentSong, elements.track.value);
  }

  updateRangeNotice(notes);
}

function getSelectedNotes() {
  if (!currentSong) return [];
  if (elements.track.value === "all") return currentSong.notes;
  return currentSong.notes.filter((note) => note.trackIndex === Number(elements.track.value));
}

function getNoteRange(notes) {
  return notes.reduce(
    (range, note) => ({
      min: Math.min(range.min, note.note),
      max: Math.max(range.max, note.note),
    }),
    { min: Infinity, max: -Infinity },
  );
}

function updateRangeNotice(notes) {
  if (!notes.length || !currentKeyMap.length) {
    rangeNotice.hidden = true;
    rangeNotice.textContent = "";
    return;
  }

  const range = getNoteRange(notes);
  const playableMin = currentKeyMap[0].note;
  const playableMax = currentKeyMap.at(-1).note;
  const outsideCount = notes.filter((note) => note.note < playableMin || note.note > playableMax).length;

  if (outsideCount === 0) {
    rangeNotice.hidden = true;
    rangeNotice.textContent = "";
    return;
  }

  rangeNotice.hidden = false;
  rangeNotice.textContent = formatRangeNotice({
    songMin: noteName(range.min),
    songMax: noteName(range.max),
    playableMin: noteName(playableMin),
    playableMax: noteName(playableMax),
    outsideCount,
  });
}

function formatRangeNotice({ songMin, songMax, playableMin, playableMax, outsideCount }) {
  const messages = {
    ru: `Диапазон этой дорожки ${songMin}-${songMax}. Сейчас на клавиатуре ${playableMin}-${playableMax}, поэтому вне доступных клавиш: ${outsideCount} нот. Выбери другую дорожку или сдвинь октаву.`,
    hy: `Այս հատվածի միջակայքը ${songMin}-${songMax} է։ Այժմ ստեղնաշարի վրա կա ${playableMin}-${playableMax}, ուստի հասանելի ստեղներից դուրս է ${outsideCount} նոտա։ Ընտրիր այլ ճանապարհ կամ փոխիր օկտավան։`,
    de: `Der Bereich dieser Spur ist ${songMin}-${songMax}. Die Tastatur zeigt ${playableMin}-${playableMax}; ${outsideCount} Noten liegen ausserhalb. Waehle eine andere Spur oder verschiebe die Oktave.`,
    es: `El rango de esta pista es ${songMin}-${songMax}. El teclado muestra ${playableMin}-${playableMax}; ${outsideCount} notas quedan fuera. Elige otra pista o cambia la octava.`,
    en: `This track spans ${songMin}-${songMax}. The keyboard currently covers ${playableMin}-${playableMax}, so ${outsideCount} notes are outside the playable keys. Choose another track or shift the octave.`,
  };

  return messages[currentLanguage] || messages.en;
}

function createRangeNotice() {
  const notice = document.createElement("section");
  notice.id = "rangeNotice";
  notice.className = "range-notice";
  notice.hidden = true;
  notice.setAttribute("aria-live", "polite");
  document.querySelector(".status-strip").after(notice);
  return notice;
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
