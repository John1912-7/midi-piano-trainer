import { noteName } from "../config/keyMap.js";

class MidiReader {
  constructor(buffer) {
    this.view = new DataView(buffer);
    this.offset = 0;
  }

  readUint8() {
    return this.view.getUint8(this.offset++);
  }

  readUint16() {
    const value = this.view.getUint16(this.offset);
    this.offset += 2;
    return value;
  }

  readUint32() {
    const value = this.view.getUint32(this.offset);
    this.offset += 4;
    return value;
  }

  readString(length) {
    let value = "";
    for (let index = 0; index < length; index += 1) {
      value += String.fromCharCode(this.readUint8());
    }
    return value;
  }

  readBytes(length) {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    return bytes;
  }

  readVarLength() {
    let value = 0;
    while (true) {
      const byte = this.readUint8();
      value = (value << 7) | (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
  }

  seek(offset) {
    this.offset = offset;
  }
}

function readHeader(reader) {
  const chunkId = reader.readString(4);
  if (chunkId !== "MThd") {
    throw new Error("Это не похоже на MIDI-файл: нет заголовка MThd.");
  }

  const headerLength = reader.readUint32();
  const format = reader.readUint16();
  const trackCount = reader.readUint16();
  const division = reader.readUint16();

  if (division & 0x8000) {
    throw new Error("SMPTE MIDI пока не поддерживается. Нужен файл с ticks-per-quarter.");
  }

  reader.seek(8 + headerLength);
  return { format, trackCount, ticksPerQuarter: division };
}

function createTempoMap(tempoEvents, ticksPerQuarter) {
  const events = [...tempoEvents].sort((a, b) => a.tick - b.tick);
  if (!events.length || events[0].tick !== 0) {
    events.unshift({ tick: 0, microsecondsPerQuarter: 500000 });
  }

  const segments = [];
  let seconds = 0;
  let lastTick = events[0].tick;
  let currentTempo = events[0].microsecondsPerQuarter;

  segments.push({ tick: lastTick, seconds, microsecondsPerQuarter: currentTempo });

  for (let index = 1; index < events.length; index += 1) {
    const event = events[index];
    seconds += ((event.tick - lastTick) * currentTempo) / ticksPerQuarter / 1000000;
    lastTick = event.tick;
    currentTempo = event.microsecondsPerQuarter;
    segments.push({ tick: lastTick, seconds, microsecondsPerQuarter: currentTempo });
  }

  return function tickToSeconds(tick) {
    let segment = segments[0];
    for (let index = 1; index < segments.length; index += 1) {
      if (segments[index].tick > tick) break;
      segment = segments[index];
    }

    return (
      segment.seconds +
      ((tick - segment.tick) * segment.microsecondsPerQuarter) / ticksPerQuarter / 1000000
    );
  };
}

function parseTrack(reader, trackIndex) {
  const id = reader.readString(4);
  if (id !== "MTrk") {
    throw new Error(`Дорожка ${trackIndex + 1}: ожидался блок MTrk.`);
  }

  const length = reader.readUint32();
  const endOffset = reader.offset + length;
  const notes = [];
  const tempoEvents = [];
  const activeNotes = new Map();
  let runningStatus = null;
  let tick = 0;
  let name = `Track ${trackIndex + 1}`;

  const activeKey = (channel, note) => `${channel}:${note}`;

  while (reader.offset < endOffset) {
    tick += reader.readVarLength();
    let status = reader.readUint8();

    if (status < 0x80) {
      reader.offset -= 1;
      if (runningStatus === null) {
        if (status === 0) {
          reader.offset += 1;
          continue;
        }
        throw new Error(`Дорожка ${trackIndex + 1}: MIDI-событие без running status.`);
      }
      status = runningStatus;
    } else if (status < 0xf0) {
      runningStatus = status;
    }

    if (status === 0xff) {
      const type = reader.readUint8();
      const metaLength = reader.readVarLength();
      const data = reader.readBytes(metaLength);

      if (type === 0x03 && data.length) {
        name = new TextDecoder().decode(data);
      }

      if (type === 0x51 && data.length === 3) {
        const microsecondsPerQuarter = (data[0] << 16) | (data[1] << 8) | data[2];
        tempoEvents.push({ tick, microsecondsPerQuarter });
      }

      if (type === 0x2f) break;
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      reader.readBytes(reader.readVarLength());
      continue;
    }

    const eventType = status >> 4;
    const channel = status & 0x0f;
    const data1 = reader.readUint8();
    const hasSecondByte = ![0xc, 0xd].includes(eventType);
    const data2 = hasSecondByte ? reader.readUint8() : 0;

    if (eventType === 0x9 && data2 > 0) {
      const key = activeKey(channel, data1);
      if (!activeNotes.has(key)) activeNotes.set(key, []);
      activeNotes.get(key).push({ startTick: tick, velocity: data2 });
    }

    if (eventType === 0x8 || (eventType === 0x9 && data2 === 0)) {
      const key = activeKey(channel, data1);
      const stack = activeNotes.get(key);
      const start = stack?.pop();

      if (start) {
        notes.push({
          id: `${trackIndex}-${notes.length}`,
          trackIndex,
          channel,
          note: data1,
          name: noteName(data1),
          startTick: start.startTick,
          endTick: tick,
          velocity: start.velocity / 127,
          status: "pending",
        });
      }
    }
  }

  reader.seek(endOffset);
  return { name, notes, tempoEvents };
}

export function parseMidi(buffer) {
  const reader = new MidiReader(buffer);
  const header = readHeader(reader);
  const tracks = [];
  const allTempoEvents = [];

  for (let index = 0; index < header.trackCount; index += 1) {
    const track = parseTrack(reader, index);
    tracks.push(track);
    allTempoEvents.push(...track.tempoEvents);
  }

  const tickToSeconds = createTempoMap(allTempoEvents, header.ticksPerQuarter);
  const notes = tracks
    .flatMap((track) => track.notes)
    .map((note) => ({
      ...note,
      start: tickToSeconds(note.startTick),
      duration: Math.max(0.03, tickToSeconds(note.endTick) - tickToSeconds(note.startTick)),
    }))
    .sort((a, b) => a.start - b.start || a.note - b.note);

  const duration = notes.reduce((max, note) => Math.max(max, note.start + note.duration), 0);
  const trackSummaries = tracks.map((track, index) => ({
    index,
    name: track.name,
    noteCount: track.notes.length,
  }));

  return { ...header, notes, duration, tracks: trackSummaries };
}
