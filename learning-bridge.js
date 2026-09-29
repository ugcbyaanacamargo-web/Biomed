(function(){
"use strict";
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const SESSION_KEY="biomed-student-session-v1", LOCAL_DB="biomed-local-students-v1";
const readSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}};
const readDb=()=>{try{return JSON.parse(localStorage.getItem(LOCAL_DB)||"{}")}catch{return {}}};
const saveDb=db=>localStorage.setItem(LOCAL_DB,JSON.stringify(db));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);

async function sendEvent(detail){
  const s=readSession(); if(!s)return;
  if(s.mode==="server"&&s.token){
    try{
      await fetch("/api/event",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.token},body:JSON.stringify({
        type:detail.type,payload:detail.payload||{},topic:detail.topic||null,eventKey:detail.eventKey||uid()
      })});
    }catch{}
    return;
  }
  if(s.mode!=="local"||!s.id)return;
  const db=readDb(),u=db[s.id];if(!u)return;
  u.stats=u.stats||{};
  const arr=(key,val)=>{u.stats[key]=Array.isArray(u.stats[key])?u.stats[key]:[];u.stats[key].push(val);u.stats[key]=u.stats[key].slice(-40)};
  if(detail.type==="simulation")arr("simulation_scores",Number(detail.payload?.score)||0);
  if(detail.type==="case")arr("case_scores",Number(detail.payload?.score)||0);
  if(detail.type==="open_answer")arr("open_answer_scores",(Number(detail.payload?.score)||0)*10);
  if(detail.type==="diagnostic"){u.stats.diagnostic_done=true;arr("exam_scores",Number(detail.payload?.score)||0)}
  if(detail.type==="question"){
    u.stats.questions_answered=(u.stats.questions_answered||0)+1;
    if(detail.payload?.correct)u.stats.questions_correct=(u.stats.questions_correct||0)+1;
    if(detail.topic&&Number.isFinite(Number(detail.payload?.mastery))){
      u.stats.mastery=u.stats.mastery||{};u.stats.mastery[detail.topic]=Number(detail.payload.mastery);
    }
  }
  saveDb(db);
}
window.addEventListener("biomed:activity",e=>sendEvent(e.detail||{}));

let retention=null;
function ensureButton(){
  const actions=$(".student-actions");if(!actions||$("#retentionBtn"))return;
  const b=document.createElement("button");b.id="retentionBtn";b.className="student-secondary";b.textContent="Revisão de retenção";b.addEventListener("click",startRetention);actions.appendChild(b);
}
function startRetention(){
  if(!window.BiomedAdaptive?.generateQuestion){location.hash="laboratorio";return}
  const mount=$("#levelExamMount");if(!mount)return;
  retention={questions:Array.from({length:8},()=>window.BiomedAdaptive.generateQuestion()),index:0,correct:0,answered:false};
  mount.scrollIntoView({behavior:"smooth"});renderRetention();
}
function renderRetention(){
  const m=$("#levelExamMount"),x=retention;if(!m||!x)return;
  if(x.index>=x.questions.length){
    const score=Math.round(x.correct/x.questions.length*100);
    m.innerHTML='<div class="level-exam result"><div class="exam-score">'+score+'%</div><div><span class="student-overline">REVISÃO DE RETENÇÃO</span><h3>'+(score>=80?"Conhecimento bem retido":"Há pontos para revisar")+'</h3><p>Você acertou '+x.correct+' de '+x.questions.length+'. Este resultado entra na métrica de retenção.</p><button class="student-primary" id="retentionClose">Fechar</button></div></div>';
    sendEvent({type:"retention",payload:{score},eventKey:"retention-"+Date.now()});
    $("#retentionClose")?.addEventListener("click",()=>{m.innerHTML="";$("#studentHome")?.scrollIntoView({behavior:"smooth"})});
    retention=null;return;
  }
  const q=x.questions[x.index];
  m.innerHTML='<div class="level-exam"><div class="exam-top"><span>Revisão de retenção</span><strong>'+(x.index+1)+' / '+x.questions.length+'</strong></div><h3>'+q.stem+'</h3><div class="exam-options">'+q.options.map((o,i)=>'<button data-ret="'+i+'">'+o+'</button>').join("")+'</div><div id="retFeedback"></div><button id="retNext" class="student-primary hidden">Próxima →</button></div>';
  $$("[data-ret]",m).forEach(b=>b.addEventListener("click",()=>{
    if(x.answered)return;x.answered=true;const ok=Number(b.dataset.ret)===q.correctIndex;if(ok)x.correct++;
    $$("[data-ret]",m).forEach((bb,i)=>{bb.disabled=true;if(i===q.correctIndex)bb.classList.add("correct");else if(bb===b&&!ok)bb.classList.add("wrong")});
    $("#retFeedback").innerHTML='<p><strong>'+(ok?"✓ Correto":"✕ Incorreto")+'</strong> '+q.explanation+'</p>';$("#retNext").classList.remove("hidden");
  }));
  $("#retNext")?.addEventListener("click",()=>{x.index++;x.answered=false;renderRetention()});
}
const mo=new MutationObserver(ensureButton);mo.observe(document.body,{childList:true,subtree:true});ensureButton();
})();