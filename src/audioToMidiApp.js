const MAX_AUDIO_MB = 25;
const GENERATED_MIDI_KEY = "midiPianoTrainerGeneratedMidi";
const BACKEND_URL_KEY = "midiPianoTrainerBackendUrl";

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
};

let selectedFile = null;
let generatedMidiBytes = null;
let generatedMidiName = "converted.mid";

elements.backendUrl.value = localStorage.getItem(BACKEND_URL_KEY) || "";
updateConvertState();

elements.backendUrl.addEventListener("input", () => {
  localStorage.setItem(BACKEND_URL_KEY, elements.backendUrl.value.trim());
  updateConvertState();
});

elements.checkBackend.addEventListener("click", async () => {
  const backendUrl = normalizeBackendUrl(elements.backendUrl.value);
  if (!backendUrl) {
    setStatus("Укажите URL backend API.");
    return;
  }

  try {
    setBusy(true, "Проверяю...", "Сделать MIDI");
    setProgress(15);
    await checkBackendHealth(backendUrl);
    setProgress(100);
    setStatus("Backend доступен. Можно конвертировать аудио.");
  } catch (error) {
    console.error(error);
    setProgress(0);
    setStatus(error.message || "Backend не отвечает.");
  } finally {
    setBusy(false);
  }
});

elements.file.addEventListener("change", () => {
  selectedFile = elements.file.files?.[0] || null;
  generatedMidiBytes = null;
  elements.result.hidden = true;
  elements.download.removeAttribute("href");

  if (!selectedFile) {
    setStatus("Выберите аудиофайл.");
  } else if (selectedFile.size > MAX_AUDIO_MB * 1024 * 1024) {
    setStatus(`Файл слишком большой для MVP. Ограничение: ${MAX_AUDIO_MB} MB.`);
  } else {
    setStatus(`Файл выбран: ${selectedFile.name}`);
  }

  setProgress(0);
  updateConvertState();
});

elements.convert.addEventListener("click", async () => {
  if (!selectedFile) return;

  const backendUrl = normalizeBackendUrl(elements.backendUrl.value);
  if (!backendUrl) {
    setStatus("Укажите URL backend API.");
    return;
  }

  try {
    setBusy(true);
    setProgress(8);
    setStatus("Отправляю аудио на backend...");

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);

    const response = await fetch(`${backendUrl}/convert`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || `Backend вернул ошибку ${response.status}.`);
    }

    setProgress(82);
    setStatus("Получаю MIDI...");

    generatedMidiBytes = new Uint8Array(await response.arrayBuffer());
    generatedMidiName = response.headers.get("X-Midi-Filename") || `${cleanFileName(selectedFile.name)}.mid`;
    const noteCount = response.headers.get("X-Note-Count") || "?";

    showResult(noteCount);
    setProgress(100);
    setStatus("MIDI готов. Можно скачать или открыть в тренажёре.");
  } catch (error) {
    console.error(error);
    setProgress(0);
    setStatus(error.message || "Не удалось получить MIDI.");
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
    setStatus("Не удалось передать MIDI в тренажёр. Скачайте MIDI и загрузите его вручную.");
  }
});

function updateConvertState() {
  const hasBackend = Boolean(normalizeBackendUrl(elements.backendUrl.value));
  const hasValidFile = selectedFile && selectedFile.size <= MAX_AUDIO_MB * 1024 * 1024;
  elements.convert.disabled = !hasBackend || !hasValidFile;
  elements.checkBackend.disabled = !hasBackend;
}

function showResult(noteCount) {
  const blob = new Blob([generatedMidiBytes], { type: "audio/midi" });
  elements.download.href = URL.createObjectURL(blob);
  elements.download.download = generatedMidiName;
  elements.fileName.textContent = generatedMidiName;
  elements.noteCount.textContent = noteCount.toString();
  elements.result.hidden = false;
}

function setBusy(isBusy, checkLabel = "Проверить backend", convertLabel = "Конвертация...") {
  elements.backendUrl.disabled = isBusy;
  elements.file.disabled = isBusy;
  elements.checkBackend.disabled = isBusy || !normalizeBackendUrl(elements.backendUrl.value);
  elements.convert.disabled = isBusy || !selectedFile;
  elements.checkBackend.textContent = isBusy ? checkLabel : "Проверить backend";
  elements.convert.textContent = isBusy ? convertLabel : "Сделать MIDI";
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
  return name.replace(/\.[^.]+$/, "").replace(/[^\wа-яА-ЯёЁ.-]+/g, "-").replace(/-+/g, "-") || "converted";
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
      throw new Error(`Backend вернул ошибку ${response.status}.`);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Backend долго не отвечает. Проверьте URL или подождите, пока бесплатный сервер проснется.");
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
