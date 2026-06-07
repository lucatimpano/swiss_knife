const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /** PDF Tools API */
    openPdfDialog: (opts) => ipcRenderer.invoke('open-pdf-dialog', opts),
    pdfMerge: (filePaths) => ipcRenderer.invoke('pdf-merge', filePaths),
    pdfSplit: (opts) => ipcRenderer.invoke('pdf-split', opts),
    pdfCompress: (filePath) => ipcRenderer.invoke('pdf-compress', filePath),
    pdfToWord: (filePath) => ipcRenderer.invoke('pdf-to-word', filePath),

    /** Image Converter API */
    convertImage: (opts) => ipcRenderer.invoke('convert-image', opts),

    /** Audio Converter API */
    convertAudio: (opts) => ipcRenderer.invoke('convert-audio', opts),

    /** URL → Markdown Converter */
    urlToMarkdown: (opts) => ipcRenderer.invoke('url-to-markdown', opts),
});
