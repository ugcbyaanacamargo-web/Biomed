import {normalizeTutorPlan,fallbackTutorPlan} from "./tutor-schema.js";
import {renderBlocks} from "./learning-components.js";
import {trackLearningEvent} from "./analytics.js";

const SESSION_KEY="biomed-student-session-v1";
const CLIENT_TIMEOUT_MS=23000;

function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}}

async function callTutor(messages,mode="visual"){
  const s=session();
  if(!s?.token)throw new Error("Sessão do aluno não encontrada.");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),CLIENT_TIMEOUT_MS);
  try{
    const res=await fetch("/api/tutor",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.token},
      body:JSON.stringify({mode,messages}),
      signal:controller.signal
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||"Tutor temporariamente indisponível.");
    return data;
  }catch(error){
    if(controller.signal.aborted)throw new Error("O Tutor ultrapassou o limite de resposta rápida.");
    throw error;
  }finally{clearTimeout(timer)}
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

export function localTutorPlan(prompt=""){
  const p=String(prompt||"").toLowerCase();
  if(/simula|port[aã]o|modula/.test(p)){
    return normalizeTutorPlan({
      screen:{title:"Modulação da dor",objective:"Veja como toque e controle descendente alteram a transmissão.",progressLabel:"Resposta imediata"},
      blocks:[
        {type:"concept",title:"O sistema pode reduzir ou aumentar a transmissão",text:"No corno dorsal, entradas periféricas e sinais descendentes mudam o balanço entre excitação e inibição.",asset:"portao"},
        {type:"gate_diagram",title:"Teste o portão"},
        {type:"prediction",id:"local-mod",question:"Se a inibição aumentar, o que tende a acontecer com a transmissão nociceptiva?",options:["Aumentar","Diminuir"],answer:1,explanation:"Maior inibição tende a reduzir a transmissão nociceptiva."}
      ],
      nextAction:{type:"continue",label:"Quero outro exemplo"}
    });
  }
  if(/fibra|aβ|aδ|condu/.test(p)){
    return normalizeTutorPlan({
      screen:{title:"Aβ, Aδ e C",objective:"Compare velocidade, mielina e função antes de responder.",progressLabel:"Resposta imediata"},
      blocks:[
        {type:"fiber_comparison",title:"Compare as fibras"},
        {type:"multiple_choice",id:"local-fib",question:"Qual fibra conduz mais rapidamente?",options:["Aβ","Aδ","C"],answer:0,explanation:"Aβ é maior e mais mielinizada."}
      ],
      nextAction:{type:"continue",label:"Continuar"}
    });
  }
  if(/receptor|transdu|perceb/.test(p)){
    return normalizeTutorPlan({
      screen:{title:"Do estímulo ao sinal",objective:"Entenda como o receptor transforma energia em linguagem neural.",progressLabel:"Resposta imediata"},
      blocks:[
        {type:"concept",title:"O receptor é um tradutor biológico",text:"Ele detecta uma forma de energia e a converte em alteração elétrica que pode originar potenciais de ação.",asset:"receptores"},
        {type:"neural_path",title:"Sequência inicial",steps:["Estímulo","Receptor","Transdução","Sinal elétrico"]},
        {type:"multiple_choice",id:"local-rec",question:"Transdução significa:",options:["Converter estímulo em sinal elétrico","Levar o sinal ao córtex","Inibir o sistema motor"],answer:0,explanation:"Transdução é a conversão inicial do estímulo em sinal elétrico."}
      ],
      nextAction:{type:"continue",label:"Continuar"}
    });
  }
  if(/caso|cl[ií]nic/.test(p)){
    return normalizeTutorPlan({
      screen:{title:"Caso rápido",objective:"Use o mecanismo para justificar uma decisão.",progressLabel:"Resposta imediata"},
      blocks:[
        {type:"case_step",id:"local-case",title:"Caso clínico",scenario:"Após bater a perna, uma pessoa esfrega o local dolorido.",question:"Qual mecanismo ajuda a explicar um possível alívio?",options:["Entrada Aβ favorecendo inibição","Desmielinização imediata","Perda de propriocepção"],answer:0,explanation:"A entrada tátil Aβ pode favorecer interneurônios inibitórios no corno dorsal."}
      ],
      nextAction:{type:"continue",label:"Outro caso"}
    });
  }
  return normalizeTutorPlan({
    screen:{title:"Nocicepção e dor",objective:"Separe o processo neural da experiência percebida.",progressLabel:"Resposta imediata"},
    blocks:[
      {type:"compare",left:{title:"Nocicepção",text:"Detecção e processamento neural de estímulos potencialmente lesivos."},right:{title:"Dor",text:"Experiência sensorial e emocional percebida."}},
      {type:"multiple_choice",id:"local-default",question:"Nocicepção e dor são exatamente a mesma coisa?",options:["Sim","Não"],answer:1,explanation:"A dor emerge de processamento mais amplo e pode variar mesmo com entradas nociceptivas semelhantes."}
    ],
    nextAction:{type:"continue",label:"Continuar"}
  });
}

export async function gradeWrittenAnswer(question,text){
  try{
    const data=await callTutor([{role:"user",content:"Pergunta: "+question+"\nMinha resposta: "+text}],"grade");
    return data.parsed||null;
  }catch{return null}
}

export async function requestVisualPlan(prompt,history=[]){
  const started=performance.now();
  try{
    const messages=[...history.slice(-6),{role:"user",content:prompt}];
    const data=await callTutor(messages,"visual");
    return {
      plan:normalizeTutorPlan(data.plan||data.parsed||data.content),
      provider:data.provider||"fallback",
      durationMs:Number(data.durationMs||Math.round(performance.now()-started))
    };
  }catch(error){
    return {
      plan:localTutorPlan(prompt),
      provider:"local-fast",
      durationMs:Math.round(performance.now()-started),
      error:String(error?.message||error)
    };
  }
}

function appendHistory(log,role,text){
  const row=document.createElement("div");
  row.className="vt-history-row "+role;
  const label=document.createElement("strong");label.textContent=role==="user"?"Você":"Tutor BIOMED";
  const body=document.createElement("p");body.textContent=text;
  row.append(label,body);log.append(row);log.scrollTop=log.scrollHeight;
}

function renderPlan(canvas,plan,handlers={}){
  const banner=document.createElement("div");banner.className="vt-screen-banner";
  const bannerCopy=document.createElement("div");
  const progress=document.createElement("span");progress.textContent=plan.screen.progressLabel;
  const heading=document.createElement("h3");heading.textContent=plan.screen.title;
  const objective=document.createElement("p");objective.textContent=plan.screen.objective;
  bannerCopy.append(progress,heading,objective);banner.append(bannerCopy);
  canvas.replaceChildren(banner);
  const blocks=document.createElement("div");blocks.className="learning-stage";canvas.append(blocks);
  renderBlocks(blocks,plan.blocks,handlers);
  if(plan.nextAction.type==="continue"){
    const next=document.createElement("button");next.type="button";next.className="app-primary vt-next";next.textContent=plan.nextAction.label||"Continuar";
    next.addEventListener("click",()=>handlers.onContinue?.());
    canvas.append(next);
  }
}

export async function mountVisualTutor(mount,{prompt="Conduza uma atividade visual curta sobre meu ponto mais importante agora.",title="Tutor IA",contextLabel="Sessão adaptativa"}={}){
  if(!mount)return;
  mount.innerHTML="";

  const head=document.createElement("div");head.className="vt-head";
  const headCopy=document.createElement("div");
  const kicker=document.createElement("span");kicker.className="app-kicker";kicker.textContent=contextLabel;
  const h2=document.createElement("h2");h2.textContent=title;
  const desc=document.createElement("p");desc.textContent="A atividade aparece imediatamente; a IA refina o próximo passo em segundo plano.";
  headCopy.append(kicker,h2,desc);
  const status=document.createElement("div");status.className="vt-status";
  const dot=document.createElement("i"),statusText=document.createElement("span");statusText.textContent="Atividade pronta • IA ajustando...";
  status.append(dot,statusText);head.append(headCopy,status);

  const historyLog=document.createElement("div");historyLog.className="vt-history";
  const canvas=document.createElement("div");canvas.className="learning-stage";
  const composer=document.createElement("form");composer.className="vt-composer";
  const ta=document.createElement("textarea");ta.rows=2;ta.placeholder="Peça outra explicação, exemplo, caso ou simulação...";
  const send=document.createElement("button");send.type="submit";send.textContent="Enviar ao Tutor";
  composer.append(ta,send);mount.append(head,historyLog,canvas,composer);

  const history=[];
  let requestSerial=0;

  const handlers={
    onAnswer:async({block,correct,selected})=>{
      trackLearningEvent("answer_submitted",{source:"tutor",type:block.type,correct});
      if(correct)trackLearningEvent("answer_correct",{source:"tutor",type:block.type});
      await learningAction("tutor_answer",{blockId:block.id||null,type:block.type,correct,selected}).catch(()=>{});
    },
    onOpenAnswer:async({block,text,mount:result})=>{
      result.textContent="Resposta registrada. Tutor avaliando...";
      const grade=await gradeWrittenAnswer(block.question||"Explique o conceito.",text);
      if(grade){
        result.replaceChildren();
        const gradeBox=document.createElement("div");gradeBox.className="vt-grade";
        const gradeScore=document.createElement("strong");gradeScore.textContent="Nota "+Number(grade.score||0).toFixed(1)+"/10";
        const gradeFeedback=document.createElement("p");gradeFeedback.textContent=String(grade.feedback||grade.correction||"Resposta avaliada.");
        gradeBox.append(gradeScore,gradeFeedback);result.append(gradeBox);
        await learningAction("tutor_answer",{blockId:block.id||null,type:"open_answer",score:Number(grade.score||0),topic:grade.topic||null}).catch(()=>{});
      }else{
        result.textContent="Resposta salva. A avaliação por IA demorou além do limite; continue sem ficar preso nesta tela.";
      }
    },
    onSimulation:({transmission})=>trackLearningEvent("simulation_used",{source:"tutor",transmission}),
    onBlockViewed:({block})=>trackLearningEvent("lesson_block_viewed",{source:"tutor",type:block.type}),
    onContinue:()=>load("Continue a sequência a partir do que acabou de ensinar. Use outro recurso visual e uma nova interação.",true)
  };

  async function load(userPrompt,showUser=false){
    const serial=++requestSerial;
    const localPlan=localTutorPlan(userPrompt);
    if(showUser)appendHistory(historyLog,"user",userPrompt);
    renderPlan(canvas,localPlan,handlers);
    statusText.textContent="Atividade pronta • IA ajustando...";
    send.disabled=true;

    const started=performance.now();
    const result=await requestVisualPlan(userPrompt,history);
    if(serial!==requestSerial)return;

    const elapsed=Math.round(performance.now()-started);
    renderPlan(canvas,result.provider==="groq"?result.plan:localPlan,handlers);
    if(result.provider==="groq")history.push({role:"user",content:userPrompt},{role:"assistant",content:result.plan.screen.title+": "+result.plan.screen.objective});
    trackLearningEvent("tutor_action_rendered",{title:result.plan.screen.title,blocks:result.plan.blocks.length,provider:result.provider,durationMs:elapsed});
    learningAction("tutor_action",{title:result.plan.screen.title,blockTypes:result.plan.blocks.map(b=>b.type),provider:result.provider,durationMs:elapsed}).catch(()=>{});

    if(result.provider==="groq"){
      statusText.textContent="IA adaptou em "+(elapsed/1000).toFixed(1)+" s";
      appendHistory(historyLog,"assistant",result.plan.screen.title+" — "+result.plan.screen.objective);
    }else{
      statusText.textContent="Modo rápido ativo • você pode continuar";
    }
    send.disabled=false;
  }

  composer.addEventListener("submit",e=>{
    e.preventDefault();
    const v=ta.value.trim();if(!v||send.disabled)return;
    ta.value="";
    statusText.textContent="Pedido enviado • respondendo...";
    load(v,true);
  });

  renderPlan(canvas,localTutorPlan(prompt),handlers);
  load(prompt,false);
}
