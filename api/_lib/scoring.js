export const TOPICS=["receptores","fibras","vias","nocicepcao","portao","descendente","contexto","semaforo"];

const avg=a=>a.length?a.reduce((s,n)=>s+Number(n||0),0)/a.length:0;
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));

export function normalizeStats(input={}){
  const stats={
    mastery:{},
    content_completed:[],
    diagnostic_done:false,
    exam_scores:[],
    simulation_scores:[],
    case_scores:[],
    open_answer_scores:[],
    retention_scores:[],
    active_days:[],
    questions_answered:0,
    questions_correct:0,
    tutor_turns:0,
    ...input
  };
  stats.mastery=stats.mastery&&typeof stats.mastery==="object"?stats.mastery:{};
  for(const k of TOPICS) if(stats.mastery[k]!=null) stats.mastery[k]=clamp(Number(stats.mastery[k])||0);
  for(const k of ["exam_scores","simulation_scores","case_scores","open_answer_scores","retention_scores"]){
    stats[k]=Array.isArray(stats[k])?stats[k].map(x=>clamp(Number(x)||0)).slice(-40):[];
  }
  stats.content_completed=[...new Set(Array.isArray(stats.content_completed)?stats.content_completed.map(String):[])].slice(0,40);
  stats.active_days=[...new Set(Array.isArray(stats.active_days)?stats.active_days.map(String):[])].slice(-30);
  stats.questions_answered=Math.max(0,Number(stats.questions_answered)||0);
  stats.questions_correct=Math.max(0,Number(stats.questions_correct)||0);
  stats.tutor_turns=Math.max(0,Number(stats.tutor_turns)||0);
  stats.diagnostic_done=Boolean(stats.diagnostic_done);
  return stats;
}

export function computeLearningScore(statsInput){
  const s=normalizeStats(statsInput);
  const masteryValues=TOPICS.map(k=>Number(s.mastery[k])).filter(Number.isFinite);
  const mastery=avg(masteryValues);
  const exams=avg(s.exam_scores);
  const simulations=avg([...s.simulation_scores,...s.case_scores]);
  const retention=avg(s.retention_scores);
  const active7=s.active_days.slice(-7).length;
  const consistency=clamp(active7/5*100);
  const tutor=avg(s.open_answer_scores);
  const score=.40*mastery+.25*exams+.15*simulations+.10*retention+.05*consistency+.05*tutor;
  return Math.round(clamp(score)*100)/100;
}

export function determineLevel(statsInput,score){
  const s=normalizeStats(statsInput);
  const masteryVals=TOPICS.map(k=>Number(s.mastery[k]||0));
  const minMastery=Math.min(...masteryVals);
  const examBest=Math.max(0,...s.exam_scores);
  const simCount=s.simulation_scores.filter(x=>x>=60).length+s.case_scores.filter(x=>x>=60).length;
  const openStrong=s.open_answer_scores.filter(x=>x>=80).length;
  const retention=avg(s.retention_scores);

  if(score>=88 && minMastery>=85 && examBest>=85 && retention>=80 && openStrong>=5 && simCount>=6) return "diamante";
  if(score>=70 && minMastery>=70 && examBest>=75 && simCount>=3) return "ouro";
  if(score>=45 && s.diagnostic_done && s.content_completed.length>=4 && examBest>=60) return "prata";
  return "bronze";
}

export function xpForEvent(type,payload={}){
  switch(type){
    case "content_complete": return 40;
    case "diagnostic": return 80;
    case "question": return payload.correct?8:2;
    case "exam": return Number(payload.score)>=60?120:40;
    case "simulation": return Number(payload.score)>=60?50:20;
    case "case": return Number(payload.score)>=60?70:25;
    case "open_answer": return Math.round(clamp(Number(payload.score)||0)/10*50);
    case "retention": return Number(payload.score)>=70?70:25;
    case "tutor_turn": return 0;
    default:return 0;
  }
}

export function applyEvent(statsInput,type,payload={}){
  const s=normalizeStats(statsInput);
  const day=new Date().toISOString().slice(0,10);
  s.active_days=[...new Set([...s.active_days,day])].slice(-30);

  if(type==="content_complete"&&payload.module) s.content_completed=[...new Set([...s.content_completed,String(payload.module)])].slice(0,40);
  if(type==="diagnostic"){s.diagnostic_done=true;if(Number.isFinite(Number(payload.score)))s.exam_scores.push(clamp(Number(payload.score)))}
  if(type==="question"){
    s.questions_answered++;
    if(payload.correct)s.questions_correct++;
    if(payload.topic&&TOPICS.includes(payload.topic)&&Number.isFinite(Number(payload.mastery))){
      s.mastery[payload.topic]=clamp(Number(payload.mastery));
    }
  }
  if(type==="progress_snapshot"&&payload.mastery&&typeof payload.mastery==="object"){
    for(const k of TOPICS){
      if(Number.isFinite(Number(payload.mastery[k]))) s.mastery[k]=clamp(Number(payload.mastery[k]));
    }
    if(payload.diagnosticDone) s.diagnostic_done=true;
  }
  if(type==="exam"&&Number.isFinite(Number(payload.score))) s.exam_scores.push(clamp(Number(payload.score)));
  if(type==="simulation"&&Number.isFinite(Number(payload.score))) s.simulation_scores.push(clamp(Number(payload.score)));
  if(type==="case"&&Number.isFinite(Number(payload.score))) s.case_scores.push(clamp(Number(payload.score)));
  if(type==="open_answer"&&Number.isFinite(Number(payload.score))) s.open_answer_scores.push(clamp(Number(payload.score)*10));
  if(type==="retention"&&Number.isFinite(Number(payload.score))) s.retention_scores.push(clamp(Number(payload.score)));
  if(type==="tutor_turn") s.tutor_turns++;
  return normalizeStats(s);
}

export function levelRequirements(){
  return {
    bronze:{label:"Bronze",description:"Construir os fundamentos e realizar o diagnóstico."},
    prata:{label:"Prata",description:"Score ≥45, diagnóstico concluído, 4 módulos e prova ≥60%."},
    ouro:{label:"Ouro",description:"Score ≥70, todos os tópicos ≥70%, prova ≥75% e 3 práticas aprovadas."},
    diamante:{label:"Diamante",description:"Score ≥88, tópicos ≥85%, prova ≥85%, retenção ≥80% e domínio em respostas abertas."}
  };
}
