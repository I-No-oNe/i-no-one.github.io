import test from 'node:test';
import assert from 'node:assert/strict';
import { githubFields, modrinthFields, projectList, sortProjects, renderProjects } from '../site/projects.js';

const repo = (name, extra = {}) => githubFields({ name, description: 'Description', pushed_at: '2026-01-01T00:00:00Z', stargazers_count: 0, ...extra });
const mod = (name, downloads) => modrinthFields({ id: name, title: name, project_type: 'mod', source_url: `https://github.com/I-No-oNe/${name}/`, downloads });

test('popular ordering uses downloads then stars, with archived repos and forks below originals', () => {
    const repos = [repo('Small', { stargazers_count: 20 }), repo('Big'), repo('Fork', { fork: true }), repo('Archive', { archived: true }), repo('New', { pushed_at: '2026-09-01T00:00:00Z' })];
    const projects = projectList(repos, [mod('Small', 200), mod('Big', 10000), mod('Fork', 100000), mod('Archive', 99999)]);
    assert.deepEqual(sortProjects(projects).map(p => p.name), ['Big', 'Small', 'New', 'Fork', 'Archive']);
});

test('source matching ignores case and trailing slashes without attributing another owner downloads', () => {
    const mods = [mod('glowing-entities', 1234), { ...mod('Other', 90000), source_url: 'https://github.com/someone-else/Other' }];
    const projects = projectList([repo('Glowing-Entities'), repo('Other')], mods);
    assert.equal(projects[0].downloads, 1234);
    assert.equal(projects[1].downloads, null);
});

test('missing download counts stay absent; zero is an actual count', () => {
    const projects = projectList([repo('Missing'), repo('Zero')], [mod('Missing', undefined), mod('Zero', 0)]);
    const html = renderProjects(projects);
    assert.equal((html.match(/aria-label="0 downloads"/g) || []).length, 1);
    assert.equal(projects[0].downloads, null);
});

test('cards escape API text and expose exact accessible counts with source-specific actions', () => {
    const projects = projectList([repo('Test', { description: '<script>alert(1)</script>', stargazers_count: 14 })], [mod('Test', 741463)]);
    const html = renderProjects(projects);
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('aria-label="741,463 downloads"'));
    assert.ok(html.includes('741.5K'));
    assert.ok(html.includes('on Modrinth'));
    assert.ok(html.includes('on GitHub'));
});

test('without Modrinth, GitHub stars still rank original repositories', () => {
    const projects = projectList([repo('One', { stargazers_count: 1 }), repo('Fourteen', { stargazers_count: 14 })], []);
    assert.equal(sortProjects(projects)[0].name, 'Fourteen');
    assert.ok(!renderProjects(projects).includes('downloads'));
});
