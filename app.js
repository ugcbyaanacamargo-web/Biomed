const $=(s,c=document)=>c.querySelector(s);const $$=(s,c=document)=>[...c.querySelectorAll(s)];

const progressBar=$("#scrollProgress");
function updateScrollProgress(){const d=document.documentElement;const max=d.scrollHeight-d.clientHeight;progressBar.style.width=(max?window.scrollY/max*100:0)+"%"}
window.addEventListener("scroll",updateScrollProgress,{passive:true});updateScrollProgress();

if(localStorage.getItem("biomed-theme")==="dark")document.body.classList.add("dark");
$("#themeBtn")?.addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("biomed-theme",document.body.classList.contains("dark")?"dark":"light")});

const sidebar=$("#sidebar");
$("#menuBtn")?.addEventListener("click",()=>sidebar.classList.toggle("open"));
$$(".toc a").forEach(a=>a.addEventListener("click",()=>sidebar.classList.remove("open")));

const tracked=$$("[data-track]");
const navLinks=$$("[data-nav]");
const trackObserver=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(!e.isIntersecting)return;
    const id=e.target.id;
    navLinks.forEach(a=>a.classList.toggle("active",a.dataset.nav===id));
    localStorage.setItem("biomed-last-section",id);
    const label=e.target.querySelector("h2,h1")?.textContent?.trim()||id;
    localStorage.setItem("biomed-last-label",label);
    renderResume();
  });
},{rootMargin:"-22% 0px -68% 0px",threshold:0});
tracked.forEach(s=>trackObserver.observe(s));

const checks=$$("[data-complete]");
const progressFill=$("#studyProgress"),progressText=$("#progressText"),nextReviewText=$("#nextReviewText");
function getProgress(){try{return JSON.parse(localStorage.getItem("biomed-progress")||"{}")}catch{return {}}}
function saveProgress(){
  const state=Object.fromEntries(checks.map(c=>[c.dataset.complete,c.checked]));
  localStorage.setItem("biomed-progress",JSON.stringify(state));
  if(checks.some(c=>c.checked)&&!localStorage.getItem("biomed-first-complete"))localStorage.setItem("biomed-first-complete",new Date().toISOString());
  renderProgress();
}
function renderProgress(){
  const done=checks.filter(c=>c.checked).length,pct=Math.round(done/checks.length*100);
  if(progressFill)progressFill.style.width=pct+"%";
  if(progressText)progressText.textContent=pct+"%";
  const first=localStorage.getItem("biomed-first-complete");
  if(nextReviewText){
    if(!first)nextReviewText.textContent="Conclua uma etapa para iniciar seu ciclo de revisão.";
    else{
      const d=new Date(first);d.setDate(d.getDate()+1);
      nextReviewText.textContent="Próxima revisão sugerida: "+d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
    }
  }
}
const savedProgress=getProgress();
checks.forEach(c=>{c.checked=!!savedProgress[c.dataset.complete];c.addEventListener("change",saveProgress)});renderProgress();
$("#resetProgress")?.addEventListener("click",()=>{checks.forEach(c=>c.checked=false);localStorage.removeItem("biomed-progress");localStorage.removeItem("biomed-first-complete");renderProgress()});

function renderResume(){
  const id=localStorage.getItem("biomed-last-section"),label=localStorage.getItem("biomed-last-label");
  const card=$("#resumeCard");
  if(!card||!id||id==="inicio")return;
  card.classList.remove("hidden");
  $("#resumeLabel").textContent=label||"Retomar estudo";
  card.onclick=()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
}
renderResume();
$("#continueBtn")?.addEventListener("click",()=>{
  const id=localStorage.getItem("biomed-last-section")||"perceber";
  document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
});

const searchDialog=$("#searchDialog"),searchInput=$("#searchInput"),searchResults=$("#searchResults");
$("#searchBtn")?.addEventListener("click",()=>{searchDialog.showModal();setTimeout(()=>searchInput.focus(),60)});
const searchSections=$$("main section[id]").map(s=>({id:s.id,title:s.querySelector("h2,h1")?.textContent?.trim()||s.id,text:s.innerText.replace(/\s+/g," ").trim()}));
searchInput?.addEventListener("input",()=>{
  const q=searchInput.value.trim().toLowerCase();
  const results=q?searchSections.filter(x=>(x.title+" "+x.text).toLowerCase().includes(q)).slice(0,8):[];
  searchResults.innerHTML=results.length?results.map(x=>'<a href="#'+x.id+'" data-search-link><strong>'+x.title+'</strong><small>'+x.text.slice(0,145)+'...</small></a>').join(""):(q?"<p>Nenhum resultado encontrado.</p>":"<p>Digite um termo para buscar na matéria.</p>");
  $$("[data-search-link]",searchResults).forEach(a=>a.addEventListener("click",()=>searchDialog.close()));
});

const checkMessages={
  termorreceptor:{ok:"Certo. Termorreceptores respondem a variações de temperatura.",bad:"Ainda não. Frio e calor são detectados por termorreceptores."},
  abeta:{ok:"Certo. Aβ é grande, mielinizada e ligada principalmente à mecanossensação, como toque e pressão.",bad:"Revise a comparação: Aβ = toque/pressão; Aδ = dor rápida; C = dor lenta."},
  nocicepcao:{ok:"Certo. Nocicepção descreve o processo neural; dor é uma experiência sensorial e emocional.",bad:"Não são sinônimos. Pode haver nocicepção sem a mesma experiência dolorosa em todas as situações."},
  esfregar:{ok:"Certo. O toque pode recrutar circuitos inibitórios na medula e reduzir a transmissão nociceptiva.",bad:"O toque não apaga o nociceptor. O ponto principal é a modulação do circuito espinal."},
  semaforo:{ok:"Certo. No exercício, isso é verde porque o estímulo tátil pode favorecer mecanismos inibitórios.",bad:"Pense no Portão: esfregar ativa aferentes táteis e pode reduzir a transmissão nociceptiva."}
};
$$(".knowledge-check").forEach(box=>{
  const key=box.dataset.check,feedback=$(".check-feedback",box),buttons=$$(".check-options button",box);
  buttons.forEach(btn=>btn.addEventListener("click",()=>{
    if(buttons.some(b=>b.disabled))return;
    const correct=btn.dataset.answer==="correct";
    buttons.forEach(b=>{b.disabled=true;if(b.dataset.answer==="correct")b.classList.add("correct")});
    if(!correct)btn.classList.add("wrong");
    feedback.textContent=correct?checkMessages[key].ok:checkMessages[key].bad;
  }));
});

$$("[data-gate]").forEach(btn=>btn.addEventListener("click",()=>{
  const mode=btn.dataset.gate,door=$("#gateDoor"),state=$("#gateState"),text=$("#gateText");
  door.classList.remove("open","closed");door.classList.add(mode);
  if(mode==="open"){
    state.textContent="Maior passagem nociceptiva";
    text.textContent="Quando a entrada nociceptiva predomina, aumenta a atividade do neurônio de projeção.";
  }else{
    state.textContent="Maior inibição local";
    text.textContent="Aferentes táteis Aβ podem recrutar interneurônios inibitórios e reduzir a saída nociceptiva.";
  }
}));

$$(".traffic-tab").forEach(btn=>btn.addEventListener("click",()=>{
  $$(".traffic-tab").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  $$(".traffic-panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===btn.dataset.traffic));
}));

$$(".flashcard").forEach(card=>card.addEventListener("click",()=>card.classList.toggle("flipped")));

const quiz=[
  {q:"Qual fibra está mais associada ao toque e à pressão?",o:["Aβ","Aδ","C","Fibra motora alfa"],a:0,e:"Aβ é de maior diâmetro, mielinizada e fortemente ligada à mecanossensação."},
  {q:"A 'primeira dor', mais rápida e relativamente bem localizada, é associada principalmente a:",o:["Aβ","Aδ","C","Fibras autonômicas"],a:1,e:"Aδ conduz parte importante da dor rápida/aguda."},
  {q:"Qual descrição combina melhor com fibras C?",o:["Grandes e muito mielinizadas","Pequenas, amielínicas e lentas","Somente proprioceptivas","Somente motoras"],a:1,e:"Fibras C são pequenas, amielínicas e lentas."},
  {q:"Nocicepção e dor são:",o:["Sempre a mesma coisa","Processos diferentes, embora relacionados","Iguais apenas em lesão aguda","Iguais apenas no cérebro"],a:1,e:"Nocicepção é processamento neural; dor é experiência sensorial e emocional."},
  {q:"No modelo do Portão, esfregar uma área dolorida pode:",o:["Apagar os nociceptores","Ativar aferentes táteis e favorecer inibição espinal","Bloquear a circulação","Impedir qualquer sinal de subir"],a:1,e:"Atividade Aβ pode recrutar circuitos inibitórios no corno dorsal."},
  {q:"Qual região é um ponto importante de integração inicial da nocicepção?",o:["Cristalino","Corno dorsal da medula","Cóclea","Hipófise"],a:1,e:"Muitas aferências nociceptivas terminam e são moduladas no corno dorsal."},
  {q:"Modulação descendente significa que:",o:["O cérebro só recebe sinais","Centros encefálicos podem regular circuitos nociceptivos abaixo","A medula não participa da dor","Somente a pele controla a percepção"],a:1,e:"Vias descendentes podem inibir ou facilitar a transmissão nociceptiva."},
  {q:"Qual frase é correta?",o:["A intensidade da dor mede diretamente o dano","Dor é sempre proporcional à lesão","Dor é influenciada por múltiplos fatores","Dor é apenas emocional"],a:2,e:"A experiência dolorosa integra fatores sensoriais, emocionais, cognitivos e contextuais."},
  {q:"Propriocepção informa principalmente:",o:["Posição e movimento corporal","Somente temperatura","Somente dor","Somente visão"],a:0,e:"Propriocepção informa posição, movimento e estado mecânico de músculos/articulações."},
  {q:"No Semáforo Sensorial, esfregar a perna após bater corresponde melhor a:",o:["Vermelho","Amarelo","Verde"],a:2,e:"Verde representa aqui mecanismos inibitórios ou redução da transmissão nociceptiva."}
];
let score=0,answered=new Set();
function renderQuiz(){
  score=0;answered=new Set();$("#quizScore").textContent="0 / "+quiz.length;
  $("#quizBox").innerHTML=quiz.map((x,i)=>'<article class="question" data-q="'+i+'"><h3>'+(i+1)+'. '+x.q+'</h3><div class="options">'+x.o.map((o,j)=>'<button class="option" data-i="'+j+'">'+o+'</button>').join("")+'</div><p class="explanation">'+x.e+'</p></article>').join("");
  $$(".question").forEach(q=>$$(".option",q).forEach(btn=>btn.addEventListener("click",()=>{
    const i=Number(q.dataset.q);if(answered.has(i))return;answered.add(i);
    const chosen=Number(btn.dataset.i);
    $$(".option",q).forEach((b,j)=>{b.disabled=true;if(j===quiz[i].a)b.classList.add("correct");else if(j===chosen)b.classList.add("wrong")});
    if(chosen===quiz[i].a)score++;
    q.classList.add("answered");$("#quizScore").textContent=score+" / "+quiz.length;
  })));
}
renderQuiz();
$("#restartQuiz")?.addEventListener("click",renderQuiz);
