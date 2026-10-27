import {answerQuestion} from './knowledge.mjs';
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
const form=document.querySelector('#question-form');
const input=document.querySelector('#question');
const output=document.querySelector('#answer');
const submit=document.querySelector('#ask-button');
let knowledge;
let knowledgePromise;
function loadKnowledge(){
  if(!knowledgePromise)knowledgePromise=fetch(new URL('../data/public-knowledge.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Knowledge unavailable');return r.json();}).then(data=>{if(!Array.isArray(data.records))throw new Error('Invalid knowledge');knowledge=data;return data;}).catch(error=>{knowledgePromise=null;throw error;});
  return knowledgePromise;
}
function element(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function render(result){
  output.replaceChildren();
  output.append(element('p',result.records.length?'From the public knowledge base':'A note on the evidence','answer-label'),element('p',result.intro));
  for(const record of result.records){
    const evidence=element('article',null,'answer-evidence');
    evidence.append(element('h4',record.title),element('p',record.summary));
    const tags=element('ul',null,'tags');
    record.skills.slice(0,5).forEach(skill=>tags.append(element('li',skill)));
    const link=element('a',`${record.source.label} ↗`,'text-link');
    // Restrict all source links to page anchors or the owner's public GitHub.
    if(/^#[a-z][a-z0-9-]*$/.test(record.source.url) || record.source.url.startsWith('https://github.com/krishnadheerajkrovi/'))link.href=record.source.url;
    if(link.href.startsWith('https://github.com/')){link.target='_blank';link.rel='noreferrer';}
    evidence.append(tags,link);output.append(evidence);
  }
}
let running=false;
async function ask(){
  if(running || !input.value.trim())return;
  running=true;submit.disabled=true;output.setAttribute('aria-busy','true');
  try{await loadKnowledge();render(answerQuestion(input.value,knowledge));}
  catch{output.replaceChildren(element('p','The public knowledge base could not load. Please try again, explore the skills section, or contact Krishna directly.'));}
  finally{running=false;submit.disabled=false;output.removeAttribute('aria-busy');}
}
form.addEventListener('submit',event=>{event.preventDefault();ask();});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.question;ask();}));
