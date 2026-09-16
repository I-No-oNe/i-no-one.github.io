import { githubFields, modrinthFields, projectList, renderProjects } from './projects.js';

const PROJECT_CACHE_KEY = 'i-no-one:projects:v2';
const reposContainer = document.getElementById('repos');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const phoneLayout = window.matchMedia('(max-width: 820px)');

function initRows(times = []) {
    const cards = [...reposContainer.querySelectorAll('.repo')];
    if (!cards.length) return;
    const fragment = document.createDocumentFragment();
    const rowCount = Math.min(phoneLayout.matches ? 3 : 2, cards.length);
    for (let index = 0; index < rowCount; index++) {
        const row = document.createElement('div');
        row.className = 'project-row';
        const track = document.createElement('div');
        track.className = 'project-track';
        const group = document.createElement('div');
        group.className = 'project-group';
        cards.filter((_, i) => i % rowCount === index).forEach(card => group.append(card));
        const copy = group.cloneNode(true);
        copy.classList.add('project-copy');
        copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('a').forEach(link => { link.tabIndex = -1; });
        track.append(group, copy);
        row.append(track);
        fragment.append(row);
    }
    reposContainer.replaceChildren(fragment);
    reposContainer.classList.add('project-marquee');
    // Background API refreshes must not restart an already moving row.
    reposContainer.querySelectorAll('.project-track').forEach((track, index) => {
        const animation = track.getAnimations()[0];
        if (animation && times[index] != null) animation.currentTime = times[index];
    });
}

reposContainer.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') reposContainer.classList.add('is-held');
});
const releaseRows = () => reposContainer.classList.remove('is-held');
window.addEventListener('pointerup', releaseRows);
window.addEventListener('pointercancel', releaseRows);
window.addEventListener('blur', releaseRows);
reposContainer.addEventListener('focusin', event => {
    if (!event.target.matches(':focus-visible') || reducedMotion.matches) return;
    const card = event.target.closest('.repo');
    const row = card?.closest('.project-row');
    if (!row) return;
    // Undo the browser's native focus scroll before positioning the moving track.
    row.scrollLeft = 0;
    const box = card.getBoundingClientRect();
    const viewport = row.getBoundingClientRect();
    if (box.left >= viewport.left && box.right <= viewport.right) return;
    const track = row.querySelector('.project-track');
    const group = track.firstElementChild;
    const animation = track.getAnimations()[0];
    if (!animation) return;
    const offset = card.offsetLeft - group.offsetLeft;
    const progress = offset / group.getBoundingClientRect().width;
    const timing = animation.effect.getTiming();
    animation.currentTime = timing.delay + Number(timing.duration) * (timing.direction === 'reverse' ? 1 - progress : progress);
    row.scrollLeft = 0;
});
phoneLayout.addEventListener('change', () => render());
let visible = false;
const syncVisibility = () => reposContainer.classList.toggle('is-running', visible && !document.hidden);
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncVisibility(); }).observe(reposContainer);
document.addEventListener('visibilitychange', syncVisibility);
let projectData = JSON.parse(document.getElementById('project-data').textContent);
let shownData = JSON.stringify(projectData);
let githubState = projectData.github.length ? 'ready' : 'loading';

function render() {
    const focusedHref = reposContainer.contains(document.activeElement) ? document.activeElement.href : null;
    const times = [...reposContainer.querySelectorAll('.project-track')].map(track => track.getAnimations()[0]?.currentTime);
    reposContainer.innerHTML = renderProjects(projectList(projectData.github, projectData.modrinth))
        || (githubState === 'loading' ? '<p class="muted">Loading projects…</p>'
            : githubState === 'failed' ? '<p class="muted">Projects could not load. <a href="https://github.com/I-No-oNe?tab=repositories">Browse them on GitHub</a>.</p>'
            : '<p class="muted">No public projects found.</p>');
    reposContainer.setAttribute('aria-busy', String(githubState === 'loading'));
    initRows(times);
    if (focusedHref) [...reposContainer.querySelectorAll('a')].find(link => link.href === focusedHref && !link.closest('[hidden]'))?.focus({ preventScroll: true });
}

function updateData(key, data) {
    projectData = { ...projectData, [key]: data };
    try { localStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify(projectData)); } catch {}
    const signature = JSON.stringify(projectData);
    if (signature === shownData && reposContainer.getAttribute('aria-busy') === 'false') return;
    shownData = signature;
    render();
}

if (projectData.github.length) initRows();
else {
    try {
        const cached = JSON.parse(localStorage.getItem(PROJECT_CACHE_KEY));
        if (cached?.github?.length) {
            projectData = cached;
            githubState = 'ready';
            shownData = JSON.stringify(projectData);
            render();
        }
    } catch {}
}

async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
    } finally { clearTimeout(timeout); }
}

function initProjects() {
    fetchJson('https://api.github.com/users/I-No-oNe/repos?per_page=100')
        .then(repos => {
            githubState = 'ready';
            updateData('github', repos.map(githubFields));
        })
        .catch(() => {
            if (projectData.github.length) return;
            githubState = 'failed';
            render();
        });
    // Refresh independently: one unavailable source must not erase the other.
    fetchJson('https://api.modrinth.com/v2/user/iwsGxbBt/projects')
        .then(projects => updateData('modrinth', projects.map(modrinthFields)))
        .catch(() => {});
}

(window.requestIdleCallback || (cb => setTimeout(cb, 200)))(initProjects, { timeout: 3000 });
