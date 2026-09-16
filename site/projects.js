import projectIcons from './project-icons.json' with { type: 'json' };

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const exact = new Intl.NumberFormat('en');
const count = value => Number.isFinite(value) && value >= 0 ? value : null;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const sourcePath = value => {
    try { const url = new URL(value); return url.hostname === 'github.com' ? url.pathname.replace(/\/$/, '').toLowerCase() : ''; }
    catch { return ''; }
};

export function githubFields(repo) {
    const { id, name, description, html_url, updated_at, pushed_at, language, fork, archived } = repo;
    return { id, name, description, html_url, updated_at, pushed_at, language, fork, archived, stargazers_count: count(repo.stargazers_count) };
}

export function modrinthFields(project) {
    const { id, slug, title, description, source_url, icon_url, project_type } = project;
    return { id, slug, title, description, source_url, icon_url, project_type, downloads: count(project.downloads) };
}

export function projectList(repos, mods) {
    return repos.map(repo => {
        const mod = mods.find(project => sourcePath(project.source_url) === `/i-no-one/${repo.name.toLowerCase()}`);
        return {
            ...repo, mod,
            title: mod?.title || repo.name,
            description: mod?.description || repo.description || 'An open-source project on GitHub.',
            downloads: count(mod?.downloads), stars: count(repo.stargazers_count),
            updated: repo.pushed_at || repo.updated_at,
        };
    });
}

export function sortProjects(projects) {
    return [...projects].sort((a, b) => {
        const recent = Date.parse(b.updated) - Date.parse(a.updated) || 0;
        // Archived projects and forks remain available, below maintained originals.
        return Number(Boolean(a.archived || a.fork)) - Number(Boolean(b.archived || b.fork))
            || (b.downloads ?? 0) - (a.downloads ?? 0)
            || (b.stars ?? 0) - (a.stars ?? 0)
            || recent || a.name.localeCompare(b.name);
    });
}

const arrow = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const download = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 20h14"/></svg>';
const star = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>';

const github = '<svg class="repo-github-icon" width="23" height="23" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.4-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.1 1.15a10.8 10.8 0 0 1 5.62 0c2.15-1.46 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.73.8 1.16 1.79 1.16 3.02 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z"/></svg>';

export function renderProjects(projects) {
    return sortProjects(projects).map((project, index) => {
        const { mod } = project;
        const featured = index === 0 && project.downloads > 0 && !project.archived && !project.fork;
        const type = mod ? ({ mod: 'Minecraft mod', modpack: 'Modpack', resourcepack: 'Resource pack', shader: 'Shader' }[mod.project_type] || 'Minecraft') : project.language || 'Open source';
        const iconUrl = projectIcons[project.name]?.file || (mod?.icon_url?.startsWith('https://cdn.modrinth.com/') ? mod.icon_url : null);
        const icon = iconUrl
            ? `<img src="${escape(iconUrl)}" alt="" width="48" height="48" loading="lazy" decoding="async" />`
            : github;
        const metric = (value, label, icon) => value === null ? '' : `<span class="repo-stat" title="${exact.format(value)} ${label}" aria-label="${exact.format(value)} ${label}">${icon}<strong>${compact.format(value)}</strong><span>${label}</span></span>`;
        const githubUrl = `https://github.com/I-No-oNe/${encodeURIComponent(project.name)}`;
        const primaryUrl = mod ? `https://modrinth.com/project/${encodeURIComponent(mod.id)}` : githubUrl;
        return `<article class="repo${featured ? ' repo-featured' : ''}" data-repo-name="${escape(project.name)}">
            <div class="repo-heading"><div class="repo-icon">${icon}</div><div><div class="repo-category">${escape(type)}${project.archived ? ' · Archived' : project.fork ? ' · Fork' : ''}</div><h3><a class="repo-title-link" href="${primaryUrl}" target="_blank" rel="noopener noreferrer" aria-label="View ${escape(project.title)} on ${mod ? 'Modrinth' : 'GitHub'}">${escape(project.title)}</a></h3></div>${mod ? `<a class="repo-source" href="${githubUrl}" target="_blank" rel="noopener noreferrer" aria-label="View ${escape(project.title)} source on GitHub" title="Source on GitHub">${github}</a>` : ''}</div>
            <p class="repo-description">${escape(project.description)}</p>
            <div class="repo-stats">${metric(project.downloads, 'downloads', download)}${metric(project.stars, 'stars', star)}<span class="repo-open" aria-hidden="true">${arrow}</span></div>
        </article>`;
    }).join('');
}
