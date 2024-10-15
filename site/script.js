// site/script.js

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Fetch GitHub Repositories and Modrinth Projects
        const [githubRepos, modrinthProjects] = await Promise.all([
            fetch('https://api.github.com/users/I-No-oNe/repos').then(response => {
                if (!response.ok) {
                    throw new Error(`GitHub API error! status: ${response.status}`);
                }
                return response.json();
            }),
            fetch('https://api.modrinth.com/v2/user/iwsGxbBt/projects').then(response => {
                if (!response.ok) {
                    throw new Error(`Modrinth API error! status: ${response.status}`);
                }
                return response.json();
            })
        ]);

        populateRepos(githubRepos, modrinthProjects);
        initializeNavigation();
    } catch (error) {
        console.error('Error fetching data:', error);
        displayErrorMessage('Failed to load projects. Please try again later.');
    }
});

function populateRepos(githubRepos, modrinthProjects) {
    const reposContainer = document.getElementById('repos');
    if (!reposContainer) {
        console.error('Repos container element not found');
        return;
    }

    if (githubRepos.length === 0) {
        reposContainer.innerHTML = '<p>No GitHub repositories found.</p>';
        return;
    }

    githubRepos.forEach(repo => {
        const repoElement = document.createElement('div');
        repoElement.classList.add('repo');

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
        reposContainer.appendChild(repoElement);
    });
}

function findMatchingModrinthProject(repoName, modrinthProjects) {
    const specificMappings = {
        'View-Model': 'no-ones-view-model',
        'ClickCrystalPlus-Pack': 'clickcrystalplus-pack',
        'Auto-Disconnect' : 'auto-disconnect',
        'Attack-Blocker' : 'attack-blocker',
        'Glowing-Entities' : 'glowing-entities'
    };

    if (specificMappings[repoName]) {
        return modrinthProjects.find(project => project.slug === specificMappings[repoName]);
    }

    return modrinthProjects.find(project => project.title.toLowerCase() === repoName.toLowerCase());
}

function displayErrorMessage(message) {
    const reposContainer = document.getElementById('repos');
    if (reposContainer) {
        reposContainer.innerHTML = `<p class="error-message">${message}</p>`;
    }
}

function initializeNavigation() {
    const navLinks = document.querySelectorAll('nav ul li a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                smoothScroll(targetSection);
            }
        });
    });
}

function smoothScroll(target) {
    window.scrollTo({
        top: target.offsetTop - 80, 
        behavior: 'smooth'
    });
}