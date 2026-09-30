const BASE="https://opencode.ai/zen/v1";
const ENDPOINTS=Object.freeze({
  "muse-spark-1.3-contributor-free":"/responses",
  "nemotron-3-ultra-free":"/chat/completions",
  "nemotron-3.5-lightning-free":"/chat/completions",
  "mimo-v2.6-flash-free":"/chat/completions",
  "mimo-v2.5-free":"/chat/completions",
  "ling-3.0-flash-fin-free":"/chat/completions"
});
const DEFAULT_TIMEOUT_MS=18000;

export function endpointForModel(model){
  const suffix=ENDPOINTS[String(model||"")];
  if(!suffix)throw new Error("Modelo Zen não autorizado: use um dos modelos gratuitos configurados.");
  return BASE+suffix;
}

export function extractZenText(result){
  if(result?.status==="incomplete")throw new Error("Zen retornou resposta incompleta");
  if(typeof result?.output_text==="string"&&result.output_text.trim())return result.output_text.trim();
  const outputs=[];
  for(const message of (Array.isArray(result?.output)?result.output:[])){
    if(message?.type!=="message")continue;
    for(const item of Array.isArray(message.content)?message.content:[]){
      if((item?.type==="output_text"||item?.type==="text")&&typeof item.text==="string")outputs.push(item.text);
    }
  }
  if(outputs.join("").trim())return outputs.join("\n").trim();
  const chat=result?.choices?.[0]?.message?.content;
  if(typeof chat==="string"&&chat.trim())return chat.trim();
  if(Array.isArray(chat)){
    const text=chat.filter(x=>x&&typeof x.text==="string").map(x=>x.text).join("\n").trim();
    if(text)return text;
  }
  throw new Error("Resposta vazia do modelo Zen");
}

export async function callZen({prompt,model="muse-spark-1.3-contributor-free",apiKey,fetchImpl=fetch,timeoutMs=DEFAULT_TIMEOUT_MS}){
  if(!apiKey)throw new Error("OPENCODE_API_KEY ausente");
  const endpoint=endpointForModel(model);
  const useResponses=endpoint.endsWith("/responses");
  const payload=useResponses
    ?{model,input:String(prompt||"").slice(0,24000),max_output_tokens:1800}
    :{model,messages:[{role:"user",content:String(prompt||"").slice(0,24000)}],max_tokens:1800};
  const deadline=Math.max(5000,Math.min(24000,Number(timeoutMs)||DEFAULT_TIMEOUT_MS));
  const started=Date.now();
  try{
    const response=await fetchImpl(endpoint,{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(deadline)
    });
    if(!response.ok){
      const error=new Error("Zen HTTP "+response.status);
      error.code="ZEN_HTTP_"+response.status;
      throw error;
    }
    const data=await response.json();
    const content=extractZenText(data);
    return{content,model,runtime:"zen-direct",durationMs:Date.now()-started};
  }catch(cause){
    const error=new Error(String(cause?.message||cause));
    error.code=cause?.code||(["TimeoutError","AbortError"].includes(cause?.name)?"ZEN_TIMEOUT":"ZEN_NETWORK_ERROR");
    error.durationMs=Date.now()-started;
    throw error;
  }
}
