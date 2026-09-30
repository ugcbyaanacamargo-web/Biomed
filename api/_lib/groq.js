// Ligação direta do BIOMED com a Groq. Sem AI Gateway, OpenCode, Sandbox ou Railway.
const ENDPOINT="https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL="openai/gpt-oss-120b";
const MODEL_ALLOWLIST=new Set([GROQ_MODEL]);

export function requireGroqModel(model){
  const chosen=String(model||GROQ_MODEL).trim();
  if(!MODEL_ALLOWLIST.has(chosen))throw Object.assign(new Error("Modelo Groq não autorizado"),{code:"AI_MODEL_NOT_ALLOWED"});
  return chosen;
}

export function textFromGroq(data){
  const choice=data?.choices?.[0];
  if(choice?.finish_reason==="length")throw Object.assign(new Error("Resposta incompleta"),{code:"AI_INCOMPLETE"});
  const content=choice?.message?.content;
  const text=typeof content==="string"
    ?content
    :Array.isArray(content)
      ?content.filter(p=>p?.type==="text"&&typeof p.text==="string").map(p=>p.text).join("\n")
      :"";
  if(!text.trim())throw Object.assign(new Error("Resposta vazia"),{code:"AI_EMPTY_RESPONSE"});
  return text.trim();
}

export async function callTutorAI({
  prompt,
  model=GROQ_MODEL,
  apiKey,
  fetchImpl=fetch,
  timeoutMs=19000,
  enableBrowserSearch=false,
  reasoningEffort="low"
}){
  const chosen=requireGroqModel(model);
  if(!apiKey)throw Object.assign(new Error("GROQ_API_KEY ausente"),{code:"AI_NOT_CONFIGURED"});
  const started=Date.now(),deadline=Math.max(5000,Math.min(22000,Number(timeoutMs)||19000));
  const body={
    model:chosen,
    messages:[{role:"user",content:String(prompt||"").slice(0,30000)}],
    max_completion_tokens:2400,
    stream:false,
    reasoning_effort:["low","medium","high"].includes(reasoningEffort)?reasoningEffort:"low"
  };
  if(enableBrowserSearch)body.tools=[{type:"browser_search"}];

  try{
    const res=await fetchImpl(ENDPOINT,{
      method:"POST",
      headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify(body),
      signal:AbortSignal.timeout(deadline)
    });
    if(!res.ok){
      let detail="";
      try{
        const errorData=await res.json();
        detail=String(errorData?.error?.message||errorData?.message||"").slice(0,300);
      }catch{}
      throw Object.assign(new Error(detail?"Groq HTTP "+res.status+": "+detail:"Groq HTTP "+res.status),{code:"AI_HTTP_"+res.status});
    }
    const data=await res.json();
    return{
      content:textFromGroq(data),
      model:chosen,
      runtime:"groq-direct",
      durationMs:Date.now()-started,
      browserSearchEnabled:Boolean(enableBrowserSearch)
    };
  }catch(cause){
    const e=new Error(String(cause?.message||cause));
    e.code=cause?.code||(["TimeoutError","AbortError"].includes(cause?.name)?"AI_TIMEOUT":"AI_NETWORK_ERROR");
    e.durationMs=Date.now()-started;
    throw e;
  }
}
