import {MODULES,getModule,getLesson,nextLesson,moduleProgress,overallProgress,recommendedNext} from "./data/course-model.js";
import {renderBlocks} from "./learning-components.js";
import {PASS_THRESHOLD,buildExam,gradeExam,bestAndLatest,recoveryMessage} from "./assessment-engine.js";
import {mountVisualTutor,gradeWrittenAnswer,requestVisualPlan} from "./visual-tutor.js";
import {bootstrapAnalytics,identifyStudent,trackLearningEvent} from "./analytics.js";

const SESSION_KEY="biomed-student-session-v1";
let profile=null,mounted=false,examRun=null,practiceMode="recommended";

function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}}
function token(){return readSession()?.token||""}
function eventKey(){return crypto.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2)}
async function api(path,options={}){
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(token())headers.Authorization="Bearer "+token();
  const res=await fetch(path,{...options,headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){const error=new Error(data.error||"Falha ao carregar.");error.status=res.status;throw error}
  return data;
}
async function refreshProfile(){profile=await api("/api/learning-state");identifyStudent(profile.student?.id);return profile}
async function action(actionName,payload={}){
  const data=await api("/api/learning-event",{method:"POST",body:JSON.stringify({action:actionName,eventKey:eventKey(),payload})});
  profile=data;return data;
}
function route(path){location.hash="#app/"+path}
function currentRoute(){
  const raw=location.hash.startsWith("#app/")?location.hash.slice(5):"home";
  const [name,...rest]=raw.split("/");return{name:name||"home",args:rest};
}
function esc(v){return String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
function moduleExamStatus(id){return profile?.learningState?.examStatus?.[id]||{}}
function completed(){return profile?.learningState?.completedLessons||[]}
function navItems(){
  return[
    ["home","⌂","Início"],
    ["trail","▤","Minha trilha"],
    ["tutor","✦","Tutor IA"],
    ["practice","◎","Praticar"],
    ["exams","✎","Provas e simulados"],
    ["progress","◫","Meu progresso"],
    ["ranking","♛","Ranking"],
    ["library","▦","Biblioteca / Revisão"]
  ];
}
function shellMarkup(){
  const first=(profile.student?.name||"Aluno").split(" ")[0];
  return '<div class="study-shell">'+
    '<aside class="study-nav" id="studyNav">'+
      '<a class="study-brand" href="#app/home"><span>🧠</span><div><strong>BIOMED</strong><small>Estudo guiado</small></div></a>'+
      '<div class="study-nav-group"><div class="study-nav-label">ESTUDAR</div>'+
      navItems().map(([id,icon,label])=>'<a data-route="'+id+'" href="#app/'+id+'"><span>'+icon+'</span>'+label+'</a>').join("")+
      '</div>'+
      '<div class="study-user"><small>Aluno</small><strong>'+esc(first)+'</strong><small>'+esc(profile.student?.level||"bronze")+' • '+Math.round(Number(profile.student?.learningScore||0))+'% score</small><button class="study-logout" id="guidedLogout">Sair</button></div>'+
    '</aside>'+
    '<main class="study-main">'+
      '<header class="study-top"><div style="display:flex;align-items:center;gap:12px"><button class="mobile-menu" id="mobileMenu">☰</button><div><h1 id="studyTopTitle">BIOMED</h1><p id="studyTopHint">Seu próximo passo está sempre visível.</p></div></div>'+
      '<div class="study-top-progress"><span>Progresso geral</span><strong id="topProgressValue">0%</strong><div class="track"><i id="topProgressBar"></i></div></div></header>'+
      '<div class="study-view" id="studyView"></div>'+
    '</main></div>';
}
function updateTop(){
  const p=overallProgress(completed()),bar=document.querySelector("#topProgressBar"),val=document.querySelector("#topProgressValue");
  if(bar)bar.style.width=p+"%";if(val)val.textContent=p+"%";
}
function setActiveNav(name){
  document.querySelectorAll(".study-nav a[data-route]").forEach(a=>a.classList.toggle("active",a.dataset.route===name));
}
function title(text,hint=""){
  const t=document.querySelector("#studyTopTitle"),h=document.querySelector("#studyTopHint");if(t)t.textContent=text;if(h)h.textContent=hint;
}
function view(){return document.querySelector("#studyView")}
function buttonRoute(label,path,kind="app-primary"){return '<button type="button" class="'+kind+'" data-go="'+path+'">'+label+'</button>'}
function bindRouteButtons(scope=document){
  scope.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>route(b.dataset.go)));
}
function dashboard(){
  const target=recommendedNext(profile.learningState),module=getModule(target.moduleId),p=overallProgress(completed());
  const attempts=profile.examAttempts||[],latest=attempts[0],exam=moduleExamStatus(module.id),score=Math.round(Number(profile.student?.learningScore||0));
  const accuracy=profile.student?.stats?.questions_answered?Math.round((Number(profile.student.stats.questions_correct||0)/Number(profile.student.stats.questions_answered))*100)+"%":"—";
  title("Início","Continue exatamente do ponto em que parou.");
  view().innerHTML='<section>'+
    '<span class="app-kicker">PAINEL DO ALUNO</span><h1 class="app-title">Olá, '+esc((profile.student?.name||"Aluno").split(" ")[0])+'.</h1><p class="app-lead">Você não precisa escolher entre dezenas de páginas. O BIOMED mostra o próximo passo e acompanha o que você realmente domina.</p>'+
    '<div class="hero-dashboard"><article class="resume-panel"><span class="app-kicker">CONTINUE SEUS ESTUDOS</span><h2>'+module.number+'. '+esc(module.title)+' — '+esc(target.title)+'</h2><p>'+esc(module.description)+'</p>'+buttonRoute("Continuar estudando →","lesson/"+target.id)+'</article>'+
    '<article class="score-panel"><div class="score-ring" style="--p:'+score+'"><div><strong>'+score+'%</strong><span>Learning Score</span></div></div><p style="text-align:center;margin:0;color:#627386">Nível <strong>'+esc(profile.student?.level||"bronze")+'</strong></p></article></div>'+
    '<div class="metric-row"><article class="metric-card"><span>Progresso do curso</span><strong>'+p+'%</strong></article><article class="metric-card"><span>Última nota</span><strong>'+(latest?Math.round(latest.score)+"%":"—")+'</strong></article><article class="metric-card"><span>Precisão</span><strong>'+accuracy+'</strong></article><article class="metric-card"><span>Etapa atual</span><strong>'+module.number+'/5</strong></article></div>'+
    '<div class="dashboard-grid-new"><article class="app-card"><span class="app-kicker">RECOMENDAÇÃO DO TUTOR</span><h3>Faça '+esc(target.title)+'</h3><p>'+(exam.passed?"Você já aprovou esta etapa; avance sem perder as revisões.":"Finalize a aula atual antes da prova da etapa.")+'</p>'+buttonRoute("Abrir próxima atividade","lesson/"+target.id,"app-secondary")+'</article>'+
    '<article class="app-card"><span class="app-kicker">SUA TRILHA</span><div class="next-list">'+MODULES.map(m=>{const mp=moduleProgress(m.id,completed());return'<div class="next-item"><b>'+(mp===100?"✓":m.number)+'</b><div><strong>'+esc(m.title)+'</strong><small style="display:block;color:#627386">'+mp+'% concluído</small></div><span>'+mp+'%</span></div>'}).join("")+'</div></article></div>'+
  '</section>';
  bindRouteButtons(view());trackLearningEvent("student_dashboard_viewed",{progress:p,currentModule:module.id});
}
function trail(){
  title("Minha trilha","Cinco etapas, divididas em aulas curtas.");
  view().innerHTML='<span class="app-kicker">TRILHA GUIADA</span><h1 class="app-title">Do estímulo à aplicação clínica.</h1><p class="app-lead">Cada etapa termina com checagem e prova. O progresso é liberado pelo que você faz, não por uma rolagem de página.</p><div class="trail-grid">'+MODULES.map(m=>{
    const mp=moduleProgress(m.id,completed()),first=m.lessons.find(l=>!completed().includes(l.id))||m.lessons[m.lessons.length-1],st=moduleExamStatus(m.id);
    return'<article class="module-card"><div class="module-number">'+(mp===100?"✓":m.number)+'</div><div><h3>'+esc(m.title)+'</h3><p>'+esc(m.description)+'</p><small>'+m.lessons.length+' aulas • prova '+(st.passed?"aprovada ✓":"pendente")+'</small></div><div class="module-progress"><strong>'+mp+'%</strong><div class="track"><i style="width:'+mp+'%"></i></div><div style="margin-top:9px">'+buttonRoute(mp?"Continuar":"Começar","lesson/"+first.id,"app-secondary")+'</div></div></article>'
  }).join("")+'</div>';
  bindRouteButtons(view());
}
async function openLesson(id){
  const lesson=getLesson(id),module=getModule(lesson.moduleId),done=completed(),mp=moduleProgress(module.id,done);
  title(module.title+" — "+lesson.title,"Aula curta, visual e interativa.");
  await action("lesson_started",{moduleId:module.id,lessonId:lesson.id}).catch(()=>{});
  trackLearningEvent("lesson_started",{moduleId:module.id,lessonId:lesson.id});
  view().innerHTML='<div class="lesson-head"><div><span class="app-kicker">ETAPA '+module.number+' DE 5</span><h1 class="app-title">'+esc(lesson.title)+'</h1><p class="app-lead">'+esc(module.description)+'</p><div class="lesson-meta"><span>'+lesson.minutes+' min</span><span>'+mp+'% da etapa</span><span>'+module.title+'</span></div></div><div>'+buttonRoute("Ver trilha","trail","app-secondary")+'</div></div><div class="learning-stage" id="lessonStage"></div><div class="lesson-actions"><button type="button" class="app-secondary" data-go="trail">← Trilha</button><button type="button" class="app-primary" id="completeLesson">'+(done.includes(lesson.id)?"Continuar →":"Concluir aula e continuar →")+'</button></div>';
  renderBlocks(document.querySelector("#lessonStage"),lesson.blocks,{
    onAnswer:async({block,correct,selected})=>{
      trackLearningEvent("answer_submitted",{source:"lesson",moduleId:module.id,lessonId:lesson.id,type:block.type,correct});
      if(correct)trackLearningEvent("answer_correct",{source:"lesson",moduleId:module.id,lessonId:lesson.id});
      await action("checkpoint",{moduleId:module.id,lessonId:lesson.id,blockId:block.id||null,correct,selected}).catch(()=>{});
    },
    onOpenAnswer:async({block,text,mount})=>{
      mount.textContent="Avaliando...";
      const grade=await gradeWrittenAnswer(block.question||"Explique o conceito.",text).catch(()=>null);
      if(grade){mount.innerHTML='<div class="vt-grade"><strong>Nota '+Number(grade.score||0).toFixed(1)+'/10</strong><p>'+esc(grade.feedback||grade.correction||"Resposta avaliada.")+'</p></div>';await action("tutor_answer",{moduleId:module.id,lessonId:lesson.id,blockId:block.id||null,score:Number(grade.score||0)}).catch(()=>{})}
      else mount.textContent="Resposta registrada. Compare sua ideia com o próximo bloco.";
    },
    onSimulation:({transmission})=>trackLearningEvent("simulation_used",{source:"lesson",moduleId:module.id,lessonId:lesson.id,transmission}),
    onBlockViewed:({block,index})=>trackLearningEvent("lesson_block_viewed",{moduleId:module.id,lessonId:lesson.id,type:block.type,index})
  });
  bindRouteButtons(view());
  document.querySelector("#completeLesson").addEventListener("click",async()=>{
    const next=nextLesson(lesson.id),updated=[...new Set([...done,lesson.id])],modulePct=moduleProgress(module.id,updated);
    trackLearningEvent("lesson_completed",{moduleId:module.id,lessonId:lesson.id,moduleProgress:modulePct});
    await action("lesson_completed",{moduleId:module.id,lessonId:lesson.id,moduleProgress:modulePct,nextModule:next.moduleId,nextLesson:next.id});
    updateTop();
    const lastInModule=module.lessons[module.lessons.length-1].id===lesson.id;
    route(lastInModule?"exams":"lesson/"+next.id);
  });
}
async function tutorPage(){
  title("Tutor IA","A IA escolhe a próxima explicação, mas a interface é controlada pelo BIOMED.");
  view().innerHTML='<div id="visualTutorMount"></div>';
  await mountVisualTutor(document.querySelector("#visualTutorMount"),{prompt:"Conduza a próxima atividade mais útil para mim. Use uma explicação visual curta, depois uma interação. Não faça uma resposta longa em texto simples."});
}
function renderLocalPractice(mount,mode){
  if(!mount)return null;
  mount.innerHTML='<div class="practice-instant"><div><span class="app-kicker">ATIVIDADE IMEDIATA</span><strong>Você já pode começar.</strong><p>A prática não espera a IA para funcionar. A IA ajusta dificuldade e sequência em segundo plano.</p></div><span class="practice-ai-state">IA ajustando…</span></div><div class="practice-tutor-slot"></div>';
  return mount.querySelector(".practice-tutor-slot");
}
async function practice(){
  title("Praticar","Perguntas, respostas abertas, simulações e casos sem tela travada.");
  view().innerHTML='<span class="app-kicker">TREINO ADAPTATIVO</span><h1 class="app-title">Treine agora; a IA adapta enquanto você avança.</h1><p class="app-lead">O modo recomendado combina formatos pelo seu estado atual. Os modos específicos entram imediatamente e continuam funcionando mesmo se a IA estiver ocupada.</p><div class="practice-toolbar"><button data-practice="recommended" class="active">Recomendado pela IA</button><button data-practice="questions">Perguntas</button><button data-practice="open">Resposta aberta</button><button data-practice="simulation">Simulação</button><button data-practice="cases">Casos</button></div><div id="practiceMount"></div>';
  const buttons=[...view().querySelectorAll("[data-practice]")];
  let practiceSerial=0;
  async function load(mode){
    const serial=++practiceSerial;
    practiceMode=mode;buttons.forEach(b=>b.classList.toggle("active",b.dataset.practice===mode));
    const prompts={
      recommended:"Monte um treino adaptativo curto alternando pergunta objetiva, explicação visual e outro formato de interação baseado no meu ponto mais fraco.",
      questions:"Crie uma sequência visual com duas perguntas objetivas inéditas e feedback somente depois de eu responder.",
      open:"Crie uma atividade de resposta aberta com contexto visual e depois avalie meu raciocínio.",
      simulation:"Crie uma simulação de fisiologia sensorial. Peça minha previsão antes da explicação.",
      cases:"Crie um caso clínico curto em etapas, com uma decisão clicável e uma justificativa escrita."
    };
    trackLearningEvent("practice_started",{mode});
    const slot=renderLocalPractice(document.querySelector("#practiceMount"),mode);
    if(serial!==practiceSerial)return;
    mountVisualTutor(slot,{prompt:prompts[mode],title:"Sessão de prática",contextLabel:"TREINO "+mode.toUpperCase()});
  }
  buttons.forEach(b=>b.addEventListener("click",()=>load(b.dataset.practice)));
  load("recommended");
}
function examLanding(){
  title("Provas e simulados","Escolha uma avaliação; nenhuma prova começa escondida.");
  const current=profile.learningState?.currentModule||"perceber";
  const attempts=profile.examAttempts||[];
  view().innerHTML='<span class="app-kicker">AVALIAÇÕES</span><h1 class="app-title">Provas com começo, fim e resultado claro.</h1><p class="app-lead">Cada prova da etapa tem 10 questões e aprovação em '+PASS_THRESHOLD+'%. O simulado cumulativo mistura todo o curso.</p>'+
    '<div class="assessment-choice-grid">'+MODULES.map(m=>{const st=bestAndLatest(attempts,m.id);return '<article class="assessment-choice '+(m.id===current?"current":"")+'"><span class="app-kicker">ETAPA '+m.number+'</span><h3>'+esc(m.title)+'</h3><p>'+esc(m.description)+'</p><div class="assessment-meta"><span>10 questões</span><span>'+(st.latest==null?"Sem tentativa":"Última "+Math.round(st.latest)+"%")+'</span><span>'+(st.passed?"Aprovada ✓":"Meta "+PASS_THRESHOLD+"%")+'</span></div><button type="button" class="app-primary" data-start-exam="'+m.id+'">Começar prova</button></article>'}).join("")+
    '<article class="assessment-choice cumulative"><span class="app-kicker">SIMULADO CUMULATIVO</span><h3>Integração das 5 etapas</h3><p>Mistura Perceber, Conduzir, Processar, Modular e Aplicar.</p><div class="assessment-meta"><span>10 questões</span><span>Todos os módulos</span><span>Meta '+PASS_THRESHOLD+'%</span></div><button type="button" class="app-primary" data-start-exam="cumulative">Iniciar prova cumulativa</button></article></div>'+
    '<div id="examMount"></div>'+
    '<h2 class="section-subtitle">Histórico de avaliações</h2><div class="attempt-table"><div class="attempt-row head"><span>Avaliação</span><span>Nota</span><span>Status</span><span>Data</span></div>'+(attempts.length?attempts.slice(0,12).map(a=>'<div class="attempt-row"><span>'+esc(a.moduleId==="cumulative"?"Simulado cumulativo":getModule(a.moduleId).title)+'</span><strong>'+Math.round(a.score)+'%</strong><span>'+(a.passed?"Aprovado ✓":"Revisar")+'</span><span>'+new Date(a.createdAt).toLocaleDateString("pt-BR")+'</span></div>').join(""):'<div class="attempt-row"><span>Nenhuma avaliação concluída ainda.</span><span>—</span><span>—</span><span>—</span></div>')+'</div>';
  view().querySelectorAll("[data-start-exam]").forEach(b=>b.addEventListener("click",()=>startExam(b.dataset.startExam)));
}
function startExam(moduleId,scroll=true){
  view().querySelectorAll("[data-exam-module]").forEach(b=>b.classList.toggle("active",b.dataset.examModule===moduleId));
  const questions=buildExam(moduleId,10,Date.now()),answers=Array(10).fill(null);examRun={moduleId,questions,answers,index:0};
  trackLearningEvent("exam_started",{moduleId,examType:moduleId==="cumulative"?"cumulative":"stage"});
  renderExamQuestion(scroll);
}
function renderExamQuestion(scroll=false){
  const mount=document.querySelector("#examMount"),x=examRun,q=x.questions[x.index];
  mount.innerHTML='<div class="exam-shell"><div class="exam-progress"><span>'+(x.moduleId==="cumulative"?"Simulado cumulativo":"Prova — "+esc(getModule(x.moduleId).title))+'</span><strong>Questão '+(x.index+1)+' / '+x.questions.length+'</strong></div><div class="exam-question"><h3>'+esc(q.stem)+'</h3><div class="exam-options">'+q.options.map((o,i)=>'<button type="button" data-answer="'+i+'" class="'+(x.answers[x.index]===i?"selected":"")+'">'+esc(o)+'</button>').join("")+'</div></div><div class="exam-nav"><button class="app-primary" id="examNext">'+(x.index===x.questions.length-1?"Finalizar prova":"Próxima questão →")+'</button></div></div>';
  mount.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>{x.answers[x.index]=Number(b.dataset.answer);mount.querySelectorAll("[data-answer]").forEach(bb=>bb.classList.toggle("selected",bb===b))}));
  mount.querySelector("#examNext").addEventListener("click",async()=>{
    if(x.answers[x.index]==null){mount.querySelector(".exam-question").insertAdjacentHTML("beforeend",'<p class="app-error" style="margin-top:12px">Selecione uma resposta antes de continuar.</p>');return}
    if(x.index<x.questions.length-1){x.index++;renderExamQuestion();return}
    const result=gradeExam(x.questions,x.answers,PASS_THRESHOLD);
    trackLearningEvent("exam_completed",{moduleId:x.moduleId,score:result.score,passed:result.passed});
    trackLearningEvent(result.passed?"exam_passed":"exam_failed",{moduleId:x.moduleId,score:result.score});
    await action("exam_completed",{moduleId:x.moduleId,examType:x.moduleId==="cumulative"?"cumulative":"stage",score:result.score,passThreshold:PASS_THRESHOLD,answers:result.detail,weaknesses:result.weaknesses});
    updateTop();renderExamResult(result,x.moduleId);
  });
  if(scroll)mount.scrollIntoView({behavior:"smooth",block:"start"});
}
function renderExamResult(result,moduleId){
  const mount=document.querySelector("#examMount"),label=moduleId==="cumulative"?"Simulado cumulativo":getModule(moduleId).title;
  mount.innerHTML='<div class="exam-shell exam-result '+(result.passed?"pass":"fail")+'"><div class="exam-score-big">'+result.score+'%</div><div><span class="app-kicker">'+esc(label)+'</span><h2>'+(result.passed?"APROVADO ✓":"REVISÃO NECESSÁRIA")+'</h2><p>'+esc(recoveryMessage(result))+'</p><p>Acertos: '+result.correct+' de '+result.total+'. Nota mínima: '+result.passThreshold+'%.</p><div style="display:flex;gap:8px;flex-wrap:wrap">'+(result.passed?buttonRoute("Continuar trilha","trail"):buttonRoute("Revisar com Tutor IA","tutor"))+'<button type="button" class="app-secondary" id="retryExam">Nova tentativa</button></div></div></div>';
  bindRouteButtons(mount);mount.querySelector("#retryExam").addEventListener("click",()=>startExam(moduleId));
}
function progress(){
  title("Meu progresso","Aulas, domínio e provas no mesmo lugar.");
  const attempts=profile.examAttempts||[],stats=profile.student?.stats||{};
  const answered=Number(stats.questions_answered||0),correct=Number(stats.questions_correct||0);
  const accuracy=answered?Math.round(correct/answered*100):null;
  const passedModules=MODULES.filter(m=>bestAndLatest(attempts,m.id).passed).length;
  view().innerHTML='<span class="app-kicker">PROGRESSO REAL</span><h1 class="app-title">'+overallProgress(completed())+'% do curso concluído.</h1><p class="app-lead">Aulas, desempenho e provas são acompanhados separadamente para mostrar exatamente onde você está.</p>'+
    '<div class="metric-row"><article class="metric-card"><span>Learning Score</span><strong>'+Math.round(Number(profile.student?.learningScore||0))+'%</strong></article><article class="metric-card"><span>XP</span><strong>'+Math.round(Number(profile.student?.xp||0))+'</strong></article><article class="metric-card"><span>Precisão</span><strong>'+(accuracy==null?"—":accuracy+"%")+'</strong></article><article class="metric-card"><span>Etapas aprovadas</span><strong>'+passedModules+'/5</strong></article></div>'+
    '<div class="progress-modules">'+MODULES.map(m=>{const p=moduleProgress(m.id,completed()),ex=bestAndLatest(attempts,m.id);return'<article class="progress-module"><div><strong>'+m.number+'. '+esc(m.title)+'</strong><small style="display:block;color:#627386">'+m.lessons.filter(l=>completed().includes(l.id)).length+'/'+m.lessons.length+' aulas</small></div><div class="track"><i style="width:'+p+'%"></i></div><div><strong>'+p+'%</strong><small style="display:block;color:#627386">Prova '+(ex.latest==null?"—":Math.round(ex.latest)+"%")+(ex.passed?" ✓":"")+'</small></div></article>'}).join("")+'</div>'+
    '<h2 class="section-subtitle">Histórico de avaliações</h2><div class="attempt-table"><div class="attempt-row head"><span>Avaliação</span><span>Nota</span><span>Status</span><span>Data</span></div>'+(attempts.length?attempts.slice(0,10).map(a=>'<div class="attempt-row"><span>'+esc(a.moduleId==="cumulative"?"Simulado cumulativo":getModule(a.moduleId).title)+'</span><strong>'+Math.round(a.score)+'%</strong><span>'+(a.passed?"Aprovado ✓":"Revisar")+'</span><span>'+new Date(a.createdAt).toLocaleDateString("pt-BR")+'</span></div>').join(""):'<div class="attempt-row"><span>Nenhuma prova concluída.</span><span>—</span><span>—</span><span>—</span></div>')+'</div>';
}
async function ranking(){
  title("Ranking","Comparação por Learning Score, sem exibir CPF.");
  view().innerHTML='<div class="app-loading">Carregando ranking...</div>';
  try{
    const data=await api("/api/ranking"),rows=data.ranking||[];
    view().innerHTML='<span class="app-kicker">RANKING</span><h1 class="app-title">Domínio, não quantidade de cliques.</h1><div class="rank-list">'+rows.map(r=>'<div class="rank-card '+(r.name===profile.student?.rankingName?"me":"")+'"><strong>#'+r.position+'</strong><span>'+esc(r.name)+'</span><span>'+esc(r.level)+'</span><strong>'+Math.round(r.learningScore)+'%</strong></div>').join("")+'</div>';
  }catch(e){view().innerHTML='<div class="app-error">'+esc(e.message)+'</div>'}
}
function library(){
  title("Biblioteca e revisão","Consulte conceitos sem perder sua posição na trilha.");
  const cards=[
    ["Receptores","Mecanorreceptores, termorreceptores, nociceptores e proprioceptores."],
    ["Fibras Aβ, Aδ e C","Compare mielina, velocidade e função."],
    ["Nocicepção × dor","Processo neural não é sinônimo da experiência dolorosa."],
    ["Portão da Dor","Entrada tátil pode recrutar inibição no corno dorsal."],
    ["Controle descendente","O encéfalo pode inibir ou facilitar a nocicepção."],
    ["Semáforo Sensorial","Use mecanismo para interpretar situações e casos."]
  ];
  view().innerHTML='<span class="app-kicker">BIBLIOTECA</span><h1 class="app-title">Revisão rápida, sem virar uma página infinita.</h1><div class="library-grid">'+cards.map(([h,p])=>'<article class="library-card"><h3>'+h+'</h3><p>'+p+'</p></article>').join("")+'</div><div style="margin-top:18px">'+buttonRoute("Treinar estes conceitos","practice")+'</div>';
  bindRouteButtons(view());
}
async function render(){
  if(!mounted||!profile)return;
  const r=currentRoute();setActiveNav(r.name);document.querySelector("#studyNav")?.classList.remove("open");
  try{
    if(r.name==="home")dashboard();
    else if(r.name==="trail")trail();
    else if(r.name==="lesson")await openLesson(r.args[0]||profile.learningState.currentLesson);
    else if(r.name==="tutor")await tutorPage();
    else if(r.name==="practice")await practice();
    else if(r.name==="exams")examLanding();
    else if(r.name==="progress")progress();
    else if(r.name==="ranking")await ranking();
    else if(r.name==="library")library();
    else route("home");
  }catch(e){view().innerHTML='<div class="app-error"><strong>Não foi possível abrir esta área.</strong><p>'+esc(e.message)+'</p><button class="app-secondary" data-go="home">Voltar ao início</button></div>';bindRouteButtons(view())}
}
async function mount(){
  if(mounted||!document.body.classList.contains("student-authenticated"))return;
  if(readSession()?.mode!=="server"||!token())return;
  mounted=true;
  const app=document.createElement("div");app.id="studyApp";app.innerHTML='<div class="app-loading">Montando seu plano de estudo...</div>';document.body.append(app);
  try{
    await bootstrapAnalytics();await refreshProfile();
    document.body.classList.add("guided-study-active");
    app.innerHTML=shellMarkup();updateTop();
    document.documentElement.classList.add('biomed-ready');
    document.querySelector("#guidedLogout").addEventListener("click",()=>{localStorage.removeItem(SESSION_KEY);location.reload()});
    document.querySelector("#mobileMenu").addEventListener("click",()=>document.querySelector("#studyNav").classList.toggle("open"));
    window.addEventListener("hashchange",render);
    if(!location.hash.startsWith("#app/"))route("home");else render();
  }catch(e){
    mounted=false;
    if(e?.status===401){localStorage.removeItem(SESSION_KEY);app.remove();document.body.classList.remove("student-authenticated","guided-study-active");window.dispatchEvent(new CustomEvent("biomed:auth-expired"));return}
    document.documentElement.classList.add('biomed-ready');
    app.innerHTML='<div class="app-error" style="margin:30px"><strong>Não consegui carregar seu plano.</strong><p>'+esc(e.message)+'</p></div>';
  }
}
window.addEventListener("biomed:authenticated",mount);mount();
