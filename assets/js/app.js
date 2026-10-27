import {TOPICS, topicRecords} from './topics.mjs';

const nav = document.querySelector('#nav-links');
const menu = document.querySelector('.menu-toggle');
function closeMenu() {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
}
menu.addEventListener('click', () => {
  menu.setAttribute('aria-expanded', String(nav.classList.toggle('open')));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    closeMenu();
    menu.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.navigation')) closeMenu();
});

const panel = document.querySelector('#topic-detail');
const nodes = [...document.querySelectorAll('[data-topic]')];
let profile;
let selectedTopic = 'agents';
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function selectTopic(id) {
  const topic = TOPICS.find(item => item.id === id);
  if (!topic) return;
  selectedTopic = id;
  nodes.forEach(node => node.setAttribute('aria-pressed', String(node.dataset.topic === id)));
  document.querySelectorAll('[data-edge]').forEach(edge => edge.classList.toggle('selected', edge.dataset.edge === id));
  if (!profile) return;
  const records = topicRecords(id, profile);
  panel.replaceChildren(element('p', 'In practice', 'topic-kicker'), element('h3', topic.label));
  const skills = [...new Set(records.flatMap(record => record.skills))];
  const list = element('ul', null, 'topic-skills');
  skills.slice(0, 7).forEach(skill => list.append(element('li', skill)));
  panel.append(list);
  records.forEach(record => {
    const article = element('article', null, 'topic-evidence');
    if (record.title !== topic.label) article.append(element('h4', record.title));
    article.append(element('p', record.summary));
    if (record.kind === 'public-project' && /^https:\/\/github\.com\/krishnadheerajkrovi\/[A-Za-z0-9_.-]+$/.test(record.source.url)) {
      const link = element('a', 'Explore the project ↗', 'inline-link');
      link.href = record.source.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      article.append(link);
    }
    panel.append(article);
  });
}
nodes.forEach(node => {
  node.addEventListener('click', () => selectTopic(node.dataset.topic));
  node.addEventListener('keydown', event => {
    const direction = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3}[event.key];
    if (!direction) return;
    event.preventDefault();
    const next = nodes[(nodes.indexOf(node) + direction + nodes.length) % nodes.length];
    next.focus();
    selectTopic(next.dataset.topic);
  });
});
document.querySelectorAll('[data-select-topic]').forEach(link => {
  link.addEventListener('click', () => selectTopic(link.dataset.selectTopic));
});
fetch(new URL('../data/public-knowledge.json', import.meta.url), {cache: 'no-cache'})
  .then(response => {
    if (!response.ok) throw new Error('Public profile unavailable');
    return response.json();
  })
  .then(data => {
    if (!Array.isArray(data.records)) throw new Error('Invalid public profile');
    profile = data;
    selectTopic(selectedTopic);
  })
  .catch(() => {
    panel.replaceChildren(element('h3', 'Explore the work.'), element('p', 'Topic details are unavailable right now. You can explore the public projects or read my résumé.'));
    const link = element('a', 'View selected projects ↗', 'inline-link');
    link.href = '#projects';
    panel.append(link);
  });
selectTopic(selectedTopic);
