import {z} from "zod";
import {requireBearerToken,rpc} from "@/lib/db/supabase";
import {apiError,noStoreJson} from "@/lib/api/http";
import {captureEvent,captureGeneration} from "@/lib/analytics/posthog";
import {generateStructuredTutorTurn} from "@/lib/ai/groq";

const createSchema=z.object({title:z.string().trim().min(1).max(120).optional()}).strict();

export async function GET(request:Request){
  try{
    const token=requireBearerToken(request);
    const profile=await rpc<{student?:{id?:string}}>("biomed_profile",{p_token:token});
    const data=await rpc("biomed_ai_list_conversations",{p_token:token});
    if(profile.student?.id)void captureEvent(profile.student.id,"conversation_listed");
    return noStoreJson(data);
  }catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{
    const token=requireBearerToken(request);
    const body=createSchema.parse(await request.json().catch(()=>({})));
    const profile=await rpc<{student?:{id?:string}}>("biomed_profile",{p_token:token});
    const data=await rpc<{conversation:{id:string}}>("biomed_ai_create_conversation",{p_token:token,p_title:body.title||"Nova conversa"});
    let seeded=null,seedError=false;
    try{
      const context=await rpc<any>("biomed_ai_context",{p_token:token,p_conversation_id:data.conversation.id,p_limit:8});
      context.messages=[...(context.messages||[]),{role:"user",content:"Inicie uma nova sessão de estudo comigo. Apresente-se brevemente, descubra meu objetivo e faça apenas a primeira pergunta diagnóstica. Inclua uma apresentação visual curta quando isso ajudar."}];
      const started=Date.now(),generated=await generateStructuredTutorTurn(context),traceId=crypto.randomUUID();
      const turn=generated.turn;
      seeded=await rpc("biomed_ai_seed_assistant",{
        p_token:token,p_conversation_id:data.conversation.id,p_assistant_content:turn.message,
        p_ui:{schemaVersion:turn.schemaVersion,blocks:turn.blocks},
        p_metadata:{provider:"groq",model:"openai/gpt-oss-120b",web:false,traceId},
        p_title:turn.conversation.suggestedTitle,p_learning:turn.learning,p_memory_summary:turn.conversation.memorySummary
      });
      if(profile.student?.id)void captureGeneration({distinctId:profile.student.id,conversationId:data.conversation.id,traceId,latencyMs:Date.now()-started,inputTokens:generated.usage.inputTokens,outputTokens:generated.usage.outputTokens,web:false});
    }catch{seedError=true}
    if(profile.student?.id)void captureEvent(profile.student.id,"conversation_created",{conversation_id:data.conversation.id,seeded:!seedError});
    return noStoreJson({...data,seeded,seedError},201);
  }catch(error){return apiError(error)}
}
