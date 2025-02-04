function generateQR() {
    const text = document.getElementById('text').value;
    const qrCodeContainer = document.getElementById('qrcode');
    const spinner = document.getElementById('spinner');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (!text) {
        alert('Please enter text or URL');
        return;
    }

    qrCodeContainer.innerHTML = '';
    spinner.style.display = 'block';
    downloadBtn.style.display = 'none';

    setTimeout(() => {
        const qrCode = new QRCode(qrCodeContainer, {
            text: text,
            width: 200,
            height: 200
        });
        spinner.style.display = 'none';
        downloadBtn.style.display = 'inline-block';
    }, 1500);
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

function setFavicon(url) {
    let favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = url;
    document.head.appendChild(favicon);
}

setFavicon('https://avatars.githubusercontent.com/u/145749961?v=4&size=64')