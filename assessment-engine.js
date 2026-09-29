import {MODULES,getModule} from "./data/course-model.js";

export const PASS_THRESHOLD=70;

const BANK={
  perceber:[
    q("perceber-q1","Qual evento inicia o caminho sensorial?",["Interpretação cortical","Detecção pelo receptor","Controle descendente"],1,"receptores"),
    q("perceber-q2","Transdução é:",["Conversão do estímulo em sinal elétrico","Cruzamento da via","Percepção consciente"],0,"receptores"),
    q("perceber-q3","Qual receptor informa posição e movimento?",["Proprioceptor","Nociceptor","Termorreceptor"],0,"receptores")
  ],
  conduzir:[
    q("conduzir-q1","Qual fibra é maior e mais mielinizada?",["Aβ","Aδ","C"],0,"fibras"),
    q("conduzir-q2","A dor lenta e difusa associa-se mais a:",["Aβ","Aδ","C"],2,"fibras"),
    q("conduzir-q3","Dor e temperatura seguem principalmente:",["Sistema anterolateral","Coluna dorsal","Trato corticoespinal"],0,"vias")
  ],
  processar:[
    q("processar-q1","Nocicepção e dor são sinônimos?",["Sim","Não"],1,"nocicepcao"),
    q("processar-q2","A atenção pode modificar a percepção dolorosa?",["Não","Sim"],1,"contexto"),
    q("processar-q3","A dor depende apenas do tamanho da lesão?",["Sim","Não"],1,"contexto")
  ],
  modular:[
    q("modular-q1","O Portão da Dor é:",["Uma porta anatômica","Uma metáfora para balanço de circuitos","Um receptor periférico"],1,"portao"),
    q("modular-q2","Entrada Aβ pode:",["Recrutar inibição no corno dorsal","Bloquear todo movimento","Criar nociceptor"],0,"portao"),
    q("modular-q3","Vias descendentes podem:",["Somente inibir","Somente facilitar","Inibir ou facilitar"],2,"descendente")
  ],
  aplicar:[
    q("aplicar-q1","Esfregar uma região dolorida pode favorecer:",["Inibição segmentar","Desmielinização","Perda proprioceptiva"],0,"semaforo"),
    q("aplicar-q2","Perda de vibração e propriocepção lembra:",["Coluna dorsal","Sistema anterolateral apenas","Trato motor"],0,"vias"),
    q("aplicar-q3","Um bom raciocínio clínico integra:",["Apenas receptor","Receptor, via, processamento e modulação","Somente emoção"],1,"semaforo")
  ]
};
function q(id,stem,options,correctIndex,topic){return{id,stem,options,correctIndex,topic}}

export function getQuestionBank(moduleId="cumulative"){
  if(moduleId==="cumulative") return Object.values(BANK).flat();
  return BANK[moduleId]||BANK.perceber;
}
export function buildExam(moduleId,count=10,seed=Date.now()){
  const source=getQuestionBank(moduleId);
  const arr=[...source];
  let x=Math.abs(Number(seed)||1);
  while(arr.length<count) arr.push(...source.map((q,i)=>({...q,id:q.id+"-"+arr.length+"-"+i})));
  for(let i=arr.length-1;i>0;i--){
    x=(x*1664525+1013904223)>>>0;
    const j=x%(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr.slice(0,count);
}
export function gradeExam(questions,answers,passThreshold=PASS_THRESHOLD){
  const safe=Array.isArray(questions)?questions:[];
  let correct=0;const weaknesses=[];
  const detail=safe.map((question,index)=>{
    const selected=Number(answers?.[index]);
    const ok=selected===question.correctIndex;
    if(ok) correct++; else if(question.topic&&!weaknesses.includes(question.topic)) weaknesses.push(question.topic);
    return{id:question.id,selected,correct:ok,topic:question.topic};
  });
  const score=safe.length?Math.round(correct/safe.length*100):0;
  return{score,correct,total:safe.length,passed:score>=passThreshold,passThreshold,weaknesses,detail};
}
export function bestAndLatest(attempts=[],moduleId){
  const rows=(attempts||[]).filter(a=>!moduleId||a.moduleId===moduleId);
  if(!rows.length) return{best:null,latest:null,passed:false,attempts:0};
  const latest=Number(rows[0].score),best=Math.max(...rows.map(r=>Number(r.score)||0));
  return{best,latest,passed:rows.some(r=>r.passed),attempts:rows.length};
}
export function recoveryMessage(result){
  if(result.passed) return"Você atingiu o domínio mínimo. Avance e mantenha revisões curtas.";
  return result.weaknesses.length
    ?"Antes da próxima tentativa, revise: "+result.weaknesses.join(", ")+"."
    :"Faça uma revisão curta antes de tentar novamente.";
}
export function recommendedPractice(profile={}){
  const mastery=profile.student?.stats?.mastery||{};
  const weak=Object.entries(mastery).sort((a,b)=>Number(a[1])-Number(b[1]))[0]?.[0];
  const current=profile.learningState?.currentModule||"perceber";
  return{moduleId:current,topic:weak||getModule(current).id,sequence:["multiple_choice","open_answer","simulation","case_step"]};
}
