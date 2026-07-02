const MAX_AUDIO_MB = 25;
const MAX_AUDIO_SECONDS = 60;
const JOB_POLL_MS = 3000;
const STOPPED_WAITING_MESSAGE = "Stopped waiting for this task.";
const ESTIMATE_MIN_SECONDS = 45;
const ESTIMATE_QUEUE_BUFFER_SECONDS = 90;
const GENERATED_MIDI_KEY = "midiPianoTrainerGeneratedMidi";
const BACKEND_URL_KEY = "midiPianoTrainerBackendUrl";
const QUALITY_PRESET_KEY = "midiPianoTrainerAudioQuality";
const DEFAULT_BACKEND_URL = "https://vanya1912-midi-piano-trainer-backend.hf.space";
const ADVANCED_BACKEND_PARAM = "advanced";

const copy = {
  ru: {
    chooseFile: "Выберите аудиофайл.",
    backendRequired: "Сервис конвертации временно недоступен.",
    checking: "Проверяю сервис конвертации...",
    checkBackend: "Проверить сервис",
    convertIdle: "Сделать MIDI",
    converting: "Конвертация...",
    backendReady: "Сервис конвертации доступен. Можно конвертировать аудио.",
    backendError: "Сервис конвертации не отвечает.",
    fileTooLarge: (limit) => `Файл слишком большой для MVP. Ограничение: ${limit} MB.`,
    fileSelected: (name) => `Файл выбран: ${name}`,
    sending: "Загружаю аудио для конвертации...",
    backendStatus: (status) => `Сервис конвертации вернул ошибку ${status}.`,
    receiving: "Получаю MIDI...",
    ready: "MIDI готов. Можно скачать или открыть в тренажере.",
    failed: "Не удалось получить MIDI.",
    handoffFailed:
      "Не удалось передать MIDI в тренажер. Скачайте MIDI и загрузите его вручную.",
    sleeping:
      "Сервис конвертации долго не отвечает. Подождите, пока бесплатный сервер проснется.",
    longRunning: "Распознавание нот может занять несколько минут на бесплатном сервере.",
    stillWorking: (elapsed) => `Распознавание еще идет... прошло ${elapsed}.`,
    recordingMode: "Тип записи",
    cleanMode: "Чистая запись",
    balancedMode: "Обычная запись",
    sensitiveMode: "Тихая или шумная запись",
    modeHelp:
      "Обычная запись подходит чаще всего. Режим для шумного аудио может помочь плохим записям, но иногда ухудшает чистые.",
  },
  hy: {
    chooseFile: "Ընտրեք աուդիո ֆայլ:",
    backendRequired: "Փոխարկման ծառայությունը ժամանակավորապես հասանելի չէ:",
    checking: "Ստուգում եմ փոխարկման ծառայությունը...",
    checkBackend: "Ստուգել ծառայությունը",
    convertIdle: "Ստեղծել MIDI",
    converting: "Փոխարկում...",
    backendReady: "Փոխարկման ծառայությունը հասանելի է։ Կարելի է փոխարկել աուդիոն:",
    backendError: "Փոխարկման ծառայությունը չի պատասխանում:",
    fileTooLarge: (limit) => `Ֆայլը շատ մեծ է MVP-ի համար։ Սահմանափակում՝ ${limit} MB։`,
    fileSelected: (name) => `Ընտրված ֆայլ՝ ${name}`,
    sending: "Բեռնում եմ աուդիոն փոխարկման համար...",
    backendStatus: (status) => `Փոխարկման ծառայությունը վերադարձրել է սխալ ${status}։`,
    receiving: "Ստանում եմ MIDI...",
    ready: "MIDI-ն պատրաստ է։ Կարող եք ներբեռնել կամ բացել վարժարանում:",
    failed: "Չհաջողվեց ստանալ MIDI:",
    handoffFailed:
      "Չհաջողվեց փոխանցել MIDI-ն վարժարան։ Ներբեռնեք MIDI-ն և բեռնեք ձեռքով:",
    sleeping:
      "Փոխարկման ծառայությունը երկար չի պատասխանում։ Սպասեք, մինչև անվճար սերվերը արթնանա:",
    longRunning: "Նոտաների ճանաչումը անվճար սերվերում կարող է մի քանի րոպե տևել:",
    stillWorking: (elapsed) => `Նոտաների ճանաչումը դեռ ընթանում է... անցել է ${elapsed}:`,
    recordingMode: "Ձայնագրության տեսակ",
    cleanMode: "Մաքուր ձայնագրություն",
    balancedMode: "Սովորական ձայնագրություն",
    sensitiveMode: "Ցածր կամ աղմկոտ ձայնագրություն",
    modeHelp:
      "Սովորական ռեժիմը լավագույնն է մեծ մասի համար։ Աղմկոտ ռեժիմը կարող է օգնել վատ ձայնագրություններին, բայց երբեմն վատացնում է մաքուրները։",
  },
  de: {
    chooseFile: "Waehle eine Audiodatei.",
    backendRequired: "Der Konvertierungsdienst ist gerade nicht erreichbar.",
    checking: "Konvertierungsdienst wird geprueft...",
    checkBackend: "Dienst pruefen",
    convertIdle: "MIDI erstellen",
    converting: "Konvertierung...",
    backendReady: "Konvertierungsdienst ist erreichbar. Audio kann konvertiert werden.",
    backendError: "Konvertierungsdienst antwortet nicht.",
    fileTooLarge: (limit) => `Die Datei ist fuer dieses MVP zu gross. Limit: ${limit} MB.`,
    fileSelected: (name) => `Datei gewaehlt: ${name}`,
    sending: "Audio wird fuer die Konvertierung hochgeladen...",
    backendStatus: (status) => `Konvertierungsdienst meldet Fehler ${status}.`,
    receiving: "MIDI wird empfangen...",
    ready: "MIDI ist fertig. Du kannst es herunterladen oder im Trainer oeffnen.",
    failed: "MIDI konnte nicht erstellt werden.",
    handoffFailed:
      "MIDI konnte nicht an den Trainer uebergeben werden. Lade die MIDI-Datei herunter und importiere sie manuell.",
    sleeping:
      "Der Konvertierungsdienst antwortet sehr langsam. Warte, bis der kostenlose Server aufwacht.",
    longRunning: "Die Notenerkennung kann auf kostenlosen Servern einige Minuten dauern.",
    stillWorking: (elapsed) => `Notenerkennung laeuft noch... vergangen ${elapsed}.`,
    recordingMode: "Aufnahmetyp",
    cleanMode: "Saubere Aufnahme",
    balancedMode: "Normale Aufnahme",
    sensitiveMode: "Leise oder verrauschte Aufnahme",
    modeHelp:
      "Normale Aufnahme passt meistens. Der Modus fuer verrauschte Audios kann helfen, kann saubere Aufnahmen aber verschlechtern.",
  },
  es: {
    chooseFile: "Elige un archivo de audio.",
    backendRequired: "El servicio de conversion no esta disponible ahora.",
    checking: "Comprobando el servicio de conversion...",
    checkBackend: "Comprobar servicio",
    convertIdle: "Crear MIDI",
    converting: "Convirtiendo...",
    backendReady: "El servicio de conversion esta disponible. Puedes convertir el audio.",
    backendError: "El servicio de conversion no responde.",
    fileTooLarge: (limit) => `El archivo es demasiado grande para este MVP. Limite: ${limit} MB.`,
    fileSelected: (name) => `Archivo elegido: ${name}`,
    sending: "Subiendo audio para convertirlo...",
    backendStatus: (status) => `El servicio de conversion devolvio el error ${status}.`,
    receiving: "Recibiendo MIDI...",
    ready: "MIDI listo. Puedes descargarlo o abrirlo en el entrenador.",
    failed: "No se pudo obtener el MIDI.",
    handoffFailed:
      "No se pudo pasar el MIDI al entrenador. Descarga el MIDI y cargalo manualmente.",
    sleeping:
      "El servicio de conversion tarda demasiado en responder. Espera a que el servidor gratuito despierte.",
    longRunning:
      "La deteccion de notas puede tardar varios minutos en servidores gratuitos.",
    stillWorking: (elapsed) => `La deteccion de notas sigue en curso... transcurrido ${elapsed}.`,
    recordingMode: "Tipo de grabacion",
    cleanMode: "Grabacion limpia",
    balancedMode: "Grabacion normal",
    sensitiveMode: "Grabacion baja o con ruido",
    modeHelp:
      "Grabacion normal funciona mejor la mayoria de las veces. El modo para ruido puede ayudar con audios malos, pero puede empeorar grabaciones limpias.",
  },
  en: {
    chooseFile: "Choose an audio file.",
    backendRequired: "The conversion service is temporarily unavailable.",
    checking: "Checking conversion service...",
    checkBackend: "Check service",
    convertIdle: "Create MIDI",
    converting: "Converting...",
    backendReady: "Conversion service is reachable. You can convert audio now.",
    backendError: "Conversion service is not responding.",
    fileTooLarge: (limit) => `The file is too large for this MVP. Limit: ${limit} MB.`,
    fileSelected: (name) => `File selected: ${name}`,
    sending: "Uploading audio for conversion...",
    backendStatus: (status) => `Conversion service returned error ${status}.`,
    receiving: "Receiving MIDI...",
    ready: "MIDI is ready. Download it or open it in the trainer.",
    failed: "Could not create MIDI.",
    handoffFailed:
      "Could not pass the MIDI to the trainer. Download the MIDI and upload it manually.",
    sleeping:
      "Conversion service is taking too long to respond. Wait while the free server wakes up.",
    longRunning:
      "Note detection can take several minutes on free servers.",
    stillWorking: (elapsed) => `Still detecting notes... elapsed ${elapsed}.`,
    recordingMode: "Recording type",
    cleanMode: "Clean recording",
    balancedMode: "Normal recording",
    sensitiveMode: "Quiet or noisy recording",
    modeHelp:
      "Normal recording is safest. The noisy-audio mode can help rough files, but may hurt clean recordings.",
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
  quality: document.querySelector("#qualityPreset"),
};

const language = getLanguage();
const text = copy[language] || copy.en;
const isAdvancedBackendMode = new URLSearchParams(window.location.search).get(ADVANCED_BACKEND_PARAM) === "1";

let selectedFile = null;
let selectedAudioDuration = 0;
let generatedMidiBytes = null;
let generatedMidiName = "converted.mid";
let resultUrl = "";
let conversionTimer = 0;
let activeRunId = 0;
let activeJobId = "";
let activeEstimate = null;
let elapsedStartedAt = 0;
let jobPanel = null;

ensureQualityControl();
ensureJobPanel();
configureBackendControls();
if (elements.quality) elements.quality.value = localStorage.getItem(QUALITY_PRESET_KEY) || "balanced";
if (elements.limitLabel) elements.limitLabel.textContent = `${MAX_AUDIO_MB} MB / ${MAX_AUDIO_SECONDS}s`;
if (elements.languageSelect) elements.languageSelect.value = language;
setStatus(text.chooseFile);
updateConvertState();

elements.languageSelect?.addEventListener("change", () => {
  window.location.href = languageAudioUrl(elements.languageSelect.value);
});

elements.backendUrl?.addEventListener("input", () => {
  if (!isAdvancedBackendMode) return;
  localStorage.setItem(BACKEND_URL_KEY, elements.backendUrl.value.trim());
  updateConvertState();
});

elements.quality?.addEventListener("change", () => {
  localStorage.setItem(QUALITY_PRESET_KEY, getQualityPreset());
});

elements.checkBackend?.addEventListener("click", async () => {
  const backendUrl = getBackendUrl();
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
  selectedAudioDuration = 0;
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
  loadSelectedAudioDuration(selectedFile);
});

elements.convert.addEventListener("click", async () => {
  if (!selectedFile) return;

  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    setStatus(text.backendRequired);
    return;
  }

  try {
    const runId = ++activeRunId;
    activeEstimate = estimateConversionTime(selectedFile, selectedAudioDuration, getQualityPreset());
    setBusy(true);
    setProgress(8);
    updateJobPanel({
      status: "uploading",
      message: `Uploading your audio for conversion. ${formatEstimateMessage()}`,
      progress: 8,
      jobId: "",
      canStop: true,
      canRetry: false,
    });
    startConversionTimer();
    setStatus(`${text.sending} ${text.longRunning || copy.en.longRunning}`);

    const queuedJob = await createQueuedJob(backendUrl);
    if (queuedJob) {
      await waitForQueuedMidi(backendUrl, queuedJob, runId);
    } else {
      updateJobPanel({
        status: "processing",
        message: `Conversion queue is not available yet. Converting directly. ${formatEstimateMessage()}`,
        progress: 30,
        canStop: true,
      });
      const response = await fetch(`${backendUrl}/convert`, {
        method: "POST",
        body: buildConversionFormData(),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || text.backendStatus(response.status));
      }

      await storeMidiResponse(response);
    }

    setProgress(100);
    setStatus(text.ready);
    updateJobPanel({
      status: "done",
      message: "MIDI is ready. Download it or open it in the trainer.",
      progress: 100,
      canStop: false,
      canRetry: false,
    });
  } catch (error) {
    console.error(error);
    if (error.message === STOPPED_WAITING_MESSAGE) {
      setProgress(0);
      setStatus("Stopped waiting. You can start a new conversion when ready.");
      updateJobPanel({
        status: "stopped",
        message: "Stopped waiting in this browser. The conversion task may still finish in the background.",
        progress: 0,
        canStop: false,
        canRetry: Boolean(selectedFile),
      });
      return;
    }
    setProgress(0);
    setStatus(error.message || text.failed);
    updateJobPanel({
      status: "failed",
      message: error.message || text.failed,
      progress: 0,
      canStop: false,
      canRetry: Boolean(selectedFile),
    });
  } finally {
    stopConversionTimer();
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
  const hasBackend = Boolean(getBackendUrl());
  const hasValidFile = selectedFile && selectedFile.size <= MAX_AUDIO_MB * 1024 * 1024;
  elements.convert.disabled = !hasBackend || !hasValidFile;
  if (elements.checkBackend) elements.checkBackend.disabled = !hasBackend;
}

function showResult(noteCount, engine, preprocess) {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  const blob = new Blob([generatedMidiBytes], { type: "audio/midi" });
  resultUrl = URL.createObjectURL(blob);
  elements.download.href = resultUrl;
  elements.download.download = generatedMidiName;
  elements.fileName.textContent = generatedMidiName;
  elements.noteCount.textContent = noteCount.toString();
  showEngineName(engine, preprocess);
  elements.result.hidden = false;
}

function resetResult() {
  generatedMidiBytes = null;
  elements.result.hidden = true;
  elements.download.removeAttribute("href");
  showEngineName("");
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = "";
  resetJobPanel();
}

function showEngineName(engine, preprocess) {
  let engineElement = document.querySelector("#generatedEngineName");
  if (!engineElement) {
    const container = document.createElement("div");
    container.className = "generated-engine";
    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = "Engine";
    engineElement = document.createElement("strong");
    engineElement.id = "generatedEngineName";
    container.append(label, engineElement);
    elements.result.insertBefore(container, elements.download);
  }
  engineElement.textContent = preprocess && preprocess !== "none" ? `${engine} + ${preprocess}` : engine;
}

function setBusy(isBusy, checkLabel = text.checkBackend, convertLabel = text.converting) {
  const hasValidFile = selectedFile && selectedFile.size <= MAX_AUDIO_MB * 1024 * 1024;
  if (elements.backendUrl) elements.backendUrl.disabled = isBusy || !isAdvancedBackendMode;
  elements.file.disabled = isBusy;
  if (elements.quality) elements.quality.disabled = isBusy;
  if (elements.checkBackend) elements.checkBackend.disabled = isBusy || !getBackendUrl();
  elements.convert.disabled = isBusy || !hasValidFile;
  if (elements.checkBackend) elements.checkBackend.textContent = isBusy ? checkLabel : text.checkBackend;
  elements.convert.textContent = isBusy ? convertLabel : text.convertIdle;
}

function configureBackendControls() {
  if (!elements.backendUrl) return;

  elements.backendUrl.value = isAdvancedBackendMode
    ? localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_BACKEND_URL
    : DEFAULT_BACKEND_URL;
  elements.backendUrl.disabled = !isAdvancedBackendMode;

  const backendControl = elements.backendUrl.closest(".backend-url-control");
  if (backendControl) backendControl.hidden = !isAdvancedBackendMode;
  if (elements.checkBackend) elements.checkBackend.hidden = !isAdvancedBackendMode;
}

function getBackendUrl() {
  if (!isAdvancedBackendMode) return DEFAULT_BACKEND_URL;
  return normalizeBackendUrl(elements.backendUrl?.value || DEFAULT_BACKEND_URL);
}

function startConversionTimer() {
  stopConversionTimer();
  elapsedStartedAt = Date.now();
  conversionTimer = window.setInterval(() => {
    const elapsed = formatElapsed(Date.now() - elapsedStartedAt);
    setStatus((text.stillWorking || copy.en.stillWorking)(elapsed));
    updateJobElapsed(elapsed);
  }, 15000);
}

function stopConversionTimer() {
  if (!conversionTimer) return;
  window.clearInterval(conversionTimer);
  conversionTimer = 0;
  elapsedStartedAt = 0;
  activeEstimate = null;
}

function ensureQualityControl() {
  if (elements.quality) return;
  const controls = document.querySelector(".converter-controls");
  if (!controls) return;

  const label = document.createElement("label");
  label.className = "quality-control";

  const labelText = document.createElement("span");
  labelText.textContent = text.recordingMode || copy.en.recordingMode;

  const select = document.createElement("select");
  select.id = "qualityPreset";

  for (const [value, labelValue] of [
    ["clean", text.cleanMode || copy.en.cleanMode],
    ["balanced", text.balancedMode || copy.en.balancedMode],
    ["sensitive", text.sensitiveMode || copy.en.sensitiveMode],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labelValue;
    select.append(option);
  }

  const help = document.createElement("small");
  help.textContent = text.modeHelp || copy.en.modeHelp;

  label.append(labelText, select, help);
  controls.insertBefore(label, elements.convert);
  elements.quality = select;
}

function getQualityPreset() {
  const value = elements.quality?.value || "balanced";
  return ["clean", "balanced", "sensitive"].includes(value) ? value : "balanced";
}

function buildConversionFormData() {
  const formData = new FormData();
  formData.append("quality", getQualityPreset());
  formData.append("file", selectedFile, selectedFile.name);
  return formData;
}

async function createQueuedJob(backendUrl) {
  const response = await fetch(`${backendUrl}/jobs`, {
    method: "POST",
    body: buildConversionFormData(),
  });

  if (response.status === 404 || response.status === 405) {
    return null;
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || text.backendStatus(response.status));
  }

  const job = await response.json();
  setProgress(job.progress || 10);
  setStatus(formatJobStatus(job));
  updateJobPanel({
    status: job.status || "queued",
    message: formatJobStatus(job),
    progress: job.progress || 10,
    jobId: job.job_id,
    canStop: true,
  });
  return job;
}

async function waitForQueuedMidi(backendUrl, initialJob, runId) {
  let job = initialJob;

  while (job.status !== "done") {
    if (runId !== activeRunId) {
      throw new Error(STOPPED_WAITING_MESSAGE);
    }

    if (job.status === "failed") {
      throw new Error(job.error || job.message || text.failed);
    }

    await sleep(JOB_POLL_MS);
    const response = await fetch(`${backendUrl}/jobs/${encodeURIComponent(job.job_id)}`);
    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || text.backendStatus(response.status));
    }

    job = await response.json();
    setProgress(job.progress || (job.status === "processing" ? 45 : 15));
    setStatus(formatJobStatus(job));
    updateJobPanel({
      status: job.status,
      message: formatJobStatus(job),
      progress: job.progress || (job.status === "processing" ? 45 : 15),
      jobId: job.job_id,
      canStop: true,
    });
  }

  setProgress(88);
  setStatus(text.receiving);
  updateJobPanel({
    status: "downloading",
    message: "Conversion finished. Downloading MIDI...",
    progress: 88,
    jobId: job.job_id,
    canStop: true,
  });

  const midiResponse = await fetch(`${backendUrl}/jobs/${encodeURIComponent(job.job_id)}/midi`);
  if (!midiResponse.ok) {
    const message = await readErrorMessage(midiResponse);
    throw new Error(message || text.backendStatus(midiResponse.status));
  }

  await storeMidiResponse(midiResponse);
}

async function storeMidiResponse(response) {
  setProgress(82);
  setStatus(text.receiving);

  generatedMidiBytes = new Uint8Array(await response.arrayBuffer());
  generatedMidiName = response.headers.get("X-Midi-Filename") || `${cleanFileName(selectedFile.name)}.mid`;
  const noteCount = response.headers.get("X-Note-Count") || "?";
  const engine = response.headers.get("X-Transcription-Engine") || "transkun";
  const preprocess = response.headers.get("X-Audio-Preprocess") || "";

  showResult(noteCount, engine, preprocess);
}

function formatJobStatus(job) {
  const status = job?.status || "queued";
  if (status === "queued") return "Task is queued. Waiting for the free server...";
  if (status === "processing") return "Converting audio to MIDI. You can keep this page open.";
  if (status === "done") return "Conversion finished. Downloading MIDI...";
  if (status === "failed") return job.error || "Conversion failed.";
  return job.message || "Preparing conversion...";
}

function ensureJobPanel() {
  if (jobPanel || !elements.progress) return;

  const card = document.createElement("div");
  card.className = "job-panel";
  card.hidden = true;

  const header = document.createElement("div");
  header.className = "job-panel-header";

  const badge = document.createElement("span");
  badge.className = "job-status-badge";
  badge.textContent = "Idle";

  const title = document.createElement("strong");
  title.textContent = "Conversion task";

  const elapsed = document.createElement("small");
  elapsed.className = "job-elapsed";
  elapsed.textContent = "0s";

  header.append(badge, title, elapsed);

  const steps = document.createElement("ol");
  steps.className = "job-steps";
  for (const [step, label] of [
    ["uploading", "Upload"],
    ["queued", "Queue"],
    ["processing", "Convert"],
    ["done", "Ready"],
  ]) {
    const item = document.createElement("li");
    item.dataset.step = step;
    item.textContent = label;
    steps.append(item);
  }

  const message = document.createElement("p");
  message.className = "job-message";

  const meta = document.createElement("small");
  meta.className = "job-meta";

  const estimate = document.createElement("small");
  estimate.className = "job-estimate";

  const actions = document.createElement("div");
  actions.className = "job-actions";

  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.className = "secondary";
  stopButton.textContent = "Stop waiting";
  stopButton.addEventListener("click", () => {
    activeRunId += 1;
    stopConversionTimer();
    setBusy(false);
    setStatus("Stopped waiting. You can start a new conversion when ready.");
    updateJobPanel({
      status: "stopped",
      message: "Stopped waiting in this browser. The conversion task may still finish in the background.",
      canStop: false,
      canRetry: Boolean(selectedFile),
    });
  });

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.textContent = "Try again";
  retryButton.addEventListener("click", () => {
    if (!selectedFile || elements.convert.disabled) return;
    elements.convert.click();
  });

  actions.append(stopButton, retryButton);
  card.append(header, steps, message, meta, estimate, actions);
  elements.progress.parentElement.append(card);

  jobPanel = { card, badge, elapsed, steps, message, meta, estimate, stopButton, retryButton };
}

function updateJobPanel({ status, message, progress, jobId, canStop = false, canRetry = false }) {
  ensureJobPanel();
  if (!jobPanel) return;

  jobPanel.card.hidden = false;
  jobPanel.card.dataset.status = status;
  if (jobId) activeJobId = jobId;
  jobPanel.badge.textContent = labelForJobStatus(status);
  jobPanel.message.textContent = message || "";
  jobPanel.meta.textContent = activeJobId ? `Task ID: ${shortJobId(activeJobId)}` : "";
  jobPanel.estimate.textContent = formatEstimateMeta(status);
  jobPanel.stopButton.hidden = !canStop;
  jobPanel.retryButton.hidden = !canRetry;
  if (typeof progress === "number") setProgress(progress);

  const activeIndex = stepIndexForStatus(status);
  for (const [index, item] of [...jobPanel.steps.children].entries()) {
    item.classList.toggle("active", index === activeIndex);
    item.classList.toggle("complete", index < activeIndex || status === "done");
  }

  if (elapsedStartedAt) {
    updateJobElapsed(formatElapsed(Date.now() - elapsedStartedAt));
  }
}

function resetJobPanel() {
  if (!jobPanel) return;
  jobPanel.card.hidden = true;
  jobPanel.card.dataset.status = "idle";
  jobPanel.elapsed.textContent = "0s";
  jobPanel.estimate.textContent = "";
  activeJobId = "";
  activeEstimate = null;
}

function updateJobElapsed(value) {
  if (jobPanel && !jobPanel.card.hidden) {
    jobPanel.elapsed.textContent = value;
    jobPanel.estimate.textContent = formatEstimateMeta(jobPanel.card.dataset.status);
  }
}

function labelForJobStatus(status) {
  if (status === "uploading") return "Uploading";
  if (status === "queued") return "Queued";
  if (status === "processing") return "Processing";
  if (status === "downloading") return "Downloading";
  if (status === "done") return "Ready";
  if (status === "failed") return "Failed";
  if (status === "stopped") return "Stopped";
  return "Working";
}

function stepIndexForStatus(status) {
  if (status === "uploading") return 0;
  if (status === "queued") return 1;
  if (status === "processing" || status === "downloading") return 2;
  if (status === "done") return 3;
  return -1;
}

function shortJobId(jobId) {
  return String(jobId || "").slice(0, 8);
}

function estimateConversionTime(file, durationSeconds, qualityPreset) {
  const duration = durationSeconds || estimateAudioDurationFromSize(file);
  const profileMultiplier = qualityPreset === "sensitive" ? 1.25 : qualityPreset === "clean" ? 0.9 : 1;
  const lower = Math.max(ESTIMATE_MIN_SECONDS, Math.round((duration * 5 + 30) * profileMultiplier));
  const upper = Math.max(ESTIMATE_MIN_SECONDS * 2, Math.round((duration * 14 + ESTIMATE_QUEUE_BUFFER_SECONDS) * profileMultiplier));
  return {
    lower,
    upper: Math.max(upper, lower + 30),
    source: durationSeconds ? "duration" : "size",
  };
}

function estimateAudioDurationFromSize(file) {
  if (!file?.size) return 20;
  const bytesPerSecond = file.type === "audio/wav" || file.name?.toLowerCase().endsWith(".wav") ? 176400 : 16000;
  return Math.min(MAX_AUDIO_SECONDS, Math.max(5, file.size / bytesPerSecond));
}

function formatEstimateMessage() {
  if (!activeEstimate) return "";
  return `Estimated wait: about ${formatDurationRange(activeEstimate.lower, activeEstimate.upper)}.`;
}

function formatEstimateMeta(status) {
  if (!activeEstimate || ["done", "failed", "stopped"].includes(status)) return "";
  const elapsedSeconds = elapsedStartedAt ? Math.round((Date.now() - elapsedStartedAt) / 1000) : 0;
  const remainingLower = Math.max(0, activeEstimate.lower - elapsedSeconds);
  const remainingUpper = Math.max(0, activeEstimate.upper - elapsedSeconds);
  if (remainingUpper === 0) {
    return "Taking longer than usual. The free server may still be working.";
  }
  const prefix = activeEstimate.source === "duration" ? "Approx remaining" : "Rough remaining";
  return `${prefix}: ${formatDurationRange(remainingLower, remainingUpper)}`;
}

function formatDurationRange(lowerSeconds, upperSeconds) {
  const lower = formatApproxDuration(lowerSeconds);
  const upper = formatApproxDuration(upperSeconds);
  return lower === upper ? lower : `${lower}-${upper}`;
}

function formatApproxDuration(seconds) {
  if (seconds < 60) return `${Math.max(5, Math.round(seconds / 5) * 5)}s`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function sleep(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function setSelectedFile(file) {
  if (!elements.selectedFileName || !elements.selectedFileMeta) return;
  if (!file) {
    elements.selectedFileName.textContent = "-";
    elements.selectedFileMeta.textContent = `${MAX_AUDIO_MB} MB / ${MAX_AUDIO_SECONDS}s max`;
    return;
  }

  elements.selectedFileName.textContent = file.name;
  elements.selectedFileMeta.textContent = `${formatBytes(file.size)} - ${file.type || "audio file"}`;
}

function loadSelectedAudioDuration(file) {
  if (!file || !elements.selectedFileMeta) return;
  const audio = document.createElement("audio");
  const url = URL.createObjectURL(file);
  audio.preload = "metadata";

  audio.addEventListener("loadedmetadata", () => {
    selectedAudioDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    URL.revokeObjectURL(url);
    if (selectedFile === file && selectedAudioDuration > 0) {
      elements.selectedFileMeta.textContent = `${formatBytes(file.size)} - ${formatElapsed(selectedAudioDuration * 1000)} audio`;
    }
  });

  audio.addEventListener("error", () => {
    URL.revokeObjectURL(url);
  });

  audio.src = url;
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

function formatElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
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
