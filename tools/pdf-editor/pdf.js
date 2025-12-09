document.addEventListener('DOMContentLoaded', () => {

    const {jsPDF} = window.jspdf;
    const {PDFDocument} = window.PDFLib;

    // State
    let convertFiles = [];
    let mergeFiles = [];
    let splitFile = null;
    let lastPdfBlob = null;
    let lastPdfName = 'document.pdf';

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs and contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Activate clicked tab and its content
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');
        });
    });

    // Alert system
    function showAlert(message, type = 'info') {
        const alert = document.getElementById('alert');
        if (!alert) return; // Safety check
        alert.textContent = message;
        alert.className = `alert ${type} show`;
        setTimeout(() => alert.classList.remove('show'), 5000);
    }

    // Processing indicator
    function setProcessing(tab, isProcessing) {
        const elem = document.getElementById(`processing${tab}`);
        if (elem) elem.classList.toggle('show', isProcessing);
    }

    // File helpers
    function formatSize(bytes) {
        if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
    }

    function getFileIcon(file) {
        if (file.type.startsWith('image/')) return '🖼️';
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) return '📝';
        if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) return '📄';
        return '📄';
    }

    async function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function fileToText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async function fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Simple RTL detection for scripts like Hebrew/Arabic
    function isRTL(text) {
        return /[\u0590-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
    }

    function downloadBlob(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    function previewPdf(blob, name) {
        lastPdfBlob = blob;
        lastPdfName = name;
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'width:100%;height:600px;border:none;border-radius:8px;background:#fff';
        const previewFrame = document.getElementById('previewFrame');
        if (previewFrame) {
            previewFrame.innerHTML = '';
            previewFrame.appendChild(iframe);
        }

        const previewInfo = document.getElementById('previewInfo');
        if (previewInfo) previewInfo.textContent = `${name} • ${formatSize(blob.size)}`;

        const btnDownload = document.getElementById('btnDownload');
        if (btnDownload) btnDownload.style.display = 'block';

        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    // Convert Tab
    const dropConvert = document.getElementById('dropzoneConvert');
    const inputConvert = document.getElementById('fileInputConvert');
    const listConvert = document.getElementById('fileListConvert');

    // Attach drag/drop and click listeners if elements exist
    if (dropConvert) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
            dropConvert.addEventListener(e, evt => evt.preventDefault());
        });

        dropConvert.addEventListener('dragover', () => dropConvert.classList.add('dragover'));
        dropConvert.addEventListener('dragleave', () => dropConvert.classList.remove('dragover'));
        dropConvert.addEventListener('drop', e => {
            dropConvert.classList.remove('dragover');
            handleConvertFiles(e.dataTransfer.files);
        });
    }

    const browseConvert = document.getElementById('browseConvert');
    if (browseConvert) {
        browseConvert.addEventListener('click', e => {
            e.preventDefault();
            if (inputConvert) inputConvert.click();
        });
    }

    if (inputConvert) inputConvert.addEventListener('change', e => handleConvertFiles(e.target.files));

    function handleConvertFiles(files) {
        const validFiles = Array.from(files).filter(f =>
            f.type.startsWith('image/') ||
            f.type === 'text/plain' ||
            f.name.endsWith('.txt') ||
            f.name.endsWith('.docx') ||
            f.name.endsWith('.doc')
        );
        if (validFiles.length < files.length) {
            showAlert(`${files.length - validFiles.length} file(s) skipped. Only images, TXT, and DOCX accepted.`, 'warning');
        }
        convertFiles.push(...validFiles);
        renderConvertList();
        if (validFiles.length > 0) showAlert(`${validFiles.length} file(s) added`, 'success');
    }

    function renderConvertList() {
        const count = convertFiles.length;
        const totalSize = convertFiles.reduce((sum, f) => sum + f.size, 0);

        const convertCount = document.getElementById('convertCount');
        const convertSize = document.getElementById('convertSize');
        const convertStats = document.getElementById('convertStats');
        const btnConvert = document.getElementById('btnConvert');
        const btnClearConvert = document.getElementById('btnClearConvert');

        if(convertCount) convertCount.textContent = count;
        if(convertSize) convertSize.textContent = formatSize(totalSize);
        if(convertStats) convertStats.style.display = count > 0 ? 'grid' : 'none';
        if(btnConvert) btnConvert.disabled = count === 0;
        if(btnClearConvert) btnClearConvert.disabled = count === 0;

        if (count === 0) {
            if(listConvert) listConvert.innerHTML = '';
            return;
        }

        if(listConvert) listConvert.innerHTML = convertFiles.map((f, i) => `
            <div class="file-item">
              <div class="file-info">
                <div class="file-icon">${getFileIcon(f)}</div>
                <div class="file-details">
                  <div class="file-name">${escapeHtml(f.name)}</div>
                  <div class="file-meta">
                    <span class="file-badge">${f.type.split('/')[1] || f.name.split('.').pop()}</span>
                    <span>${formatSize(f.size)}</span>
                  </div>
                </div>
              </div>
              <div class="file-actions">
                <button class="secondary" onclick="removeConvertFile(${i})" style="padding:8px 12px;font-size:12px">Remove</button>
              </div>
            </div>
          `).join('');
    }

    window.removeConvertFile = (index) => {
        convertFiles.splice(index, 1);
        renderConvertList();
        showAlert('File removed', 'info');
    };

    const btnClearConvert = document.getElementById('btnClearConvert');
    if(btnClearConvert) {
        btnClearConvert.addEventListener('click', () => {
            convertFiles = [];
            renderConvertList();
            showAlert('All files cleared', 'info');
        });
    }

    const btnConvert = document.getElementById('btnConvert');
    if(btnConvert) {
        btnConvert.addEventListener('click', async () => {
            if (convertFiles.length === 0) return;

            try {
                setProcessing('Convert', true);
                const pageSize = document.getElementById('pageSizeConvert').value;
                const orientation = document.getElementById('orientationConvert').value;
                const quality = document.getElementById('qualityConvert').value;

                let combinedHtmlContent = '';

                for (let i = 0; i < convertFiles.length; i++) {
                    const file = convertFiles[i];
                    const pageBreak = i === 0 ? '' : 'page-break-before: always;';
                    const baseStyle = `${pageBreak} font-family: sans-serif; font-size: 11pt; color: #000000; padding: 15mm; min-height: 1px;`;

                    if (file.type.startsWith('image/')) {
                        const dataUrl = await fileToDataUrl(file);
                        combinedHtmlContent += `<div style="${pageBreak} text-align: center;">
                                <img src="${dataUrl}" style="max-width: 90%; max-height: 90vh; display: inline-block; margin: 5mm;">
                            </div>`;

                    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                        const text = await fileToText(file);
                        const rtl = isRTL(text);
                        const directionStyle = rtl ? 'direction: rtl; text-align: right;' : 'direction: ltr; text-align: left;';

                        combinedHtmlContent += `<div style="${baseStyle} ${directionStyle} white-space: pre-wrap; word-break: break-word;">${escapeHtml(text)}</div>`;

                    } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                        const arrayBuffer = await fileToArrayBuffer(file);
                        const result = await mammoth.extractRawText({arrayBuffer: arrayBuffer});
                        const text = result.value;

                        if (!text.trim()) {
                            showAlert(`Warning: ${file.name} appears to be empty or couldn't be read`, 'warning');
                            continue;
                        }

                        const rtl = isRTL(text);
                        const directionStyle = rtl ? 'direction: rtl; text-align: right;' : 'direction: ltr; text-align: left;';

                        combinedHtmlContent += `<div style="${baseStyle} ${directionStyle} white-space: pre-wrap; word-break: break-word;">${escapeHtml(text)}</div>`;
                    }
                }

                if (!combinedHtmlContent.trim()) {
                    showAlert('No content could be processed from the selected files.', 'warning');
                    return;
                }

                const opt = {
                    margin: 0,
                    filename: 'converted-to-pdf.pdf',
                    image: {type: 'jpeg', quality: quality === 'high' ? 1.0 : quality === 'medium' ? 0.98 : 0.8},
                    html2canvas: {scale: 2, useCORS: true},
                    jsPDF: {unit: 'mm', format: pageSize, orientation: orientation}
                };

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = combinedHtmlContent;
                document.body.appendChild(tempDiv);

                const blob = await html2pdf().set(opt).from(tempDiv).output('blob');

                document.body.removeChild(tempDiv);

                previewPdf(blob, 'converted-to-pdf.pdf');
                showAlert(`✓ Converted ${convertFiles.length} file(s) to PDF`, 'success');

            } catch (err) {
                console.error(err);
                showAlert('Error: ' + err.message, 'error');
            } finally {
                setProcessing('Convert', false);
            }
        });
    }

    // Merge Tab
    const dropMerge = document.getElementById('dropzoneMerge');
    const inputMerge = document.getElementById('fileInputMerge');
    const listMerge = document.getElementById('fileListMerge');

    if (dropMerge) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
            dropMerge.addEventListener(e, evt => evt.preventDefault());
        });

        dropMerge.addEventListener('dragover', () => dropMerge.classList.add('dragover'));
        dropMerge.addEventListener('dragleave', () => dropMerge.classList.remove('dragover'));
        dropMerge.addEventListener('drop', e => {
            dropMerge.classList.remove('dragover');
            handleMergeFiles(e.dataTransfer.files);
        });
    }

    const browseMerge = document.getElementById('browseMerge');
    if (browseMerge) {
        browseMerge.addEventListener('click', e => {
            e.preventDefault();
            if (inputMerge) inputMerge.click();
        });
    }

    if (inputMerge) inputMerge.addEventListener('change', e => handleMergeFiles(e.target.files));

    async function handleMergeFiles(files) {
        const validFiles = Array.from(files).filter(f =>
            f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
        );

        if (validFiles.length < files.length) {
            showAlert(`${files.length - validFiles.length} file(s) skipped. Only PDFs accepted.`, 'warning');
        }

        for (const file of validFiles) {
            try {
                const buffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(buffer);
                mergeFiles.push({
                    file: file,
                    pageCount: pdfDoc.getPageCount(),
                    buffer: buffer
                });
            } catch (error) {
                console.error("Error loading PDF for merge:", file.name, error);
                showAlert(`Could not read PDF file: ${file.name}. It might be corrupted or encrypted.`, 'error');
            }
        }

        renderMergeList();
        if (validFiles.length > 0) showAlert(`${validFiles.length} PDF(s) added`, 'success');
    }

    function renderMergeList() {
        const count = mergeFiles.length;
        const totalPages = mergeFiles.reduce((sum, f) => sum + f.pageCount, 0);
        const totalSize = mergeFiles.reduce((sum, f) => sum + f.file.size, 0);

        const mergeCount = document.getElementById('mergeCount');
        const mergePages = document.getElementById('mergePages');
        const mergeSize = document.getElementById('mergeSize');
        const mergeStats = document.getElementById('mergeStats');
        const btnMerge = document.getElementById('btnMerge');
        const btnClearMerge = document.getElementById('btnClearMerge');

        if(mergeCount) mergeCount.textContent = count;
        if(mergePages) mergePages.textContent = totalPages;
        if(mergeSize) mergeSize.textContent = formatSize(totalSize);
        if(mergeStats) mergeStats.style.display = count > 0 ? 'grid' : 'none';
        if(btnMerge) btnMerge.disabled = count < 2;
        if(btnClearMerge) btnClearMerge.disabled = count === 0;

        if (count === 0) {
            if(listMerge) listMerge.innerHTML = '';
            return;
        }

        if(listMerge) listMerge.innerHTML = mergeFiles.map((item, i) => `
            <div class="file-item" draggable="true" data-index="${i}">
              <div class="file-info">
                <div class="file-icon">📄</div>
                <div class="file-details">
                  <div class="file-name">${escapeHtml(item.file.name)}</div>
                  <div class="file-meta">
                    <span class="file-badge">${item.pageCount} pages</span>
                    <span>${formatSize(item.file.size)}</span>
                  </div>
                </div>
              </div>
              <div class="file-actions">
                <button class="secondary" onclick="removeMergeFile(${i})" style="padding:8px 12px;font-size:12px">Remove</button>
              </div>
            </div>
          `).join('');

        // Drag and drop reordering
        const items = listMerge ? listMerge.querySelectorAll('.file-item') : [];
        items.forEach(item => {
            item.addEventListener('dragstart', e => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.index);
                item.style.opacity = '0.5';
            });
            item.addEventListener('dragend', e => {
                item.style.opacity = '1';
            });
            item.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            item.addEventListener('drop', e => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = parseInt(item.dataset.index);
                if (fromIndex !== toIndex) {
                    const [movedItem] = mergeFiles.splice(fromIndex, 1);
                    mergeFiles.splice(toIndex, 0, movedItem);
                    renderMergeList();
                    showAlert('Files reordered', 'info');
                }
            });
        });
    }

    window.removeMergeFile = (index) => {
        mergeFiles.splice(index, 1);
        renderMergeList();
        showAlert('File removed', 'info');
    };

    const btnClearMerge = document.getElementById('btnClearMerge');
    if(btnClearMerge) {
        btnClearMerge.addEventListener('click', () => {
            mergeFiles = [];
            renderMergeList();
            showAlert('All files cleared', 'info');
        });
    }

    const btnMerge = document.getElementById('btnMerge');
    if(btnMerge) {
        btnMerge.addEventListener('click', async () => {
            if (mergeFiles.length < 2) {
                showAlert('Please add at least 2 PDFs to merge', 'error');
                return;
            }

            try {
                setProcessing('Merge', true);
                const merged = await PDFDocument.create();

                for (const item of mergeFiles) {
                    const donor = await PDFDocument.load(item.buffer);
                    const pages = await merged.copyPages(donor, donor.getPageIndices());
                    pages.forEach(p => merged.addPage(p));
                }

                const mergedBytes = await merged.save();
                const blob = new Blob([mergedBytes], {type: 'application/pdf'});
                previewPdf(blob, 'merged.pdf');
                showAlert(`✓ Merged ${mergeFiles.length} PDFs (${merged.getPageCount()} total pages)`, 'success');
            } catch (err) {
                console.error(err);
                showAlert('Error: ' + err.message, 'error');
            } finally {
                setProcessing('Merge', false);
            }
        });
    }


    // HTML Tab
    const btnHtmlPdf = document.getElementById('btnHtmlPdf');
    if(btnHtmlPdf) {
        btnHtmlPdf.addEventListener('click', async () => {
            const htmlInput = document.getElementById('htmlInput');
            const html = htmlInput ? htmlInput.value.trim() : '';

            if (!html) {
                showAlert('Please enter some HTML content', 'error');
                return;
            }

            try {
                setProcessing('Html', true);
                const wrapper = document.createElement('div');
                wrapper.innerHTML = html;

                const pageSize = document.getElementById('pageSizeHtml').value;
                const orientation = document.getElementById('orientationHtml').value;
                const margin = parseInt(document.getElementById('marginHtml').value);

                const opt = {
                    margin: margin,
                    filename: 'html-export.pdf',
                    image: {type: 'jpeg', quality: 0.98},
                    html2canvas: {scale: 2, useCORS: true},
                    jsPDF: {unit: 'mm', format: pageSize, orientation: orientation}
                };

                const pdfBlob = await html2pdf().set(opt).from(wrapper).output('blob');
                previewPdf(pdfBlob, 'html-export.pdf');
                showAlert('✓ HTML converted to PDF', 'success');
            } catch (err) {
                console.error(err);
                showAlert('Error: ' + err.message, 'error');
            } finally {
                setProcessing('Html', false);
            }
        });
    }

    const btnClearHtml = document.getElementById('btnClearHtml');
    if(btnClearHtml) {
        btnClearHtml.addEventListener('click', () => {
            const htmlInput = document.getElementById('htmlInput');
            if (htmlInput) htmlInput.value = '';
            showAlert('Content cleared', 'info');
        });
    }


    // Split Tab
    const dropSplit = document.getElementById('dropzoneSplit');
    const inputSplit = document.getElementById('fileInputSplit');

    if (dropSplit) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
            dropSplit.addEventListener(e, evt => evt.preventDefault());
        });

        dropSplit.addEventListener('dragover', () => dropSplit.classList.add('dragover'));
        dropSplit.addEventListener('dragleave', () => dropSplit.classList.remove('dragover'));
        dropSplit.addEventListener('drop', e => {
            dropSplit.classList.remove('dragover');
            handleSplitFile(e.dataTransfer.files[0]);
        });
    }

    const browseSplit = document.getElementById('browseSplit');
    if (browseSplit) {
        browseSplit.addEventListener('click', e => {
            e.preventDefault();
            if (inputSplit) inputSplit.click();
        });
    }

    if(inputSplit) inputSplit.addEventListener('change', e => handleSplitFile(e.target.files[0]));


    async function handleSplitFile(file) {
        if (!file || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
            showAlert('Please select a PDF file', 'error');
            return;
        }

        try {
            const buffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(buffer);
            splitFile = {
                file: file,
                pageCount: pdfDoc.getPageCount(),
                buffer: buffer
            };

            const splitControls = document.getElementById('splitControls');
            const btnSplit = document.getElementById('btnSplit');

            if (splitControls) splitControls.style.display = 'block';
            if (btnSplit) btnSplit.disabled = false;
            showAlert(`PDF loaded: ${splitFile.pageCount} pages`, 'success');
        } catch (err) {
            console.error(err);
            showAlert('Error loading PDF: ' + err.message, 'error');
        }
    }

    const splitMethod = document.getElementById('splitMethod');
    if(splitMethod) {
        splitMethod.addEventListener('change', e => {
            const rangeInput = document.getElementById('rangeInput');
            const pagesInput = document.getElementById('pagesInput');
            const everyInput = document.getElementById('everyInput');

            if (rangeInput) rangeInput.style.display = e.target.value === 'range' ? 'block' : 'none';
            if (pagesInput) pagesInput.style.display = e.target.value === 'pages' ? 'block' : 'none';
            if (everyInput) everyInput.style.display = e.target.value === 'every' ? 'block' : 'none';
        });
    }

    const btnSplit = document.getElementById('btnSplit');
    if(btnSplit) {
        btnSplit.addEventListener('click', async () => {
            if (!splitFile) return;

            try {
                setProcessing('Split', true);
                const method = document.getElementById('splitMethod').value;
                const sourcePdf = await PDFDocument.load(splitFile.buffer);

                if (method === 'range') {
                    const range = document.getElementById('pageRange').value;
                    const match = range.match(/(\d+)-(\d+)/);
                    if (!match) {
                        showAlert('Invalid range format. Use format like: 1-5', 'error');
                        return;
                    }

                    const start = parseInt(match[1]) - 1;
                    const end = parseInt(match[2]) - 1;

                    if (start < 0 || end >= splitFile.pageCount || start > end) {
                        showAlert(`Invalid range. PDF has ${splitFile.pageCount} pages.`, 'error');
                        return;
                    }

                    const newPdf = await PDFDocument.create();
                    const pages = await newPdf.copyPages(sourcePdf, Array.from({length: end - start + 1}, (_, i) => start + i));
                    pages.forEach(p => newPdf.addPage(p));

                    const pdfBytes = await newPdf.save();
                    const blob = new Blob([pdfBytes], {type: 'application/pdf'});
                    previewPdf(blob, `split-pages-${start + 1}-${end + 1}.pdf`);
                    showAlert(`✓ Extracted pages ${start + 1} to ${end + 1}`, 'success');

                } else if (method === 'pages') {
                    const pagesStr = document.getElementById('specificPages').value;
                    const pageNumbers = pagesStr.split(',').map(p => parseInt(p.trim()) - 1).filter(p => p >= 0 && p < splitFile.pageCount);

                    if (pageNumbers.length === 0) {
                        showAlert('No valid page numbers specified', 'error');
                        return;
                    }

                    const newPdf = await PDFDocument.create();
                    const pages = await newPdf.copyPages(sourcePdf, pageNumbers);
                    pages.forEach(p => newPdf.addPage(p));

                    const pdfBytes = await newPdf.save();
                    const blob = new Blob([pdfBytes], {type: 'application/pdf'});
                    previewPdf(blob, 'split-pages.pdf');
                    showAlert(`✓ Extracted ${pageNumbers.length} page(s)`, 'success');

                } else if (method === 'every') {
                    const everyPagesElement = document.getElementById('everyPages');
                    const everyN = everyPagesElement ? parseInt(everyPagesElement.value) : 0;

                    if (everyN < 1) {
                        showAlert('Please enter a valid number', 'error');
                        return;
                    }

                    const chunks = [];
                    for (let i = 0; i < splitFile.pageCount; i += everyN) {
                        const end = Math.min(i + everyN, splitFile.pageCount);
                        chunks.push({start: i, end: end});
                    }

                    // For demo, just create first chunk
                    const newPdf = await PDFDocument.create();
                    const pages = await newPdf.copyPages(sourcePdf, Array.from({length: chunks[0].end - chunks[0].start}, (_, i) => chunks[0].start + i));
                    pages.forEach(p => newPdf.addPage(p));

                    const pdfBytes = await newPdf.save();
                    const blob = new Blob([pdfBytes], {type: 'application/pdf'});
                    previewPdf(blob, 'split-chunk-1.pdf');
                    showAlert(`✓ Created ${chunks.length} chunk(s) (showing first)`, 'success');
                }
            } catch (err) {
                console.error(err);
                showAlert('Error: ' + err.message, 'error');
            } finally {
                setProcessing('Split', false);
            }
        });
    }

    document.getElementById('btnDownload').addEventListener('click', () => {
        if (lastPdfBlob) {
            downloadBlob(lastPdfBlob, lastPdfName);
            showAlert('PDF downloaded', 'success');
        }
    });

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    renderConvertList();
    renderMergeList();
});