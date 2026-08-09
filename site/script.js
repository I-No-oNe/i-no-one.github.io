const PROJECT_CACHE_KEY = 'i-no-one:projects:v1';
let projectCache = readProjectCache();
let modrinthProjects = projectCache?.modrinth || [];
// The grid is rendered at build time; its signature seeds ours so a matching
// refresh is a no-op and a stale cache never overwrites fresher markup.
let shownGithubSignature = document.getElementById('repos')?.dataset.signature || '';

function readProjectCache() {
    try { return JSON.parse(localStorage.getItem(PROJECT_CACHE_KEY) || 'null'); }
    catch { return null; }
}

function saveProjectCache() {
    try { localStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify(projectCache)); }
    catch {}
}

async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
    } finally {
        clearTimeout(timeout);
    }
}

// Repo name -> Modrinth slug table, emitted by the page so it stays in one place.
let slugMappings;
function readSlugMappings() {
    if (slugMappings) return slugMappings;
    try { slugMappings = JSON.parse(document.getElementById('modrinth-slugs')?.textContent || '{}'); }
    catch { slugMappings = {}; }
    return slugMappings;
}

function githubSignature(repos) {
    return repos.map(repo => `${repo.id}:${repo.updated_at}`).join('|');
}

function showGithubRepos(repos) {
    const signature = githubSignature(repos);
    if (signature === shownGithubSignature) return;
    shownGithubSignature = signature;
    populateRepos(repos, modrinthProjects);
}

function initProjects() {
    if (!shownGithubSignature && projectCache?.github?.length) showGithubRepos(projectCache.github);

    fetchJson('https://api.github.com/users/I-No-oNe/repos')
        .then(repos => repos.map(({ id, name, description, html_url, updated_at }) => ({ id, name, description, html_url, updated_at })))
        .then(repos => {
            projectCache = { ...(projectCache || {}), github: repos };
            saveProjectCache();
            showGithubRepos(repos);
        })
        .catch(error => {
            console.error('GitHub projects failed:', error);
            if (!shownGithubSignature) displayErrorMessage('Projects are temporarily unavailable.');
        });

    fetchJson('https://api.modrinth.com/v2/user/iwsGxbBt/projects')
        .then(projects => projects.map(({ id, slug, title }) => ({ id, slug, title })))
        .then(projects => {
            modrinthProjects = projects;
            projectCache = { ...(projectCache || {}), modrinth: projects };
            saveProjectCache();
            appendModrinthLinks(projects);
        })
        .catch(error => console.error('Modrinth projects failed:', error));
}

// The grid already ships as HTML, so the refresh is pure catch-up work: hold it
// until the browser is idle rather than racing the first paint for bandwidth.
(window.requestIdleCallback || (cb => setTimeout(cb, 200)))(initProjects, { timeout: 3000 });

function populateRepos(githubRepos, modrinthProjects) {
    const reposContainer = document.getElementById('repos');
    if (!reposContainer) {
        console.error('Repos container element not found');
        return;
    }

    if (githubRepos.length === 0) {
        reposContainer.innerHTML = '<p>No GitHub repositories found.</p>';
        reposContainer.setAttribute('aria-busy', 'false');
        return;
    }

    const fragment = document.createDocumentFragment();

    // Cards built here replace a grid that is already on screen, so they skip
    // the reveal treatment the build-time markup carries.
    githubRepos.forEach((repo) => {
        const repoElement = document.createElement('div');
        repoElement.classList.add('repo');
        repoElement.dataset.repoName = repo.name;

        const repoName = document.createElement('h3');
        repoName.textContent = repo.name;
        repoElement.appendChild(repoName);

        const repoDescription = document.createElement('p');
        repoDescription.textContent = repo.description || 'No description available.';
        repoElement.appendChild(repoDescription);

        const repoLinks = document.createElement('div');
        repoLinks.classList.add('repo-links');

        const repoLink = document.createElement('a');
        repoLink.href = repo.html_url;
        repoLink.textContent = 'View on GitHub';
        repoLink.target = '_blank';
        repoLink.rel = 'noopener noreferrer';
        repoLinks.appendChild(repoLink);

        // Add Modrinth Link if available
        const modrinthProject = findMatchingModrinthProject(repo.name, modrinthProjects);
        if (modrinthProject) {
            const modrinthLink = document.createElement('a');
            modrinthLink.href = `https://modrinth.com/project/${modrinthProject.id}`;
            modrinthLink.textContent = 'View on Modrinth';
            modrinthLink.target = '_blank';
            modrinthLink.rel = 'noopener noreferrer';
            modrinthLink.classList.add('modrinth-link');
            repoLinks.appendChild(modrinthLink);
        }

        repoElement.appendChild(repoLinks);
        fragment.appendChild(repoElement);
    });

    reposContainer.replaceChildren(fragment);
    reposContainer.setAttribute('aria-busy', 'false');
}

function appendModrinthLinks(projects) {
    document.querySelectorAll('.repo[data-repo-name]').forEach(repoElement => {
        if (repoElement.querySelector('.modrinth-link')) return;
        const project = findMatchingModrinthProject(repoElement.dataset.repoName, projects);
        if (!project) return;
        const link = document.createElement('a');
        link.href = `https://modrinth.com/project/${project.id}`;
        link.textContent = 'View on Modrinth';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'modrinth-link';
        repoElement.querySelector('.repo-links')?.appendChild(link);
    });
}

function findMatchingModrinthProject(repoName, modrinthProjects) {
    const specificMappings = readSlugMappings();

    if (specificMappings[repoName]) {
        return modrinthProjects.find(project => project.slug === specificMappings[repoName]);
    }

    return modrinthProjects.find(project => project.title.toLowerCase() === repoName.toLowerCase());
}

function displayErrorMessage(message) {
    const reposContainer = document.getElementById('repos');
    if (reposContainer) {
        reposContainer.innerHTML = `<p class="error-message">${message}</p>`;
        reposContainer.setAttribute('aria-busy', 'false');
    }
}
