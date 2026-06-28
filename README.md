# MIDI Piano Trainer

Личный браузерный тренажер пианино: загружаешь `.mid` файл, видишь падающие ноты и играешь их на клавиатуре ПК.

Сайт: https://john1912-7.github.io/midi-piano-trainer/

## Что уже есть

- Загрузка MIDI прямо в браузере.
- Парсинг MIDI-файлов формата 0/1 с tempo events.
- Падающие ноты, привязанные к своим клавишам и столбцам.
- Оценка попаданий: hit/miss/wrong.
- Звук через Web Audio API.
- Выбор дорожки MIDI.
- Автоматическое расширение диапазона октав под песню.
- SEO-страницы на русском, английском, немецком, испанском и армянском.
- Вкладка Audio to MIDI с подключаемым backend URL.

## Локальный запуск сайта

```bash
npm install
npm run dev
```

Потом открой адрес, который покажет Vite.

## Локальный запуск backend

```bash
cd backend
docker build -t midi-piano-backend .
docker run --rm -p 7860:7860 midi-piano-backend
```

Backend URL для вкладки Audio to MIDI:

```text
http://127.0.0.1:7860
```

## Деплой backend

В репозитории есть `render.yaml`. На Render можно создать Blueprint/Web Service из GitHub-репозитория, и он возьмет Docker-конфигурацию из папки `backend`.

После деплоя нужно вставить URL backend в поле на странице:

```text
/ru/audio-to-midi/
```

## Тесты

```bash
npm test
```
