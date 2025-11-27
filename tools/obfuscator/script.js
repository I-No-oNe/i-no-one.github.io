let history = [];

// Clear all UI fields + history
function resetAll() {
    document.getElementById('inputText').value = '';
    document.getElementById('key').value = '';
    document.getElementById('outputText').value = '';
    history = [];
}

// Reset on first load
window.addEventListener('load', () => {
    resetAll();
    sessionStorage.setItem('pageLoaded', 'true');
});

// Reset when coming back via navigation cache
window.addEventListener('pageshow', () => {
    resetAll();
});

// Reset on tab close / reload
window.addEventListener('beforeunload', () => {
    resetAll();
});

// Reset if user switches tab away and comes back (first time only)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !sessionStorage.getItem('pageLoaded')) {
        resetAll();
    }
});

// ------------------------------------------------------
// FAVICON
// ------------------------------------------------------
function setFavicon(url) {
    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    favicon.href = url;
}
setFavicon('https://avatars.githubusercontent.com/u/145749961?v=4&size=64');

// ------------------------------------------------------
// ALERT SYSTEM
// ------------------------------------------------------
function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'slideInRight 0.4s ease-out reverse';
        setTimeout(() => alert.remove(), 400);
    }, 2500);
}

// ------------------------------------------------------
// HISTORY
// ------------------------------------------------------
function addToHistory(operation, inputText, key, outputText) {
    history.push({
        timestamp: new Date().toLocaleString(),
        operation,
        inputText,
        key,
        outputText
    });
}

// ------------------------------------------------------
// OBFUSCATION (UNTOUCHED!)
// ------------------------------------------------------
function generateDeterministicIndices(length, key) {
    const seed = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length }, (_, i) => (i + seed) % length);
}

function shuffleStringDeterministic(str, key) {
    const arr = str.split('');
    const indices = generateDeterministicIndices(arr.length, key);
    const shuffled = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) shuffled[indices[i]] = arr[i];
    return shuffled.join('');
}

function unshuffleStringDeterministic(str, key) {
    const arr = str.split('');
    const indices = generateDeterministicIndices(arr.length, key);
    const unshuffled = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) unshuffled[i] = arr[indices[i]];
    return unshuffled.join('');
}

// ------------------------------------------------------
// ENCODE
// ------------------------------------------------------
function encode() {
    const text = inputText.value.trim();
    const key = keyInput.value.trim();

    if (!text || !key) {
        showAlert('Please enter both text and key', 'error');
        return;
    }

    try {
        const base64 = btoa(unescape(encodeURIComponent(text)));
        const shuffled = shuffleStringDeterministic(base64, key);
        const output = [...shuffled].reverse().join('');

        outputText.value = output;
        addToHistory('ENCODE', text, key, output);
        showAlert('Text encoded successfully!');
    } catch (e) {
        showAlert('Encoding error: ' + e.message, 'error');
    }
}

// ------------------------------------------------------
// DECODE
// ------------------------------------------------------
function decode() {
    const text = inputText.value.trim();
    const key = keyInput.value.trim();

    if (!text || !key) {
        showAlert('Please enter both encoded text and key', 'error');
        return;
    }

    try {
        const reversed = [...text].reverse().join('');
        const unshuffled = unshuffleStringDeterministic(reversed, key);
        const decoded = decodeURIComponent(escape(atob(unshuffled)));

        outputText.value = decoded;
        addToHistory('DECODE', text, key, decoded);
        showAlert('Text decoded successfully!');
    } catch (e) {
        showAlert('Decoding failed. Wrong key or corrupted data.', 'error');
    }
}

// ------------------------------------------------------
// COPY OUTPUT
// ------------------------------------------------------
function copyOutput() {
    if (!outputText.value) return showAlert('Nothing to copy!', 'error');

    navigator.clipboard.writeText(outputText.value).then(() => {
        showAlert('Copied to clipboard!');
    });
}

// ------------------------------------------------------
// DOWNLOAD HISTORY
// ------------------------------------------------------
function downloadHistory() {
    if (history.length === 0) {
        showAlert('No history to download!', 'error');
        return;
    }

    let content =
        '='.repeat(60) + '\n' +
        'OBFUSCATOR HISTORY LOG\n' +
        'Generated: ' + new Date().toLocaleString() + '\n' +
        '='.repeat(60) + '\n\n';

    history.forEach((h, i) => {
        content += `[${i + 1}] ${h.operation} - ${h.timestamp}\n`;
        content += '-'.repeat(60) + '\n';
        content += `Key: ${h.key}\n`;
        content += `Input: ${h.inputText.slice(0, 100)}${h.inputText.length > 100 ? '...' : ''}\n`;
        content += `Output: ${h.outputText.slice(0, 100)}${h.outputText.length > 100 ? '...' : ''}\n\n`;
    });

    content += '='.repeat(60) + '\n';
    content += '⚠️ WARNING: Sensitive information. Keep secure.\n';
    content += '='.repeat(60);

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = `obfuscator-history-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);

    showAlert('History downloaded!');
}

// Cache DOM elements
const inputText = document.getElementById('inputText');
const keyInput = document.getElementById('key');
const outputText = document.getElementById('outputText');
