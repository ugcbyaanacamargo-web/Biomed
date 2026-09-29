const RESPONSES_ENDPOINT="https://opencode.ai/zen/v1/responses";
const CHAT_ENDPOINT="https://opencode.ai/zen/v1/chat/completions";
const DEFAULT_MODEL="muse-spark-1.3-contributor-free";
const DEADLINE_MS=Math.max(3000,Math.min(30000,Number(process.env.OPENCODE_DEADLINE_MS)||12000));
const MAX_OUTPUT_TOKENS=Math.max(256,Math.min(1800,Number(process.env.OPENCODE_MAX_OUTPUT_TOKENS)||1100));

function endpointFor(model){
  const id=String(model||DEFAULT_MODEL);
  return /^(muse-|gpt-|grok-)/.test(id)?RESPONSES_ENDPOINT:CHAT_ENDPOINT;
}
function extractText(data){
  if(typeof data?.output_text==="string"&&data.output_text.trim())return data.output_text.trim();
  const texts=[];
  for(const item of Array.isArray(data?.output)?data.output:[]){
    for(const part of Array.isArray(item?.content)?item.content:[]){
      if(typeof part?.text==="string"&&part.text.trim())texts.push(part.text.trim());
      else if(typeof part?.text?.value==="string"&&part.text.value.trim())texts.push(part.text.value.trim());
    }
  }
  if(texts.length)return texts.join("\n").trim();
  const content=data?.choices?.[0]?.message?.content;
  if(typeof content==="string"&&content.trim())return content.trim();
  if(Array.isArray(content)){
    const joined=content.map(part=>typeof part==="string"?part:part?.text||"").filter(Boolean).join("\n").trim();
    if(joined)return joined;
  }
  return "";
}
export async function runZenTutor({studentId,prompt,model=DEFAULT_MODEL,apiKey}){
  if(!apiKey)throw new Error("OPENCODE_API_KEY ausente");
  const endpoint=endpointFor(model);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new Error("model deadline exceeded")),DEADLINE_MS);
  const started=Date.now();
  try{
    const input=String(prompt||"").slice(0,50000);
    const body=endpoint===RESPONSES_ENDPOINT
      ?{model:String(model||DEFAULT_MODEL),input,max_output_tokens:MAX_OUTPUT_TOKENS}
      :{model:String(model||DEFAULT_MODEL),messages:[{role:"user",content:input}],max_tokens:MAX_OUTPUT_TOKENS,stream:false};
    const response=await fetch(endpoint,{
      method:"POST",
      headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify(body),
      signal:controller.signal
    });
    const raw=await response.text();
    let data=null;try{data=raw?JSON.parse(raw):null}catch{}
    if(!response.ok){
      const reason=data?.error?.message||data?.message||raw||("Zen HTTP "+response.status);
      const error=new Error(String(reason).slice(-900));
      error.code="ZEN_HTTP_"+response.status;
      error.durationMs=Date.now()-started;
      throw error;
    }
    const content=extractText(data);
    if(!content)throw new Error("OpenCode Zen retornou resposta vazia");
    return{content,model:String(model||DEFAULT_MODEL),runtime:"direct-zen-api",endpoint,durationMs:Date.now()-started,studentId:String(studentId||"anon").slice(0,40)};
  }catch(error){
    if(error?.durationMs)throw error;
    const e=new Error(String(error?.message||error));
    e.code=controller.signal.aborted?"ZEN_MODEL_TIMEOUT":"ZEN_RUNTIME_ERROR";
    e.durationMs=Date.now()-started;
    throw e;
  }finally{clearTimeout(timer)}
}
export const ZEN_RUNTIME={responsesEndpoint:RESPONSES_ENDPOINT,chatEndpoint:CHAT_ENDPOINT,deadlineMs:DEADLINE_MS,maxOutputTokens:MAX_OUTPUT_TOKENS};
