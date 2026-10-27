let graph, evidence, projects, repositories, capabilities, skills, nodeById, lastResume='';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const words=s=>(String(s).toLowerCase().match(/[a-z0-9+#.]+/g)||[]).filter(w=>w.length>2);
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const literalScore=(text,q)=>{const hay=String(text).toLowerCase();return [...new Set(words(q))].reduce((n,t)=>n+(hay.includes(t)?(t.length>5?2:1):0),0)};
const projectName=id=>nodeById.get(id)?.name||id;

function resolveRequirements(query){
  const hay=query.toLowerCase(), direct=new Set(), technologies=new Set();
  Object.entries(graph.matchIndex.aliases).forEach(([term,id])=>{if(hay.includes(term))direct.add(id)});
  Object.entries(graph.matchIndex.technologies).forEach(([term,id])=>{if(hay.includes(term))technologies.add(id)});
  const related=new Set();
  direct.forEach(id=>(graph.matchIndex.capabilityNeighbors[id]||[]).forEach(x=>related.add(x)));
  technologies.forEach(tech=>graph.edges.filter(e=>e.type==='USES_TECHNOLOGY'&&e.target===tech).forEach(e=>{
    const repo=nodeById.get(e.source);(repo?.capabilities||[]).forEach(id=>direct.add(id));
  }));
  return {direct,related,technologies};
}

function matchRecord(record, query, resolved){
  const caps=new Set(record.capabilities||[]);let score=literalScore([record.name,record.title,record.claim,record.summary,...(record.skills||[]),...(record.technologies||[])].join(' '),query);
  const direct=[...caps].filter(id=>resolved.direct.has(id));
  const transferable=[...caps].filter(id=>resolved.related.has(id)&&!resolved.direct.has(id));
  score+=direct.length*12+transferable.length*5;
  const technologyHits=(record.technologies||[]).filter(id=>resolved.technologies.has('tech:'+id));score+=technologyHits.length*9;
  return {...record,_score:score,_direct:direct,_transferable:transferable,_technologyHits:technologyHits};
}

function rank(query,type='evidence'){
  const resolved=resolveRequirements(query), source=type==='repository'?repositories:evidence;
  return source.map(item=>matchRecord(item,query,resolved)).sort((a,b)=>b._score-a._score||(a.name||a.title).localeCompare(b.name||b.title));
}

function capabilityNames(ids){return ids.map(id=>nodeById.get(id)?.name||id)}
function pathLabel(item){
  const direct=capabilityNames(item._direct||[]), transfer=capabilityNames(item._transferable||[]);
  if(direct.length)return `Direct capability path: ${direct.slice(0,3).join(' · ')}`;
  if(transfer.length)return `Transferable capability path: ${transfer.slice(0,3).join(' · ')}`;
  return 'Supporting implementation evidence';
}

function evidenceCards(items){return items.map(e=>`<div class="evidence-card"><strong>${esc(e.title)}</strong><div>${esc(e.claim)}</div><div>${(e.skills||[]).map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</div><div class="match-path">${esc(pathLabel(e))}</div><div class="proof">Verified · ${esc(projectName(e.project))} · ${esc(e.source)}</div></div>`).join('')}
function repositoryCards(items){return items.map(r=>`<div class="evidence-card"><strong>${esc(r.name)}</strong><div>${esc(r.summary)}</div><div>${(r.languages||[]).slice(0,4).map(x=>`<span class="tag">${esc(x.name)}</span>`).join('')}${(r.technologies||[]).slice(0,8).map(x=>`<span class="tag">${esc(nodeById.get('tech:'+x)?.name||x)}</span>`).join('')}</div><div class="match-path">${esc(pathLabel(r))}</div><div class="proof">${esc(r.evidenceLevel)} repository signal · ${esc(r.relativePath)} · ${r.signals.testFiles} test files</div></div>`).join('')}

function answer(query){
  const matchedEvidence=rank(query).filter(x=>x._score>0).slice(0,6), matchedRepos=rank(query,'repository').filter(x=>x._score>0).slice(0,6);
  $('#answer').classList.remove('empty');
  $('#answer').innerHTML=`<h3>Capability-based matches</h3><p>Exact words are only one signal. The graph also follows related capabilities, technologies, and implementation patterns.</p>${matchedEvidence.length?'<h4>Verified resume claims</h4>'+evidenceCards(matchedEvidence):''}${matchedRepos.length?'<h4>Relevant equivalent repository evidence</h4>'+repositoryCards(matchedRepos):'<p>No repository evidence matched this query.</p>'}`;
}

function renderExplore(){
  const term=$('#filter').value, pid=$('#projectFilter').value;
  const list=evidence.filter(e=>(!pid||e.project===pid)&&(!term||matchRecord(e,term,resolveRequirements(term))._score>0));
  $('#evidenceList').innerHTML=list.map(e=>`<article><strong>${esc(e.title)}</strong><p>${esc(e.claim)}</p><small>${esc(projectName(e.project))} · ${esc(e.source)}</small></article>`).join('');
  const featured=[...capabilities.map(x=>({...x,kind:'capability'})),...repositories.slice(0,30).map(x=>({...x,kind:'repository'}))];
  $('#graph').innerHTML=`<div class="node-grid">${featured.map(n=>`<span class="node ${n.kind}" title="${esc(n.summary||n.name)}">${esc(n.name)}</span>`).join('')}</div>`;
}

function boldTerms(text,terms){let out=esc(text);terms.sort((a,b)=>b.length-a.length).slice(0,10).forEach(t=>{out=out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'ig'),'<strong>$1</strong>')});return out}
function buildResume(){
  const role=$('#role').value.trim();if(!role)return;
  const chosen=rank(role).filter(e=>e._score>0).slice(0,10), repoMatches=rank(role,'repository').filter(r=>r._score>0).slice(0,6);
  const terms=[...new Set(chosen.flatMap(e=>e.skills||[]).filter(s=>literalScore(s,role)>0))];
  const capabilityTerms=[...new Set(chosen.flatMap(e=>capabilityNames(e._direct||[])))];
  const title=/\b(ai|llm|agent|machine learning|ml)\b/i.test(role)?'AI & Backend Software Engineer':'Software Engineer';
  const html=`<h3>${title}</h3><p><strong>Target:</strong> ${esc(role.split('\n')[0].slice(0,120))}</p><h4>Relevant skills</h4><p>${[...terms,...capabilityTerms].slice(0,20).map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</p><h4>Verified experience claims</h4><ul>${chosen.map(e=>`<li>${boldTerms(e.claim,terms)}</li>`).join('')}</ul><h4>Relevant equivalent repository evidence</h4><ul>${repoMatches.map(r=>`<li><strong>${esc(r.name)}:</strong> ${esc(r.summary)} <span class="proof">(${esc(pathLabel(r))}; ${esc(r.evidenceLevel)} signal)</span></li>`).join('')}</ul><p class="proof">Drafted from verified claims plus provenance-backed repository evidence. Repository signals must be reviewed before promotion into factual resume bullets.</p>`;
  $('#resumeOutput').classList.remove('empty');$('#resumeOutput').innerHTML=html;
  lastResume=`# ${title}\n\nTarget: ${role.split('\n')[0]}\n\n## Relevant skills\n${[...terms,...capabilityTerms].join(', ')}\n\n## Verified experience\n${chosen.map(e=>`- ${e.claim}`).join('\n')}\n\n## Relevant equivalent repository evidence\n${repoMatches.map(r=>`- ${r.name}: ${r.summary} (${pathLabel(r)}; ${r.evidenceLevel} signal; ${r.relativePath})`).join('\n')}\n`;
  $('#downloadResume').disabled=false;
}
function download(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lastResume],{type:'text/markdown'}));a.download='role-specific-resume-evidence.md';a.click();URL.revokeObjectURL(a.href)}

fetch('data/knowledge_graph.json').then(r=>r.json()).then(g=>{
  graph=g;nodeById=new Map(g.nodes.map(n=>[n['@id'],n]));evidence=g.nodes.filter(n=>n['@type']==='Evidence');projects=g.nodes.filter(n=>n['@type']==='Project');repositories=g.nodes.filter(n=>n['@type']==='Repository');capabilities=g.nodes.filter(n=>n['@type']==='Capability');skills=g.nodes.filter(n=>n['@type']==='Skill');
  $('#freshness').textContent=`Cached ${new Date(g.generatedAt).toLocaleString()}`;
  $('#stats').innerHTML=[['Repositories',g.counts.repositories],['Verified claims',g.counts.evidence],['Capabilities',g.counts.capabilities],['Technologies',g.counts.technologies]].map(([k,v])=>`<div class="stat"><b>${v}</b><small>${k}</small></div>`).join('');
  $('#projectFilter').innerHTML+=projects.map(p=>`<option value="${p['@id']}">${esc(p.name)}</option>`).join('');renderExplore();
});
$$('.nav').forEach(b=>b.onclick=()=>{$$('.nav,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.view).classList.add('active')});
$('#askBtn').onclick=()=>answer($('#question').value||'strongest verified and transferable evidence');$('#question').onkeydown=e=>{if(e.key==='Enter')answer(e.target.value)};$$('.chips button').forEach(b=>b.onclick=()=>{$('#question').value=b.textContent;answer(b.textContent)});$('#buildResume').onclick=buildResume;$('#downloadResume').onclick=download;$('#filter').oninput=renderExplore;$('#projectFilter').onchange=renderExplore;
