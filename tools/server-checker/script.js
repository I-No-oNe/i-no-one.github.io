// Server History Management
const HISTORY_KEY = 'mc_server_history';
const MAX_HISTORY = 10;

function loadHistory() {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        return [];
    }
}

function saveToHistory(host, port) {
    try {
        let history = loadHistory();

        // Remove duplicate if exists
        history = history.filter(item => !(item.host === host && item.port === port));

        // Add to beginning
        history.unshift({
            host: host,
            port: port,
            timestamp: Date.now()
        });

        // Keep only last MAX_HISTORY items
        history = history.slice(0, MAX_HISTORY);

        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        displayHistory();
    } catch (e) {
        console.error('Failed to save history:', e);
    }
}

function displayHistory() {
    const history = loadHistory();
    const historyContainer = document.getElementById('historyContainer');

    if (history.length === 0) {
        historyContainer.style.display = 'none';
        return;
    }

    historyContainer.style.display = 'block';
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <span class="history-text">${escapeHtml(item.host)}:${item.port}</span>
            <button class="history-remove" onclick="removeFromHistory('${escapeHtml(item.host)}', ${item.port})">×</button>
        `;
        div.onclick = (e) => {
            if (!e.target.classList.contains('history-remove')) {
                setServer(item.host, item.port);
                checkServer();
            }
        };
        historyList.appendChild(div);
    });
}

function removeFromHistory(host, port) {
    try {
        let history = loadHistory();
        history = history.filter(item => !(item.host === host && item.port === port));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        displayHistory();
    } catch (e) {
        console.error('Failed to remove from history:', e);
    }
}

function clearHistory() {
    try {
        localStorage.removeItem(HISTORY_KEY);
        displayHistory();
    } catch (e) {
        console.error('Failed to clear history:', e);
    }
}

// Share Link Management
function generateShareLink() {
    const host = document.getElementById('hostInput').value.trim();
    const port = parseInt(document.getElementById('portInput').value) || 25565;

    if (!host) {
        alert('Please enter a server address first');
        return;
    }

    const params = new URLSearchParams();
    params.set('host', host);
    params.set('port', port); // Always include port for reliability

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Share link copied to clipboard!');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Share link copied to clipboard!');
    });
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Check for URL parameters on load
// Check for URL parameters on load
function checkUrlParameters() {
    const params = new URLSearchParams(window.location.search);

    // Only read host and port
    const host = params.get('host');
    const portParam = params.get('port');

    if (!host) return; // nothing to do

    const port = portParam ? parseInt(portParam, 10) : 25565;

    // Set inputs
    const hostInput = document.getElementById('hostInput');
    const portInput = document.getElementById('portInput');

    if (hostInput && portInput) {
        hostInput.value = host;
        portInput.value = isNaN(port) ? 25565 : port;

        // Automatically check the server after setting values
        setTimeout(() => checkServer(), 100);
    }
}

function setServer(host, port) {
    document.getElementById('hostInput').value = host;
    document.getElementById('portInput').value = port;
}

async function checkServer() {
    const host = document.getElementById('hostInput').value.trim();
    const port = parseInt(document.getElementById('portInput').value) || 25565;
    const resultsDiv = document.getElementById('results');

    if (!host) {
        alert('Please enter a server address');
        return;
    }

    // Save to history
    saveToHistory(host, port);

    resultsDiv.classList.add('show');
    resultsDiv.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Pinging ${escapeHtml(host)}:${port}...</p>
            <p style="font-size: 0.9em; margin-top: 10px; opacity: 0.7;">Performing handshake...</p>
        </div>
    `;

    const startTime = Date.now();

    try {
        const address = port === 25565 ? host : `${host}:${port}`;
        const response = await fetch(`https://api.mcstatus.io/v2/status/java/${address}`);
        const data = await response.json();

        const ping = Date.now() - startTime;

        if (data.online) {
            displayOnlineServer(data, ping);
        } else {
            displayOfflineServer(host, port);
        }
    } catch (error) {
        displayError(error.message);
    }
}

function displayOnlineServer(data, ping) {
    const resultsDiv = document.getElementById('results');

    // Use HTML formatted MOTD for colored display
    const motdHtml = data.motd?.html || escapeHtml(data.motd?.clean || 'No description available');

    // Get player list
    const playerSample = data.players?.list || [];

    // Get favicon
    const favicon = data.icon || null;

    let html = `
        <div class="status-header">
            <div class="status-indicator online"></div>
            <div class="status-title">SERVER ONLINE</div>
            <button class="share-btn" onclick="generateShareLink()" title="Share this server">
                <span>🔗 Share</span>
            </button>
        </div>
    `;

    if (favicon) {
        html += `
            <div class="info-section">
                <h3>🖼️ SERVER ICON</h3>
                <div class="info-content">
                    <img src="${favicon}" alt="Server Icon" class="favicon-img">
                </div>
            </div>
        `;
    }

    // Display formatted MOTD with Minecraft colors
    html += `
        <div class="info-section">
            <h3>📝 DESCRIPTION (MOTD)</h3>
            <div class="info-content motd-display">
                ${motdHtml.replace(/\n/g, '<br>')}
            </div>
        </div>

        <div class="info-section">
            <h3>👥 PLAYERS</h3>
            <div class="info-content">
                <div style="font-size: 1.3em; margin-bottom: 10px;">
                    <strong style="color: #7fb53b;">${data.players?.online || 0}</strong> / 
                    <strong>${data.players?.max || 0}</strong> players online
                </div>
    `;

    if (playerSample.length > 0) {
        html += `<div class="player-list">`;
        playerSample.slice(0, 15).forEach(player => {
            const playerName = player.name_clean || player.name_raw || 'Unknown';
            const playerUuid = player.uuid || '';
            // Use Crafatar for player head avatars
            const avatarUrl = playerUuid
                ? `https://crafatar.com/avatars/${playerUuid}?size=32&overlay`
                : null;

            html += `
                <div class="player-item">
                    ${avatarUrl
                ? `<img src="${avatarUrl}" alt="${escapeHtml(playerName)}" class="player-avatar" onerror="this.style.display='none'">`
                : `<div class="player-avatar"></div>`
            }
                    <span>${escapeHtml(playerName)}</span>
                </div>
            `;
        });
        if (playerSample.length > 15) {
            html += `
                <div class="player-item" style="justify-content: center; opacity: 0.7;">
                    ... and ${playerSample.length - 15} more players
                </div>
            `;
        }
        html += `</div>`;
    } else if (data.players?.online > 0) {
        html += `<p style="margin-top: 10px; opacity: 0.7;">Player list not available (server has disabled player samples)</p>`;
    }

    html += `
            </div>
        </div>

        <div class="info-section">
            <h3>🎮 VERSION & PROTOCOL</h3>
            <div class="info-content">
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Version:</strong><br>
                        ${escapeHtml(data.version?.name_clean || 'Unknown')}
                    </div>
                    <div class="info-item">
                        <strong>Protocol:</strong><br>
                        ${data.version?.protocol || 'Unknown'}
                    </div>
                    <div class="info-item">
                        <strong>Ping:</strong><br>
                        <span style="color: ${ping < 100 ? '#7fb53b' : ping < 200 ? '#ffaa00' : '#ff5555'}">
                            ${ping}ms
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Server software info
    if (data.software) {
        html += `
            <div class="info-section">
                <h3>⚙️ SERVER SOFTWARE</h3>
                <div class="info-content">${escapeHtml(data.software)}</div>
            </div>
        `;
    }

    // Mods section
    if (data.mods && data.mods.length > 0) {
        html += `
            <div class="info-section">
                <h3>🔧 MODS (${data.mods.length})</h3>
                <div class="info-content">
                    <div class="player-list">
        `;
        data.mods.slice(0, 10).forEach(mod => {
            html += `
                <div class="info-item">
                    <strong>${escapeHtml(mod.name)}</strong><br>
                    Version: ${escapeHtml(mod.version || 'Unknown')}
                </div>
            `;
        });
        if (data.mods.length > 10) {
            html += `<p style="margin-top: 10px; opacity: 0.7;">... and ${data.mods.length - 10} more mods</p>`;
        }
        html += `
                    </div>
                </div>
            </div>
        `;
    }

    // Plugins section
    if (data.plugins && data.plugins.length > 0) {
        html += `
            <div class="info-section">
                <h3>🔌 PLUGINS (${data.plugins.length})</h3>
                <div class="info-content">
                    <div class="player-list">
        `;
        data.plugins.slice(0, 10).forEach(plugin => {
            html += `
                <div class="info-item">
                    <strong>${escapeHtml(plugin.name)}</strong><br>
                    ${plugin.version ? `Version: ${escapeHtml(plugin.version)}` : 'Version unknown'}
                </div>
            `;
        });
        if (data.plugins.length > 10) {
            html += `<p style="margin-top: 10px; opacity: 0.7;">... and ${data.plugins.length - 10} more plugins</p>`;
        }
        html += `
                    </div>
                </div>
            </div>
        `;
    }

    html += `
        <div class="info-section">
            <h3>🌐 CONNECTION INFO</h3>
            <div class="info-content">
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Hostname:</strong><br>
                        ${escapeHtml(data.host)}
                    </div>
                    <div class="info-item">
                        <strong>IP Address:</strong><br>
                        ${data.ip_address ? escapeHtml(data.ip_address) : 'Unknown'}
                    </div>
                    <div class="info-item">
                        <strong>Port:</strong><br>
                        ${data.port}
                    </div>
                    <div class="info-item">
                        <strong>EULA Blocked:</strong><br>
                        ${data.eula_blocked ? '⚠️ Yes' : '✓ No'}
                    </div>
                </div>
    `;

    // SRV Record info
    if (data.srv_record) {
        html += `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #4a4a4a;">
                    <strong style="color: #a0d468;">SRV Record:</strong><br>
                    Host: ${escapeHtml(data.srv_record.host)}<br>
                    Port: ${data.srv_record.port}
                </div>
        `;
    }

    html += `
            </div>
        </div>

        <div class="info-section">
            <h3>⏱️ CACHE INFO</h3>
            <div class="info-content">
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Retrieved At:</strong><br>
                        ${new Date(data.retrieved_at).toLocaleString()}
                    </div>
                    <div class="info-item">
                        <strong>Cache Expires:</strong><br>
                        ${new Date(data.expires_at).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    `;

    resultsDiv.innerHTML = html;
}

function displayOfflineServer(host, port) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="status-header">
            <div class="status-indicator offline"></div>
            <div class="status-title">SERVER OFFLINE</div>
        </div>
        <div class="error">
            <strong>⚠️ CONNECTION FAILED</strong><br><br>
            The server <strong>${escapeHtml(host)}:${port}</strong> is currently offline, unreachable, or protected by anti-bot systems.
            <br><br>
            <strong>Possible reasons:</strong>
            <ul style="margin-top: 10px; margin-left: 20px;">
                <li>Server is down for maintenance</li>
                <li>Firewall or DDoS protection blocking requests</li>
                <li>Invalid server address or port</li>
                <li>Server doesn't support status queries</li>
            </ul>
        </div>
    `;
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="error">
            <strong>⚠️ ERROR</strong><br><br>
            ${escapeHtml(message)}
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Display history
    displayHistory();

    // Check for URL parameters
    checkUrlParameters();

    // Enter key handlers
    document.getElementById('hostInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') checkServer();
    });
    document.getElementById('portInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') checkServer();
    });
});