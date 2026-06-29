const MAX_AUDIO_MB = 25;
const GENERATED_MIDI_KEY = "midiPianoTrainerGeneratedMidi";
const BACKEND_URL_KEY = "midiPianoTrainerBackendUrl";
const DEFAULT_BACKEND_URL = "https://vanya1912-midi-piano-trainer-backend.hf.space";

const copy = {
  ru: {
    chooseFile: "Выберите аудиофайл.",
    backendRequired: "Укажите URL backend API.",
    checking: "Проверяю backend...",
    checkBackend: "Проверить backend",
    convertIdle: "Сделать MIDI",
    converting: "Конвертация...",
    backendReady: "Backend доступен. Можно конвертировать аудио.",
    backendError: "Backend не отвечает.",
    fileTooLarge: (limit) => `Файл слишком большой для MVP. Ограничение: ${limit} MB.`,
    fileSelected: (name) => `Файл выбран: ${name}`,
    sending: "Отправляю аудио на backend...",
    backendStatus: (status) => `Backend вернул ошибку ${status}.`,
    receiving: "Получаю MIDI...",
    ready: "MIDI готов. Можно скачать или открыть в тренажере.",
    failed: "Не удалось получить MIDI.",
    handoffFailed:
      "Не удалось передать MIDI в тренажер. Скачайте MIDI и загрузите его вручную.",
    sleeping:
      "Backend долго не отвечает. Проверьте URL или подождите, пока бесплатный сервер проснется.",
  },
  hy: {
    chooseFile: "Ընտրեք աուդիո ֆայլ:",
    backendRequired: "Նշեք backend API URL-ը:",
    checking: "Ստուգում եմ backend-ը...",
    checkBackend: "Ստուգել backend-ը",
    convertIdle: "Ստեղծել MIDI",
    converting: "Փոխարկում...",
    backendReady: "Backend-ը հասանելի է։ Կարելի է փոխարկել աուդիոն:",
    backendError: "Backend-ը չի պատասխանում:",
    fileTooLarge: (limit) => `Ֆայլը շատ մեծ է MVP-ի համար։ Սահմանափակում՝ ${limit} MB։`,
    fileSelected: (name) => `Ընտրված ֆայլ՝ ${name}`,
    sending: "Ուղարկում եմ աուդիոն backend...",
    backendStatus: (status) => `Backend-ը վերադարձրել է սխալ ${status}։`,
    receiving: "Ստանում եմ MIDI...",
    ready: "MIDI-ն պատրաստ է։ Կարող եք ներբեռնել կամ բացել վարժարանում:",
    failed: "Չհաջողվեց ստանալ MIDI:",
    handoffFailed:
      "Չհաջողվեց փոխանցել MIDI-ն վարժարան։ Ներբեռնեք MIDI-ն և բեռնեք ձեռքով:",
    sleeping:
      "Backend-ը երկար չի պատասխանում։ Ստուգեք URL-ը կամ սպասեք, մինչև անվճար սերվերը արթնանա:",
  },
  de: {
    chooseFile: "Waehle eine Audiodatei.",
    backendRequired: "Gib die Backend-API-URL ein.",
    checking: "Backend wird geprueft...",
    checkBackend: "Backend pruefen",
    convertIdle: "MIDI erstellen",
    converting: "Konvertierung...",
    backendReady: "Backend ist erreichbar. Audio kann konvertiert werden.",
    backendError: "Backend antwortet nicht.",
    fileTooLarge: (limit) => `Die Datei ist fuer dieses MVP zu gross. Limit: ${limit} MB.`,
    fileSelected: (name) => `Datei gewaehlt: ${name}`,
    sending: "Audio wird an das Backend gesendet...",
    backendStatus: (status) => `Backend meldet Fehler ${status}.`,
    receiving: "MIDI wird empfangen...",
    ready: "MIDI ist fertig. Du kannst es herunterladen oder im Trainer oeffnen.",
    failed: "MIDI konnte nicht erstellt werden.",
    handoffFailed:
      "MIDI konnte nicht an den Trainer uebergeben werden. Lade die MIDI-Datei herunter und importiere sie manuell.",
    sleeping:
      "Backend antwortet sehr langsam. Pruefe die URL oder warte, bis der kostenlose Server aufwacht.",
  },
  es: {
    chooseFile: "Elige un archivo de audio.",
    backendRequired: "Introduce la URL de la API backend.",
    checking: "Comprobando backend...",
    checkBackend: "Comprobar backend",
    convertIdle: "Crear MIDI",
    converting: "Convirtiendo...",
    backendReady: "El backend esta disponible. Puedes convertir el audio.",
    backendError: "El backend no responde.",
    fileTooLarge: (limit) => `El archivo es demasiado grande para este MVP. Limite: ${limit} MB.`,
    fileSelected: (name) => `Archivo elegido: ${name}`,
    sending: "Enviando audio al backend...",
    backendStatus: (status) => `El backend devolvio el error ${status}.`,
    receiving: "Recibiendo MIDI...",
    ready: "MIDI listo. Puedes descargarlo o abrirlo en el entrenador.",
    failed: "No se pudo obtener el MIDI.",
    handoffFailed:
      "No se pudo pasar el MIDI al entrenador. Descarga el MIDI y cargalo manualmente.",
    sleeping:
      "El backend tarda demasiado en responder. Comprueba la URL o espera a que el servidor gratuito despierte.",
  },
  en: {
    chooseFile: "Choose an audio file.",
    backendRequired: "Enter the backend API URL.",
    checking: "Checking backend...",
    checkBackend: "Check backend",
    convertIdle: "Create MIDI",
    converting: "Converting...",
    backendReady: "Backend is reachable. You can convert audio now.",
    backendError: "Backend is not responding.",
    fileTooLarge: (limit) => `The file is too large for this MVP. Limit: ${limit} MB.`,
    fileSelected: (name) => `File selected: ${name}`,
    sending: "Sending audio to backend...",
    backendStatus: (status) => `Backend returned error ${status}.`,
    receiving: "Receiving MIDI...",
    ready: "MIDI is ready. Download it or open it in the trainer.",
    failed: "Could not create MIDI.",
    handoffFailed:
      "Could not pass the MIDI to the trainer. Download the MIDI and upload it manually.",
    sleeping:
      "Backend is taking too long to respond. Check the URL or wait while the free server wakes up.",
  },
};

const elements = {
  backendUrl: document.querySelector("#backendUrl"),
  file: document.querySelector("#audioFile"),
  checkBackend: document.querySelector("#checkBackendButton"),
  convert: document.querySelector("#convertAudioButton"),
  download: document.querySelector("#downloadMidiButton"),
  openTrainer: document.querySelector("#openTrainerButton"),
  status: document.querySelector("#conversionStatus"),
  progress: document.querySelector("#conversionProgress"),
  result: document.querySelector("#conversionResult"),
  noteCount: document.querySelector("#generatedNoteCount"),
  fileName: document.querySelector("#generatedFileName"),
  selectedFileName: document.querySelector("#selectedFileName"),
  selectedFileMeta: document.querySelector("#selectedFileMeta"),
  limitLabel: document.querySelector("#audioLimitLabel"),
  languageSelect: document.querySelector("#audioLanguageSelect"),
};

const language = getLanguage();
const text = copy[language] || copy.en;

let selectedFile = null;
let generatedMidiBytes = null;
let generatedMidiName = "converted.mid";
let resultUrl = "";

elements.backendUrl.value = localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_BACKEND_URL;
if (elements.limitLabel) elements.limitLabel.textContent = `${MAX_AUDIO_MB} MB`;
if (elements.languageSelect) elements.languageSelect.value = language;
setStatus(text.chooseFile);
updateConvertState();

elements.languageSelect?.addEventListener("change", () => {
  window.location.href = languageAudioUrl(elements.languageSelect.value);
});

elements.backendUrl.addEventListener("input", () => {
  localStorage.setItem(BACKEND_URL_KEY, elements.backendUrl.value.trim());
  updateConvertState();
});

elements.checkBackend.addEventListener("click", async () => {
  const backendUrl = normalizeBackendUrl(elements.backendUrl.value);
  if (!backendUrl) {
    setStatus(text.backendRequired);
    return;
  }

  try {
    setBusy(true, text.checking, text.convertIdle);
    setProgress(15);
    await checkBackendHealth(backendUrl);
    setProgress(100);
    setStatus(text.backendReady);
  } catch (error) {
    console.error(error);
    setProgress(0);
    setStatus(error.message || text.backendError);
  } finally {
    setBusy(false);
  }
});

elements.file.addEventListener("change", () => {
  selectedFile = elements.file.files?.[0] || null;
  resetResult();

  if (!selectedFile) {
    setSelectedFile(null);
    setStatus(text.chooseFile);
  } else if (selectedFile.size > MAX_AUDIO_MB * 1024 * 1024) {
    setSelectedFile(selectedFile);
    setStatus(text.fileTooLarge(MAX_AUDIO_MB));
  } else {
    setSelectedFile(selectedFile);
    setStatus(text.fileSelected(selectedFile.name));
  }

  setProgress(0);
  updateConvertState();
});

elements.convert.addEventListener("click", async () => {
  if (!selectedFile) return;

  const backendUrl = normalizeBackendUrl(elements.backendUrl.value);
  if (!backendUrl) {
    setStatus(text.backendRequired);
    return;
  }

  try {
    setBusy(true);
    setProgress(8);
    setStatus(text.sending);

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);

    const response = await fetch(`${backendUrl}/convert`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || text.backendStatus(response.status));
    }

    setProgress(82);
    setStatus(text.receiving);

    generatedMidiBytes = new Uint8Array(await response.arrayBuffer());
    generatedMidiName = response.headers.get("X-Midi-Filename") || `${cleanFileName(selectedFile.name)}.mid`;
    const noteCount = response.headers.get("X-Note-Count") || "?";

    showResult(noteCount);
    setProgress(100);
    setStatus(text.ready);
  } catch (error) {
    console.error(error);
    setProgress(0);
    setStatus(error.message || text.failed);
  } finally {
    setBusy(false);
  }
});

elements.openTrainer.addEventListener("click", () => {
  if (!generatedMidiBytes) return;

  try {
    sessionStorage.setItem(
      GENERATED_MIDI_KEY,
      JSON.stringify({
        name: generatedMidiName,
        bytes: arrayToBase64(generatedMidiBytes),
      }),
    );
    window.location.href = "../?generatedMidi=1";
  } catch (error) {
    console.error(error);
    setStatus(text.handoffFailed);
  }
});

function updateConvertState() {
  const hasBackend = Boolean(normalizeBackendUrl(elements.backendUrl.value));
  const hasValidFile = selectedFile && selectedFile.size <= MAX_AUDIO_MB * 1024 * 1024;
  elements.convert.disabled = !hasBackend || !hasValidFile;
  elements.checkBackend.disabled = !hasBackend;
}

function showResult(noteCount) {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  const blob = new Blob([generatedMidiBytes], { type: "audio/midi" });
  resultUrl = URL.createObjectURL(blob);
  elements.download.href = resultUrl;
  elements.download.download = generatedMidiName;
  elements.fileName.textContent = generatedMidiName;
  elements.noteCount.textContent = noteCount.toString();
  elements.result.hidden = false;
}

function resetResult() {
  generatedMidiBytes = null;
  elements.result.hidden = true;
  elements.download.removeAttribute("href");
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = "";
}

function setBusy(isBusy, checkLabel = text.checkBackend, convertLabel = text.converting) {
  elements.backendUrl.disabled = isBusy;
  elements.file.disabled = isBusy;
  elements.checkBackend.disabled = isBusy || !normalizeBackendUrl(elements.backendUrl.value);
  elements.convert.disabled = isBusy || !selectedFile;
  elements.checkBackend.textContent = isBusy ? checkLabel : text.checkBackend;
  elements.convert.textContent = isBusy ? convertLabel : text.convertIdle;
}

function setSelectedFile(file) {
  if (!elements.selectedFileName || !elements.selectedFileMeta) return;
  if (!file) {
    elements.selectedFileName.textContent = "-";
    elements.selectedFileMeta.textContent = `${MAX_AUDIO_MB} MB max`;
    return;
  }

  elements.selectedFileName.textContent = file.name;
  elements.selectedFileMeta.textContent = `${formatBytes(file.size)} - ${file.type || "audio file"}`;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function setProgress(value) {
  elements.progress.value = value;
}

function normalizeBackendUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function cleanFileName(name) {
  return name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-") || "converted";
}

async function checkBackendHealth(backendUrl) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(text.backendStatus(response.status));
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(text.sleeping);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    return data?.detail || data?.message || "";
  }
  return response.text().catch(() => "");
}

function arrayToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getLanguage() {
  const pathLang = window.location.pathname.split("/").filter(Boolean).find((part) => copy[part]);
  return pathLang || document.documentElement.lang || "en";
}

function languageAudioUrl(lang) {
  const target = copy[lang] ? lang : "en";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const hasRepoPath = parts.includes("midi-piano-trainer");
  const base = hasRepoPath ? "/midi-piano-trainer/" : "/";
  return `${base}${target}/audio-to-midi/`;
}
