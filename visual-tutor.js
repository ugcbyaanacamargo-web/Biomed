import {normalizeTutorPlan,fallbackTutorPlan} from "./tutor-schema.js";
import {renderBlocks} from "./learning-components.js";
import {trackLearningEvent} from "./analytics.js";

const SESSION_KEY="biomed-student-session-v1";
function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}}
async function callTutor(messages,mode="visual"){
  const s=session();
  if(!s?.token)throw new Error("Sessão do aluno não encontrada.");
  const res=await fetch("/api/tutor",{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.token},
    body:JSON.stringify({mode,messages})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||"Tutor temporariamente indisponível.");
  return data;
}
async function learningAction(action,payload={}){
  const s=session();if(!s?.token)return null;
  const eventKey=(crypto.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2));
  const res=await fetch("/api/learning-event",{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.token},
    body:JSON.stringify({action,eventKey,payload})
  });
  return res.ok?res.json():null;
}
export async function gradeWrittenAnswer(question,text){
  const data=await callTutor([{role:"user",content:"Pergunta: "+question+"\nMinha resposta: "+text}],"grade");
  return data.parsed||null;
}
export async function requestVisualPlan(prompt){
  try{
    const data=await callTutor([{role:"user",content:prompt}],"visual");
    return normalizeTutorPlan(data.plan||data.parsed||data.content);
  }catch(e){
    return fallbackTutorPlan("O Tutor IA não respondeu agora. Continue pela atividade visual local e tente novamente em instantes.");
  }
}
export async function mountVisualTutor(mount,{prompt="Conduza uma atividade visual curta sobre meu ponto mais importante agora.",title="Tutor IA",contextLabel="Sessão adaptativa"}={}){
  if(!mount)return;
  mount.innerHTML="";
  const head=document.createElement("div");head.className="vt-head";
  head.innerHTML='<div><span class="app-kicker">'+contextLabel+'</span><h2>'+title+'</h2><p>Eu organizo a próxima explicação, pergunta ou simulação. Você responde clicando ou escrevendo.</p></div><div class="vt-status"><i></i><span>Preparando atividade...</span></div>';
  const canvas=document.createElement("div");canvas.className="learning-stage";
  const composer=document.createElement("form");composer.className="vt-composer";
  composer.innerHTML='<textarea rows="2" placeholder="Peça outra explicação, exemplo, caso ou simulação..."></textarea><button type="submit">Enviar ao Tutor</button>';
  mount.append(head,canvas,composer);

  const history=[];
  async function load(userPrompt){
    const status=head.querySelector(".vt-status span");status.textContent="Tutor organizando a próxima tela...";
    const plan=await requestVisualPlan(userPrompt);history.push({role:"user",content:userPrompt});
    status.textContent="Atividade pronta";
    trackLearningEvent("tutor_action_rendered",{title:plan.screen.title,blocks:plan.blocks.length});
    await learningAction("tutor_action",{title:plan.screen.title,blockTypes:plan.blocks.map(b=>b.type)});
    const banner=document.createElement("div");banner.className="vt-screen-banner";
    banner.innerHTML='<div><span>'+plan.screen.progressLabel+'</span><h3>'+plan.screen.title+'</h3><p>'+plan.screen.objective+'</p></div>';
    canvas.replaceChildren(banner);
    const blocks=document.createElement("div");blocks.className="learning-stage";canvas.append(blocks);
    renderBlocks(blocks,plan.blocks,{
      onAnswer:async({block,correct,selected})=>{
        trackLearningEvent("answer_submitted",{source:"tutor",type:block.type,correct});
        if(correct)trackLearningEvent("answer_correct",{source:"tutor",type:block.type});
        await learningAction("tutor_answer",{blockId:block.id||null,type:block.type,correct,selected});
      },
      onOpenAnswer:async({block,text,mount:result})=>{
        result.textContent="Tutor avaliando seu raciocínio...";
        const grade=await gradeWrittenAnswer(block.question||"Explique o conceito.",text);
        if(grade){
          result.innerHTML='<div class="vt-grade"><strong>Nota '+Number(grade.score||0).toFixed(1)+'/10</strong><p>'+String(grade.feedback||grade.correction||"Resposta avaliada.")+'</p></div>';
          await learningAction("tutor_answer",{blockId:block.id||null,type:"open_answer",score:Number(grade.score||0),topic:grade.topic||null});
        }else result.textContent="Resposta registrada. Continue e compare com os próximos exemplos.";
      },
      onSimulation:({transmission})=>trackLearningEvent("simulation_used",{source:"tutor",transmission}),
      onBlockViewed:({block})=>trackLearningEvent("lesson_block_viewed",{source:"tutor",type:block.type})
    });
    if(plan.nextAction.type==="continue"){
      const next=document.createElement("button");next.type="button";next.className="app-primary vt-next";next.textContent=plan.nextAction.label||"Continuar";
      next.addEventListener("click",()=>load("Continue a sequência a partir do que acabou de ensinar. Use outro recurso visual e uma nova interação."));
      canvas.append(next);
    }
  }
  composer.addEventListener("submit",e=>{e.preventDefault();const ta=composer.querySelector("textarea"),v=ta.value.trim();if(!v)return;ta.value="";load(v)});
  await load(prompt);
}
