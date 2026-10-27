// Curated navigation groups over the reviewed public profile. No inferred claims.
export const TOPICS = [
  {id:'agents', label:'Agent systems', records:['capability-1','capability-9']},
  {id:'retrieval', label:'RAG & search', records:['capability-4','rag-lab']},
  {id:'backend', label:'Backend engineering', records:['capability-11','capability-6']},
  {id:'security', label:'Secure tool integrations', records:['capability-2','capability-10']},
  {id:'cloud', label:'Cloud & observability', records:['capability-7','capability-8']},
  {id:'evaluation', label:'Evaluation & delivery', records:['capability-5','capability-12']}
];
export function topicRecords(id, profile) {
  const topic = TOPICS.find(t=>t.id===id);
  if(!topic) return [];
  return topic.records.map(recordId=>profile.records.find(r=>r.id===recordId)).filter(Boolean);
}
