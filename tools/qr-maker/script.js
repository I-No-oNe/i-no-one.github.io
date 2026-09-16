function generateQR() {
    const textInput = document.getElementById('text');
    const text = textInput.value.trim();
    const qrCodeContainer = document.getElementById('qrcode');
    const spinner = document.getElementById('spinner');
    const downloadBtn = document.getElementById('downloadBtn');
    const emptyState = document.getElementById('qr-empty');
    
    if (!text) {
        window.showToolAlert('Enter text or a URL before generating a QR code.');
        textInput.focus();
        return;
    }

    const status = document.getElementById('qr-status');
    if (typeof QRCode === 'undefined') {
        window.showToolAlert('QR generator could not load. Check your connection and reload this page.');
        return;
    }
    document.getElementById('tool-alert-close').click();
    qrCodeContainer.replaceChildren();
    qrCodeContainer.hidden = true;
    emptyState.hidden = true;
    spinner.style.display = 'block';
    downloadBtn.hidden = true;
    status.textContent = '';

    requestAnimationFrame(() => {
        try {
            new QRCode(qrCodeContainer, { text, width: 200, height: 200 });
            qrCodeContainer.hidden = false;
            downloadBtn.hidden = false;
            status.textContent = 'QR code ready. Download it below.';
            downloadBtn.focus({ preventScroll: true });
            document.getElementById('qr-preview').scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        } catch {
            qrCodeContainer.replaceChildren();
            emptyState.hidden = false;
            status.textContent = 'Could not generate this code. Try a shorter link or message.';
            textInput.focus();
        } finally {
            spinner.style.display = 'none';
        }
    });
}

function downloadQR() {
    const qrCanvas = document.querySelector('#qrcode canvas');
    if (qrCanvas) {
        const link = document.createElement('a');
        link.href = qrCanvas.toDataURL("image/png");
        link.download = 'qrcode.png';
        link.click();
    }
}

document.getElementById('text').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') generateQR();
});

// An edited input must not leave a download for the previous value available.
document.getElementById('text').addEventListener('input', () => {
    document.getElementById('qrcode').hidden = true;
    document.getElementById('downloadBtn').hidden = true;
    document.getElementById('qr-empty').hidden = false;
    document.getElementById('qr-status').textContent = '';
});
