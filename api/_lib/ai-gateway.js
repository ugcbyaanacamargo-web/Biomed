// Única ligação de IA do BIOMED: Gateway nativo da Vercel, sem processos adicionais.
const ENDPOINT="https://ai-gateway.vercel.sh/v1/chat/completions";
export const FREE_MODEL="inclusionai/ling-3.1-flash-free";
const FREE_ALLOWLIST=new Set([FREE_MODEL]);
export function requireFreeModel(model){
  if(!FREE_ALLOWLIST.has(model)||!model.endsWith("-free"))throw Object.assign(new Error("Modelo gratuito não autorizado"),{code:"AI_MODEL_NOT_FREE"});
  return model;
}
export function textFromGateway(data){
  const choice=data?.choices?.[0];
  if(choice?.finish_reason==="length")throw Object.assign(new Error("Resposta incompleta"),{code:"AI_INCOMPLETE"});
  const content=choice?.message?.content;
  const text=typeof content==="string"?content:Array.isArray(content)?content.filter(p=>p?.type==="text"&&typeof p.text==="string").map(p=>p.text).join("\n"):"";
  if(!text.trim())throw Object.assign(new Error("Resposta vazia"),{code:"AI_EMPTY_RESPONSE"});
  return text.trim();
}
export async function callTutorAI({prompt,model=FREE_MODEL,apiKey,fetchImpl=fetch,timeoutMs=19000}){
  const chosen=requireFreeModel(String(model||FREE_MODEL));
  if(!apiKey)throw Object.assign(new Error("Autenticação do Gateway ausente"),{code:"AI_NOT_CONFIGURED"});
  const started=Date.now(),deadline=Math.max(5000,Math.min(22000,Number(timeoutMs)||19000));
  try{
    const res=await fetchImpl(ENDPOINT,{
      method:"POST",
      headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({model:chosen,messages:[{role:"user",content:String(prompt||"").slice(0,30000)}],max_tokens:2400,stream:false}),
      signal:AbortSignal.timeout(deadline)
    });
    if(!res.ok)throw Object.assign(new Error("Gateway HTTP "+res.status),{code:"AI_HTTP_"+res.status});
    const data=await res.json();
    return{content:textFromGateway(data),model:chosen,runtime:"vercel-ai-gateway",durationMs:Date.now()-started};
  }catch(cause){
    const e=new Error(String(cause?.message||cause));
    e.code=cause?.code||(["TimeoutError","AbortError"].includes(cause?.name)?"AI_TIMEOUT":"AI_NETWORK_ERROR");
    e.durationMs=Date.now()-started;
    throw e;
  }
}
