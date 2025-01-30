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
        alert('Please enter text and key');
        return;
    }

    // Encode to Base64 with Unicode support
    let encoder = new TextEncoder();
    let base64Encoded = btoa(String.fromCharCode(...encoder.encode(text)));

    let shuffled = shuffleStringDeterministic(base64Encoded, key);
    document.getElementById('outputText').value = shuffled.split('').reverse().join('');
}

function decode() {
    const text = document.getElementById('inputText').value;
    const key = document.getElementById('key').value;
    
    if (!text || !key) {
        alert('Please enter encoded text and key');
        return;
    }

    let reversed = text.split('').reverse().join('');
    let unshuffled = unshuffleStringDeterministic(reversed, key);

    try {
        // Decode from Base64 with Unicode support
        let decodedBytes = new Uint8Array([...atob(unshuffled)].map(char => char.charCodeAt(0)));
        let decoder = new TextDecoder();
        let decoded = decoder.decode(decodedBytes);

        document.getElementById('outputText').value = decoded;
    } catch (error) {
        alert('Failed to decode. The input might be corrupted or the wrong key was used.');
        console.error('Decode Error:', error);
    }
}

function setFavicon(url) {
    let favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = url;
    document.head.appendChild(favicon);
}

setFavicon('https://avatars.githubusercontent.com/u/145749961?v=4&size=64')