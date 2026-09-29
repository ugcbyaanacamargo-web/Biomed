(function(){
"use strict";
const MODEL_ID="Qwen3-0.6B-q4f16_1-MLC";
let engine=null;
let loading=null;
function cleanText(text){
  return String(text||"").replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/^```(?:json)?\s*|\s*```$/g,"").trim();
}
function systemPrompt(student,mode){
  const s=(student&&student.stats)||{};
  const mastery=s.mastery||{};
  return [
    "Você é o Tutor BIOMED, professor virtual de fisiologia sensorial e modulação da dor.",
    "Responda sempre em português brasileiro.",
    "Não peça nome, CPF, telefone, endereço, senha, token ou qualquer dado pessoal.",
    "Você não possui acesso ao GitHub, arquivos, Vercel, terminal, banco de dados ou ferramentas administrativas.",
    "Seu único papel é ensinar, criar exercícios, simulações didáticas e avaliar respostas sobre o conteúdo BIOMED.",
    "Não diagnostique condições médicas pessoais.",
    "Faça o aluno raciocinar antes de revelar respostas.",
    "Crie situações novas variando estímulo, região corporal, receptor, fibra, via, atenção, emoção, contexto e modulação.",
    "Ao avaliar resposta aberta, considere o mecanismo e a cadeia causal, não apenas palavras-chave.",
    "Quando o aluno errar, explique a lacuna e faça outra pergunta focada nela.",
    "Não mostre raciocínio interno. Entregue apenas a resposta didática.",
    "Nível atual: "+((student&&student.level)||"bronze"),
    "Learning score: "+Number((student&&student.learningScore)||0),
    "Domínio: "+JSON.stringify(mastery).slice(0,1000),
    "Modo: "+(mode||"chat"),
    mode==="grade" ? "Para avaliação, responda em JSON: {\"score\":0,\"strengths\":[\"\"],\"gaps\":[\"\"],\"feedback\":\"\",\"correction\":\"\",\"nextQuestion\":\"\",\"topic\":\"\"}" : "",
    mode==="generate_question" ? "Para gerar questão, responda em JSON: {\"type\":\"multiple_choice|open|simulation\",\"topic\":\"\",\"difficulty\":\"bronze|prata|ouro|diamante\",\"prompt\":\"\",\"options\":[],\"answer\":\"\",\"explanation\":\"\"}" : ""
  ].filter(Boolean).join("\n");
}
async function ensureEngine(onProgress){
  if(engine)return engine;
  if(loading)return loading;
  if(!("gpu" in navigator))throw new Error("Este navegador não oferece WebGPU");
  loading=(async function(){
    const webllm=await import("https://esm.run/@mlc-ai/web-llm");
    engine=await webllm.CreateMLCEngine(MODEL_ID,{
      initProgressCallback:function(report){
        const t=(report&&report.text)||"Preparando IA local...";
        if(onProgress)onProgress(t);
      },
      logLevel:"WARN"
    },{context_window_size:4096});
    return engine;
  })();
  try{return await loading}finally{loading=null}
}
async function chat(opts){
  opts=opts||{};
  const mode=opts.mode||"chat";
  const e=await ensureEngine(opts.onProgress);
  const safe=(Array.isArray(opts.messages)?opts.messages:[]).slice(-8).map(function(m){
    return {role:m.role==="assistant"?"assistant":"user",content:String(m.content||"").slice(0,3500)};
  });
  const completion=await e.chat.completions.create({
    messages:[{role:"system",content:systemPrompt(opts.student||null,mode)}].concat(safe),
    temperature:mode==="grade"?0.25:0.6,
    max_tokens:(mode==="grade"||mode==="generate_question")?650:700
  });
  const content=cleanText(completion&&completion.choices&&completion.choices[0]&&completion.choices[0].message&&completion.choices[0].message.content);
  if(!content)throw new Error("A IA local não retornou conteúdo");
  let parsed=null;
  if(mode==="grade"||mode==="generate_question"){try{parsed=JSON.parse(content)}catch(e){}}
  return {provider:"webllm",model:MODEL_ID,content:content,parsed:parsed};
}
window.BiomedLocalLLM={model:MODEL_ID,supported:function(){return Boolean(navigator.gpu)},ready:function(){return Boolean(engine)},chat:chat};
})();