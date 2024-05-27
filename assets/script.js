document.addEventListener('DOMContentLoaded', function() {
    fetch('https://api.github.com/users/I-No-oNe/repos')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const reposContainer = document.getElementById('repos');
            if (!reposContainer) {
                throw new Error('Repos container element not found');
            }

            data.forEach(repo => {
                const repoElement = document.createElement('div');
                repoElement.classList.add('repo');
                const repoName = document.createElement('h3');
                repoName.textContent = repo.name;
                repoElement.appendChild(repoName);
                const repoDescription = document.createElement('p');
                repoDescription.textContent = repo.description || 'No description available.';
                repoElement.appendChild(repoDescription);
                const repoLink = document.createElement('a');
                repoLink.href = repo.html_url;
                repoLink.textContent = 'View on GitHub';
                repoLink.target = '_blank';
                repoElement.appendChild(repoLink);

                if (repo.name === 'View-Model') {
                    addModrinthLink(repoElement, 'https://modrinth.com/mod/no-ones-view-model');
                }

                if (repo.name === 'ClickCrystalPlus-Pack') {
                    addModrinthLink(repoElement, 'https://modrinth.com/resourcepack/clickcrystalplus-pack');
                }

                if (repo.name === 'Glowing-entities') {
                    addModrinthLink(repoElement, 'https://modrinth.com/mod/glowing-entities');
                }
                reposContainer.appendChild(repoElement);
            });
        })
        .catch(error => console.error('Error fetching repositories:', error));

    const basePath = calculateBasePathFromDataLayer();

    function handleLinkClick(event, url) {
        if (event.button === 0) {
            event.preventDefault();
            window.open(url, '_blank');
        }
    }

    document.getElementById('contact-link').addEventListener('click', function(event) {
        handleLinkClick(event, 'https://discord.com/users/1051897115447660697');
    });

    document.getElementById('cc-link').addEventListener('click', function(event) {
        handleLinkClick(event, 'https://clickcrystals.xyz/');
    });

    document.getElementById('tools-link').addEventListener('click', function(event) {
        handleLinkClick(event, `${basePath}tools.html`);
    });

    document.getElementById('modrinth-link').addEventListener('click', function(event) {
        handleLinkClick(event, 'https://modrinth.com/user/I-No-oNe');
    });

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = `${basePath}assets/styles.css`;
    document.head.appendChild(cssLink);

    const faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.href = 'https://avatars.githubusercontent.com/u/145749961?s=40&v=4';
    document.head.appendChild(faviconLink);
});

function addModrinthLink(repoElement, modrinthUrl) {
    try {
        const modrinthLink = document.createElement('a');
        modrinthLink.href = modrinthUrl;
        modrinthLink.textContent = 'View on Modrinth';
        modrinthLink.target = '_blank';
        modrinthLink.classList.add('modrinth-link');
        repoElement.appendChild(modrinthLink);
    } catch (error) {
        console.error('Error adding Modrinth link:', error);
    }
}

function calculateBasePathFromDataLayer() {
    const dataLayer = document.body.getAttribute('data-layer');
    const layer = parseInt(dataLayer, 10);
    const layersToAscend = isNaN(layer) ? 0 : layer;
    const basePath = '../'.repeat(layersToAscend);
    return basePath;
}
