/**
 * Coltellino Svizzero – Renderer Process
 * Gestisce: Navigazione pannelli, Cambio tema, Strumenti PDF,
 *           Convertitore Immagini e Convertitore Audio.
 */

if (document.readyState === 'complete') {
    initApp();
} else {
    window.addEventListener('load', initApp);
}

function initApp() {
    try {
        _initApp();
    } catch (err) {
        console.error('[Coltellino Svizzero] Errore di inizializzazione:', err);
    }
}

function _initApp() {
    // ── RIFERIMENTI DOM GENERALE
    let toastTimer;
    const preview = document.getElementById('preview');
    const wordCount = document.getElementById('word-count');
    const charCount = document.getElementById('char-count');
    const lineCount = document.getElementById('line-count');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastIcon = document.getElementById('toast-icon');
    const btnTheme = document.getElementById('btn-theme');
    const themeIcon = document.getElementById('theme-icon');
    const activeToolTitle = document.getElementById('active-tool-title');
    const statusLabel = document.getElementById('status-label');
    const statusDot = document.getElementById('status-dot');
    const sidebarFilename = document.getElementById('sidebar-filename');

    const pdfWorkspace = document.getElementById('pdf-workspace');
    const imageWorkspace = document.getElementById('image-workspace');
    const audioWorkspace = document.getElementById('audio-workspace');
    const webWorkspace = document.getElementById('web-workspace');

    const navPdf = document.getElementById('nav-pdf');
    const navImage = document.getElementById('nav-image');
    const navAudio = document.getElementById('nav-audio');
    const navWeb = document.getElementById('nav-web');

    // ── STATO APPLICAZIONE
    let activePanel = 'pdf';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let isDark = localStorage.getItem('theme') === 'light' ? false : (localStorage.getItem('theme') === 'dark' ? true : prefersDark);

    // ── CAMBIO PANNELLI / WORKSPACES
    function switchPanel(name) {
        activePanel = name;
        
        // Nascondi tutti i workspace
        pdfWorkspace.classList.add('hidden');
        imageWorkspace.classList.add('hidden');
        audioWorkspace.classList.add('hidden');

        const NAV_BASE = 'w-full flex items-center gap-3 px-3 py-3 rounded-lg group text-left text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition';
        // Hide all workspaces, reset all nav buttons
        [pdfWorkspace, imageWorkspace, audioWorkspace, webWorkspace].forEach(w => w?.classList.add('hidden'));
        [navPdf, navImage, navAudio, navWeb].forEach(n => { if (n) n.className = NAV_BASE; });

        if (name === 'pdf') {
            pdfWorkspace.classList.remove('hidden');
            navPdf.className = 'nav-active w-full flex items-center gap-3 px-3 py-3 rounded-lg group text-left';
            activeToolTitle.textContent = 'Strumenti PDF';
            statusLabel.textContent = 'Strumenti PDF Attivi';
            statusDot.className = 'w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/40';
            sidebarFilename.textContent = 'Strumenti PDF';
        } else if (name === 'image') {
            imageWorkspace.classList.remove('hidden');
            navImage.className = 'nav-active w-full flex items-center gap-3 px-3 py-3 rounded-lg group text-left';
            activeToolTitle.textContent = 'Convertitore Immagini';
            statusLabel.textContent = 'Convertitore Immagini Attivo';
            statusDot.className = 'w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/40';
            sidebarFilename.textContent = 'Convertitore Immagini';
        } else if (name === 'audio') {
            audioWorkspace.classList.remove('hidden');
            navAudio.className = 'nav-active-violet w-full flex items-center gap-3 px-3 py-3 rounded-lg group text-left';
            activeToolTitle.textContent = 'Convertitore Audio';
            statusLabel.textContent = 'Convertitore Audio Attivo';
            statusDot.className = 'w-2 h-2 rounded-full bg-violet-400 shadow-sm shadow-violet-500/40';
            sidebarFilename.textContent = 'Convertitore Audio';
        } else if (name === 'web') {
            webWorkspace.classList.remove('hidden');
            navWeb.className = 'nav-active-emerald w-full flex items-center gap-3 px-3 py-3 rounded-lg group text-left';
            activeToolTitle.textContent = 'Web → Markdown';
            statusLabel.textContent = 'Convertitore Web Attivo';
            statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/40';
            sidebarFilename.textContent = 'Web → Markdown';
        }
    }

    navPdf?.addEventListener('click', () => switchPanel('pdf'));
    navImage?.addEventListener('click', () => switchPanel('image'));
    navAudio?.addEventListener('click', () => switchPanel('audio'));
    navWeb?.addEventListener('click', () => switchPanel('web'));

    // ── CAMBIO TEMA
    function applyTheme() {
        document.documentElement.classList.toggle('dark', isDark);
        themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }

    btnTheme?.addEventListener('click', () => {
        isDark = !isDark;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        applyTheme();
    });

    applyTheme(); // Esegui all'avvio

    // ── FUNZIONI TOAST DI NOTIFICA
    function showToast(msg, type = 'success') {
        clearTimeout(toastTimer);
        toastMsg.textContent = msg;
        toastIcon.textContent = type === 'error' ? 'error' : (type === 'info' ? 'info' : 'check_circle');
        toastIcon.className = `material-symbols-outlined text-lg ${type === 'error' ? 'text-red-400' : (type === 'info' ? 'text-blue-400' : 'text-emerald-400')}`;
        toast.classList.add('show');
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3800);
    }

    // ── GESTIONE SELEZIONE FILE DINAMICA (HTML INPUT)
    function pickFile(accept, onFile) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                onFile(e.target.files[0]);
            }
        };
        input.click();
    }

    function pickFiles(accept, onFiles) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = true;
        input.onchange = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                onFiles([...e.target.files]);
            }
        };
        input.click();
    }

    // ── CREAZIONE DEI TAG FILE NELL'INTERFACCIA
    function makeFileTag(name, isViolet = false) {
        const span = document.createElement('span');
        span.className = `pdf-file-tag ${isViolet ? 'pdf-file-tag-violet' : ''}`;
        span.innerHTML = `<span class="material-symbols-outlined text-[14px]">insert_drive_file</span>${name}`;
        return span;
    }

    function setBtnLoading(btn, loading, originalHTML) {
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Elaborazione…';
        } else {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }

    // ── GESTIONE DRAG & DROP
    function setupDropZone(dropZone, onFiles, extFilter = null) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            let files = [...(e.dataTransfer?.files || [])];
            if (extFilter) {
                files = files.filter(f => {
                    const ext = f.name.split('.').pop().toLowerCase();
                    return extFilter.includes(ext);
                });
            }
            if (!files.length) {
                showToast('Formato file non supportato o non valido', 'error');
                return;
            }
            onFiles(files);
        });
    }

    // ==========================================
    // 1. STRUMENTI PDF
    // ==========================================

    // ── UNISCI PDF
    const mergeSelectBtn = document.getElementById('merge-select-btn');
    const mergeBtn = document.getElementById('merge-btn');
    const mergeFileList = document.getElementById('merge-file-list');
    const mergeDropZone = document.getElementById('merge-drop-zone');
    let mergePaths = [];

    function updateMergeList() {
        mergeFileList.innerHTML = '';
        mergePaths.forEach((p, index) => {
            mergeFileList.appendChild(makeMergeFileTag(p, index, mergePaths.length));
        });
        mergeBtn.disabled = mergePaths.length < 2;
    }

    function makeMergeFileTag(file, index, total) {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 shadow-sm max-w-full';
        
        // Icon and file name
        div.innerHTML = `
            <span class="material-symbols-outlined text-primary text-[16px] flex-shrink-0">picture_as_pdf</span>
            <span class="truncate font-medium flex-1 mr-2" title="${file.name}">${file.name}</span>
        `;
        
        // Reordering buttons container
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex items-center gap-1 flex-shrink-0 mr-1';
        
        // Move Up button
        const upBtn = document.createElement('button');
        upBtn.className = 'p-0.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none';
        upBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] block">arrow_upward</span>';
        upBtn.title = 'Sposta su';
        upBtn.disabled = index === 0;
        upBtn.onclick = (e) => {
            e.stopPropagation();
            swapMergeItems(index, index - 1);
        };
        btnContainer.appendChild(upBtn);
        
        // Move Down button
        const downBtn = document.createElement('button');
        downBtn.className = 'p-0.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none';
        downBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] block">arrow_downward</span>';
        downBtn.title = 'Sposta giù';
        downBtn.disabled = index === total - 1;
        downBtn.onclick = (e) => {
            e.stopPropagation();
            swapMergeItems(index, index + 1);
        };
        btnContainer.appendChild(downBtn);
        
        div.appendChild(btnContainer);
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'p-0.5 hover:bg-red-900/50 rounded transition text-slate-400 hover:text-red-400 flex-shrink-0';
        deleteBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] block">close</span>';
        deleteBtn.title = 'Rimuovi';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeMergeItem(index);
        };
        div.appendChild(deleteBtn);
        
        return div;
    }

    function swapMergeItems(idx1, idx2) {
        if (idx1 < 0 || idx1 >= mergePaths.length || idx2 < 0 || idx2 >= mergePaths.length) return;
        const temp = mergePaths[idx1];
        mergePaths[idx1] = mergePaths[idx2];
        mergePaths[idx2] = temp;
        updateMergeList();
    }
    
    function removeMergeItem(idx) {
        if (idx < 0 || idx >= mergePaths.length) return;
        mergePaths.splice(idx, 1);
        updateMergeList();
    }

    mergeSelectBtn?.addEventListener('click', () => {
        pickFiles('.pdf', (files) => {
            const list = files.map(f => ({ path: f.path, name: f.name })).filter(f => f.path);
            mergePaths = [...mergePaths, ...list];
            updateMergeList();
        });
    });

    if (mergeDropZone) setupDropZone(mergeDropZone, (files) => {
        const list = files.map(f => ({ path: f.path, name: f.name })).filter(f => f.path);
        mergePaths = [...mergePaths, ...list];
        updateMergeList();
    }, ['pdf']);

    const mergeBtnOriginalHTML = mergeBtn?.innerHTML;
    mergeBtn?.addEventListener('click', async () => {
        if (mergePaths.length < 2) return;
        setBtnLoading(mergeBtn, true, mergeBtnOriginalHTML);
        try {
            const result = await window.electronAPI.pdfMerge(mergePaths.map(f => f.path));
            if (result.success) {
                showToast(`PDF unito — ${result.pageCount} pagine totali`);
                mergePaths = [];
                updateMergeList();
            } else if (result.reason !== 'cancelled') {
                showToast(result.reason, 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setBtnLoading(mergeBtn, false, mergeBtnOriginalHTML);
        }
    });

    // ── DIVIDI PDF
    const splitSelectBtn = document.getElementById('split-select-btn');
    const splitBtn = document.getElementById('split-btn');
    const splitFileTag = document.getElementById('split-file-tag');
    const splitDropZone = document.getElementById('split-drop-zone');
    const splitRangesArea = document.getElementById('split-ranges-area');
    const splitRangesInput = document.getElementById('split-ranges-input');
    const splitModes = document.querySelectorAll('input[name="split-mode"]');
    let splitPath = null;

    // Toggle ranges area on mode change
    splitModes.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isRanges = e.target.value === 'ranges';
            splitRangesArea.classList.toggle('hidden', !isRanges);
        });
    });

    function setSplitFile(file) {
        if (file && file.path) {
            splitPath = { path: file.path, name: file.name };
            splitFileTag.innerHTML = '';
            splitFileTag.appendChild(makeFileTag(splitPath.name, true));
            splitBtn.disabled = false;
        }
    }

    splitSelectBtn?.addEventListener('click', () => {
        pickFile('.pdf', setSplitFile);
    });

    if (splitDropZone) setupDropZone(splitDropZone, (files) => {
        if (files[0]) setSplitFile(files[0]);
    }, ['pdf']);

    const splitBtnOriginalHTML = splitBtn?.innerHTML;
    splitBtn?.addEventListener('click', async () => {
        if (!splitPath) return;
        const mode = document.querySelector('input[name="split-mode"]:checked').value;
        let ranges = [];
        if (mode === 'ranges') {
            const raw = splitRangesInput.value.trim();
            if (!raw) {
                showToast('Inserisci intervalli validi (es: 1-3, 5-9)', 'error');
                return;
            }
            ranges = raw.split(',').map(part => {
                const bounds = part.trim().split('-');
                const from = parseInt(bounds[0], 10);
                const to = bounds[1] ? parseInt(bounds[1], 10) : from;
                return { from: from || 1, to: to || from };
            }).filter(r => !isNaN(r.from));
        }
        setBtnLoading(splitBtn, true, splitBtnOriginalHTML);
        try {
            const result = await window.electronAPI.pdfSplit({ filePath: splitPath.path, mode, ranges });
            if (result.success) {
                showToast(`PDF diviso con successo in ${result.count} file`);
            } else if (result.reason !== 'cancelled') {
                showToast(result.reason, 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setBtnLoading(splitBtn, false, splitBtnOriginalHTML);
        }
    });

    // ── COMPRIMI PDF
    const compressSelectBtn = document.getElementById('compress-select-btn');
    const compressBtn = document.getElementById('compress-btn');
    const compressFileTag = document.getElementById('compress-file-tag');
    const compressDropZone = document.getElementById('compress-drop-zone');
    const compressResult = document.getElementById('compress-result');
    const compressResultText = document.getElementById('compress-result-text');
    let compressPath = null;

    function setCompressFile(file) {
        if (file && file.path) {
            compressPath = { path: file.path, name: file.name };
            compressFileTag.innerHTML = '';
            compressFileTag.appendChild(makeFileTag(compressPath.name));
            compressBtn.disabled = false;
            compressResult.classList.add('hidden');
        }
    }

    compressSelectBtn?.addEventListener('click', () => {
        pickFile('.pdf', setCompressFile);
    });

    if (compressDropZone) setupDropZone(compressDropZone, (files) => {
        if (files[0]) setCompressFile(files[0]);
    }, ['pdf']);

    const compressBtnOriginalHTML = compressBtn?.innerHTML;
    compressBtn?.addEventListener('click', async () => {
        if (!compressPath) return;
        setBtnLoading(compressBtn, true, compressBtnOriginalHTML);
        try {
            const result = await window.electronAPI.pdfCompress(compressPath.path);
            if (result.success) {
                showToast('PDF compresso e salvato con successo!');
                compressResultText.innerHTML = `<strong>Risultato:</strong> Dimensione ridotta da ${(result.originalSize/1024/1024).toFixed(2)} MB a ${(result.newSize/1024/1024).toFixed(2)} MB (${result.percent}% in meno!)`;
                compressResult.classList.remove('hidden');
            } else if (result.reason !== 'cancelled') {
                showToast(result.reason, 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setBtnLoading(compressBtn, false, compressBtnOriginalHTML);
        }
    });

    // ── PDF TO WORD
    const wordSelectBtn = document.getElementById('word-select-btn');
    const wordBtn = document.getElementById('word-btn');
    const wordFileTag = document.getElementById('word-file-tag');
    const wordDropZone = document.getElementById('word-drop-zone');
    let wordPath = null;

    function setWordFile(file) {
        if (file && file.path) {
            wordPath = { path: file.path, name: file.name };
            wordFileTag.innerHTML = '';
            wordFileTag.appendChild(makeFileTag(wordPath.name, true));
            wordBtn.disabled = false;
        }
    }

    wordSelectBtn?.addEventListener('click', () => {
        pickFile('.pdf', setWordFile);
    });

    if (wordDropZone) setupDropZone(wordDropZone, (files) => {
        if (files[0]) setWordFile(files[0]);
    }, ['pdf']);

    const wordBtnOriginalHTML = wordBtn?.innerHTML;
    wordBtn?.addEventListener('click', async () => {
        if (!wordPath) return;
        setBtnLoading(wordBtn, true, wordBtnOriginalHTML);
        try {
            const result = await window.electronAPI.pdfToWord(wordPath.path);
            if (result.success) {
                showToast(`Word salvato con successo! ${result.linesExtracted || 0} linee estratte.`);
            } else if (result.reason !== 'cancelled') {
                showToast(result.reason, 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setBtnLoading(wordBtn, false, wordBtnOriginalHTML);
        }
    });


    // ==========================================
    // 2. CONVERTITORE IMMAGINI
    // ==========================================

    // ── SUB-TAB switcher (Converti / Ritaglia)
    const imgTabConvert = document.getElementById('img-tab-convert');
    const imgTabCrop = document.getElementById('img-tab-crop');
    const imgPanelConvert = document.getElementById('img-panel-convert');
    const imgPanelCrop = document.getElementById('img-panel-crop');

    function switchImgTab(tab) {
        const TAB_ACTIVE = 'img-tab-active flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition';
        const TAB_INACTIVE = 'img-tab-inactive flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition';
        if (tab === 'convert') {
            imgTabConvert.className = TAB_ACTIVE;
            imgTabCrop.className = TAB_INACTIVE;
            imgPanelConvert.classList.remove('hidden');
            imgPanelCrop.classList.add('hidden');
        } else {
            imgTabConvert.className = TAB_INACTIVE;
            imgTabCrop.className = TAB_ACTIVE;
            imgPanelConvert.classList.add('hidden');
            imgPanelCrop.classList.remove('hidden');
        }
    }
    imgTabConvert?.addEventListener('click', () => switchImgTab('convert'));
    imgTabCrop?.addEventListener('click', () => switchImgTab('crop'));

    // ── Convertitore Immagini (sezione originale)
    const imageSelectBtn = document.getElementById('image-select-btn');
    const imageDropZone = document.getElementById('image-drop-zone');
    const imageFileTag = document.getElementById('image-file-tag');
    const imageFormat = document.getElementById('image-format');
    const imageWidth = document.getElementById('image-width');
    const imageHeight = document.getElementById('image-height');
    const imageKeepRatio = document.getElementById('image-keep-ratio');
    const imageQuality = document.getElementById('image-quality');
    const imageQualityVal = document.getElementById('image-quality-val');
    const imageQualityContainer = document.getElementById('image-quality-container');
    const imageConvertBtn = document.getElementById('image-convert-btn');
    
    let loadedImage = null;

    // Toggle quality container based on format
    imageFormat?.addEventListener('change', (e) => {
        const fmt = e.target.value.toLowerCase();
        const supportsQuality = ['jpg', 'jpeg', 'webp'].includes(fmt);
        imageQualityContainer.classList.toggle('hidden', !supportsQuality);
    });

    // Sync quality slider label
    imageQuality?.addEventListener('input', (e) => {
        imageQualityVal.textContent = `${e.target.value}%`;
    });

    // Auto-calculate dimensions if keeping ratio (visual suggestion)
    let originalWidth = 0;
    let originalHeight = 0;
    let imageAspectRatio = 1;

    function setImageFile(file) {
        if (file && file.path) {
            loadedImage = { path: file.path, name: file.name };
            imageFileTag.innerHTML = '';
            imageFileTag.appendChild(makeFileTag(loadedImage.name));
            imageConvertBtn.disabled = false;

            // Load original dimensions using browser Image API
            const img = new Image();
            img.onload = () => {
                originalWidth = img.naturalWidth;
                originalHeight = img.naturalHeight;
                imageAspectRatio = originalWidth / originalHeight;
                imageWidth.placeholder = `${originalWidth}px (originale)`;
                imageHeight.placeholder = `${originalHeight}px (originale)`;
                showToast(`Immagine caricata: ${originalWidth}x${originalHeight}`);
            };
            img.src = `file://${file.path}`;
        }
    }

    imageSelectBtn?.addEventListener('click', () => {
        pickFile('image/*', setImageFile);
    });

    if (imageDropZone) setupDropZone(imageDropZone, (files) => {
        if (files[0]) setImageFile(files[0]);
    }, ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff']);

    // Automatic dimension calculations keeping aspect ratio
    imageWidth?.addEventListener('input', (e) => {
        if (imageKeepRatio.checked && e.target.value && imageAspectRatio) {
            imageHeight.value = Math.round(parseInt(e.target.value, 10) / imageAspectRatio);
        }
    });

    imageHeight?.addEventListener('input', (e) => {
        if (imageKeepRatio.checked && e.target.value && imageAspectRatio) {
            imageWidth.value = Math.round(parseInt(e.target.value, 10) * imageAspectRatio);
        }
    });

    const imageConvertBtnOriginalHTML = imageConvertBtn?.innerHTML;
    imageConvertBtn?.addEventListener('click', async () => {
        if (!loadedImage) return;
        setBtnLoading(imageConvertBtn, true, imageConvertBtnOriginalHTML);
        try {
            const format = imageFormat.value;
            const width = imageWidth.value ? parseInt(imageWidth.value, 10) : null;
            const height = imageHeight.value ? parseInt(imageHeight.value, 10) : null;
            const quality = imageQuality.value;

            const result = await window.electronAPI.convertImage({
                filePath: loadedImage.path,
                format,
                width,
                height,
                quality
            });

            if (result.success) {
                showToast('Immagine convertita e salvata!');
            } else if (result.reason !== 'cancelled') {
                showToast(result.reason, 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setBtnLoading(imageConvertBtn, false, imageConvertBtnOriginalHTML);
        }
    });


    // ==========================================
    // 3. CROP IMMAGINI
    // ==========================================
    const cropSelectBtn   = document.getElementById('crop-select-btn');
    const cropDropZone    = document.getElementById('crop-drop-zone');
    const cropFileTag     = document.getElementById('crop-file-tag');
    const cropCanvasCard  = document.getElementById('crop-canvas-card');
    const cropCanvas      = document.getElementById('crop-canvas');
    const cropOverlay     = document.getElementById('crop-overlay');
    const cropCanvasWrap  = document.getElementById('crop-canvas-wrap');
    const cropSizeLabel   = document.getElementById('crop-size-label');
    const cropXInput      = document.getElementById('crop-x');
    const cropYInput      = document.getElementById('crop-y');
    const cropWInput      = document.getElementById('crop-w');
    const cropHInput      = document.getElementById('crop-h');
    const cropResetBtn    = document.getElementById('crop-reset-btn');
    const cropOverwriteBtn= document.getElementById('crop-overwrite-btn');
    const cropCopyBtn     = document.getElementById('crop-copy-btn');

    let cropLoadedImage = null;   // { path, name }
    let cropOrigW = 0, cropOrigH = 0;
    let cropScaleX = 1, cropScaleY = 1;
    let cropSelection = { x: 0, y: 0, w: 0, h: 0 }; // in original pixels
    let cropDragState = null;
    const HANDLE_SIZE = 8;
    const MAX_CANVAS_W = 720;
    const MAX_CANVAS_H = 480;

    function loadCropImageFile(file) {
        if (!file || !file.path) return;
        cropLoadedImage = { path: file.path, name: file.name };
        cropFileTag.innerHTML = '';
        cropFileTag.appendChild(makeFileTag(cropLoadedImage.name));
        cropResetBtn.disabled = false;
        cropOverwriteBtn.disabled = false;
        cropCopyBtn.disabled = false;

        const img = new Image();
        img.onload = () => {
            cropOrigW = img.naturalWidth;
            cropOrigH = img.naturalHeight;

            const scaleW = Math.min(1, MAX_CANVAS_W / cropOrigW);
            const scaleH = Math.min(1, MAX_CANVAS_H / cropOrigH);
            const scale  = Math.min(scaleW, scaleH);
            const dispW  = Math.round(cropOrigW * scale);
            const dispH  = Math.round(cropOrigH * scale);
            cropScaleX   = cropOrigW / dispW;
            cropScaleY   = cropOrigH / dispH;

            cropCanvas.width   = dispW;
            cropCanvas.height  = dispH;
            cropOverlay.width  = dispW;
            cropOverlay.height = dispH;
            cropOverlay.style.width  = dispW + 'px';
            cropOverlay.style.height = dispH + 'px';

            cropCanvas.getContext('2d').drawImage(img, 0, 0, dispW, dispH);

            cropSelection = { x: 0, y: 0, w: cropOrigW, h: cropOrigH };
            updateCropInputs();
            drawCropOverlay();
            cropCanvasCard.classList.remove('hidden');
            showToast(`Immagine caricata: ${cropOrigW}×${cropOrigH}px`);
        };
        img.onerror = () => showToast("Impossibile caricare l'immagine", 'error');
        img.src = `file://${file.path}`;
    }

    function updateCropInputs() {
        cropXInput.value = Math.round(cropSelection.x);
        cropYInput.value = Math.round(cropSelection.y);
        cropWInput.value = Math.round(cropSelection.w);
        cropHInput.value = Math.round(cropSelection.h);
        cropSizeLabel.textContent = `${Math.round(cropSelection.w)} × ${Math.round(cropSelection.h)} px`;
    }

    function selectionFromInputs() {
        let x = parseInt(cropXInput.value, 10) || 0;
        let y = parseInt(cropYInput.value, 10) || 0;
        let w = parseInt(cropWInput.value, 10) || 1;
        let h = parseInt(cropHInput.value, 10) || 1;
        x = Math.max(0, Math.min(x, cropOrigW - 1));
        y = Math.max(0, Math.min(y, cropOrigH - 1));
        w = Math.max(1, Math.min(w, cropOrigW - x));
        h = Math.max(1, Math.min(h, cropOrigH - y));
        cropSelection = { x, y, w, h };
        cropSizeLabel.textContent = `${Math.round(w)} × ${Math.round(h)} px`;
        drawCropOverlay();
    }

    function drawCropOverlay() {
        if (!cropOverlay.width) return;
        const ctx = cropOverlay.getContext('2d');
        const dW  = cropOverlay.width;
        const dH  = cropOverlay.height;
        const sx  = cropSelection.x / cropScaleX;
        const sy  = cropSelection.y / cropScaleY;
        const sw  = cropSelection.w / cropScaleX;
        const sh  = cropSelection.h / cropScaleY;

        ctx.clearRect(0, 0, dW, dH);

        // Scurisci area fuori selezione
        ctx.fillStyle = 'rgba(0,0,0,0.52)';
        ctx.fillRect(0, 0, dW, dH);
        ctx.clearRect(sx, sy, sw, sh);

        // Bordo selezione
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx + 0.75, sy + 0.75, sw - 1.5, sh - 1.5);

        // Griglia regola dei terzi
        ctx.strokeStyle = 'rgba(45,212,191,0.22)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(sx + sw * i / 3, sy); ctx.lineTo(sx + sw * i / 3, sy + sh); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, sy + sh * i / 3); ctx.lineTo(sx + sw, sy + sh * i / 3); ctx.stroke();
        }

        // Handle d'angolo e lato
        const handles = getCropHandles(sx, sy, sw, sh);
        ctx.fillStyle   = '#2dd4bf';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth   = 1;
        handles.forEach(h => {
            ctx.beginPath();
            ctx.rect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
            ctx.fill();
            ctx.stroke();
        });
    }

    function getCropHandles(sx, sy, sw, sh) {
        const cx = sx + sw / 2, cy = sy + sh / 2;
        return [
            { id: 'nw', x: sx,      y: sy },
            { id: 'n',  x: cx,      y: sy },
            { id: 'ne', x: sx + sw, y: sy },
            { id: 'e',  x: sx + sw, y: cy },
            { id: 'se', x: sx + sw, y: sy + sh },
            { id: 's',  x: cx,      y: sy + sh },
            { id: 'sw', x: sx,      y: sy + sh },
            { id: 'w',  x: sx,      y: cy },
        ];
    }

    function hitTestCropHandle(ex, ey) {
        const sx = cropSelection.x / cropScaleX;
        const sy = cropSelection.y / cropScaleY;
        const sw = cropSelection.w / cropScaleX;
        const sh = cropSelection.h / cropScaleY;
        for (const h of getCropHandles(sx, sy, sw, sh)) {
            if (Math.abs(ex - h.x) <= HANDLE_SIZE && Math.abs(ey - h.y) <= HANDLE_SIZE) return h.id;
        }
        return null;
    }

    function isInsideCropSel(ex, ey) {
        const sx = cropSelection.x / cropScaleX;
        const sy = cropSelection.y / cropScaleY;
        const sw = cropSelection.w / cropScaleX;
        const sh = cropSelection.h / cropScaleY;
        return ex >= sx && ex <= sx + sw && ey >= sy && ey <= sy + sh;
    }

    cropCanvasWrap?.addEventListener('mousedown', (e) => {
        if (!cropLoadedImage) return;
        const rect = cropCanvas.getBoundingClientRect();
        const ex = e.clientX - rect.left;
        const ey = e.clientY - rect.top;
        const hit = hitTestCropHandle(ex, ey);
        if (hit) {
            cropDragState = { type: 'handle', id: hit, startSel: { ...cropSelection }, startX: ex, startY: ey };
        } else if (isInsideCropSel(ex, ey)) {
            cropDragState = { type: 'move', startSel: { ...cropSelection }, startX: ex, startY: ey };
        } else {
            const ox = ex * cropScaleX, oy = ey * cropScaleY;
            cropDragState = { type: 'new', originX: ox, originY: oy };
            cropSelection = { x: ox, y: oy, w: 1, h: 1 };
        }
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!cropDragState || !cropLoadedImage) return;
        const rect = cropCanvas.getBoundingClientRect();
        const ex = e.clientX - rect.left;
        const ey = e.clientY - rect.top;
        const ox = ex * cropScaleX, oy = ey * cropScaleY;

        if (cropDragState.type === 'new') {
            const dox = cropDragState.originX, doy = cropDragState.originY;
            let nx = Math.max(0, Math.min(dox, ox));
            let ny = Math.max(0, Math.min(doy, oy));
            let nw = Math.max(1, Math.abs(ox - dox));
            let nh = Math.max(1, Math.abs(oy - doy));
            nw = Math.min(nw, cropOrigW - nx);
            nh = Math.min(nh, cropOrigH - ny);
            cropSelection = { x: nx, y: ny, w: nw, h: nh };
        } else if (cropDragState.type === 'move') {
            const dx = (ex - cropDragState.startX) * cropScaleX;
            const dy = (ey - cropDragState.startY) * cropScaleY;
            let nx = Math.max(0, Math.min(cropDragState.startSel.x + dx, cropOrigW - cropDragState.startSel.w));
            let ny = Math.max(0, Math.min(cropDragState.startSel.y + dy, cropOrigH - cropDragState.startSel.h));
            cropSelection = { ...cropDragState.startSel, x: nx, y: ny };
        } else if (cropDragState.type === 'handle') {
            const dx = (ex - cropDragState.startX) * cropScaleX;
            const dy = (ey - cropDragState.startY) * cropScaleY;
            let { x, y, w, h } = cropDragState.startSel;
            const id = cropDragState.id;
            if (id.includes('e')) { w = Math.max(1, w + dx); }
            if (id.includes('w')) { const nw = Math.max(1, w - dx); x += w - nw; w = nw; }
            if (id.includes('s')) { h = Math.max(1, h + dy); }
            if (id.includes('n')) { const nh = Math.max(1, h - dy); y += h - nh; h = nh; }
            x = Math.max(0, x); y = Math.max(0, y);
            w = Math.min(w, cropOrigW - x); h = Math.min(h, cropOrigH - y);
            cropSelection = { x, y, w, h };
        }
        updateCropInputs();
        drawCropOverlay();
    });

    window.addEventListener('mouseup', () => { cropDragState = null; });

    cropCanvasWrap?.addEventListener('mousemove', (e) => {
        if (!cropLoadedImage) return;
        const rect = cropCanvas.getBoundingClientRect();
        const ex = e.clientX - rect.left, ey = e.clientY - rect.top;
        const hit = hitTestCropHandle(ex, ey);
        if (hit) {
            const c = { nw:'nw-resize', ne:'ne-resize', se:'se-resize', sw:'sw-resize', n:'n-resize', e:'e-resize', s:'s-resize', w:'w-resize' };
            cropCanvasWrap.style.cursor = c[hit] || 'crosshair';
        } else if (isInsideCropSel(ex, ey)) {
            cropCanvasWrap.style.cursor = 'move';
        } else {
            cropCanvasWrap.style.cursor = 'crosshair';
        }
    });

    [cropXInput, cropYInput, cropWInput, cropHInput].forEach(inp => {
        inp?.addEventListener('change', selectionFromInputs);
    });

    cropResetBtn?.addEventListener('click', () => {
        cropSelection = { x: 0, y: 0, w: cropOrigW, h: cropOrigH };
        updateCropInputs();
        drawCropOverlay();
    });

    cropSelectBtn?.addEventListener('click', () => pickFile('image/*', loadCropImageFile));
    if (cropDropZone) setupDropZone(cropDropZone, (files) => {
        if (files[0]) loadCropImageFile(files[0]);
    }, ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff']);

    async function doCropAndSave(overwrite) {
        if (!cropLoadedImage) return;
        const { x, y, w, h } = cropSelection;
        if (w < 1 || h < 1) { showToast("Seleziona un'area valida", 'error'); return; }

        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `file://${cropLoadedImage.path}`; });

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width  = Math.round(w);
        tmpCanvas.height = Math.round(h);
        tmpCanvas.getContext('2d').drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h), 0, 0, Math.round(w), Math.round(h));

        const rawExt = cropLoadedImage.name.split('.').pop().toLowerCase();
        const mime    = (rawExt === 'jpg' || rawExt === 'jpeg') ? 'image/jpeg' : rawExt === 'webp' ? 'image/webp' : 'image/png';
        const saveExt = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
        const base64  = tmpCanvas.toDataURL(mime, 0.92);

        const btn = overwrite ? cropOverwriteBtn : cropCopyBtn;
        const origHTML = btn.innerHTML;
        setBtnLoading(btn, true, origHTML);
        try {
            const result = await window.electronAPI.cropImage({ base64, sourcePath: cropLoadedImage.path, ext: saveExt, overwrite });
            if (result.success) {
                showToast(overwrite ? 'Immagine sovrascritta!' : `Copia salvata: ${result.path.split('/').pop()}`);
            } else if (result.reason !== 'cancelled') {
                showToast(result.reason, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setBtnLoading(btn, false, origHTML);
        }
    }

    cropOverwriteBtn?.addEventListener('click', () => doCropAndSave(true));
    cropCopyBtn?.addEventListener('click', () => doCropAndSave(false));

    // ==========================================
    // 4. CONVERTITORE AUDIO
    // ==========================================
    const audioSelectBtn = document.getElementById('audio-select-btn');
    const audioDropZone = document.getElementById('audio-drop-zone');
    const audioFileTag = document.getElementById('audio-file-tag');
    const audioFormat = document.getElementById('audio-format');
    const audioBitrate = document.getElementById('audio-bitrate');
    const audioBitrateContainer = document.getElementById('audio-bitrate-container');
    const audioSamplerate = document.getElementById('audio-samplerate');
    const audioChannels = document.getElementById('audio-channels');
    const audioConvertBtn = document.getElementById('audio-convert-btn');

    let loadedAudio = null;

    // Toggle bitrate selector based on format (hide for WAV and FLAC lossless)
    audioFormat?.addEventListener('change', (e) => {
        const fmt = e.target.value.toLowerCase();
        const supportsBitrate = ['mp3', 'aac', 'ogg', 'm4a'].includes(fmt);
        audioBitrateContainer.classList.toggle('hidden', !supportsBitrate);
    });

    function setAudioFile(file) {
        if (file && file.path) {
            loadedAudio = { path: file.path, name: file.name };
            audioFileTag.innerHTML = '';
            audioFileTag.appendChild(makeFileTag(loadedAudio.name, true));
            audioConvertBtn.disabled = false;
            showToast(`File audio caricato: ${file.name}`);
        }
    }

    audioSelectBtn?.addEventListener('click', () => {
        pickFile('audio/*', setAudioFile);
    });

    if (audioDropZone) setupDropZone(audioDropZone, (files) => {
        if (files[0]) setAudioFile(files[0]);
    }, ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'wma', 'opus']);

    const audioConvertBtnOriginalHTML = audioConvertBtn?.innerHTML;
    audioConvertBtn?.addEventListener('click', async () => {
        if (!loadedAudio) return;
        setBtnLoading(audioConvertBtn, true, audioConvertBtnOriginalHTML);
        try {
            const format = audioFormat.value;
            // Only send bitrate if it's visible / applicable
            const isLossless = ['wav', 'flac'].includes(format.toLowerCase());
            const bitrate = isLossless ? null : audioBitrate.value;
            const sampleRate = audioSamplerate.value || null;
            const channels = audioChannels.value || null;

            const result = await window.electronAPI.convertAudio({
                filePath: loadedAudio.path,
                format,
                bitrate,
                sampleRate,
                channels
            });

            if (result.success) {
                showToast('Audio convertito e salvato con successo!');
            } else if (result.reason !== 'cancelled') {
                showToast(result.reason, 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setBtnLoading(audioConvertBtn, false, audioConvertBtnOriginalHTML);
        }
    });

    // ==========================================
    // 4. WEB → MARKDOWN CONVERTER
    // ==========================================
    const webUrlInput = document.getElementById('web-url-input');
    const webFetchBtn = document.getElementById('web-fetch-btn');
    const webStatus = document.getElementById('web-status');
    const webMdOutput = document.getElementById('web-md-output');
    const webCopyBtn = document.getElementById('web-copy-btn');
    const webSaveBtn = document.getElementById('web-save-btn');

    let lastMarkdown = '';
    const webFetchBtnHTML = webFetchBtn?.innerHTML;

    async function doFetch(saveImmediately = false) {
        const url = webUrlInput?.value.trim();
        if (!url) { showToast('Inserisci un URL valido', 'error'); return; }

        setBtnLoading(webFetchBtn, true, webFetchBtnHTML);
        webStatus.textContent = 'Caricamento sito in corso…';
        webMdOutput.value = '';
        webCopyBtn.disabled = true;
        webSaveBtn.disabled = true;

        try {
            const result = await window.electronAPI.urlToMarkdown({ url, saveFile: saveImmediately });
            if (result.success) {
                lastMarkdown = result.markdown;
                webMdOutput.value = lastMarkdown;
                const lines = lastMarkdown.split('\n').length;
                const words = lastMarkdown.trim().split(/\s+/).length;
                webStatus.textContent = `✓ Completato — ${lines} righe, ${words} parole${
                    result.saved ? ` — Salvato in: ${result.path}` : ''}`;
                webCopyBtn.disabled = false;
                webSaveBtn.disabled = false;
                showToast(result.saved ? 'Markdown salvato!' : 'Conversione completata!');
            } else {
                webStatus.textContent = `⚠ Errore: ${result.reason}`;
                showToast(result.reason, 'error');
            }
        } catch (e) {
            webStatus.textContent = `⚠ Errore: ${e.message}`;
            showToast(e.message, 'error');
        } finally {
            setBtnLoading(webFetchBtn, false, webFetchBtnHTML);
        }
    }

    webFetchBtn?.addEventListener('click', () => doFetch(false));

    // Convert on Enter key in input
    webUrlInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doFetch(false);
    });

    webCopyBtn?.addEventListener('click', async () => {
        if (!lastMarkdown) return;
        try {
            await navigator.clipboard.writeText(lastMarkdown);
            const orig = webCopyBtn.innerHTML;
            webCopyBtn.innerHTML = '<span class="material-symbols-outlined text-[15px]">check</span> Copiato!';
            setTimeout(() => { webCopyBtn.innerHTML = orig; }, 2000);
        } catch (e) {
            showToast('Impossibile copiare negli appunti', 'error');
        }
    });

    webSaveBtn?.addEventListener('click', () => doFetch(true));

    // Imposta il primo workspace attivo (PDF)
    switchPanel('pdf');
}
