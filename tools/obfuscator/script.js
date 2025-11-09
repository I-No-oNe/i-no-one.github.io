let history = [];

document.getElementById('inputText').value = '';
document.getElementById('key').value = '';
document.getElementById('outputText').value = '';

window.addEventListener('load', () => {
    document.getElementById('inputText').value = '';
    document.getElementById('key').value = '';
    document.getElementById('outputText').value = '';
    history = [];
    
    sessionStorage.setItem('pageLoaded', 'true');
});

window.addEventListener('pageshow', (event) => {
    document.getElementById('inputText').value = '';
    document.getElementById('key').value = '';
    document.getElementById('outputText').value = '';
    history = [];
});

window.addEventListener('beforeunload', () => {
    document.getElementById('inputText').value = '';
    document.getElementById('key').value = '';
    document.getElementById('outputText').value = '';
    history = [];
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        if (!sessionStorage.getItem('pageLoaded')) {
            document.getElementById('inputText').value = '';
            document.getElementById('key').value = '';
            document.getElementById('outputText').value = '';
            history = [];
        }
    }
});

function setFavicon(url) {
    let favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = url;
    document.head.appendChild(favicon);
}
setFavicon('https://avatars.githubusercontent.com/u/145749961?v=4&size=64');

function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'slideInRight 0.4s ease-out reverse';
        setTimeout(() => alert.remove(), 400);
    }, 3000);
}

function addToHistory(operation, inputText, key, outputText) {
    const timestamp = new Date().toLocaleString();
    history.push({
        timestamp,
        operation,
        inputText,
        key,
        outputText
    });
}

function generateDeterministicIndices(length, key) {
    const seed = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let indices = new Array(length).fill(0).map((_, i) => (i + seed) % length);
    return indices;
}

function shuffleStringDeterministic(str, key) {
    const arr = str.split('');
    const indices = generateDeterministicIndices(arr.length, key);
    let shuffled = [...arr];
    for (let i = 0; i < arr.length; i++) {
        shuffled[indices[i]] = arr[i];
    }
    return shuffled.join('');
}

function unshuffleStringDeterministic(str, key) {
    const arr = str.split('');
    const indices = generateDeterministicIndices(arr.length, key);
    let unshuffled = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        unshuffled[i] = arr[indices[i]];
    }
    return unshuffled.join('');
}

function encode() {
    const text = document.getElementById('inputText').value;
    const key = document.getElementById('key').value;
    
    if (!text || !key) {
        showAlert('Please enter both text and key', 'error');
        return;
    }

    try {
        let encoder = new TextEncoder();
        let base64Encoded = btoa(String.fromCharCode(...encoder.encode(text)));
        let shuffled = shuffleStringDeterministic(base64Encoded, key);
        const output = shuffled.split('').reverse().join('');
        document.getElementById('outputText').value = output;
        
        // Add to history
        addToHistory('ENCODE', text, key, output);
        
        showAlert('Text encoded successfully!', 'success');
    } catch (error) {
        showAlert('Encoding failed: ' + error.message, 'error');
    }
}

function decode() {
    const text = document.getElementById('inputText').value;
    const key = document.getElementById('key').value;
    
    if (!text || !key) {
        showAlert('Please enter both encoded text and key', 'error');
        return;
    }

    try {
        let reversed = text.split('').reverse().join('');
        let unshuffled = unshuffleStringDeterministic(reversed, key);
        let decodedBytes = new Uint8Array([...atob(unshuffled)].map(char => char.charCodeAt(0)));
        let decoder = new TextDecoder();
        const decoded = decoder.decode(decodedBytes);
        document.getElementById('outputText').value = decoded;
        
        // Add to history
        addToHistory('DECODE', text, key, decoded);
        
        showAlert('Text decoded successfully!', 'success');
    } catch (error) {
        showAlert('Decoding failed. Wrong key or corrupted data.', 'error');
        console.error('Decode Error:', error);
    }
}

function copyOutput() {
    const output = document.getElementById('outputText');
    if (!output.value) {
        showAlert('Nothing to copy!', 'error');
        return;
    }
    
    output.select();
    document.execCommand('copy');
    showAlert('Copied to clipboard!', 'success');
}

function downloadHistory() {
    if (history.length === 0) {
        showAlert('No history to download!', 'error');
        return;
    }

    // Create formatted text content
    let content = '='.repeat(60) + '\n';
    content += 'OBFUSCATOR HISTORY LOG\n';
    content += 'Generated: ' + new Date().toLocaleString() + '\n';
    content += '='.repeat(60) + '\n\n';

    history.forEach((entry, index) => {
        content += `[${index + 1}] ${entry.operation} - ${entry.timestamp}\n`;
        content += '-'.repeat(60) + '\n';
        content += `Key: ${entry.key}\n`;
        content += `Input: ${entry.inputText.substring(0, 100)}${entry.inputText.length > 100 ? '...' : ''}\n`;
        content += `Output: ${entry.outputText.substring(0, 100)}${entry.outputText.length > 100 ? '...' : ''}\n`;
        content += '\n';
    });

    content += '='.repeat(60) + '\n';
    content += '⚠️ WARNING: This file contains sensitive information.\n';
    content += 'Keep it secure and delete after use.\n';
    content += '='.repeat(60) + '\n';

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obfuscator-history-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showAlert('History downloaded successfully!', 'success');
}