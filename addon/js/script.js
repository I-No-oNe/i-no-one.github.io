fetch('https://i-no-one.github.io/addon/js/readme.md')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    return response.text();
  })
  .then(data => {
    const lines = data.split('\n');
    const moduleTable = extractTable(lines, 'Modules');
    const commandTable = extractTable(lines, 'Commands');

    document.getElementById('modules').innerHTML = `<h2>✨ Modules</h2>${createTable(moduleTable)}`;
    document.getElementById('commands').innerHTML = `<h2>💻 Commands</h2>${createTable(commandTable)}`;
  })
  .catch(error => {
    console.error('Error:', error);
    document.body.innerHTML += `<p style="color: red;">Failed to load README file.</p>`;
  });
function extractTable(lines, sectionTitle) {
  const table = [];
  let start = false;

  for (const line of lines) {
    if (line.trim().startsWith(`### ${sectionTitle}`)) {
      start = true;
      continue;
    }

    if (start) {
      // Stop if we hit a new section (another ### or ##)
      if (/^##+ /.test(line.trim())) {
        break;
      }

      if (line.trim().startsWith('|') && !line.includes('---')) {
        const cells = line.split('|').map(cell => cell.trim()).filter(Boolean);
        if (cells.length > 1) {
          table.push(cells);
        }
      }
    }
  }

  return table.length > 1 ? table : [];
}

function createTable(data) {
  if (data.length === 0) return '<p>No data available.</p>';

  const headers = data[0];
  const rows = data.slice(1);

  let html = '<table border="1"><thead><tr>';
  headers.forEach(header => {
    html += `<th>${header}</th>`;
  });
  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}
