const ASSET_MAP={
  hero:"assets/hero-neuro.svg",
  receptores:"assets/receptores.svg",
  fibras:"assets/fibras.svg",
  portao:"assets/portao.svg",
  descendente:"assets/descendente.svg",
  semaforo:"assets/semaforo-casos.svg"
};

export const ALLOWED_BLOCK_TYPES=new Set([
  "concept","key_point","neural_path","fiber_comparison","compare","multiple_choice","prediction",
  "open_answer","ordering","case_step","simulation","gate_diagram","feedback","checkpoint","tutor_message"
]);

function node(tag,className,text){
  const n=document.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=String(text);return n;
}
function button(label,className="lc-option"){
  const b=node("button",className,label);b.type="button";return b;
}
function meter(value,label){
  const wrap=node("div","lc-meter"),head=node("div","lc-meter-head");
  head.append(node("span","",label),node("strong","",Math.round(value)+"%"));
  const track=node("div","lc-meter-track"),bar=node("i");bar.style.width=Math.max(0,Math.min(100,value))+"%";track.append(bar);wrap.append(head,track);return wrap;
}
function feedback(ok,text){
  const f=node("div","lc-feedback "+(ok?"ok":"bad"));
  f.append(node("strong","",ok?"✓ Correto":"✕ Ainda não"),node("p","",text||"Observe o mecanismo e tente novamente."));
  return f;
}
function objectiveBlock(block,ctx){
  const card=node("article","lc-block lc-question");
  if(block.title)card.append(node("span","lc-kicker",block.title));
  if(block.scenario)card.append(node("p","lc-scenario",block.scenario));
  card.append(node("h3","",block.question||"Escolha a melhor resposta."));
  const options=node("div","lc-options");
  (block.options||[]).forEach((label,index)=>{
    const b=button(label);b.dataset.index=String(index);
    b.addEventListener("click",()=>{
      if(card.dataset.answered==="1")return;
      card.dataset.answered="1";
      const ok=index===Number(block.answer);
      [...options.children].forEach((child,i)=>{
        child.disabled=true;
        if(i===Number(block.answer))child.classList.add("correct");
        if(i===index&&!ok)child.classList.add("wrong");
      });
      card.append(feedback(ok,block.explanation));
      ctx.onAnswer?.({block,correct:ok,selected:index});
    });
    options.append(b);
  });
  card.append(options);return card;
}
function conceptBlock(block){
  const card=node("article","lc-block lc-concept");
  const copy=node("div","lc-copy");
  if(block.eyebrow)copy.append(node("span","lc-kicker",block.eyebrow));
  copy.append(node("h2","",block.title||"Conceito"),node("p","",block.text||""));
  card.append(copy);
  if(block.asset&&ASSET_MAP[block.asset]){
    const media=node("div","lc-media"),img=document.createElement("img");
    img.src=ASSET_MAP[block.asset];img.alt=block.title||"Ilustração educacional";img.loading="lazy";media.append(img);card.append(media);
  }
  return card;
}
function neuralPath(block){
  const card=node("article","lc-block");
  card.append(node("span","lc-kicker","CAMINHO"),node("h3","",block.title||"Caminho do sinal"));
  const path=node("div","lc-path");
  (block.steps||[]).forEach((step,i)=>{
    path.append(node("div","lc-path-step",step));
    if(i<(block.steps||[]).length-1)path.append(node("span","lc-arrow","→"));
  });
  card.append(path);if(block.caption)card.append(node("p","lc-muted",block.caption));return card;
}
function fibers(block){
  const card=node("article","lc-block");
  card.append(node("span","lc-kicker","COMPARE"),node("h3","",block.title||"Fibras sensoriais"));
  const grid=node("div","lc-fibers");
  [
    ["Aβ","Grande • mielinizada","Muito rápida","Tato, pressão, vibração","toque rápido"],
    ["Aδ","Média • mielina fina","Rápida","Dor inicial, aguda","agulhada rápida"],
    ["C","Pequena • sem mielina","Lenta","Dor difusa, persistente","continua e demora"]
  ].forEach(([name,structure,speed,role,mnemonic])=>{
    const x=node("div","lc-fiber");x.append(node("b","",name),node("span","",structure),node("strong","",speed),node("p","",role),node("small","",mnemonic));grid.append(x);
  });
  card.append(grid);return card;
}
function comparison(block){
  const card=node("article","lc-block lc-compare");
  [block.left,block.right].forEach((side,i)=>{
    const x=node("div","lc-compare-side "+(i?"right":"left"));x.append(node("span","lc-kicker",i?"EXPERIÊNCIA":"PROCESSO"),node("h3","",side?.title||""),node("p","",side?.text||""));card.append(x);
  });return card;
}
function openAnswer(block,ctx){
  const card=node("article","lc-block lc-open");
  if(block.title)card.append(node("span","lc-kicker",block.title));
  card.append(node("h3","",block.question||"Explique com suas palavras."));
  if(block.hint)card.append(node("p","lc-muted","Dica: "+block.hint));
  const ta=node("textarea","lc-textarea");ta.rows=4;ta.placeholder="Escreva sua resposta aqui...";
  const b=button("Enviar resposta","lc-primary");
  const result=node("div","lc-open-result");
  b.addEventListener("click",async()=>{
    const value=ta.value.trim();if(value.length<8){result.textContent="Escreva um pouco mais para eu conseguir avaliar.";return}
    b.disabled=true;b.textContent="Avaliando...";
    try{await ctx.onOpenAnswer?.({block,text:value,mount:result})}finally{b.disabled=false;b.textContent="Enviar resposta"}
  });
  card.append(ta,b,result);return card;
}
function ordering(block,ctx){
  const card=node("article","lc-block");card.append(node("span","lc-kicker","ORDENE"),node("h3","",block.question||"Monte a sequência."));
  const pool=node("div","lc-order-pool"),selected=node("div","lc-order-selected");
  const chosen=[];
  (block.items||[]).forEach(item=>{
    const b=button(item,"lc-order-chip");b.addEventListener("click",()=>{if(b.disabled)return;b.disabled=true;chosen.push(item);selected.append(node("span","lc-order-picked",(chosen.length)+". "+item))});pool.append(b);
  });
  const actions=node("div","lc-inline-actions"),check=button("Conferir","lc-primary"),reset=button("Recomeçar","lc-secondary");
  check.addEventListener("click",()=>{const ok=JSON.stringify(chosen)===JSON.stringify(block.answer||[]);card.querySelector(".lc-feedback")?.remove();card.append(feedback(ok,ok?"Sequência correta.":"A ordem ainda não está correta."));ctx.onAnswer?.({block,correct:ok,selected:chosen})});
  reset.addEventListener("click",()=>{chosen.splice(0);selected.innerHTML="";[...pool.children].forEach(b=>b.disabled=false);card.querySelector(".lc-feedback")?.remove()});
  actions.append(check,reset);card.append(pool,selected,actions);return card;
}
function gateSimulation(block,ctx){
  const card=node("article","lc-block lc-sim");card.append(node("span","lc-kicker","SIMULAÇÃO"),node("h3","",block.title||"Portão da dor"));
  const controls=node("div","lc-sim-controls");
  const touch=document.createElement("input"),noc=document.createElement("input"),desc=document.createElement("input");
  for(const x of [touch,noc,desc]){x.type="range";x.min="0";x.max="100";x.value="50"}
  const touchRow=node("label","lc-range");touchRow.append(node("span","","Entrada tátil Aβ"),touch);
  const nocRow=node("label","lc-range");nocRow.append(node("span","","Entrada nociceptiva"),noc);
  const descRow=node("label","lc-range");descRow.append(node("span","","Inibição descendente"),desc);
  const output=node("div","lc-sim-output");
  function update(){
    const inhibition=Number(touch.value)*.45+Number(desc.value)*.55;
    const transmission=Math.max(0,Math.min(100,Number(noc.value)-inhibition*.65+20));
    output.replaceChildren(meter(inhibition,"Força inibitória"),meter(transmission,"Transmissão nociceptiva"));
    ctx.onSimulation?.({block,touch:Number(touch.value),nociception:Number(noc.value),descending:Number(desc.value),transmission:Math.round(transmission)});
  }
  [touch,noc,desc].forEach(x=>x.addEventListener("input",update));
  controls.append(touchRow,nocRow,descRow);card.append(controls,output);update();return card;
}
function simpleBlock(block,kind){
  const card=node("article","lc-block "+kind);
  if(block.title)card.append(node("h3","",block.title));
  if(block.text)card.append(node("p","",block.text));
  return card;
}

export function renderBlock(block,ctx={}){
  if(!block||!ALLOWED_BLOCK_TYPES.has(block.type))return simpleBlock({title:"Conteúdo indisponível",text:"Este bloco não pôde ser exibido com segurança."},"lc-warning");
  switch(block.type){
    case"concept":return conceptBlock(block);
    case"key_point":return simpleBlock(block,"lc-key");
    case"tutor_message":return simpleBlock(block,"lc-tutor-message");
    case"feedback":return simpleBlock(block,"lc-feedback-card");
    case"checkpoint":return simpleBlock(block,"lc-checkpoint");
    case"neural_path":return neuralPath(block);
    case"fiber_comparison":return fibers(block);
    case"compare":return comparison(block);
    case"multiple_choice":
    case"prediction":
    case"case_step":return objectiveBlock(block,ctx);
    case"open_answer":return openAnswer(block,ctx);
    case"ordering":return ordering(block,ctx);
    case"simulation":
    case"gate_diagram":return gateSimulation(block,ctx);
    default:return simpleBlock(block,"");
  }
}
export function renderBlocks(mount,blocks=[],ctx={}){
  if(!mount)return;mount.replaceChildren();
  (blocks||[]).forEach((block,index)=>{
    const n=renderBlock(block,{...ctx,index});mount.append(n);ctx.onBlockViewed?.({block,index});
  });
}
