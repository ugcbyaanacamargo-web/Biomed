const $=(s,c=document)=>c.querySelector(s); const $$=(s,c=document)=>[...c.querySelectorAll(s)];

const progressBar=$("#scrollProgress");
window.addEventListener("scroll",()=>{const h=document.documentElement;const max=h.scrollHeight-h.clientHeight;progressBar.style.width=(max?window.scrollY/max*100:0)+"%"});

$("#themeBtn").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("biomed-theme",document.body.classList.contains("dark")?"dark":"light")});
if(localStorage.getItem("biomed-theme")==="dark")document.body.classList.add("dark");

const sidebar=$("#sidebar"); $("#menuBtn")?.addEventListener("click",()=>sidebar.classList.toggle("open"));
$$(".toc a").forEach(a=>a.addEventListener("click",()=>sidebar.classList.remove("open")));

const tocLinks=$$(".toc a");
const sections=$$("main section[id]");
const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){tocLinks.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+e.target.id))}})},{rootMargin:"-25% 0px -65% 0px",threshold:0});
sections.forEach(s=>observer.observe(s));

const checks=$$("[data-complete]");
const studyProgress=$("#studyProgress"),progressText=$("#progressText");
function updateProgress(){
  const done=checks.filter(c=>c.checked).length;
  const pct=Math.round(done/checks.length*100);
  studyProgress.style.width=pct+"%";progressText.textContent=pct+"%";
  localStorage.setItem("biomed-progress",JSON.stringify(Object.fromEntries(checks.map(c=>[c.dataset.complete,c.checked]))));
}
const saved=JSON.parse(localStorage.getItem("biomed-progress")||"{}");
checks.forEach(c=>{c.checked=!!saved[c.dataset.complete];c.addEventListener("change",updateProgress)});updateProgress();
$("#resetProgress").addEventListener("click",()=>{checks.forEach(c=>c.checked=false);updateProgress()});

const searchDialog=$("#searchDialog"),searchInput=$("#searchInput"),searchResults=$("#searchResults");
$("#searchBtn").addEventListener("click",()=>{searchDialog.showModal();setTimeout(()=>searchInput.focus(),80)});
const searchIndex=sections.map(s=>({id:s.id,title:s.querySelector("h2,h1")?.textContent||s.id,text:s.innerText.replace(/\s+/g," ").slice(0,700)}));
searchInput.addEventListener("input",()=>{
  const q=searchInput.value.toLowerCase().trim();
  const found=q?searchIndex.filter(x=>(x.title+" "+x.text).toLowerCase().includes(q)).slice(0,8):[];
  searchResults.innerHTML=found.map(x=>'<a href="#'+x.id+'" data-close-search><strong>'+x.title+'</strong><small>'+x.text.slice(0,135)+'...</small></a>').join("") || (q?'<p>Nenhum resultado.</p>':'<p>Digite um termo para buscar na matéria.</p>');
  $$("[data-close-search]",searchResults).forEach(a=>a.addEventListener("click",()=>searchDialog.close()));
});

$$(".flashcard").forEach(card=>card.addEventListener("click",()=>card.classList.toggle("flipped")));

$$(".traffic-tab").forEach(btn=>btn.addEventListener("click",()=>{
  $$(".traffic-tab").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  $$(".traffic-panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===btn.dataset.traffic));
}));

$$("[data-gate]").forEach(btn=>btn.addEventListener("click",()=>{
  const door=$("#gateDoor"),text=$("#gateText"),mode=btn.dataset.gate;
  door.classList.remove("open","closed");door.classList.add(mode);
  text.textContent=mode==="open"?"Predomínio nociceptivo: maior passagem do sinal para neurônios de projeção.":"Atividade mecanossensorial: aumento da inibição local e redução da transmissão nociceptiva.";
}));

const quiz=[
  {q:"Qual fibra está mais associada ao toque e à pressão?",o:["Aβ","Aδ","C","Somente fibras autonômicas"],a:0,e:"As fibras Aβ são de maior diâmetro e participam fortemente da mecanossensação, como toque e pressão."},
  {q:"A chamada 'primeira dor' é mais associada a:",o:["Fibras C","Fibras Aδ","Fibras Aβ","Fibras motoras"],a:1,e:"Aδ conduz dor mais rápida e relativamente bem localizada."},
  {q:"Fibras C são:",o:["Grandes e muito mielinizadas","Somente motoras","Pequenas, amielínicas e lentas","Exclusivas do sistema visual"],a:2,e:"Fibras C são pequenas, amielínicas e conduzem lentamente."},
  {q:"Nocicepção e dor são a mesma coisa?",o:["Sim, sempre","Não: nocicepção é processo neural; dor é experiência","Só em lesão aguda","Só em humanos"],a:1,e:"A dor é uma experiência sensorial e emocional; nocicepção descreve processamento neural de estímulos nocivos."},
  {q:"No modelo do Portão, esfregar uma região dolorida pode:",o:["Aumentar sempre a lesão","Ativar aferentes táteis e favorecer inibição","Bloquear o sangue","Desligar o cérebro"],a:1,e:"Atividade de fibras de maior diâmetro pode recrutar circuitos inibitórios no corno dorsal."},
  {q:"Qual estrutura é ponto importante de modulação inicial da nocicepção?",o:["Cristalino","Corno dorsal da medula","Cóclea","Cerebelo exclusivamente"],a:1,e:"A substância cinzenta do corno dorsal recebe e modula muitas aferências nociceptivas."},
  {q:"A modulação descendente significa que:",o:["O cérebro só recebe sinais","Centros encefálicos podem regular circuitos medulares","A dor nunca chega à medula","Somente a pele controla a dor"],a:1,e:"Vias descendentes podem inibir ou facilitar a transmissão nociceptiva."},
  {q:"Qual frase é correta sobre a dor?",o:["É medida direta do tamanho da lesão","É sempre proporcional ao dano","É uma experiência influenciada por múltiplos fatores","É apenas emocional"],a:2,e:"A dor integra componentes sensoriais, emocionais e contextuais."},
  {q:"Propriocepção é a percepção de:",o:["Somente temperatura","Posição e movimento corporal","Somente dor","Somente visão"],a:1,e:"Proprioceptores informam posição, movimento, comprimento muscular e tensão."},
  {q:"No Semáforo Sensorial, um exemplo 'verde' é:",o:["Foco extremo na dor","Ansiedade intensa","Estimulação tátil em área dolorida","Estresse máximo"],a:2,e:"No exercício, verde representa mecanismos inibitórios ou redução da transmissão nociceptiva."}
];
let score=0,answered=new Set();
function renderQuiz(){
  score=0;answered.clear();$("#quizScore").textContent="0 / "+quiz.length;
  $("#quizBox").innerHTML=quiz.map((x,i)=>'<article class="question" data-q="'+i+'"><h3>'+(i+1)+'. '+x.q+'</h3><div class="options">'+x.o.map((o,j)=>'<button class="option" data-i="'+j+'">'+o+'</button>').join("")+'</div><p class="explanation">'+x.e+'</p></article>').join("");
  $$(".question").forEach(q=>$$(".option",q).forEach(btn=>btn.addEventListener("click",()=>{
    const i=+q.dataset.q;if(answered.has(i))return;answered.add(i);const selected=+btn.dataset.i;
    $$(".option",q).forEach((b,j)=>{if(j===quiz[i].a)b.classList.add("correct");else if(j===selected)b.classList.add("wrong");b.disabled=true});
    if(selected===quiz[i].a)score++;q.classList.add("answered");$("#quizScore").textContent=score+" / "+quiz.length;
  })));
}
renderQuiz();$("#restartQuiz").addEventListener("click",renderQuiz);
