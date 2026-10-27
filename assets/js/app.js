import {TOPICS, topicRecords} from './topics.mjs';
const nav = document.querySelector('#nav-links');
const toggle = document.querySelector('.menu-toggle');
function closeMenu(){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');}
toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape' && nav.classList.contains('open')){closeMenu();toggle.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.nav'))closeMenu();});
const cards=[...document.querySelectorAll('[data-category]')];
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  cards.forEach(card=>card.hidden=filter!=='all' && card.dataset.category!==filter);
  document.querySelector('#filter-status').textContent=`Showing ${cards.filter(c=>!c.hidden).length} projects.`;
}));
const panel = document.querySelector('#topic-detail');
const nodes = [...document.querySelectorAll('[data-topic]')];
let profile;
let selectedTopic = 'agents';
function element(tag, text, className) {
  const node = document.createElement(tag);
  if(text) node.textContent=text;
  if(className) node.className=className;
  return node;
}
function selectTopic(id) {
  const topic=TOPICS.find(t=>t.id===id);
  if(!topic) return;
  selectedTopic=id;
  nodes.forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.topic===id)));
  document.querySelectorAll('[data-edge]').forEach(edge=>edge.classList.toggle('selected',edge.dataset.edge===id));
  if(!profile) return;
  const records=topicRecords(id,profile);
  panel.replaceChildren(element('p','Inside the skill map','topic-kicker'),element('h3',topic.label));
  const skills=[...new Set(records.flatMap(r=>r.skills))];
  const tags=element('ul',null,'tags');
  skills.slice(0,7).forEach(skill=>tags.append(element('li',skill)));
  panel.append(tags);
  for(const record of records) {
    const article=element('article',null,'topic-evidence');
    if(record.title!==topic.label) article.append(element('h4',record.title));
    article.append(element('p',record.summary));
    if(record.kind==='public-project') {
      const link=element('a','Explore the project ↗','text-link');
      if(/^https:\/\/github\.com\/krishnadheerajkrovi\/[A-Za-z0-9_.-]+$/.test(record.source.url)) {
        link.href=record.source.url;link.target='_blank';link.rel='noreferrer';article.append(link);
      }
    }
    panel.append(article);
  }
  if(!records.some(r=>r.kind==='public-project')) {
    const link=element('a','Explore related capabilities ↗','text-link');
    link.href=id==='backend'?'#experience':'#skills';panel.append(link);
  }
}
nodes.forEach(node=>node.addEventListener('click',()=>selectTopic(node.dataset.topic)));
document.querySelectorAll('[data-select-topic]').forEach(link=>link.addEventListener('click',()=>selectTopic(link.dataset.selectTopic)));
fetch(new URL('../data/public-knowledge.json',import.meta.url))
  .then(response=>{if(!response.ok)throw new Error('Public profile unavailable');return response.json();})
  .then(data=>{if(!Array.isArray(data.records))throw new Error('Invalid public profile');profile=data;selectTopic(selectedTopic);})
  .catch(()=>{panel.replaceChildren(element('h3','Explore the skills behind the work'),element('p','The map details couldn’t load. You can still explore the capabilities and projects on this page.'));const link=element('a','Browse capabilities ↗','text-link');link.href='#skills';panel.append(link);});
selectTopic(selectedTopic);
