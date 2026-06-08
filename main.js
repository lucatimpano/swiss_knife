const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Document Swiss Knife',
    icon: path.join(__dirname, 'assets', 'icons', 'icon.png'),
    backgroundColor: '#101922',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── IPC: Open PDF dialog (multi-file) ──────────────────────────────────────
ipcMain.handle('open-pdf-dialog', async (_event, { multi = false } = {}) => {
  const properties = multi ? ['openFile', 'multiSelections'] : ['openFile'];
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: multi ? 'Seleziona PDF' : 'Seleziona un PDF',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties,
  });
  if (canceled || !filePaths.length) return { success: false };
  return { success: true, paths: filePaths, names: filePaths.map((p) => path.basename(p)) };
});

// ─── IPC: PDF Merge ──────────────────────────────────────────────────────────
ipcMain.handle('pdf-merge', async (_event, filePaths) => {
  try {
    const { PDFDocument } = require('pdf-lib');
    const merged = await PDFDocument.create();

    for (const fp of filePaths) {
      const bytes = fs.readFileSync(fp);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageIndices = doc.getPageIndices();
      const copied = await merged.copyPages(doc, pageIndices);
      copied.forEach((p) => merged.addPage(p));
    }

    const pdfBytes = await merged.save();

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salva PDF unito',
      defaultPath: 'merged.pdf',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { success: false, reason: 'cancelled' };

    fs.writeFileSync(filePath, pdfBytes);
    shell.openPath(filePath);
    return { success: true, path: filePath, pageCount: merged.getPageCount() };
  } catch (err) {
    console.error('PDF merge error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── IPC: PDF Split ──────────────────────────────────────────────────────────
ipcMain.handle('pdf-split', async (_event, { filePath, mode, ranges }) => {
  try {
    const { PDFDocument } = require('pdf-lib');
    const bytes = fs.readFileSync(filePath);
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // Ask where to save split files
    const { filePaths: [outDir], canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Scegli cartella di output',
      properties: ['openDirectory'],
    });
    if (canceled || !outDir) return { success: false, reason: 'cancelled' };

    const baseName = path.basename(filePath, '.pdf');
    let chunks = []; // array of page-index arrays (0-indexed)

    if (mode === 'per-page') {
      for (let i = 0; i < totalPages; i++) chunks.push([i]);
    } else if (mode === 'ranges' && Array.isArray(ranges)) {
      for (const r of ranges) {
        const from = Math.max(1, Number(r.from)) - 1;
        const to = Math.min(totalPages, Number(r.to)) - 1;
        if (from > to) continue;
        const indices = [];
        for (let i = from; i <= to; i++) indices.push(i);
        chunks.push(indices);
      }
    }

    const savedFiles = [];
    for (let ci = 0; ci < chunks.length; ci++) {
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(srcDoc, chunks[ci]);
      copied.forEach((p) => newDoc.addPage(p));
      const outBytes = await newDoc.save();
      const outName = mode === 'per-page'
        ? `${baseName}_page_${chunks[ci][0] + 1}.pdf`
        : `${baseName}_part_${ci + 1}.pdf`;
      const outPath = path.join(outDir, outName);
      fs.writeFileSync(outPath, outBytes);
      savedFiles.push(outPath);
    }

    shell.openPath(outDir);
    return { success: true, files: savedFiles, count: savedFiles.length };
  } catch (err) {
    console.error('PDF split error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── IPC: PDF Compress ───────────────────────────────────────────────────────
ipcMain.handle('pdf-compress', async (_event, filePath) => {
  try {
    const { PDFDocument } = require('pdf-lib');
    const bytes = fs.readFileSync(filePath);
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    // Re-save with object streams (reduces redundancy, lossless compression)
    const compressedBytes = await srcDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const { filePath: outPath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salva PDF compresso',
      defaultPath: path.basename(filePath, '.pdf') + '_compressed.pdf',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (canceled || !outPath) return { success: false, reason: 'cancelled' };

    const originalSize = bytes.length;
    fs.writeFileSync(outPath, compressedBytes);
    const newSize = compressedBytes.length;

    shell.openPath(outPath);
    return {
      success: true,
      path: outPath,
      originalSize,
      newSize,
      savedBytes: originalSize - newSize,
      percent: Math.round(((originalSize - newSize) / originalSize) * 100),
    };
  } catch (err) {
    console.error('PDF compress error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── IPC: PDF → Word (.docx) ────────────────────────────────────────────────
ipcMain.handle('pdf-to-word', async (_event, filePath) => {
  try {
    const { PDFDocument } = require('pdf-lib');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

    const bytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    const rawPdf = bytes.toString('binary');

    // Simple regex-based text extraction from PDF content streams
    const extractedLines = [];
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(rawPdf)) !== null) {
      const streamContent = match[1];
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
        const t = tjMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\\(/g, '(').replace(/\\\)/g, ')').trim();
        if (t) extractedLines.push(t);
      }
      while ((tjMatch = tjArrayRegex.exec(streamContent)) !== null) {
        const arr = tjMatch[1];
        const parts = arr.match(/\(([^)]*)\)/g) || [];
        const combined = parts.map((p) => p.slice(1, -1)).join('').trim();
        if (combined) extractedLines.push(combined);
      }
    }

    const paragraphs = [];

    // Title
    paragraphs.push(
      new Paragraph({
        text: path.basename(filePath, '.pdf'),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Convertito da: ${path.basename(filePath)} (${totalPages} pagine)`,
            color: '888888',
            italics: true,
            size: 18,
          }),
        ],
        spacing: { after: 600 },
      })
    );

    if (extractedLines.length === 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Il PDF non contiene testo estraibile (potrebbe essere un documento scansionato o basato su immagini).',
              color: 'cc0000',
            }),
          ],
        })
      );
    } else {
      let currentBuffer = [];
      for (const line of extractedLines) {
        if (!line.trim()) {
          if (currentBuffer.length) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: currentBuffer.join(' ') })],
                spacing: { after: 200 },
              })
            );
            currentBuffer = [];
          }
        } else {
          currentBuffer.push(line);
        }
      }
      if (currentBuffer.length) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: currentBuffer.join(' ') })],
            spacing: { after: 200 },
          })
        );
      }
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 },
          },
        },
        children: paragraphs,
      }],
    });

    const docxBuffer = await Packer.toBuffer(doc);

    const { filePath: outPath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salva come Word',
      defaultPath: path.basename(filePath, '.pdf') + '.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });
    if (canceled || !outPath) return { success: false, reason: 'cancelled' };

    fs.writeFileSync(outPath, docxBuffer);
    shell.openPath(outPath);
    return { success: true, path: outPath, linesExtracted: extractedLines.length };
  } catch (err) {
    console.error('PDF to Word error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── IPC: Convert Image ──────────────────────────────────────────────────────
ipcMain.handle('convert-image', async (_event, { filePath, format, width, height, quality }) => {
  try {
    const { nativeImage } = require('electron');
    if (!fs.existsSync(filePath)) {
      return { success: false, reason: 'Il file sorgente non esiste.' };
    }

    const ext = format.toLowerCase();
    const baseName = path.basename(filePath, path.extname(filePath));

    const { filePath: outPath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salva Immagine Convertita',
      defaultPath: `${baseName}_converted.${ext}`,
      filters: [{ name: `${format.toUpperCase()} Image`, extensions: [ext] }],
    });

    if (canceled || !outPath) return { success: false, reason: 'cancelled' };

    const isNative = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);

    if (isNative) {
      let img = nativeImage.createFromPath(filePath);
      if (img.isEmpty()) {
        return { success: false, reason: 'Impossibile caricare l\'immagine.' };
      }

      // Resize
      const resizeOpts = {};
      if (width && !isNaN(width)) resizeOpts.width = parseInt(width, 10);
      if (height && !isNaN(height)) resizeOpts.height = parseInt(height, 10);
      
      if (resizeOpts.width || resizeOpts.height) {
        img = img.resize(resizeOpts);
      }

      let buffer;
      if (ext === 'png') {
        buffer = img.toPNG();
      } else if (ext === 'jpg' || ext === 'jpeg') {
        const q = quality ? parseInt(quality, 10) : 90;
        buffer = img.toJPEG(q);
      } else if (ext === 'webp') {
        const q = quality ? parseInt(quality, 10) : 90;
        buffer = img.toWEBP(q);
      }

      fs.writeFileSync(outPath, buffer);
      shell.openPath(outPath);
      return { success: true, path: outPath };
    } else {
      // Fallback using system ffmpeg for bmp, gif, tiff
      const { spawn } = require('child_process');
      const ffmpegArgs = ['-y', '-i', filePath];

      const w = width ? parseInt(width, 10) : -1;
      const h = height ? parseInt(height, 10) : -1;
      if (w !== -1 || h !== -1) {
        ffmpegArgs.push('-vf', `scale=${w}:${h}`);
      }

      ffmpegArgs.push(outPath);

      const result = await new Promise((resolve) => {
        const proc = spawn('ffmpeg', ffmpegArgs);
        let errData = '';
        proc.stderr.on('data', (d) => { errData += d.toString(); });
        proc.on('close', (code) => {
          if (code === 0) resolve({ success: true });
          else resolve({ success: false, reason: errData });
        });
      });

      if (result.success) {
        shell.openPath(outPath);
        return { success: true, path: outPath };
      } else {
        return { success: false, reason: `Errore FFmpeg: ${result.reason}` };
      }
    }
  } catch (err) {
    console.error('Image conversion error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── IPC: Convert Audio ──────────────────────────────────────────────────────
ipcMain.handle('convert-audio', async (_event, { filePath, format, bitrate, sampleRate, channels }) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, reason: 'Il file sorgente non esiste.' };
    }

    const ext = format.toLowerCase();
    const baseName = path.basename(filePath, path.extname(filePath));

    const { filePath: outPath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salva Audio Convertito',
      defaultPath: `${baseName}_converted.${ext}`,
      filters: [{ name: `${format.toUpperCase()} Audio`, extensions: [ext] }],
    });

    if (canceled || !outPath) return { success: false, reason: 'cancelled' };

    const { spawn } = require('child_process');
    const ffmpegArgs = ['-y', '-i', filePath];

    if (bitrate) {
      ffmpegArgs.push('-b:a', bitrate);
    }
    if (sampleRate) {
      ffmpegArgs.push('-ar', sampleRate);
    }
    if (channels) {
      ffmpegArgs.push('-ac', channels);
    }

    ffmpegArgs.push(outPath);

    console.log('Running FFmpeg for audio with args:', ffmpegArgs);

    const result = await new Promise((resolve) => {
      const proc = spawn('ffmpeg', ffmpegArgs);
      let errData = '';
      proc.stderr.on('data', (d) => { errData += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve({ success: true });
        else resolve({ success: false, reason: errData });
      });
    });

    if (result.success) {
      shell.openPath(outPath);
      return { success: true, path: outPath };
    } else {
      return { success: false, reason: `Errore FFmpeg: ${result.reason}` };
    }
  } catch (err) {
    console.error('Audio conversion error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── IPC: URL → Markdown ─────────────────────────────────────────────────────
ipcMain.handle('url-to-markdown', async (_event, { url, saveFile }) => {
  let fetchWin = null;
  try {
    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : 'https://' + url);
    } catch {
      return { success: false, reason: 'URL non valido. Assicurati di includere https://' };
    }

    // Launch a hidden BrowserWindow to load the page with full JS support
    fetchWin = new BrowserWindow({
      show: false,
      width: 1280,
      height: 900,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
        images: false, // skip images for speed
      },
    });

    // Load the URL and wait for DOM ready with a 15s timeout
    await Promise.race([
      fetchWin.loadURL(parsedUrl.href, {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: il sito ha impiegato troppo tempo a rispondere.')), 15000)),
    ]);

    // Small wait for any JS to settle
    await new Promise(r => setTimeout(r, 800));

    // Extract cleaned HTML from the page via JS evaluation in the page context
    const rawHtml = await fetchWin.webContents.executeJavaScript(`
      (function() {
        // Remove noisy elements: scripts, styles, nav, footer, ads, etc.
        const remove = ['script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer',
                        'header', 'aside', '[role="banner"]', '[role="navigation"]',
                        '[role="complementary"]', '.cookie-banner', '.ad', '.ads',
                        '.advertisement', '.social-share', '#comments', '.sidebar'];
        remove.forEach(sel => {
          try { document.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
        });

        // Try to find main content area
        const main = document.querySelector('main, [role="main"], article, .post-content, .entry-content, .content, #content, #main-content');
        const title = document.title || '';
        const html = (main || document.body || document.documentElement).innerHTML;
        return JSON.stringify({ title, html });
      })();
    `);

    fetchWin.close();
    fetchWin = null;

    const { title, html } = JSON.parse(rawHtml);

    // Convert HTML → Markdown via turndown
    const TurndownService = require('turndown');
    const td = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
    });

    // Remove any remaining style/script blocks from turndown output
    td.remove(['script', 'style', 'noscript']);

    let markdown = `# ${title}\n\n> Fonte: ${parsedUrl.href}\n\n---\n\n` + td.turndown(html);

    // Cleanup: collapse 3+ blank lines to 2
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

    if (saveFile) {
      const safeName = title.replace(/[^a-z0-9\-_\s]/gi, '').trim().replace(/\s+/g, '_') || 'pagina';
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Salva Markdown',
        defaultPath: `${safeName}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (canceled || !filePath) return { success: true, markdown, saved: false };
      fs.writeFileSync(filePath, markdown, 'utf-8');
      shell.openPath(filePath);
      return { success: true, markdown, saved: true, path: filePath };
    }

    return { success: true, markdown, saved: false };
  } catch (err) {
    if (fetchWin && !fetchWin.isDestroyed()) fetchWin.close();
    console.error('URL to Markdown error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── IPC: Crop Image ─────────────────────────────────────────────────────────
ipcMain.handle('crop-image', async (_event, { base64, sourcePath, ext, overwrite }) => {
  try {
    // Decodifica base64 → Buffer
    const dataPrefix = base64.indexOf(',');
    const b64Data = dataPrefix >= 0 ? base64.slice(dataPrefix + 1) : base64;
    const buffer = Buffer.from(b64Data, 'base64');

    if (overwrite) {
      // Sovrascrive il file originale
      fs.writeFileSync(sourcePath, buffer);
      shell.openPath(sourcePath);
      return { success: true, path: sourcePath };
    } else {
      // Apre dialog salva-come
      const baseName = path.basename(sourcePath, path.extname(sourcePath));
      const defaultName = `${baseName}_ritagliata.${ext}`;
      const { filePath: outPath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Salva copia ritagliata',
        defaultPath: path.join(path.dirname(sourcePath), defaultName),
        filters: [{ name: `${ext.toUpperCase()} Image`, extensions: [ext] }],
      });
      if (canceled || !outPath) return { success: false, reason: 'cancelled' };
      fs.writeFileSync(outPath, buffer);
      shell.openPath(outPath);
      return { success: true, path: outPath };
    }
  } catch (err) {
    console.error('Crop image error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
