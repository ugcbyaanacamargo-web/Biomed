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

function installPostHogStub(host){
  if(typeof window==="undefined"||window.posthog?.__SV)return window.posthog;
  const t=document,e=window.posthog||[];
  window.posthog=e;e._i=[];
  e.init=function(key,config){
    const methods="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags".split(" ");
    const stub=e;
    stub.people=stub.people||[];
    const add=(target,name)=>{target[name]=function(){target.push([name,...arguments])}};
    methods.forEach(name=>{if(name.includes(".")){const [group,method]=name.split(".");stub[group]=stub[group]||[];add(stub[group],method)}else add(stub,name)});
    const script=t.createElement("script");script.type="text/javascript";script.async=true;script.crossOrigin="anonymous";
    script.src=(config.api_host||host).replace(/\/$/,"")+"/static/array.full.js";
    const first=t.getElementsByTagName("script")[0];first?.parentNode?.insertBefore(script,first);
    e._i.push([key,config,"posthog"]);
  };
  e.__SV=1;return e;
}

export async function bootstrapAnalytics(){
  if(typeof window==="undefined")return null;
  const existing=initAnalyticsFromWindow();if(existing)return existing;
  try{
    const res=await fetch("/api/runtime-config",{headers:{Accept:"application/json"}});
    const cfg=await res.json();
    if(!res.ok||!cfg?.posthog?.enabled||!cfg.posthog.key)return null;
    const ph=installPostHogStub(cfg.posthog.host);
    ph.init(cfg.posthog.key,{
      api_host:cfg.posthog.host,
      autocapture:false,
      capture_pageview:false,
      capture_exceptions:true,
      session_recording:{maskAllInputs:true},
      before_send:event=>{
        if(!event)return event;
        event.properties=sanitizeAnalyticsProperties(event.properties||{});
        return event;
      }
    });
    setAnalyticsClient(ph);return ph;
  }catch{return null}
}
export {EVENT_NAMES};
