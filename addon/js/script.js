// Cursor Glow
const glow = document.getElementById('cursor-glow');
window.addEventListener('mousemove', e => {
    glow.style.setProperty('--x', e.clientX + 'px');
    glow.style.setProperty('--y', e.clientY + 'px');
});

// Scroll Reveal
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('active');
    });
}, {threshold: 0.1});
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// FAQ Accordion
const allDetails = document.querySelectorAll('.faq-list details');
allDetails.forEach(target => {
    target.addEventListener('click', () => {
        allDetails.forEach(d => {
            if (d !== target) d.removeAttribute('open');
        });
    });
});

// Markdown parsing
function parseMarkdownTable(text, sectionKeyword) {
    const lines = text.split('\n');
    const rows = [];
    let inSection = false;
    let passedHeader = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (/^#{1,3}\s/.test(trimmed) && trimmed.toLowerCase().includes(sectionKeyword.toLowerCase())) {
            inSection = true;
            passedHeader = false;
            continue;
        }

        if (inSection && /^#{1,3}\s/.test(trimmed)) break;
        if (!inSection || !trimmed.startsWith('|')) continue;
        if (trimmed.replace(/[\|\s\-:]/g, '') === '') continue;

        const cols = trimmed.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length < 2) continue;
        if (!passedHeader) {
            passedHeader = true;
            continue;
        }

        const name = cols[0].replace(/\*\*/g, '').replace(/`/g, '').trim();
        const desc = cols[1].replace(/\*\*/g, '').replace(/`/g, '').trim();
        rows.push([name, desc]);
    }
    return rows;
}

function renderTable(tbodyId, rows) {
    const tbody = document.getElementById(tbodyId);
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="2" class="table-status error">No data found.</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    rows.forEach(([name, desc]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="mod-name">${name}</td><td>${desc}</td>`;
        tbody.appendChild(tr);
    });
}

function renderError(tbodyId, msg) {
    document.getElementById(tbodyId).innerHTML =
        `<tr><td colspan="2" class="table-status error">⚠ ${msg}</td></tr>`;
}

// Fetch README
fetch('https://raw.githubusercontent.com/I-No-oNe/No-oNe-Addon/refs/heads/main/README.MD')
    .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
    })
    .then(text => {
        renderTable('module-body', parseMarkdownTable(text, 'modules'));
        renderTable('command-body', parseMarkdownTable(text, 'commands'));
    })
    .catch(err => {
        renderError('module-body', 'Failed to load — ' + err.message);
        renderError('command-body', 'Failed to load — ' + err.message);
    });

// Fetch version
fetch('https://raw.githubusercontent.com/I-No-oNe/No-oNe-Addon/refs/heads/main/gradle.properties')
    .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
    })
    .then(text => {
        const match = text.match(/mod_version\s*=\s*([^\s\r\n]+)/);
        const version = match ? match[1].split('-')[0] : '?.?';
        document.getElementById('badge-version').textContent = 'V' + version;
    })
    .catch(() => {
        document.getElementById('badge-version').textContent = 'V?.?';
    });

function setFavicon(url) {
    let favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = url;
    document.head.appendChild(favicon);
}

setFavicon('https://raw.githubusercontent.com/I-No-oNe/No-oNe-Addon/refs/heads/main/src/main/resources/assets/no-one-addon/icon.png');

document.querySelectorAll('.faq-list details').forEach(detail => {
    const content = detail.querySelector('.qa-content');
    const summary = detail.querySelector('summary');

    if (detail.hasAttribute('open')) {
        content.style.height = content.scrollHeight + 'px';
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }

    summary.addEventListener('click', e => {
        e.preventDefault();
        const isOpen = detail.hasAttribute('open');

        if (isOpen) {
            content.style.height = content.scrollHeight + 'px';

            requestAnimationFrame(() => {
                content.style.height = '0px';
                content.style.opacity = '0';
                content.style.transform = 'translateY(-6px)';
            });

            setTimeout(() => {
                detail.removeAttribute('open');
            }, 280);

        } else {
            detail.setAttribute('open', '');

            content.style.height = '0px';
            content.style.opacity = '0';
            content.style.transform = 'translateY(-6px)';

            requestAnimationFrame(() => {
                content.style.height = content.scrollHeight + 'px';
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            });
        }
    });
});