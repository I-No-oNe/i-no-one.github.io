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

    qrCodeContainer.innerHTML = '';
    emptyState.hidden = true;
    spinner.style.display = 'block';
    downloadBtn.hidden = true;

    requestAnimationFrame(() => {
        new QRCode(qrCodeContainer, {
            text: text,
            width: 200,
            height: 200
        });
        spinner.style.display = 'none';
        downloadBtn.hidden = false;
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
