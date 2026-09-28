(function(){
"use strict";
const root=document.getElementById("labApp");
if(!root)return;

const STORAGE="biomed-adaptive-v2";
const topics={
  receptores:{label:"Receptores",color:"#0d78bd",lesson:"#perceber"},
  fibras:{label:"Fibras Aβ/Aδ/C",color:"#6b55bd",lesson:"#conduzir"},
  vias:{label:"Vias sensoriais",color:"#8058bd",lesson:"#conduzir"},
  nocicepcao:{label:"Nocicepção × dor",color:"#e68b2c",lesson:"#processar"},
  portao:{label:"Teoria do Portão",color:"#15965a",lesson:"#modular"},
  descendente:{label:"Modulação descendente",color:"#15856d",lesson:"#modular"},
  contexto:{label:"Atenção, emoção e contexto",color:"#d89c10",lesson:"#processar"},
  semaforo:{label:"Semáforo Sensorial",color:"#cf4a4a",lesson:"#aplicar"}
};
const topicKeys=Object.keys(topics);
const defaultState=()=>({
  mastery:Object.fromEntries(topicKeys.map(k=>[k,{score:null,attempts:0,correct:0,last:null}])),
  misconceptions:{},
  history:[],
  diagnosticDone:false,
  diagnosticScore:null,
  generated:0,
  openAnswers:0,
  caseLevel:0,
  lastStudy:null
});
let state=load();
let currentQuestion=null;
let diagnostic={active:false,items:[],index:0,correct:0};
let caseSession=null;

function load(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE)||"null");
    if(!raw)return defaultState();
    const base=defaultState();
    base.mastery={...base.mastery,...(raw.mastery||{})};
    return {...base,...raw,mastery:base.mastery};
  }catch(e){return defaultState()}
}
function save(){state.lastStudy=new Date().toISOString();localStorage.setItem(STORAGE,JSON.stringify(state));renderMastery();renderTutor()}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function shuffle(arr){return arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1])}
function normalize(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w\sβδ]/g," ").replace(/\s+/g," ").trim()}
function topicScore(k){const v=state.mastery[k];return v&&v.score!=null?v.score:35}
function updateMastery(topic,correct,difficulty=1,wrongLabel){
  const m=state.mastery[topic]||{score:null,attempts:0,correct:0,last:null};
  const before=m.score==null?45:m.score;
  const gain=correct?(6+3*difficulty):-(5+2*difficulty);
  m.score=clamp(Math.round(before+gain),0,100);
  m.attempts=(m.attempts||0)+1;
  if(correct)m.correct=(m.correct||0)+1;
  m.last=new Date().toISOString();
  state.mastery[topic]=m;
  if(!correct&&wrongLabel)state.misconceptions[wrongLabel]=(state.misconceptions[wrongLabel]||0)+1;
}
function log(entry){
  state.history.unshift({time:new Date().toISOString(),...entry});
  state.history=state.history.slice(0,120);
}
function weakestTopic(){
  return topicKeys.map(k=>[k,topicScore(k),state.mastery[k].attempts||0]).sort((a,b)=>a[1]-b[1]||a[2]-b[2])[0][0];
}

const names=["Ana","Bruno","Carla","Diego","Elisa","Felipe","Giovana","Hugo"];
const places=["perna","antebraço","mão","ombro","pé"];
const tactile=["esfrega suavemente o local","pressiona levemente a região","recebe uma estimulação tátil no local"];
const contexts=[
  {text:"fica extremamente focada na sensação",dir:"up",factor:"atenção"},
  {text:"começa a conversar e se distrair",dir:"down",factor:"distração"},
  {text:"fica muito ansiosa com o que aconteceu",dir:"up",factor:"ansiedade"},
  {text:"permanece calma e recebe apoio",dir:"down",factor:"contexto"}
];

function mc(topic,stem,correct,wrong,explanation,difficulty=1,misconception){
  const opts=shuffle([correct,...wrong]);
  return {type:"mc",topic,stem,options:opts,correctIndex:opts.indexOf(correct),answer:correct,explanation,difficulty,misconception:misconception||topic};
}
function qReceptor(){
  const cases=[
    ["uma superfície fria","Termorreceptor",["Mecanorreceptor","Proprioceptor","Nociceptor"],"Frio e calor são detectados por termorreceptores."],
    ["uma pressão leve sobre a pele","Mecanorreceptor",["Termorreceptor","Nociceptor","Proprioceptor"],"Toque e pressão são formas de energia mecânica detectadas por mecanorreceptores."],
    ["a posição da articulação do joelho","Proprioceptor",["Termorreceptor","Nociceptor","Mecanorreceptor cutâneo"],"Proprioceptores informam posição e movimento corporal."],
    ["um estímulo potencialmente lesivo muito intenso","Nociceptor",["Proprioceptor","Termorreceptor apenas","Mecanorreceptor apenas"],"Nociceptores respondem a estímulos potencialmente lesivos."]
  ];
  const c=pick(cases),n=pick(names);
  return mc("receptores",n+" recebe "+c[0]+". Qual receptor é o mais diretamente relacionado à detecção principal desse estímulo?",c[1],c[2],c[3],1,"receptores");
}
function qFibra(){
  const cases=[
    ["toque e pressão, com condução rápida","Aβ",["Aδ","C","Somente fibras autonômicas"],"Aβ tem grande diâmetro, é mielinizada e conduz mecanossensação rapidamente.","Aβ × Aδ/C"],
    ["dor inicial aguda e relativamente bem localizada","Aδ",["Aβ","C","Fibra motora α"],"Aδ participa da chamada primeira dor, mais rápida.","Aδ × C"],
    ["dor lenta, difusa e em queimação","C",["Aβ","Aδ","Fibra Ia"],"Fibras C são pequenas, amielínicas e lentas.","Aδ × C"]
  ];
  const c=pick(cases);
  return mc("fibras","Qual fibra combina melhor com: "+c[0]+"?",c[1],c[2],c[3],1,c[4]);
}
function qVia(){
  if(Math.random()<.5)return mc("vias","Qual via é mais associada a tato discriminativo, vibração e propriocepção?","Coluna dorsal–lemnisco medial",["Sistema anterolateral","Trato corticoespinal","Via vestibuloespinal"],"A coluna dorsal–lemnisco medial conduz principalmente tato discriminativo, vibração e propriocepção.",1,"vias ascendentes");
  return mc("vias","Uma informação de dor e temperatura ascende principalmente por qual sistema?","Sistema anterolateral",["Coluna dorsal–lemnisco medial","Trato corticoespinal lateral","Fascículo longitudinal medial"],"Dor e temperatura usam principalmente o sistema anterolateral.",1,"vias ascendentes");
}
function qNocicepcao(){
  const loc=pick(places),n=pick(names);
  return mc("nocicepcao",n+" machuca a "+loc+". O sistema nervoso detecta e transmite o estímulo potencialmente lesivo, mas a experiência final também depende de emoção e contexto. Qual distinção está correta?","Nocicepção é o processo neural; dor é a experiência sensorial e emocional.",["Dor e nocicepção são sempre a mesma coisa.","Dor é apenas o sinal que sobe pela medula.","Nocicepção depende exclusivamente de emoção."],"Nocicepção descreve detecção/transmissão neural; dor é uma experiência multidimensional.",2,"nocicepção × dor");
}
function qPortao(){
  const n=pick(names),loc=pick(places),touch=pick(tactile);
  return mc("portao",n+" bate a "+loc+" e depois "+touch+". Qual mecanismo explica melhor uma possível redução temporária da dor?","Aferentes táteis Aβ podem recrutar circuitos inibitórios no corno dorsal.",["O toque destrói os nociceptores locais.","A medula deixa de receber qualquer sinal sensorial.","As fibras C passam a conduzir mais rápido."],"No modelo do Portão, atividade mecanossensorial pode favorecer inibição da transmissão nociceptiva na medula.",2,"Portão/Aβ");
}
function qDescendente(){
  return mc("descendente","Qual afirmação descreve melhor a modulação descendente da dor?","Centros encefálicos podem enviar sinais que inibem ou facilitam circuitos nociceptivos na medula.",["O cérebro apenas recebe informação e nunca envia controle de volta.","Somente receptores da pele modulam a dor.","A modulação descendente ocorre apenas nos nervos periféricos."],"Vias descendentes do encéfalo e tronco encefálico regulam a excitabilidade de circuitos nociceptivos espinais.",2,"modulação descendente");
}
function qContexto(){
  const n=pick(names),ctx=pick(contexts);
  const correct=ctx.dir==="up"?"A percepção dolorosa pode aumentar.":"A percepção dolorosa pode diminuir em algumas situações.";
  const wrong=ctx.dir==="up"?["A percepção necessariamente desaparece.","A lesão física aumenta automaticamente.","Nenhum fator central pode influenciar a dor."]:["A lesão é curada pela distração.","A nocicepção periférica necessariamente zera.","A dor sempre aumenta."];
  return mc("contexto",n+" sente dor e "+ctx.text+". O que é mais coerente com a modulação da percepção?",correct,wrong,"Atenção, emoção e contexto podem modificar a experiência dolorosa sem tornar a dor 'falsa'.",2,"atenção/contexto");
}
function qSemaforo(){
  const type=pick(["red","yellow","green"]);
  if(type==="green"){
    return mc("semaforo","Depois de bater a "+pick(places)+", "+pick(names)+" "+pick(tactile)+". No Semáforo Sensorial, qual classificação faz mais sentido?","🟢 Verde",["🔴 Vermelho","🟡 Amarelo","Sem classificação"],"Verde representa situações em que mecanismos inibitórios/redução da transmissão são destacados.",1,"cores do semáforo");
  }
  if(type==="red"){
    return mc("semaforo",pick(names)+" sente um estímulo doloroso e fica extremamente focado e ansioso. Qual classificação?","🔴 Vermelho",["🟡 Amarelo","🟢 Verde","Sem classificação"],"Vermelho representa maior ativação/percepção dolorosa.",1,"cores do semáforo");
  }
  return mc("semaforo","Duas pessoas recebem estímulos semelhantes, mas relatam intensidades diferentes. Qual classificação destaca melhor a influência do processamento individual?","🟡 Amarelo",["🔴 Vermelho","🟢 Verde","Sem classificação"],"Amarelo destaca modulação por contexto, atenção e fatores individuais.",1,"cores do semáforo");
}
const generators={receptores:qReceptor,fibras:qFibra,vias:qVia,nocicepcao:qNocicepcao,portao:qPortao,descendente:qDescendente,contexto:qContexto,semaforo:qSemaforo};

function generateQuestion(topic){
  const key=topic&&generators[topic]?topic:(Math.random()<.65?weakestTopic():pick(topicKeys));
  state.generated++;
  return generators[key]();
}

const openRubrics=[
  {
    topic:"portao",
    title:"Explique o mecanismo",
    prompt:()=>pick(names)+" bate a "+pick(places)+" e começa a esfregar o local. Explique, com suas palavras, por que isso pode reduzir temporariamente a dor.",
    criteria:[
      {label:"Cita estímulo tátil/toque/pressão",pts:2,words:["toque","tatil","pressao","esfrega","mecanossensorial"]},
      {label:"Relaciona a fibras Aβ",pts:2,words:["aβ","a beta","abeta"]},
      {label:"Cita medula/corno dorsal",pts:2,words:["medula","corno dorsal","substancia gelatinosa"]},
      {label:"Cita inibição/interneurônio inibitório",pts:2,words:["inib","interneuronio"]},
      {label:"Explica redução da transmissão nociceptiva",pts:2,words:["reduz","diminu","transmissao nociceptiva","sinal doloroso","nocicept"]}
    ],
    model:"O toque ativa aferentes de maior diâmetro, como Aβ. No corno dorsal da medula, essa atividade pode recrutar interneurônios inibitórios e reduzir a transmissão nociceptiva para neurônios de projeção."
  },
  {
    topic:"nocicepcao",
    title:"Diferencie conceitos",
    prompt:()=>"Explique a diferença entre nocicepção e dor e dê um motivo pelo qual duas pessoas podem sentir intensidades diferentes diante de estímulos semelhantes.",
    criteria:[
      {label:"Define nocicepção como processo neural",pts:2,words:["processo neural","deteccao","transmissao","nocicept"]},
      {label:"Define dor como experiência",pts:2,words:["experiencia","sensorial e emocional","percepcao"]},
      {label:"Diz que não são sinônimos",pts:2,words:["nao sao","diferente","distint"]},
      {label:"Cita fator modulador",pts:2,words:["atencao","emocao","ansiedade","contexto","expectativa","memoria"]},
      {label:"Relaciona ao processamento do sistema nervoso",pts:2,words:["sistema nervoso","cerebro","processamento","modulacao"]}
    ],
    model:"Nocicepção é a detecção e transmissão neural de estímulos potencialmente lesivos; dor é uma experiência sensorial e emocional. Atenção, emoção, contexto e experiências anteriores podem modificar o processamento e ajudar a explicar diferenças entre pessoas."
  },
  {
    topic:"fibras",
    title:"Compare as fibras",
    prompt:()=>"Compare Aβ, Aδ e C quanto à função e velocidade relativa. Depois diga qual delas está mais ligada à primeira dor e qual à dor lenta/difusa.",
    criteria:[
      {label:"Aβ: toque/pressão e rápida",pts:2,words:["aβ","a beta","toque","pressao","rapida"]},
      {label:"Aδ: primeira dor/aguda",pts:2,words:["aδ","a delta","primeira dor","aguda"]},
      {label:"C: lenta/difusa/queimação",pts:2,words:["fibra c","lenta","difusa","queimacao"]},
      {label:"Relaciona mielina/diâmetro à velocidade",pts:2,words:["mielina","mieliniz","diametro","velocidade"]},
      {label:"Distingue claramente Aδ de C",pts:2,words:["aδ","a delta","fibra c","c e","delta e c"]}
    ],
    model:"Aβ é grande, mielinizada e rápida, relacionada a toque e pressão. Aδ é menor, finamente mielinizada e participa da primeira dor, mais aguda. C é pequena, amielínica e lenta, associada à dor mais difusa e persistente."
  }
];

function gradeOpen(text,rubric){
  const n=normalize(text);
  let score=0;
  const details=rubric.criteria.map(c=>{
    const hit=c.words.some(w=>n.includes(normalize(w)));
    if(hit)score+=c.pts;
    return {...c,hit};
  });
  return {score:Math.min(10,score),details};
}

const caseTemplates=[
  {
    name:"Lesão + toque",
    make:()=>{const n=pick(names),loc=pick(places);return {
      stem:n+" bate a "+loc+", sente uma dor aguda inicial e, segundos depois, começa a esfregar o local.",
      steps:[
        {q:"Qual fibra combina melhor com a dor aguda inicial?",a:"Aδ",choices:["Aβ","Aδ","C"],why:"Aδ participa da primeira dor, mais rápida."},
        {q:"Qual fibra é mais recrutada pelo toque/pressão ao esfregar?",a:"Aβ",choices:["Aβ","Aδ","C"],why:"Aβ conduz mecanossensação, como toque e pressão."},
        {q:"Onde ocorre importante integração desse efeito inibitório?",a:"Corno dorsal da medula",choices:["Corno dorsal da medula","Cristalino","Cerebelo exclusivamente"],why:"Circuitos do corno dorsal podem modular a transmissão nociceptiva."},
        {q:"Qual resultado conceitual é esperado?",a:"Redução da transmissão nociceptiva",choices:["Redução da transmissão nociceptiva","Destruição do nociceptor","Bloqueio total de todo sinal sensorial"],why:"A atividade tátil pode favorecer inibição, não apagar todo o sistema."}
      ]};}
  },
  {
    name:"Contexto e percepção",
    make:()=>{const n=pick(names);return {
      stem:n+" recebe um estímulo doloroso moderado. Em um momento fica muito ansioso e focado na sensação; em outro, está calmo e envolvido em uma conversa.",
      steps:[
        {q:"O estímulo periférico precisa mudar para a percepção mudar?",a:"Não",choices:["Sim","Não"],why:"A percepção pode mudar por modulação central mesmo com estímulos semelhantes."},
        {q:"Qual fator está claramente envolvido?",a:"Atenção e emoção",choices:["Atenção e emoção","Somente temperatura","Somente propriocepção"],why:"Foco, ansiedade e contexto modulam a experiência dolorosa."},
        {q:"Isso significa que a dor é 'inventada'?",a:"Não",choices:["Sim","Não"],why:"A dor é real; ser modulada não significa ser falsa."}
      ]};}
  },
  {
    name:"Via sensorial",
    make:()=>({stem:"Uma pessoa percebe vibração fina na mão e, em outro momento, uma picada dolorosa quente.",
      steps:[
        {q:"Qual sistema leva principalmente vibração/tato discriminativo?",a:"Coluna dorsal–lemnisco medial",choices:["Coluna dorsal–lemnisco medial","Sistema anterolateral"],why:"Essa via leva principalmente tato discriminativo, vibração e propriocepção."},
        {q:"Qual sistema leva principalmente dor/temperatura?",a:"Sistema anterolateral",choices:["Coluna dorsal–lemnisco medial","Sistema anterolateral"],why:"Dor e temperatura usam principalmente o sistema anterolateral."}
      ]})
  }
];

function renderShell(){
  root.innerHTML=
    '<div class="lab-head">'+
      '<div><span class="lab-eyebrow">LABORATÓRIO ADAPTATIVO</span><h2>Pratique até dominar — não até decorar</h2><p>As atividades mudam conforme seu desempenho. O sistema registra erros, escolhe o próximo assunto e gera novas combinações de casos.</p></div>'+
      '<div class="lab-summary-mini"><strong id="labOverall">—</strong><span>domínio global</span></div>'+
    '</div>'+
    '<div class="lab-tabs" role="tablist">'+
      '<button class="lab-tab active" data-labtab="diagnostico">🩺 Diagnóstico</button>'+
      '<button class="lab-tab" data-labtab="treino">♻️ Perguntas variáveis</button>'+
      '<button class="lab-tab" data-labtab="aberta">✍️ Resposta aberta</button>'+
      '<button class="lab-tab" data-labtab="simulacoes">🎛️ Simulações</button>'+
      '<button class="lab-tab" data-labtab="casos">🧩 Casos clínicos</button>'+
      '<button class="lab-tab" data-labtab="dominio">📊 Mapa de domínio</button>'+
    '</div>'+
    '<div class="lab-panel active" data-labpanel="diagnostico"></div>'+
    '<div class="lab-panel" data-labpanel="treino"></div>'+
    '<div class="lab-panel" data-labpanel="aberta"></div>'+
    '<div class="lab-panel" data-labpanel="simulacoes"></div>'+
    '<div class="lab-panel" data-labpanel="casos"></div>'+
    '<div class="lab-panel" data-labpanel="dominio"></div>';
  $$(".lab-tab",root).forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.labtab)));
}
function switchTab(tab){
  $$(".lab-tab",root).forEach(b=>b.classList.toggle("active",b.dataset.labtab===tab));
  $$(".lab-panel",root).forEach(p=>p.classList.toggle("active",p.dataset.labpanel===tab));
  if(tab==="diagnostico")renderDiagnostic();
  if(tab==="treino")renderTraining();
  if(tab==="aberta")renderOpen();
  if(tab==="simulacoes")renderSimulations();
  if(tab==="casos")renderCases();
  if(tab==="dominio")renderMastery();
}
function panel(name){return root.querySelector('[data-labpanel="'+name+'"]')}

function renderDiagnostic(){
  const p=panel("diagnostico");
  if(diagnostic.active){renderDiagnosticQuestion();return}
  if(state.diagnosticDone){
    p.innerHTML='<div class="lab-intro-card"><div><span class="lab-badge good">CONCLUÍDO</span><h3>Seu diagnóstico já foi realizado</h3><p>Resultado mais recente: <strong>'+state.diagnosticScore+'%</strong>. Você pode refazer quando quiser; o sistema usará o novo resultado para recalibrar seu mapa de domínio.</p></div><button class="lab-primary" id="startDiagnostic">Refazer diagnóstico</button></div>'+masteryMarkup(true);
  }else{
    p.innerHTML='<div class="lab-intro-card"><div><span class="lab-badge">PRIMEIRO PASSO</span><h3>Descubra onde você realmente está</h3><p>São 10 perguntas misturadas. Elas não servem para “aprovar” ou “reprovar”: servem para evitar que você perca tempo revendo o que já sabe e encontrar suas lacunas.</p><ul><li>10 questões aleatórias</li><li>assuntos intercalados</li><li>mapa inicial de domínio</li><li>leva cerca de 4 minutos</li></ul></div><button class="lab-primary" id="startDiagnostic">Começar diagnóstico</button></div>';
  }
  $("#startDiagnostic",p)?.addEventListener("click",startDiagnostic);
}
function startDiagnostic(){
  diagnostic.active=true;diagnostic.index=0;diagnostic.correct=0;
  const chosen=shuffle([...topicKeys,...shuffle(topicKeys).slice(0,2)]).slice(0,10);
  diagnostic.items=chosen.map(k=>generators[k]());
  renderDiagnosticQuestion();
}
function renderDiagnosticQuestion(){
  const p=panel("diagnostico");
  if(diagnostic.index>=diagnostic.items.length){
    diagnostic.active=false;state.diagnosticDone=true;state.diagnosticScore=Math.round(diagnostic.correct/diagnostic.items.length*100);save();renderDiagnostic();return;
  }
  const q=diagnostic.items[diagnostic.index];
  p.innerHTML='<div class="lab-question-card"><div class="lab-qtop"><span>Diagnóstico '+(diagnostic.index+1)+' / '+diagnostic.items.length+'</span><span>'+topics[q.topic].label+'</span></div><h3>'+q.stem+'</h3><div class="lab-options">'+q.options.map((o,i)=>'<button data-diag="'+i+'">'+o+'</button>').join("")+'</div><div class="lab-meter"><i style="width:'+((diagnostic.index)/diagnostic.items.length*100)+'%"></i></div></div>';
  $$("[data-diag]",p).forEach(b=>b.addEventListener("click",()=>{
    const correct=Number(b.dataset.diag)===q.correctIndex;
    if(correct)diagnostic.correct++;
    updateMastery(q.topic,correct,q.difficulty,correct?null:q.misconception);
    log({mode:"diagnostic",topic:q.topic,correct});
    save();diagnostic.index++;renderDiagnosticQuestion();
  }));
}

function trainingQuestionMarkup(q){
  return '<div class="lab-question-card adaptive-q">'+
    '<div class="lab-qtop"><span>Questão gerada #'+state.generated+'</span><span>'+topics[q.topic].label+' • dificuldade '+q.difficulty+'</span></div>'+
    '<h3>'+q.stem+'</h3>'+
    '<div class="lab-options">'+q.options.map((o,i)=>'<button data-train="'+i+'">'+o+'</button>').join("")+'</div>'+
    '<div class="lab-feedback" id="trainFeedback"></div>'+
    '<div class="lab-qactions"><button class="lab-secondary" id="newQuestion">Gerar outra situação</button><button class="lab-primary hidden" id="nextAdaptive">Próxima adaptativa →</button></div>'+
  '</div>';
}
function renderTraining(){
  const p=panel("treino");
  const weak=weakestTopic();
  p.innerHTML='<div class="adaptive-toolbar"><div><span class="lab-badge">MODO ADAPTATIVO</span><h3>O próximo exercício mira sua maior lacuna</h3><p>No momento, o sistema prioriza: <strong>'+topics[weak].label+'</strong>.</p></div><label>Foco<select id="topicFocus"><option value="">Automático (recomendado)</option>'+topicKeys.map(k=>'<option value="'+k+'">'+topics[k].label+'</option>').join("")+'</select></label></div><div id="trainingMount"></div>';
  currentQuestion=generateQuestion();
  mountTraining();
  $("#topicFocus",p).addEventListener("change",e=>{currentQuestion=generateQuestion(e.target.value||null);mountTraining()});
}
function mountTraining(){
  const mount=$("#trainingMount",panel("treino"));if(!mount)return;
  mount.innerHTML=trainingQuestionMarkup(currentQuestion);
  $$("[data-train]",mount).forEach(btn=>btn.addEventListener("click",()=>answerTraining(Number(btn.dataset.train))));
  $("#newQuestion",mount)?.addEventListener("click",()=>{const f=$("#topicFocus",panel("treino"))?.value||null;currentQuestion=generateQuestion(f);mountTraining()});
  $("#nextAdaptive",mount)?.addEventListener("click",()=>{currentQuestion=generateQuestion();mountTraining()});
}
function answerTraining(index){
  const q=currentQuestion,mount=$("#trainingMount",panel("treino")),buttons=$$("[data-train]",mount);
  if(buttons.some(b=>b.disabled))return;
  const correct=index===q.correctIndex;
  buttons.forEach((b,i)=>{b.disabled=true;if(i===q.correctIndex)b.classList.add("correct");else if(i===index)b.classList.add("wrong")});
  updateMastery(q.topic,correct,q.difficulty,correct?null:q.misconception);
  log({mode:"adaptive",topic:q.topic,correct,stem:q.stem});
  save();
  $("#trainFeedback",mount).innerHTML='<strong>'+(correct?"✓ Correto":"✕ Ainda não")+'</strong><p>'+q.explanation+'</p><small>'+(!correct?"Esse tipo de erro aumentou a prioridade deste assunto nas próximas questões.":"O sistema registrou o acerto e poderá aumentar a dificuldade.")+'</small>';
  $("#nextAdaptive",mount).classList.remove("hidden");
}

function renderOpen(){
  const p=panel("aberta"),rubric=pick(openRubrics);
  p.dataset.rubric=String(openRubrics.indexOf(rubric));
  p.innerHTML='<div class="open-layout"><div class="open-prompt"><span class="lab-badge">NOTA 0–10 POR CRITÉRIOS</span><h3>'+rubric.title+'</h3><p>'+rubric.prompt()+'</p><textarea id="openText" rows="8" placeholder="Escreva como explicaria para um colega. Tente usar o mecanismo, não apenas a resposta final."></textarea><div class="open-actions"><button class="lab-primary" id="gradeOpen">Corrigir minha explicação</button><button class="lab-secondary" id="newOpen">Nova pergunta</button></div><small class="lab-disclaimer">A nota é calculada por uma rubrica de conceitos esperados, sem depender de API externa de IA.</small></div><div class="open-result" id="openResult"><div class="empty-result">Sua nota e o que faltou aparecerão aqui.</div></div></div>';
  $("#gradeOpen",p).addEventListener("click",()=>gradeCurrentOpen());
  $("#newOpen",p).addEventListener("click",renderOpen);
}
function gradeCurrentOpen(){
  const p=panel("aberta"),rubric=openRubrics[Number(p.dataset.rubric)],text=$("#openText",p).value.trim(),result=$("#openResult",p);
  if(text.length<15){result.innerHTML='<div class="score-bad"><strong>Resposta muito curta</strong><p>Escreva pelo menos uma explicação completa para que a rubrica consiga avaliar.</p></div>';return}
  const g=gradeOpen(text,rubric);
  state.openAnswers++;
  const correct=g.score>=7;
  updateMastery(rubric.topic,correct,g.score>=9?3:2,correct?null:"resposta aberta incompleta: "+rubric.topic);
  log({mode:"open",topic:rubric.topic,score:g.score});
  save();
  const cls=g.score>=8?"score-good":g.score>=5?"score-mid":"score-bad";
  result.innerHTML='<div class="'+cls+'"><div class="score-circle">'+g.score+'<small>/10</small></div><div><strong>'+(g.score>=8?"Explicação sólida":g.score>=5?"Você entendeu parte do mecanismo":"Faltam peças importantes")+'</strong><p>A correção abaixo mostra exatamente o que apareceu e o que faltou.</p></div></div><div class="rubric-list">'+g.details.map(d=>'<div class="'+(d.hit?"hit":"miss")+'"><span>'+(d.hit?"✓":"○")+'</span><p><strong>'+d.label+'</strong><small>'+(d.hit?"+"+d.pts+" pontos":"não identificado")+'</small></p></div>').join("")+'</div><details class="model-answer"><summary>Ver resposta-modelo</summary><p>'+rubric.model+'</p></details>';
}

function renderSimulations(){
  const p=panel("simulacoes");
  p.innerHTML=
  '<div class="sim-grid">'+
    '<article class="sim-card"><span class="lab-badge">SIMULAÇÃO 1</span><h3>Misturador de modulação</h3><p>Altere as variáveis e veja a direção prevista da percepção em um <strong>modelo didático qualitativo</strong>, não uma fórmula clínica.</p>'+
      slider("noc","Entrada nociceptiva",70)+slider("touch","Toque/pressão Aβ",20)+slider("focus","Foco na dor",50)+slider("anx","Ansiedade/estresse",40)+slider("inh","Inibição descendente",30)+
      '<div class="pain-output"><div class="pain-bar"><i id="painBar"></i></div><strong id="painLabel"></strong><p id="painExplain"></p></div></article>'+
    '<article class="sim-card"><span class="lab-badge">SIMULAÇÃO 2</span><h3>Corrida de condução</h3><p>Escolha a distância aproximada entre o receptor e a medula/encéfalo. O cálculo usa faixas didáticas de velocidade.</p>'+slider("distance","Distância",1,0.2,2,0.1," m")+'<div class="race-results" id="raceResults"></div><small>Faixas aproximadas usadas: Aβ 35–75 m/s, Aδ 5–30 m/s, C 0,5–2 m/s.</small></article>'+
    '<article class="sim-card full"><span class="lab-badge">SIMULAÇÃO 3</span><h3>“E se eu mudar só uma coisa?”</h3><p>Selecione uma alteração. O sistema mantém o restante do caso igual e mostra qual mecanismo mudou.</p><div class="counter-grid"><button data-counter="touch">Adicionar toque/pressão</button><button data-counter="focus">Aumentar foco na dor</button><button data-counter="anxiety">Aumentar ansiedade</button><button data-counter="desc">Aumentar inibição descendente</button></div><div class="counter-result" id="counterResult">Escolha uma variável.</div></article>'+
  '</div>';
  $$('input[type="range"]',p).forEach(i=>i.addEventListener("input",updateSims));
  $$("[data-counter]",p).forEach(b=>b.addEventListener("click",()=>counterfactual(b.dataset.counter)));
  updateSims();
}
function slider(id,label,val,min=0,max=100,step=1,suffix=""){
  return '<label class="sim-slider"><span>'+label+' <b id="'+id+'Val">'+val+suffix+'</b></span><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" data-suffix="'+suffix+'"></label>';
}
function updateSims(){
  ["noc","touch","focus","anx","inh","distance"].forEach(id=>{const el=$("#"+id);if(el){$("#"+id+"Val").textContent=el.value+(el.dataset.suffix||"")}});
  if($("#noc")){
    const noc=+$("#noc").value,t=+$("#touch").value,f=+$("#focus").value,a=+$("#anx").value,inh=+$("#inh").value;
    const value=clamp(Math.round(20+noc*.58-t*.20+f*.12+a*.12-inh*.24),0,100);
    $("#painBar").style.width=value+"%";
    $("#painLabel").textContent=value<34?"Tendência menor":value<67?"Tendência intermediária":"Tendência maior";
    const factors=[];if(t>55)factors.push("toque Aβ favorece inibição");if(inh>55)factors.push("controle descendente inibitório");if(f>65)factors.push("foco pode aumentar saliência");if(a>65)factors.push("ansiedade pode amplificar a experiência");if(noc>70)factors.push("entrada nociceptiva alta");
    $("#painExplain").textContent=factors.length?factors.join(" • "):"As variáveis estão em faixas intermediárias.";
  }
  if($("#distance")){
    const d=+$("#distance").value;
    const calc=(v1,v2)=>[(d/v2*1000).toFixed(1),(d/v1*1000).toFixed(1)];
    const ab=calc(35,75),ad=calc(5,30),c=calc(.5,2);
    $("#raceResults").innerHTML='<div><b>Aβ</b><span>'+ab[0]+'–'+ab[1]+' ms</span></div><div><b>Aδ</b><span>'+ad[0]+'–'+ad[1]+' ms</span></div><div><b>C</b><span>'+c[0]+'–'+c[1]+' ms</span></div>';
  }
}
function counterfactual(k){
  const map={
    touch:["Adicionar toque/pressão","↑ atividade Aβ → pode ↑ inibição local no corno dorsal → ↓ transmissão nociceptiva."],
    focus:["Aumentar foco na dor","↑ atenção ao estímulo → pode ↑ saliência/percepção dolorosa, sem exigir aumento da lesão."],
    anxiety:["Aumentar ansiedade","↑ estado emocional de ameaça → pode facilitar/amplificar a experiência dolorosa."],
    desc:["Aumentar inibição descendente","↑ controle inibitório de centros encefálicos → pode ↓ excitabilidade de circuitos nociceptivos espinais."]
  };
  $("#counterResult").innerHTML='<strong>'+map[k][0]+'</strong><p>'+map[k][1]+'</p>';
}

function renderCases(){
  const p=panel("casos");
  if(!caseSession){
    p.innerHTML='<div class="lab-intro-card"><div><span class="lab-badge">EXEMPLO → AJUDA → SOZINHO</span><h3>Casos em etapas com retirada progressiva da ajuda</h3><p>Primeiro você vê uma resolução guiada; depois recebe pistas; por fim resolve um caso sem pistas. O nível sobe conforme você avança.</p></div><button class="lab-primary" id="startCase">Iniciar caso</button></div>';
    $("#startCase",p).addEventListener("click",startCase);
    return;
  }
  renderCaseStep();
}
function startCase(){
  const tpl=pick(caseTemplates).make();
  const level=state.caseLevel%3;
  caseSession={...tpl,level,index:0,correct:0,locked:false};
  renderCaseStep();
}
function renderCaseStep(){
  const p=panel("casos"),c=caseSession,step=c.steps[c.index];
  if(!step){
    const pct=Math.round(c.correct/c.steps.length*100);
    state.caseLevel=(state.caseLevel||0)+1;
    log({mode:"case",score:pct,name:c.stem});
    save();
    p.innerHTML='<div class="case-finish"><div class="score-circle">'+pct+'<small>%</small></div><div><span class="lab-badge good">CASO CONCLUÍDO</span><h3>'+(pct>=75?"Bom raciocínio":"Vale revisar o mecanismo")+'</h3><p>Você acertou '+c.correct+' de '+c.steps.length+' etapas. O próximo caso usará '+(["exemplo resolvido","ajuda parcial","menos ajuda"][state.caseLevel%3])+' conforme sua sequência.</p><button class="lab-primary" id="nextCase">Novo caso</button></div></div>';
    $("#nextCase",p).addEventListener("click",()=>{caseSession=null;startCase()});return;
  }
  const labels=["Exemplo resolvido","Ajuda parcial","Resolva sozinho"];
  const level=c.level;
  let hint="";
  if(level===0)hint='<div class="worked-hint"><strong>Exemplo guiado:</strong> '+step.why+' <em>Mesmo vendo a lógica, escolha a alternativa para reforçar a recuperação.</em></div>';
  if(level===1)hint='<div class="worked-hint"><strong>Pista:</strong> pense no caminho receptor → fibra → medula → modulação.</div>';
  p.innerHTML='<div class="case-player"><div class="case-progress"><span>'+labels[level]+'</span><span>Etapa '+(c.index+1)+' / '+c.steps.length+'</span></div><div class="case-stem"><strong>Caso</strong><p>'+c.stem+'</p></div>'+hint+'<h3>'+step.q+'</h3><div class="lab-options">'+shuffle(step.choices).map(o=>'<button data-case="'+o.replace(/"/g,"&quot;")+'">'+o+'</button>').join("")+'</div><div class="lab-feedback" id="caseFeedback"></div><button class="lab-primary hidden" id="caseNext">Continuar →</button></div>';
  $$("[data-case]",p).forEach(b=>b.addEventListener("click",()=>{
    if(c.locked)return;c.locked=true;
    const ok=b.dataset.case===step.a;if(ok)c.correct++;
    $$("[data-case]",p).forEach(x=>{x.disabled=true;if(x.dataset.case===step.a)x.classList.add("correct");else if(x===b&&!ok)x.classList.add("wrong")});
    $("#caseFeedback",p).innerHTML='<strong>'+(ok?"✓ Correto":"✕ Revise esta etapa")+'</strong><p>'+step.why+'</p>';
    $("#caseNext",p).classList.remove("hidden");
  }));
  $("#caseNext",p)?.addEventListener("click",()=>{c.index++;c.locked=false;renderCaseStep()});
}

function masteryMarkup(compact=false){
  const rows=topicKeys.map(k=>{
    const m=state.mastery[k],score=m.score==null?0:m.score,label=m.score==null?"Não avaliado":score+"%";
    const cls=m.score==null?"unknown":score>=80?"high":score>=60?"mid":"low";
    return '<div class="mastery-row '+cls+'"><div><strong>'+topics[k].label+'</strong><small>'+label+' • '+(m.attempts||0)+' tentativas</small></div><div class="mastery-bar"><i style="width:'+score+'%;background:'+topics[k].color+'"></i></div><a href="'+topics[k].lesson+'">Rever</a></div>';
  }).join("");
  return '<div class="mastery-map '+(compact?"compact":"")+'">'+rows+'</div>';
}
function renderMastery(){
  const p=panel("dominio");if(!p)return;
  const tested=topicKeys.filter(k=>state.mastery[k].score!=null);
  const avg=tested.length?Math.round(tested.reduce((s,k)=>s+state.mastery[k].score,0)/tested.length):0;
  const weak=weakestTopic();
  const confusions=Object.entries(state.misconceptions).sort((a,b)=>b[1]-a[1]).slice(0,4);
  p.innerHTML='<div class="mastery-head"><div><span class="lab-badge">DOMÍNIO POR CONCEITO</span><h3>'+avg+'% de domínio médio avaliado</h3><p>“Concluir uma página” não vale como domínio. Este mapa usa seu desempenho nas atividades.</p></div><div class="mastery-ring" style="--p:'+avg+'"><strong>'+avg+'%</strong></div></div>'+masteryMarkup()+'<div class="misconceptions"><h3>Confusões detectadas</h3>'+(confusions.length?confusions.map(([x,n])=>'<span>'+x+' <b>'+n+'×</b></span>').join(""):'<p>Ainda não há erros suficientes para identificar um padrão.</p>')+'</div><div class="tutor-report" id="tutorReport"></div>';
  renderTutor();
}
function renderTutor(){
  const tested=topicKeys.filter(k=>state.mastery[k].score!=null),el=$("#labOverall");
  const avg=tested.length?Math.round(tested.reduce((s,k)=>s+state.mastery[k].score,0)/tested.length):0;
  if(el)el.textContent=tested.length?avg+"%":"—";
  const report=$("#tutorReport");if(!report)return;
  const weak=weakestTopic(),m=state.mastery[weak];
  const strong=topicKeys.filter(k=>state.mastery[k].score!=null).sort((a,b)=>topicScore(b)-topicScore(a))[0];
  let advice;
  if(!state.diagnosticDone)advice="Faça o diagnóstico inicial. Sem ele, o sistema ainda não sabe quais assuntos devem receber prioridade.";
  else if(m.score!=null&&m.score<60)advice="Seu ponto mais fraco é "+topics[weak].label+". Volte ao conteúdo correspondente e depois faça 5 questões adaptativas desse tema.";
  else if(avg<80)advice="Você já tem uma base, mas ainda precisa consolidar. Use perguntas mistas e uma resposta aberta para forçar explicação, não reconhecimento.";
  else advice="Seu domínio está alto. Priorize casos clínicos, perguntas contrafactuais e respostas abertas para testar transferência.";
  report.innerHTML='<span class="lab-badge">RELATÓRIO DO TUTOR</span><h3>O que fazer agora</h3><p>'+advice+'</p>'+(strong?'<small>Ponto mais forte atual: '+topics[strong].label+' ('+topicScore(strong)+'%).</small>':'');
}

renderShell();
renderDiagnostic();
renderTraining();
renderOpen();
renderSimulations();
renderCases();
renderMastery();
})();