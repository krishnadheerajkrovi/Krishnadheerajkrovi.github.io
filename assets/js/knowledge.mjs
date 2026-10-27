// Retrieval over the reviewed public subset only. Never load the private career graph.
const STOP = new Set('a an and are as at be been can could did do does doing for from give had has have he her him his how i in is it its me my of on or our please show some tell that the their them there these they this to us use used using was were what when where which who why will with work worked working would you your krishna experience experienced built build about know knows skill skills system systems kind kinds example examples background'.split(' '));
const normalize = (text) => String(text).toLowerCase().normalize('NFKC').replace(/[^a-z0-9+#]+/g, ' ').trim();
const canonical = (word) => ({evaluates:'evaluation',evaluate:'evaluation',evaluating:'evaluation',evals:'evaluation',agents:'agent',apis:'api',projects:'project',models:'model',databases:'database',tools:'tool',frameworks:'framework',capabilities:'capability',tests:'testing',test:'testing',monitor:'monitoring'}[word] || word);
export function tokens(text) {
  return [...new Set(normalize(text).split(/\s+/).map(canonical).filter(w => w.length > 1 && /[a-z]/.test(w) && !STOP.has(w)))];
}
export function answerQuestion(question, knowledge) {
  const raw = String(question || '').trim().slice(0, 500);
  const q = normalize(raw);
  if (!raw) return {type:'empty', intro:'Ask about an engineering skill or public project.', records:[]};
  if (/\b(salary|compensation|visa|sponsorship|citizenship|available|availability|hiring|relocat|phone|address)\b/.test(q)) {
    return {type:'unknown', intro:'The public knowledge base does not verify that information. Please contact Krishna directly for current details.',records:[]};
  }
  if (/\b(secret|secrets|password|passwords|credential|credentials|confidential|proprietary|private)\b/.test(q) && !/\b(skills|capabilities|summary|summaries)\b/.test(q)) {
    return {type:'private',intro:'Private repositories, internal project details, and source documents are not included here. You can explore the public projects and reviewed capability summaries instead.',records:[]};
  }
  const terms = tokens(raw);
  const overview = /\b(skills|capabilities|strengths|background|technical toolkit)\b/.test(q) && terms.filter(t=>!['capability','technical','toolkit','strengths','main','key','engineering','technical'].includes(t)).length === 0;
  if (overview || /^(who is krishna|tell me about krishna|tell me about yourself|what can krishna do|what can he do|what is his tech stack|what is krishna s tech stack)$/.test(q)) {
    const ids = ['capability-1','capability-4','capability-11'];
    return {type:'overview',intro:'Krishna’s reviewed experience spans agent orchestration, retrieval and knowledge systems, backend APIs, security, evaluation, and cloud delivery. Here are a few examples.',records:ids.map(id=>knowledge.records.find(r=>r.id===id)).filter(Boolean)};
  }
  const publicOnly = /\b(project|projects|portfolio|repository|repositories|github)\b/.test(q) && !/\b(confidential|private)\b/.test(q);
  const candidates = knowledge.records.filter(r=>!publicOnly || r.kind==='public-project');
  const ranked = candidates.map(record=>{
    const title = new Set(tokens(record.title));
    const skills = new Set(tokens(record.skills.join(' ')));
    const aliases = new Set(tokens(record.aliases));
    const body = new Set(tokens(record.summary));
    const score = terms.reduce((sum,t)=>sum+(title.has(t)?4:0)+(skills.has(t)?5:0)+(aliases.has(t)?3:0)+(body.has(t)?1:0),0);
    return {record,score};
  }).filter(x=>x.score>=3).sort((a,b)=>b.score-a.score);
  if (!ranked.length) return {type:'unknown',intro:'I couldn’t find reviewed public evidence for that question. That does not mean Krishna lacks the skill; it means this knowledge base does not document it. Try a specific technology or contact him for more context.',records:[]};
  const best = ranked[0].score;
  return {type:'matches',intro:publicOnly?'Here are the most relevant public projects, with links to their repositories.':'Here is the closest documented experience. These summaries support the capabilities shown; they do not verify every requirement in a question.',records:ranked.filter(x=>x.score>=Math.max(3,best*.4)).slice(0,3).map(x=>x.record)};
}
