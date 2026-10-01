import {noStoreJson} from "@/lib/api/http";
import {NVIDIA_MODEL} from "@/lib/ai/nvidia";

export const maxDuration=15;

export async function GET(){
  if(process.env.VERCEL_ENV==="production")return noStoreJson({error:"Not found"},404);
  const key=process.env.NVIDIA_API_KEY;
  if(!key)return noStoreJson({ok:false,error:"NVIDIA_API_KEY ausente"},503);
  const started=Date.now();
  try{
    const response=await fetch("https://integrate.api.nvidia.com/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({
        model:NVIDIA_MODEL,
        messages:[
          {role:"system",content:"Retorne somente JSON válido com message e blocks."},
          {role:"user",content:"Explique em uma frase por que fibras C conduzem lentamente."}
        ],
        max_tokens:220,
        temperature:0.2,
        top_p:0.9,
        response_format:{
          type:"json_schema",
          json_schema:{
            name:"biomed_probe",
            schema:{
              type:"object",
              properties:{
                message:{type:"string"},
                blocks:{type:"array",items:{}}
              },
              required:["message","blocks"],
              additionalProperties:false
            }
          }
        },
        chat_template_kwargs:{enable_thinking:false},
        stream:false
      }),
      signal:AbortSignal.timeout(10000),
      cache:"no-store"
    });
    const raw=await response.text();
    let data:any={};try{data=raw?JSON.parse(raw):{}}catch{}
    const content=String(data?.choices?.[0]?.message?.content||"");
    let validJson=false;try{JSON.parse(content);validJson=true}catch{}
    return noStoreJson({
      ok:response.ok,
      status:response.status,
      model:NVIDIA_MODEL,
      latencyMs:Date.now()-started,
      validJson,
      contentPreview:content.slice(0,800),
      contentType:typeof data?.choices?.[0]?.message?.content,
      usage:data?.usage||null
    },response.ok?200:502);
  }catch(error){
    return noStoreJson({ok:false,model:NVIDIA_MODEL,latencyMs:Date.now()-started,error:String((error as Error)?.message||error)},504);
  }
}
