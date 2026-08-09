let history = [];

function showAlert(message, type = 'success') {
    window.showToolAlert(message, type === 'error' ? 'error' : 'success');
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
        const bytes = new TextEncoder().encode(text);
        const base64 = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
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
        const bytes = Uint8Array.from(atob(unshuffled), char => char.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);

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
