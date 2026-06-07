# 🇨🇭 Coltellino Svizzero

> **Desktop app tutto-in-uno per documenti e media** — PDF, immagini, audio e pagine web, direttamente sul tuo computer.

![Electron](https://img.shields.io/badge/Electron-29-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Funzionalità

### 📄 Strumenti PDF
| Operazione | Descrizione |
|---|---|
| **Unisci** | Combina più PDF in uno — con riordinamento drag-to-sort e rimozione singola |
| **Dividi** | Separa ogni pagina o definisci intervalli personalizzati (es. `1-3, 5-9`) |
| **Comprimi** | Riduzione lossless del peso con object-stream (mostra % risparmiata) |
| **PDF → Word** | Estrae il testo e genera un `.docx` strutturato |

### 🖼️ Convertitore Immagini
- Formati supportati: **PNG, JPEG, WebP, BMP, GIF, TIFF**
- Ridimensionamento con opzione di mantenere le proporzioni
- Slider qualità/compressione (per JPG e WebP)
- Backend: `nativeImage` di Electron (Skia) per PNG/JPG/WebP — `ffmpeg` per il resto

### 🎵 Convertitore Audio
- Formati: **MP3, WAV, FLAC, AAC, OGG, M4A**
- Controllo bitrate (64 – 320 kbps), frequenza di campionamento e canali (stereo/mono)
- Backend: **FFmpeg** di sistema

### 🌐 Web → Markdown
- Inserisci un URL → l'app carica la pagina con un browser Chromium nascosto
- Funziona anche su siti con rendering JavaScript (React, Vue, ecc.)
- Rimuove automaticamente nav, footer, script, sidebar e banner cookie
- Individua il contenuto principale (`<main>`, `<article>`, `.post-content`, ecc.)
- Output: Markdown pulito con heading `#`, fenced code block e link inline
- Pulsante **Copia** e **Salva .md**

---

## 🚀 Avvio rapido

### Prerequisiti
- [Node.js](https://nodejs.org/) ≥ 18
- `ffmpeg` installato nel sistema (per audio e alcuni formati immagine)
  ```bash
  # Ubuntu / Debian
  sudo apt install ffmpeg
  ```

### Installazione e avvio in sviluppo
```bash
git clone https://github.com/<tuo-utente>/coltellino-svizzero.git
cd coltellino-svizzero
npm install
npm start
```

---

## 📦 Build distribuzione

```bash
# Linux (AppImage + .deb)
npm run build:linux

# Windows
npm run build:win

# macOS
npm run build:mac
```

I pacchetti vengono generati nella cartella `dist/`.

---

## 🗂️ Struttura del progetto

```
coltellino-svizzero/
├── main.js              # Processo principale Electron (IPC handlers)
├── preload.js           # Bridge sicuro renderer ↔ main
├── renderer/
│   ├── index.html       # UI principale (Tailwind CSS)
│   └── renderer.js      # Logica frontend
├── assets/
│   └── icons/           # Icone app
└── package.json
```

---

## 🛠️ Stack tecnico

| Componente | Tecnologia |
|---|---|
| Framework desktop | [Electron](https://electronjs.org/) 29 |
| UI / Stile | [Tailwind CSS](https://tailwindcss.com/) (CDN) + Material Symbols |
| PDF | [pdf-lib](https://pdf-lib.js.org/) + [docx](https://docx.js.org/) |
| HTML → Markdown | [Turndown](https://github.com/mixmark-io/turndown) |
| Immagini | Electron `nativeImage` + FFmpeg |
| Audio | FFmpeg (sistema) |

---

## 📋 Requisiti di sistema

| | Minimo |
|---|---|
| OS | Linux x64, Windows 10+, macOS 11+ |
| RAM | 256 MB |
| FFmpeg | Richiesto per audio e formati immagine non nativi |

---

## 📝 Licenza

MIT © Giuseppe
