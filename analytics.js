const EVENT_NAMES=new Set([
  "student_dashboard_viewed","study_resumed","lesson_started","lesson_block_viewed","answer_submitted",
  "answer_correct","lesson_completed","practice_started","simulation_used","exam_started","exam_completed",
  "exam_passed","exam_failed","tutor_action_rendered","student_stuck_detected"
]);
let client=null,identified=null;

export function sanitizeAnalyticsProperties(properties={}){
  const out={};
  for(const [key,value] of Object.entries(properties||{})){
    if(/cpf|document|token|authorization|password/i.test(key)) continue;
    const s=typeof value==="string"?value:String(value??"");
    if(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(s)) continue;
    out[key]=typeof value==="string"?value.slice(0,300):value;
  }
  return out;
}
export function setAnalyticsClient(value){client=value||null}
export function identifyStudent(studentId){
  if(!client||!studentId||identified===studentId)return;
  identified=studentId;
  try{client.identify(String(studentId))}catch{}
}
export function trackLearningEvent(name,properties={}){
  if(!EVENT_NAMES.has(name)) return false;
  const safe=sanitizeAnalyticsProperties(properties);
  try{client?.capture?.(name,safe);return Boolean(client)}catch{return false}
}
export function initAnalyticsFromWindow(){
  if(typeof window==="undefined")return null;
  const ph=window.posthog;
  if(ph&&typeof ph.capture==="function"){setAnalyticsClient(ph);return ph}
  return null;
}
export {EVENT_NAMES};
