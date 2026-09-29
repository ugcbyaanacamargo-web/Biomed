(function(){
"use strict";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const LOCAL_DB="biomed-local-students-v1";
const SESSION_KEY="biomed-student-session-v1";
const TOPICS=["receptores","fibras","vias","nocicepcao","portao","descendente","contexto","semaforo"];
const LEVELS={
  bronze:{label:"Bronze",icon:"🥉",min:0,next:45},
  prata:{label:"Prata",icon:"🥈",min:45,next:70},
  ouro:{label:"Ouro",icon:"🥇",min:70,next:88},
  diamante:{label:"Diamante",icon:"💎",min:88,next:100}
};

let session=readSession();
let student=null;
let serverMode=false;
let tutorMessages=[];
let currentTutorMode="chat";
let levelExam=null;
let lastAdaptiveSnapshot="";

function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}}
function saveSession(v){session=v;localStorage.setItem(SESSION_KEY,JSON.stringify(v))}
function clearSession(){session=null;student=null;localStorage.removeItem(SESSION_KEY)}
function localDb(){try{return JSON.parse(localStorage.getItem(LOCAL_DB)||"{}")}catch{return {}}}
function saveLocalDb(db){localStorage.setItem(LOCAL_DB,JSON.stringify(db))}
function digits(v){return String(v||"").replace(/\D/g,"")}
function clamp(n,a=0,b=100){return Math.max(a,Math.min(b,n))}
function avg(a){return a.length?a.reduce((s,n)=>s+Number(n||0),0)/a.length:0}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2)}
async function hashCpf(cpf){
  const data=new TextEncoder().encode(digits(cpf));
  const h=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function validCPF(input){
  const cpf=digits(input);
  if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
  const calc=(base,factor)=>{let t=0;for(const n of base)t+=Number(n)*factor--;const m=(t*10)%11;return m===10?0:m};
  return calc(cpf.slice(0,9),10)===Number(cpf[9])&&calc(cpf.slice(0,10),11)===Number(cpf[10]);
}
function defaultStats(){return{mastery:{},content_completed:[],diagnostic_done:false,exam_scores:[],simulation_scores:[],case_scores:[],open_answer_scores:[],retention_scores:[],active_days:[],questions_answered:0,questions_correct:0,tutor_turns:0}}
function localScore(stats){
  stats={...defaultStats(),...(stats||{})};
  const m=TOPICS.map(k=>Number(stats.mastery?.[k])).filter(Number.isFinite);
  const mastery=avg(m), exams=avg(stats.exam_scores||[]), sims=avg([...(stats.simulation_scores||[]),...(stats.case_scores||[])]);
  const retention=avg(stats.retention_scores||[]), consistency=clamp((stats.active_days||[]).slice(-7).length/5*100), tutor=avg(stats.open_answer_scores||[]);
  return Math.round((.40*mastery+.25*exams+.15*sims+.10*retention+.05*consistency+.05*tutor)*100)/100;
}
function localLevel(stats,score){
  const s={...defaultStats(),...(stats||{})};
  const mins=TOPICS.map(k=>Number(s.mastery?.[k]||0));
  const minMastery=Math.min(...mins), examBest=Math.max(0,...(s.exam_scores||[])), simCount=(s.simulation_scores||[]).filter(x=>x>=60).length+(s.case_scores||[]).filter(x=>x>=60).length;
  const strong=(s.open_answer_scores||[]).filter(x=>x>=80).length, retention=avg(s.retention_scores||[]);
  if(score>=88&&minMastery>=85&&examBest>=85&&retention>=80&&strong>=5&&simCount>=6)return"diamante";
  if(score>=70&&minMastery>=70&&examBest>=75&&simCount>=3)return"ouro";
  if(score>=45&&s.diagnostic_done&&(s.content_completed||[]).length>=4&&examBest>=60)return"prata";
  return"bronze";
}
function normalizeLocalStudent(s){
  s.stats={...defaultStats(),...(s.stats||{})};
  s.learningScore=Number(s.learningScore??s.learning_score??0);
  s.level=s.level||"bronze";s.xp=Number(s.xp||0);return s;
}

async function api(path,opts={}){
  const headers={"Content-Type":"application/json",...(opts.headers||{})};
  if(session?.token)headers.Authorization="Bearer "+session.token;
  const res=await fetch(path,{...opts,headers});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok){const e=new Error(data.error||("Erro "+res.status));e.status=res.status;e.data=data;throw e}
  return data;
}

function injectAuth(){
  if($("#authGate"))return;
  const gate=document.createElement("div");
  gate.id="authGate";gate.className="auth-gate";
  gate.innerHTML='<div class="auth-shell"><div class="auth-visual"><span class="auth-brand">🧠 BIOMED</span><h1>Seu estudo começa pelo que você já sabe.</h1><p>Entre com seu CPF para recuperar progresso, nível, provas, simulações e histórico de aprendizagem.</p><div class="auth-points"><span>✓ Tutor adaptativo</span><span>✓ Bronze → Diamante</span><span>✓ Ranking por domínio</span></div><small>O CPF não aparece no ranking e não é enviado ao modelo de IA.</small></div><div class="auth-card"><p class="auth-step">ACESSO DO ALUNO</p><h2 id="authTitle">Digite seu CPF</h2><p id="authHint">Se já existir cadastro, seu nome e progresso serão recuperados.</p><form id="authForm"><label>CPF<input id="cpfInput" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" required></label><label id="nameWrap" class="hidden">Nome completo<input id="nameInput" autocomplete="name" maxlength="120" placeholder="Seu nome"></label><button class="auth-primary" type="submit" id="authSubmit">Continuar</button><p class="auth-error" id="authError"></p></form><div class="auth-privacy">🔒 No servidor, o CPF é convertido em identificador criptográfico; o valor original não é gravado no banco.</div></div></div>';
  document.body.prepend(gate);
  $("#cpfInput",gate).addEventListener("input",e=>{
    let v=digits(e.target.value).slice(0,11);
    if(v.length>9)v=v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,"$1.$2.$3-$4");
    else if(v.length>6)v=v.replace(/(\d{3})(\d{3})(\d+)/,"$1.$2.$3");
    else if(v.length>3)v=v.replace(/(\d{3})(\d+)/,"$1.$2");
    e.target.value=v;
  });
  $("#authForm",gate).addEventListener("submit",handleAuth);
}
async function handleAuth(e){
  e.preventDefault();
  const cpf=$("#cpfInput").value,name=$("#nameInput").value.trim(),err=$("#authError"),btn=$("#authSubmit");
  err.textContent="";
  if(!validCPF(cpf)){err.textContent="CPF inválido. Confira os 11 dígitos.";return}
  btn.disabled=true;btn.textContent="Entrando...";
  try{
    let data;
    try{
      data=await api("/api/auth",{method:"POST",body:JSON.stringify({cpf,name:name||undefined})});
      serverMode=true;
      if(data.newStudent&&!name){
        $("#nameWrap").classList.remove("hidden");$("#nameInput").required=true;$("#authTitle").textContent="Primeiro acesso";$("#authHint").textContent="CPF ainda não cadastrado. Informe seu nome para criar o perfil.";btn.textContent="Criar meu perfil";btn.disabled=false;return;
      }
      saveSession({token:data.token,mode:"server"});student=normalizeLocalStudent(data.student);
    }catch(ex){
      if(ex.data?.code!=="DB_NOT_CONFIGURED"&&ex.status!==404&&ex.status!==503)throw ex;
      serverMode=false;
      const hash=await hashCpf(cpf),db=localDb();
      if(!db[hash]&&!name){
        session={mode:"local",id:hash};
        $("#nameWrap").classList.remove("hidden");$("#nameInput").required=true;$("#authTitle").textContent="Primeiro acesso neste navegador";$("#authHint").textContent="Informe seu nome. Enquanto o banco central não estiver conectado, este perfil fica salvo apenas neste navegador.";btn.textContent="Criar perfil local";btn.disabled=false;return;
      }
      if(!db[hash])db[hash]={id:hash,name,rankingName:name.split(" ")[0],level:"bronze",xp:0,learningScore:0,stats:defaultStats(),createdAt:new Date().toISOString()};
      db[hash]=normalizeLocalStudent(db[hash]);saveLocalDb(db);student=db[hash];saveSession({mode:"local",id:hash});
    }
    enterApp();
  }catch(ex){err.textContent=ex.message||"Não foi possível entrar.";btn.disabled=false;btn.textContent="Continuar"}
}
async function restore(){
  if(!session)return false;
  try{
    if(session.mode==="server"&&session.token){
      const data=await api("/api/profile");student=normalizeLocalStudent(data.student);serverMode=true;return true;
    }
    if(session.mode==="local"&&session.id){
      const s=localDb()[session.id];if(s){student=normalizeLocalStudent(s);serverMode=false;return true}
    }
  }catch{}
  clearSession();return false;
}

function insertStudentUI(){
  if($("#studentHome"))return;
  const main=$("main");
  const home=document.createElement("section");home.id="studentHome";home.className="student-home section";home.setAttribute("data-track","");
  home.innerHTML='<div class="student-hero"><div><span class="student-overline">PAINEL DO ALUNO</span><h1>Olá, <span id="studentFirstName">Aluno</span>.</h1><p id="studentMission">Seu próximo passo será definido pelo seu desempenho.</p><div class="student-actions"><a href="#laboratorio" class="student-primary">Continuar estudo</a><a href="#tutor" class="student-secondary">Falar com Tutor IA</a><button id="startLevelExam" class="student-secondary">Fazer prova de nível</button></div></div><div class="level-orb" id="levelOrb"><span id="levelIcon">🥉</span><strong id="levelName">Bronze</strong><small id="levelScore">0/100</small></div></div><div class="metric-grid"><article><span>Domínio</span><strong id="metricScore">0%</strong><small>métrica global de aprendizagem</small></article><article><span>XP</span><strong id="metricXp">0</strong><small>atividade validada</small></article><article><span>Precisão</span><strong id="metricAccuracy">—</strong><small>questões respondidas</small></article><article><span>Próximo nível</span><strong id="metricNext">Prata</strong><small id="metricGap">comece pelo diagnóstico</small></article></div><div class="dashboard-grid"><article class="dash-card"><div class="dash-title"><span>🎯</span><div><h3>Missão recomendada</h3><p id="recommendedReason"></p></div></div><div id="recommendedAction"></div></article><article class="dash-card"><div class="dash-title"><span>🧬</span><div><h3>Mapa de domínio</h3><p>O progresso é medido por desempenho, não apenas por leitura.</p></div></div><div id="miniMastery"></div></article></div><div class="levels-path" id="levelsPath"></div><div id="levelExamMount"></div>';
  const hero=$("#inicio",main);main.insertBefore(home,hero);
  const tutor=document.createElement("section");tutor.id="tutor";tutor.className="tutor-section section";tutor.setAttribute("data-track","");
  tutor.innerHTML='<div class="tutor-head"><div><span class="student-overline">TUTOR BIOMED</span><h2>Converse, responda, erre e tente de novo.</h2><p>A IA recebe somente contexto pedagógico anônimo: nível, domínio e resultados. CPF e nome não são enviados ao modelo.</p></div><div class="tutor-status" id="tutorStatus"><i></i><span>Verificando IA...</span></div></div><div class="tutor-layout"><div class="tutor-chat"><div class="chat-log" id="chatLog"><div class="chat-msg ai"><b>Tutor BIOMED</b><p>Posso explicar um conceito, criar uma pergunta nova, montar uma simulação ou avaliar sua resposta de 0 a 10. O que você quer treinar?</p></div></div><div class="tutor-quick"><button data-tutor-mode="teach">Explique meu ponto mais fraco</button><button data-tutor-mode="generate_question">Crie uma pergunta inédita</button><button data-tutor-mode="simulation">Crie uma simulação</button><button data-tutor-mode="grade">Avalie minha resposta</button></div><form id="tutorForm"><textarea id="tutorInput" rows="3" placeholder="Digite sua dúvida ou resposta..."></textarea><button type="submit">Enviar</button></form></div><aside class="tutor-context"><h3>O tutor sabe</h3><div id="tutorContext"></div><h3>O tutor não pode</h3><ul><li>alterar o GitHub ou o site</li><li>executar terminal ou ferramentas</li><li>ler CPF, tokens ou segredos</li><li>substituir avaliação médica</li></ul></aside></div>';
  const lab=$("#laboratorio",main);main.insertBefore(tutor,lab||$("#revisao",main));
  const rank=document.createElement("section");rank.id="ranking";rank.className="ranking-section section";rank.setAttribute("data-track","");
  rank.innerHTML='<div class="ranking-head"><div><span class="student-overline">RANKING DE APRENDIZAGEM</span><h2>Comparação por domínio, não por quantidade de cliques.</h2><p>Chat sozinho não aumenta posição. A métrica privilegia domínio, provas, simulações, retenção e respostas explicadas.</p></div><button id="refreshRanking" class="student-secondary">Atualizar ranking</button></div><div class="ranking-table" id="rankingTable"></div><div class="score-formula"><strong>Learning Score</strong><span>40% domínio</span><span>25% provas</span><span>15% simulações/casos</span><span>10% retenção</span><span>5% consistência</span><span>5% respostas abertas</span></div>';
  main.insertBefore(rank,$("#referencias",main));
  $("#startLevelExam").addEventListener("click",startLevelExam);
  $("#tutorForm").addEventListener("submit",sendTutor);
  $$(".tutor-quick").forEach(()=>{});
  $$("[data-tutor-mode]",tutor).forEach(b=>b.addEventListener("click",()=>quickTutor(b.dataset.tutorMode)));
  $("#refreshRanking").addEventListener("click",loadRanking);
}
function updateDashboard(){
  if(!student)return;
  const stats={...defaultStats(),...(student.stats||{})};
  student.learningScore=Number(student.learningScore??student.learning_score??localScore(stats));
  student.level=student.level||localLevel(stats,student.learningScore);
  const level=LEVELS[student.level]||LEVELS.bronze;
  $("#studentFirstName").textContent=String(student.name||"Aluno").split(" ")[0];
  $("#levelIcon").textContent=level.icon;$("#levelName").textContent=level.label;$("#levelScore").textContent=Math.round(student.learningScore)+"/100";
  $("#metricScore").textContent=Math.round(student.learningScore)+"%";$("#metricXp").textContent=student.xp||0;
  const qa=Number(stats.questions_answered||0),qc=Number(stats.questions_correct||0);
  $("#metricAccuracy").textContent=qa?Math.round(qc/qa*100)+"%":"—";
  const order=["bronze","prata","ouro","diamante"],idx=order.indexOf(student.level),next=order[Math.min(idx+1,3)];
  $("#metricNext").textContent=idx===3?"Diamante":LEVELS[next].label;
  $("#metricGap").textContent=idx===3?"manter domínio":Math.max(0,LEVELS[next].min-student.learningScore).toFixed(0)+" pontos de score";
  const mastery=stats.mastery||{};
  const weakest=TOPICS.map(k=>[k,Number(mastery[k]??0)]).sort((a,b)=>a[1]-b[1])[0];
  const labels={receptores:"Receptores",fibras:"Fibras Aβ/Aδ/C",vias:"Vias",nocicepcao:"Nocicepção × dor",portao:"Teoria do Portão",descendente:"Modulação descendente",contexto:"Atenção/contexto",semaforo:"Semáforo"};
  let mission;
  if(!stats.diagnostic_done)mission={reason:"Ainda não medimos sua base.",html:'<a class="student-primary" href="#laboratorio">Fazer diagnóstico inicial</a>'};
  else if(weakest[1]<60)mission={reason:"Seu menor domínio é "+labels[weakest[0]]+" ("+Math.round(weakest[1])+"%).",html:'<a class="student-primary" href="#laboratorio">Treinar '+labels[weakest[0]]+'</a>'};
  else if(!(stats.exam_scores||[]).length)mission={reason:"Você já treinou conceitos; falta validar em uma prova mista.",html:'<button class="student-primary" id="missionExam">Fazer prova de nível</button>'};
  else mission={reason:"Agora consolide transferência com casos e respostas abertas.",html:'<a class="student-primary" href="#tutor">Resolver desafio com o Tutor</a>'};
  $("#recommendedReason").textContent=mission.reason;$("#recommendedAction").innerHTML=mission.html;$("#missionExam")?.addEventListener("click",startLevelExam);
  $("#studentMission").textContent=mission.reason;
  $("#miniMastery").innerHTML=TOPICS.map(k=>'<div class="mini-mastery"><span>'+labels[k]+'</span><div><i style="width:'+clamp(Number(mastery[k]||0))+'%"></i></div><b>'+Math.round(Number(mastery[k]||0))+'%</b></div>').join("");
  $("#levelsPath").innerHTML=order.map(k=>{
    const l=LEVELS[k],active=k===student.level,done=order.indexOf(k)<idx;
    const req=k==="bronze"?"Comece aqui":k==="prata"?"Score 45 + diagnóstico + prova 60%":k==="ouro"?"Score 70 + domínio ≥70 + prova 75%":"Score 88 + domínio ≥85 + prova 85 + retenção";
    return '<article class="'+(active?"active ":"")+(done?"done":"")+'"><span>'+l.icon+'</span><strong>'+l.label+'</strong><small>'+req+'</small></article>';
  }).join("");
  $("#tutorContext").innerHTML='<div><span>Nível</span><strong>'+level.icon+" "+level.label+'</strong></div><div><span>Learning Score</span><strong>'+Math.round(student.learningScore)+'%</strong></div><div><span>Menor domínio</span><strong>'+labels[weakest[0]]+' '+Math.round(weakest[1])+'%</strong></div><div><span>Provas</span><strong>'+(stats.exam_scores||[]).length+'</strong></div>';
  persistLocal();
}
function persistLocal(){
  if(!student||serverMode)return;
  const db=localDb();db[student.id]=student;saveLocalDb(db);
}
async function recordEvent(type,payload={},topic=null,eventKey=null){
  if(!student)return;
  if(serverMode&&session?.token){
    try{
      const data=await api("/api/event",{method:"POST",body:JSON.stringify({type,payload,topic,eventKey:eventKey||uid()})});
      if(data.student){student=normalizeLocalStudent(data.student);updateDashboard()}
      return;
    }catch(e){console.warn("sync event",e)}
  }
  const s=student.stats={...defaultStats(),...(student.stats||{})};
  const day=new Date().toISOString().slice(0,10);s.active_days=[...new Set([...(s.active_days||[]),day])].slice(-30);
  if(type==="content_complete"&&payload.module)s.content_completed=[...new Set([...(s.content_completed||[]),payload.module])];
  if(type==="diagnostic"){s.diagnostic_done=true;s.exam_scores.push(clamp(Number(payload.score)||0));student.xp+=80}
  if(type==="exam"){s.exam_scores.push(clamp(Number(payload.score)||0));student.xp+=Number(payload.score)>=60?120:40}
  if(type==="simulation"){s.simulation_scores.push(clamp(Number(payload.score)||0));student.xp+=50}
  if(type==="case"){s.case_scores.push(clamp(Number(payload.score)||0));student.xp+=70}
  if(type==="open_answer"){s.open_answer_scores.push(clamp(Number(payload.score)||0)*10);student.xp+=Math.round(clamp(Number(payload.score)||0)/10*50)}
  if(type==="question"){s.questions_answered++;if(payload.correct)s.questions_correct++;if(topic&&Number.isFinite(Number(payload.mastery)))s.mastery[topic]=clamp(Number(payload.mastery));student.xp+=payload.correct?8:2}
  if(type==="progress_snapshot"&&payload.mastery){for(const k of TOPICS)if(Number.isFinite(Number(payload.mastery[k])))s.mastery[k]=clamp(Number(payload.mastery[k]));if(payload.diagnosticDone)s.diagnostic_done=true}
  if(type==="content_complete")student.xp+=40;
  if(type==="tutor_turn")s.tutor_turns++;
  student.learningScore=localScore(s);student.level=localLevel(s,student.learningScore);persistLocal();updateDashboard();
}

function localTutor(prompt,mode){
  const t=prompt.toLowerCase();
  if(mode==="generate_question")return "Pergunta: uma pessoa bate a perna e sente primeiro uma dor aguda, seguida de uma dor lenta e difusa. Quais fibras estão mais relacionadas a cada fase e por quê?";
  if(mode==="simulation")return "Simulação: mantenha o estímulo nociceptivo igual. Cenário A: ansiedade alta e foco intenso. Cenário B: distração e estimulação tátil local. Antes de eu explicar, diga em qual cenário você espera maior percepção dolorosa e quais mecanismos mudaram.";
  if(mode==="grade")return "A correção por IA depende da conexão com OpenCode Zen. Enquanto isso, use a aba “Resposta aberta” do Laboratório Adaptativo, que já dá nota por rubrica.";
  if(t.includes("aβ")||t.includes("a beta"))return "Aβ é uma fibra de grande diâmetro e mielinizada, muito ligada a toque e pressão. Na modulação espinal, sua atividade pode recrutar circuitos inibitórios no corno dorsal.";
  if(t.includes("aδ")||t.includes("a delta")||t.includes("fibra c"))return "Aδ está ligada à dor inicial mais rápida e melhor localizada; C é amielínica, lenta e ligada à dor mais difusa/persistente.";
  if(t.includes("nocicep"))return "Nocicepção é o processamento neural de estímulos potencialmente lesivos. Dor é a experiência sensorial e emocional; são relacionadas, mas não idênticas.";
  if(t.includes("port"))return "No modelo do Portão, o corno dorsal integra entradas nociceptivas e mecanossensoriais. Aferentes Aβ podem favorecer inibição da transmissão nociceptiva.";
  return "Ainda estou em modo local. Posso explicar fibras Aβ/Aδ/C, nocicepção, Teoria do Portão, modulação descendente ou criar uma pergunta/simulação. Para chat generativo livre, conecte a chave do OpenCode Zen no servidor.";
}
function appendMsg(role,text,extra=""){
  const log=$("#chatLog"),div=document.createElement("div");div.className="chat-msg "+role;
  div.innerHTML='<b>'+(role==="ai"?"Tutor BIOMED":"Você")+'</b><p></p>'+extra;
  $("p",div).textContent=text;log.appendChild(div);log.scrollTop=log.scrollHeight;
}
function quickTutor(mode){
  currentTutorMode=mode;
  const prompts={
    teach:"Explique meu ponto mais fraco de forma simples, depois faça uma pergunta curta para eu responder.",
    generate_question:"Crie uma pergunta inédita e não revele a resposta até eu tentar.",
    simulation:"Crie uma simulação com variáveis de dor, atenção, emoção, fibras ou modulação. Peça minha previsão primeiro.",
    grade:"Vou escrever uma resposta. Avalie de 0 a 10 pelo raciocínio fisiológico, diga o que acertei, o que faltou e crie uma nova pergunta focada no meu erro."
  };
  $("#tutorInput").value=prompts[mode];$("#tutorInput").focus();
}
async function sendTutor(e){
  e.preventDefault();
  const input=$("#tutorInput"),text=input.value.trim();if(!text)return;
  appendMsg("user",text);input.value="";
  const mode=currentTutorMode;currentTutorMode="chat";
  tutorMessages.push({role:"user",content:text});
  const loading=document.createElement("div");loading.className="chat-msg ai loading";loading.innerHTML="<b>Tutor BIOMED</b><p>Pensando...</p>";$("#chatLog").appendChild(loading);
  try{
    let reply,parsed=null,model=null;
    if(serverMode&&session?.token){
      const data=await api("/api/tutor",{method:"POST",body:JSON.stringify({mode,messages:tutorMessages})});
      reply=data.content;parsed=data.parsed;model=data.model;
      const providerLabel=data.provider==="opencode"?"OpenCode Zen":data.provider==="vercel-free"?"Vercel AI Free":"Tutor IA";
      $("#tutorStatus").classList.add("online");$("#tutorStatus span").textContent=providerLabel+" • "+model;
    }else reply=localTutor(text,mode);
    loading.remove();
    if(mode==="grade"&&parsed){
      const formatted="Nota "+parsed.score+"/10\n\n"+(parsed.feedback||"")+"\n\nO que faltou: "+(parsed.gaps||[]).join("; ")+"\n\nPróxima pergunta: "+(parsed.nextQuestion||"");
      appendMsg("ai",formatted);
      await recordEvent("open_answer",{score:Number(parsed.score)||0},parsed.topic||null);
    }else{
      appendMsg("ai",reply);tutorMessages.push({role:"assistant",content:reply});
      await recordEvent("tutor_turn",{mode});
    }
  }catch(ex){
    loading.remove();
    const reply=localTutor(text,mode);appendMsg("ai",reply);
    $("#tutorStatus").classList.remove("online");$("#tutorStatus span").textContent="Modo local • IA ainda não conectada";
  }
}
async function checkTutor(){
  const st=$("#tutorStatus");if(!st)return;
  if(!serverMode){st.classList.remove("online");$("span",st).textContent="Modo local • banco/IA não conectados";return}
  st.classList.add("online");$("span",st).textContent="Servidor conectado";
}

function startLevelExam(){
  if(!window.BiomedAdaptive?.generateQuestion){location.hash="laboratorio";return}
  const mount=$("#levelExamMount");levelExam={questions:Array.from({length:12},()=>window.BiomedAdaptive.generateQuestion()),index:0,correct:0,answered:false};
  mount.scrollIntoView({behavior:"smooth"});renderExamQuestion();
}
function renderExamQuestion(){
  const m=$("#levelExamMount"),x=levelExam;
  if(!x)return;
  if(x.index>=x.questions.length){
    const score=Math.round(x.correct/x.questions.length*100);
    m.innerHTML='<div class="level-exam result"><div class="exam-score">'+score+'%</div><div><span class="student-overline">PROVA CONCLUÍDA</span><h3>'+(score>=75?"Bom domínio aplicado":score>=60?"Aprovado no mínimo, mas ainda há lacunas":"Ainda não atingiu o domínio esperado")+'</h3><p>Acertos: '+x.correct+' de '+x.questions.length+'. A prova entra na sua métrica de nível.</p><button class="student-primary" id="closeExam">Fechar e ver meu painel</button></div></div>';
    $("#closeExam").addEventListener("click",()=>{m.innerHTML="";$("#studentHome").scrollIntoView({behavior:"smooth"})});
    recordEvent("exam",{score},null,"exam-"+Date.now());levelExam=null;return;
  }
  const q=x.questions[x.index];
  m.innerHTML='<div class="level-exam"><div class="exam-top"><span>Prova de nível</span><strong>'+(x.index+1)+' / '+x.questions.length+'</strong></div><h3>'+q.stem+'</h3><div class="exam-options">'+q.options.map((o,i)=>'<button data-exam="'+i+'">'+o+'</button>').join("")+'</div><div id="examFeedback"></div><button id="examNext" class="student-primary hidden">Próxima →</button></div>';
  $$("[data-exam]",m).forEach(b=>b.addEventListener("click",()=>{
    if(x.answered)return;x.answered=true;
    const ok=Number(b.dataset.exam)===q.correctIndex;if(ok)x.correct++;
    $$("[data-exam]",m).forEach((bb,i)=>{bb.disabled=true;if(i===q.correctIndex)bb.classList.add("correct");else if(bb===b&&!ok)bb.classList.add("wrong")});
    $("#examFeedback").innerHTML='<p><strong>'+(ok?"✓ Correto":"✕ Incorreto")+'</strong> '+q.explanation+'</p>';$("#examNext").classList.remove("hidden");
  }));
  $("#examNext").addEventListener("click",()=>{x.index++;x.answered=false;renderExamQuestion()});
}

async function loadRanking(){
  const box=$("#rankingTable");if(!box)return;box.innerHTML='<p class="ranking-loading">Carregando...</p>';
  let rows=[];
  if(serverMode){
    try{rows=(await api("/api/ranking")).ranking||[]}catch{}
  }
  if(!rows.length){
    rows=Object.values(localDb()).map(s=>normalizeLocalStudent(s)).sort((a,b)=>b.learningScore-a.learningScore||b.xp-a.xp).map((s,i)=>({position:i+1,name:s.rankingName||String(s.name).split(" ")[0],level:s.level,learningScore:s.learningScore,xp:s.xp}));
  }
  if(!rows.length){box.innerHTML="<p>Ainda não há alunos no ranking.</p>";return}
  box.innerHTML='<div class="rank-row rank-head"><span>#</span><span>Aluno</span><span>Nível</span><span>Domínio</span><span>XP</span></div>'+rows.map(r=>'<div class="rank-row '+((r.name===student?.rankingName)?"me":"")+'"><strong>'+r.position+'</strong><span>'+r.name+'</span><span>'+(LEVELS[r.level]?.icon||"🥉")+' '+(LEVELS[r.level]?.label||r.level)+'</span><strong>'+Math.round(r.learningScore)+'%</strong><span>'+r.xp+'</span></div>').join("");
}

function hookExistingLearning(){
  document.addEventListener("change",e=>{
    const input=e.target.closest?.("[data-complete]");if(input&&input.checked)recordEvent("content_complete",{module:input.dataset.complete},null,"content-"+input.dataset.complete);
  });
  document.addEventListener("click",e=>{
    if(e.target.closest?.("#quizBox .option")){
      setTimeout(()=>{
        const qs=$$("#quizBox .question");if(qs.length&&qs.every(q=>q.classList.contains("answered"))){
          const t=$("#quizScore")?.textContent||"";const m=t.match(/(\d+)\s*\/\s*(\d+)/);if(m){const score=Math.round(Number(m[1])/Number(m[2])*100);recordEvent("exam",{score},null,"legacy-quiz-"+score+"-"+new Date().toISOString().slice(0,10))}
        }
      },120);
    }
  });
  setInterval(syncAdaptive,3500);
}
function syncAdaptive(){
  if(!student)return;
  let a;try{a=JSON.parse(localStorage.getItem("biomed-adaptive-v2")||"null")}catch{}
  if(!a)return;
  const mastery={};for(const k of TOPICS){const v=a.mastery?.[k]?.score;if(Number.isFinite(Number(v)))mastery[k]=Number(v)}
  const snap=JSON.stringify({mastery,diagnosticDone:Boolean(a.diagnosticDone)});
  if(snap===lastAdaptiveSnapshot)return;lastAdaptiveSnapshot=snap;
  recordEvent("progress_snapshot",{mastery,diagnosticDone:Boolean(a.diagnosticDone)},null,"snap-"+Date.now());
}

async function enterApp(){
  document.body.classList.add("student-authenticated");$("#authGate")?.classList.add("hidden");
  insertStudentUI();updateDashboard();checkTutor();loadRanking();hookExistingLearning();
}
function addTopNav(){
  const nav=$(".quick-nav");if(nav&&!nav.querySelector('a[href="#studentHome"]')){
    nav.insertAdjacentHTML("afterbegin",'<a href="#studentHome">Painel</a><a href="#tutor">Tutor IA</a>');
    nav.insertAdjacentHTML("beforeend",'<a href="#ranking">Ranking</a>');
  }
  const actions=$(".top-actions");if(actions&&!$("#logoutBtn")){
    const b=document.createElement("button");b.id="logoutBtn";b.className="icon-btn student-logout";b.title="Sair do perfil";b.setAttribute("aria-label","Sair do perfil");b.textContent="⇥";b.addEventListener("click",()=>{clearSession();location.reload()});actions.prepend(b);
  }
}

injectAuth();addTopNav();
restore().then(ok=>{if(ok)enterApp()});
})();