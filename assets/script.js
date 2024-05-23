// Wait for the DOM content to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Fetch GitHub repositories data
    fetch('https://api.github.com/users/I-No-oNe/repos')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json(); // Parse response as JSON
        })
        .then(data => {
            // Get the container element where repositories will be displayed
            const reposContainer = document.getElementById('repos');
            if (!reposContainer) {
                throw new Error('Repos container element not found');
            }

            // Iterate over each repository
            data.forEach(repo => {
                // Create a new div element for the repository
                const repoElement = document.createElement('div');
                repoElement.classList.add('repo'); // Add 'repo' class to the div
                
                // Create a heading element for the repository name
                const repoName = document.createElement('h3');
                repoName.textContent = repo.name; // Set the repository name as text content
                repoElement.appendChild(repoName); // Append the heading to the repository div
                
                // Create a paragraph element for the repository description
                const repoDescription = document.createElement('p');
                repoDescription.textContent = repo.description || 'No description available.'; // Set the description text, or use a default if not available
                repoElement.appendChild(repoDescription); // Append the paragraph to the repository div
                
                // Create a link element for viewing the repository on GitHub
                const repoLink = document.createElement('a');
                repoLink.href = repo.html_url; // Set the link href to the repository URL
                repoLink.textContent = 'View on GitHub'; // Set the link text
                repoLink.target = '_blank'; // Open link in a new tab
                repoElement.appendChild(repoLink); // Append the link to the repository div

                // Add additional Modrinth links for specific repositories
                if (repo.name === 'View-Model') {
                    addModrinthLink(repoElement, 'https://modrinth.com/mod/no-ones-view-model');
                }

                if (repo.name === 'ClickCrystalPlus-Pack') {
                    addModrinthLink(repoElement, 'https://modrinth.com/resourcepack/clickcrystalplus-pack');
                }

                if (repo.name === 'Glowing-entities') {
                    addModrinthLink(repoElement, 'https://modrinth.com/mod/glowing-entities');
                }

                // Append the repository div to the container
                reposContainer.appendChild(repoElement);
            });
        })
        .catch(error => console.error('Error fetching repositories:', error)); // Log any errors encountered while fetching repositories
    
    // Event listener for clicking on the contact link
    document.getElementById('contact-link').addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default behavior of the link
        window.open('https://discord.com/users/1051897115447660697', '_blank'); // Open Discord profile in a new tab
    });

    // Event listener for clicking on the ClickCrystals link
    document.getElementById('cc-link').addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default behavior of the link
        window.open('https://clickcrystals.xyz/', '_blank'); // Open ClickCrystals website in a new tab
    });

    // Event listener for clicking on the tools link
    document.getElementById('tools-link').addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default behavior of the link
        window.open('https://i-no-one.github.io/tools/tools.html', '_blank'); // Open tools page in a new tab
    });

    // Event listener for clicking on the Modrinth link
    document.getElementById('modrinth-link').addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default behavior of the link
        window.open('https://modrinth.com/user/I-No-oNe', '_blank'); // Open Modrinth profile in a new tab
    });

    // Add a favicon for the page
    var faviconLink = document.createElement('link'); // Create a new link element
    faviconLink.rel = 'icon'; // Set the rel attribute to 'icon'
    faviconLink.href = 'https://avatars.githubusercontent.com/u/145749961?s=40&v=4'; // Set the href attribute to the favicon URL
    document.head.appendChild(faviconLink); // Append the link to the document head
});

// Function to add a Modrinth link to a repository element
function addModrinthLink(repoElement, modrinthUrl) {
    try {
        const modrinthLink = document.createElement('a'); // Create a new link element
        modrinthLink.href = modrinthUrl; // Set the href attribute to the Modrinth URL
        modrinthLink.textContent = 'View on Modrinth'; // Set the link text
        modrinthLink.target = '_blank'; // Open link in a new tab
        modrinthLink.classList.add('modrinth-link'); // Add 'modrinth-link' class to the link
        repoElement.appendChild(modrinthLink); // Append the link to the repository element
    } catch (error) {
        console.error('Error adding Modrinth link:', error);
    }
}
