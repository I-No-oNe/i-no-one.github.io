document.addEventListener('DOMContentLoaded', function() {
    fetch('https://api.github.com/users/I-No-oNe/repos')
        .then(response => response.json())
        .then(data => {
            const reposContainer = document.getElementById('repos');
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

                // Add Modrinth links for specific repositories
                if (repo.name === 'View-Model') {
                    const modrinthLink = document.createElement('a');
                    modrinthLink.href = 'https://modrinth.com/mod/no-ones-view-model';
                    modrinthLink.textContent = 'View on Modrinth';
                    modrinthLink.target = '_blank';
                    modrinthLink.classList.add('modrinth-link');
                    repoElement.appendChild(modrinthLink);
                }

                if (repo.name === 'ClickCrystalPlus-Pack') {
                    const modrinthLink = document.createElement('a');
                    modrinthLink.href = 'https://modrinth.com/resourcepack/clickcrystalplus-pack';
                    modrinthLink.textContent = 'View on Modrinth';
                    modrinthLink.target = '_blank';
                    modrinthLink.classList.add('modrinth-link');
                    repoElement.appendChild(modrinthLink);
                }

                if (repo.name === 'Glowing-entities') {
                    const modrinthLink = document.createElement('a');
                    modrinthLink.href = 'https://modrinth.com/mod/glowing-entities';
                    modrinthLink.textContent = 'View on Modrinth';
                    modrinthLink.target = '_blank';
                    modrinthLink.classList.add('modrinth-link');
                    repoElement.appendChild(modrinthLink);
                }

                reposContainer.appendChild(repoElement);
            });
        })
        .catch(error => console.error('Error fetching repositories:', error));
    
    document.getElementById('contact-link').addEventListener('click', function(event) {
        event.preventDefault();
        window.open('https://discord.com/users/1051897115447660697', '_blank');
    });

    document.getElementById('cc-link').addEventListener('click', function(event) {
    event.preventDefault();
    window.open('https://clickcrystals.xyz/', '_blank');
});
});
