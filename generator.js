'use strict';

const storageKey = 'asm-code-generator-history-v1';
const find = (id) => document.getElementById(id);
const current = find('current');
const note = find('note');
const status = find('status');
const historyPanel = find('history');
const copyButton = find('copy');
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
let entries = [];
let currentEntry;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (Array.isArray(saved)) {
    entries = saved.filter((entry) => entry && typeof entry.code === 'string'
      && entry.code.trim().length > 0 && typeof entry.note === 'string'
      && typeof entry.createdAt === 'string' && Number.isFinite(Date.parse(entry.createdAt)));
  }
} catch {
  status.textContent = 'Lecture de l’historique impossible dans ce navigateur.';
}

function randomIndex(limit) {
  const buffer = new Uint8Array(1);
  const cutoff = 256 - 256 % limit;
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= cutoff);
  return buffer[0] % limit;
}

function createCode() {
  const chars = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[randomIndex(26)],
    'abcdefghijklmnopqrstuvwxyz'[randomIndex(26)],
    '.',
    ...Array.from({ length: 9 }, () => String(randomIndex(10))),
  ];
  for (let index = chars.length - 1; index > 0; index--) {
    const other = randomIndex(index + 1);
    [chars[index], chars[other]] = [chars[other], chars[index]];
  }
  return chars.join('');
}

function saveHistory(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries));
    status.textContent = message;
  } catch {
    status.textContent = 'Enregistrement local impossible. Les modifications restent visibles sur cette page.';
  }
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    status.textContent = 'Code copié.';
  } catch {
    const field = document.createElement('textarea');
    field.value = code;
    field.setAttribute('aria-label', 'Code à copier');
    field.readOnly = true;
    status.replaceChildren('Copiez le code avec Ctrl+C. ', field);
    field.select();
  }
}

function makeEntry(entry) {
  const row = find('entry').content.firstElementChild.cloneNode(true);
  const timestamp = row.querySelector('time');
  row.querySelector('code').textContent = entry.code;
  timestamp.dateTime = entry.createdAt;
  timestamp.textContent = dateFormat.format(new Date(entry.createdAt));
  row.querySelector('.entry-note').textContent = entry.note ? 'Note — ' + entry.note : 'Sans note';
  const pngButton = row.querySelector('.png');
  pngButton.setAttribute('aria-label', 'Exporter en PNG le code ' + entry.code);
  pngButton.addEventListener('click', () => exportCard(entry));
  row.querySelector('.copy').addEventListener('click', () => copyCode(entry.code));
  const deleteButton = row.querySelector('.delete');
  deleteButton.setAttribute('aria-label', 'Supprimer le code ' + entry.code);
  deleteButton.addEventListener('click', () => {
    entries = entries.filter((item) => item !== entry);
    const nextCard = row.nextElementSibling ?? row.previousElementSibling;
    row.remove();
    if (entry === currentEntry) {
      currentEntry = undefined;
      current.value = '—';
      copyButton.disabled = true;
    }
    showEmptyState();
    updateCount();
    saveHistory('Carte supprimée.');
    (nextCard?.querySelector('.delete') ?? find('history-title')).focus();
  });
  return row;
}

function updateCount() {
  const total = String(entries.length);
  find('count').textContent = total + (entries.length === 1 ? ' code' : ' codes');

  updateFlip(find('flip-count'), total);
}

function updateFlip(display, total) {
  const value = display.querySelector('.flip-value');
  const previous = value.textContent;
  value.textContent = total;
  if (previous === total || matchMedia('(prefers-reduced-motion: reduce)').matches
      || !display.getClientRects().length) return;

  const face = display.querySelector('.flip-face');
  if (!face.animate || !face.getAnimations) return;
  face.getAnimations().forEach((animation) => animation.cancel());
  face.textContent = previous;
  face.animate([
    { visibility: 'visible', transform: 'rotateX(0deg)' },
    { visibility: 'visible', transform: 'rotateX(-90deg)' },
  ], { duration: 280, easing: 'ease-in' });
}

function showEmptyState() {
  if (entries.length) return;
  const empty = document.createElement('p');
  empty.id = 'empty';
  empty.className = 'hint';
  empty.textContent = 'Aucun code généré.';
  historyPanel.append(empty);
}

for (const entry of entries) historyPanel.append(makeEntry(entry));
showEmptyState();
updateCount();

function addCode(code, noteField) {
  const entry = { code, note: noteField.value.trim(), createdAt: new Date().toISOString() };
  entries.unshift(entry);
  currentEntry = entry;
  current.value = entry.code;
  copyButton.disabled = false;
  noteField.value = '';
  find('empty')?.remove();
  historyPanel.prepend(makeEntry(entry));
  historyPanel.scrollTop = 0;
  updateCount();
  saveHistory('Code ajouté à l’historique.');
}

const manual = find('manual-code');
const manualError = find('manual-error');
const manualNote = find('manual-note');

manual.addEventListener('input', () => {
  manual.removeAttribute('aria-invalid');
  manualError.textContent = '';
});

find('manual-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!manual.value.trim()) {
    manual.setAttribute('aria-invalid', 'true');
    manualError.textContent = 'Saisis un code avant de l’enregistrer.';
    manual.focus();
    return;
  }
  addCode(manual.value, manualNote);
  manual.value = '';
  manual.removeAttribute('aria-invalid');
  manualError.textContent = '';
  manual.blur();
});

find('generate').addEventListener('click', () => addCode(createCode(), note));

copyButton.addEventListener('click', () => copyCode(current.value));

function wrapNote(context, noteText, maxWidth) {
  const lines = [];
  for (const paragraph of noteText.split(/\r?\n/)) {
    let line = '';
    for (const character of paragraph) {
      if (line && context.measureText(line + character).width > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
    lines.push(line);
  }
  return lines;
}

function renderCard(entry) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const width = 900;
  const inset = 54;
  const codeFont = 'bold 48px monospace';
  context.font = codeFont;
  const codeLines = wrapNote(context, entry.code, width - 2 * inset);
  const extraHeight = 60 * (codeLines.length - 1);
  const noteFont = '26px system-ui, sans-serif';
  context.font = noteFont;
  const lines = wrapNote(context, entry.note || 'Sans note', width - 2 * inset);
  canvas.width = width;
  canvas.height = 381 + extraHeight + 37 * lines.length;

  const background = context.createLinearGradient(0, 0, width, canvas.height);
  background.addColorStop(0, '#2c2319');
  background.addColorStop(1, '#100d09');
  context.fillStyle = background;
  context.fillRect(0, 0, width, canvas.height);
  context.strokeStyle = '#c5984f';
  context.lineWidth = 3;
  context.strokeRect(14, 14, width - 28, canvas.height - 28);

  const logo = document.querySelector('header img');
  if (logo.complete && logo.naturalWidth) context.drawImage(logo, width - 210, 34, 156, 156);
  context.fillStyle = '#efc66e';
  context.font = 'bold 32px Georgia, serif';
  context.fillText('ASM CODE GENERATOR', inset, 75);
  context.font = codeFont;
  codeLines.forEach((line, index) => context.fillText(line, inset, 241 + 60 * index));
  context.fillStyle = '#d1c4ad';
  context.font = '24px system-ui, sans-serif';
  context.fillText(dateFormat.format(new Date(entry.createdAt)), inset, 281 + extraHeight);
  context.fillStyle = '#efc66e';
  context.font = 'bold 22px system-ui, sans-serif';
  context.fillText('NOTE', inset, 337 + extraHeight);
  context.fillStyle = '#f5e8cc';
  context.font = noteFont;
  lines.forEach((line, index) => context.fillText(line, inset, 374 + extraHeight + 37 * index));
  return canvas.toDataURL('image/png');
}

async function exportCard(entry) {
  try {
    const url = renderCard(entry);
    const filename = 'ASM-Carte-' + entry.createdAt.replace(/[:.]/g, '-') + '.png';
    if (navigator.canShare && navigator.share) {
      const bytes = Uint8Array.from(atob(url.split(',')[1]), (character) => character.charCodeAt(0));
      const file = new File([bytes], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    status.textContent = 'Téléchargement PNG lancé.';
  } catch {
    status.textContent = 'Impossible de créer le fichier PNG.';
  }
}

const widget = document.querySelector('main');
const screenButtons = [...document.querySelectorAll('[data-screen-target]')];
for (const button of screenButtons) {
  button.addEventListener('click', () => {
    widget.dataset.screen = button.dataset.screenTarget;
    for (const option of screenButtons) {
      if (option === button) option.setAttribute('aria-current', 'true');
      else option.removeAttribute('aria-current');
    }
  });
}

const modeButtons = [...document.querySelectorAll('[data-mode-target]')];
for (const button of modeButtons) {
  button.addEventListener('click', () => {
    widget.dataset.mode = button.dataset.modeTarget;
    for (const option of modeButtons) option.setAttribute('aria-pressed', String(option === button));
  });
}

const clockTime = find('clock-time');
const clockDate = find('clock-date');
const clockParts = [...clockTime.querySelectorAll('[data-clock-part]')];
const clockDateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' });
const twoDigits = (number) => String(number).padStart(2, '0');

function updateClock(now = new Date()) {
  const parts = {
    hours: twoDigits(now.getHours()),
    minutes: twoDigits(now.getMinutes()),
    seconds: twoDigits(now.getSeconds()),
  };
  for (const display of clockParts) updateFlip(display, parts[display.dataset.clockPart]);
  const time = Object.values(parts).join(':');
  clockTime.dateTime = time;
  clockTime.setAttribute('aria-label', 'Heure locale ' + time);

  const calendarDate = [now.getFullYear(), twoDigits(now.getMonth() + 1), twoDigits(now.getDate())].join('-');
  if (clockDate.dateTime !== calendarDate) {
    clockDate.dateTime = calendarDate;
    clockDate.textContent = clockDateFormat.format(now);
  }
}

function tickClock() {
  updateClock();
  setTimeout(tickClock, 1000 - Date.now() % 1000);
}

tickClock();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateClock();
});

const scanCamera = find('scan-camera');
const scanPhoto = find('scan-photo');
let decoderLoading;

function loadScanner() {
  if (!decoderLoading) {
    decoderLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'vendor/zxing-0.21.3.min.js';
      script.onload = () => resolve(new ZXing.BrowserMultiFormatReader());
      script.onerror = () => {
        script.remove();
        reject(new Error('Décodeur indisponible'));
      };
      document.head.append(script);
    }).catch((error) => {
      decoderLoading = undefined;
      throw error;
    });
  }
  return decoderLoading;
}

async function scanImage(input) {
  const image = input.files[0];
  input.value = '';
  if (!image) return;

  scanCamera.disabled = scanPhoto.disabled = true;
  status.textContent = 'Lecture du code en cours…';
  let url;
  try {
    const reader = await loadScanner();
    url = URL.createObjectURL(image);
    const result = await reader.decodeFromImageUrl(url);
    const value = result.getText();
    if (!value.trim()) throw new Error('Code vide');
    manual.value = value;
    manual.removeAttribute('aria-invalid');
    manualError.textContent = '';
    status.textContent = 'Code lu. Vérifie-le, puis touche Enregistrer.';
  } catch {
    status.textContent = 'Code illisible. Réessaie avec une photo nette du QR code ou du code-barres.';
  } finally {
    if (url) URL.revokeObjectURL(url);
    scanCamera.disabled = scanPhoto.disabled = false;
  }
}

for (const [button, inputId] of [[scanCamera, 'scan-camera-file'], [scanPhoto, 'scan-photo-file']]) {
  const input = find(inputId);
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => scanImage(input));
}
