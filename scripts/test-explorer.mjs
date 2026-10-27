import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TOPICS,topicRecords} from '../assets/js/topics.mjs';
const profile=JSON.parse(fs.readFileSync(new URL('../assets/data/public-knowledge.json',import.meta.url)));
const graph=JSON.parse(fs.readFileSync(new URL('../assets/data/public-graph.json',import.meta.url)));
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.equal(TOPICS.length,6);
assert.equal(new Set(TOPICS.map(t=>t.id)).size,6);
for(const topic of TOPICS) {
  const records=topicRecords(topic.id,profile);
  assert.equal(records.length,topic.records.length,`Missing record for ${topic.id}`);
  assert(records.length>0 && records.length<=2);
  assert(html.includes(`data-topic="${topic.id}"`));
  assert(html.includes(`data-edge="${topic.id}"`));
  for(const record of records) {
    const node=graph.nodes.find(n=>n['@id']==='public:'+record.id);
    assert(node,`Public graph missing ${record.id}`);
    assert.equal(node.description,record.summary);
    for(const skill of record.skills) {
      const skillNode=graph.nodes.find(n=>n['@type']==='Skill' && n.name===skill);
      assert(graph.edges.some(e=>e.source===node['@id'] && e.target===skillNode['@id'] && e.type==='DEMONSTRATES_SKILL'));
    }
  }
}
assert.deepEqual(topicRecords('unknown',profile),[]);
assert(topicRecords('retrieval',profile).some(r=>r.source.url.includes('mastering_rag')));
assert(html.includes('class="brand-mark">KD</span>'));
assert(!html.includes('question-form'));
assert(!/href="assets\/data\//.test(html),'No visitor-facing raw JSON links');
assert(!html.includes('Portfolio Q&amp;A'));
console.log('Passed six-topic mapping, reviewed evidence, graph relationships, project links, and visitor UI checks.');
