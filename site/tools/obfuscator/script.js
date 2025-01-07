
// TODO -> fix this :(

function shuffleStringDeterministic(str, key) {
    const arr = str.split('');
    const seed = key.length;
    for (let i = arr.length - 1; i > 0; i--) {
        const j = (i + seed) % arr.length;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

function unshuffleStringDeterministic(str, key) {
    const arr = str.split('');
    const seed = key.length;
    for (let i = 0; i < arr.length; i++) {
        const j = (i + seed) % arr.length;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

function encode() {
    const text = document.getElementById('inputText').value;
    const key = document.getElementById('key').value;
    
    if (!text || !key) {
        alert('Please enter text and key');
        return;
    }

    let base64Encoded = btoa(text);
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
        let decoded = atob(unshuffled);
        document.getElementById('outputText').value = decoded;
    } catch (error) {
        alert('Failed to decode. The input might be corrupted or the wrong key was used.');
        console.error('Decode Error:', error);
    }
}