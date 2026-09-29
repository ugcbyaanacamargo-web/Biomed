export const TUTOR_BLOCK_TYPES=new Set([
  "concept","key_point","neural_path","fiber_comparison","compare","multiple_choice","prediction",
  "open_answer","ordering","case_step","simulation","gate_diagram","feedback","checkpoint","tutor_message"
]);

const ASSETS=new Set(["hero","receptores","fibras","portao","descendente","semaforo"]);
const MAX_BLOCKS=8;
const clean=s=>String(s??"").replace(/[<>]/g,"").slice(0,4000);
const cleanArray=(a,n=8)=>Array.isArray(a)?a.slice(0,n).map(v=>clean(v)):[];

export function normalizeTutorPlan(input){
  let value=input;
  if(typeof value==="string"){
    const stripped=value.trim().replace(/^\`\`\`json\s*|\s*\`\`\`$/g,"");
    try{value=JSON.parse(stripped)}catch{return fallbackTutorPlan("Não consegui montar a atividade visual desta vez.")}
  }
  if(!value||typeof value!=="object") return fallbackTutorPlan("Vamos continuar com uma explicação guiada.");
  const screen=value.screen&&typeof value.screen==="object"?{
    title:clean(value.screen.title||"Tutor BIOMED"),
    objective:clean(value.screen.objective||"Aprender um passo de cada vez."),
    progressLabel:clean(value.screen.progressLabel||"Atividade personalizada")
  }:{title:"Tutor BIOMED",objective:"Aprender um passo de cada vez.",progressLabel:"Atividade personalizada"};
  const blocks=(Array.isArray(value.blocks)?value.blocks:[]).slice(0,MAX_BLOCKS).map(normalizeBlock).filter(Boolean);
  const nextAction=value.nextAction&&typeof value.nextAction==="object"?{
    type:["wait_for_answer","continue","finish"].includes(value.nextAction.type)?value.nextAction.type:"continue",
    label:clean(value.nextAction.label||"Continuar")
  }:{type:"continue",label:"Continuar"};
  return{screen,blocks:blocks.length?blocks:fallbackTutorPlan().blocks,nextAction};
}
export function normalizeBlock(block){
  if(!block||typeof block!=="object"||!TUTOR_BLOCK_TYPES.has(block.type)) return null;
  const b={type:block.type};
  for(const k of ["id","eyebrow","title","text","question","hint","scenario","explanation","caption","simulation"]){
    if(block[k]!=null)b[k]=clean(block[k]);
  }
  if(block.asset&&ASSETS.has(block.asset))b.asset=block.asset;
  if(block.options)b.options=cleanArray(block.options,6);
  if(block.items)b.items=cleanArray(block.items,8);
  if(block.steps)b.steps=cleanArray(block.steps,8);
  if(Number.isInteger(block.answer)&&block.answer>=0&&block.answer<(b.options?.length||0))b.answer=block.answer;
  if(block.left&&typeof block.left==="object")b.left={title:clean(block.left.title),text:clean(block.left.text)};
  if(block.right&&typeof block.right==="object")b.right={title:clean(block.right.title),text:clean(block.right.text)};
  return b;
}
export function fallbackTutorPlan(message="Vamos aprender isso de forma visual e em pequenos passos."){
  return{
    screen:{title:"Tutor BIOMED",objective:"Entender antes de decorar.",progressLabel:"Atividade personalizada"},
    blocks:[
      {type:"tutor_message",title:"Vamos por partes",text:message},
      {type:"key_point",title:"Próximo passo",text:"Observe a explicação, responda a atividade e eu adapto o que vem depois."}
    ],
    nextAction:{type:"continue",label:"Continuar"}
  };
}
export function containsUnsafeTutorContent(plan){
  const raw=JSON.stringify(plan||{}).toLowerCase();
  return /<script|javascript:|onerror=|onclick=|<iframe|<style/.test(raw);
}
