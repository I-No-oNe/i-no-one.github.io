let playerNamesArray = [];

// Fetch player names from the URL
async function fetchPlayerNames() {
    try {
        const response = await fetch('https://i-no-one.github.io/info');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (data && data.PlayerNames) playerNamesArray = data.PlayerNames;
        displayNames();
    } catch (error) {
        console.error('Failed to fetch player names:', error);
    }
}

fetchPlayerNames();

document.getElementById('addButton').addEventListener('click', addPlayerName);

document.getElementById('nameToAdd').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') addPlayerName();
});

document.getElementById('copyButton').addEventListener('click', function () {
    const outputText = document.getElementById('output').value;
    navigator.clipboard.writeText(outputText).then(() => {
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
});

document.getElementById('downloadButton').addEventListener('click', function () {
    const formattedNames = playerNamesArray.join(',').replace(/,+/g, ',').replace(/\s*,\s*/g, ',');
    const blob = new Blob([formattedNames], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted_names.txt';
    a.click();
    URL.revokeObjectURL(url);
});

function addPlayerName() {
    const nameToAdd = document.getElementById('nameToAdd').value.trim();
    const cleanedName = nameToAdd.replace(/["{};:()[]]/g, '');
    if (cleanedName) {
        playerNamesArray.push(cleanedName);
        document.getElementById('nameToAdd').value = '';
        displayNames();
    } else {
        alert('Please enter a valid player name.');
    }
}

function displayNames() {
    let formattedNames = playerNamesArray.join(',').replace(/,+/g, ',').replace(/\s*,\s*/g, ',');
    document.getElementById('output').value = formattedNames;
}