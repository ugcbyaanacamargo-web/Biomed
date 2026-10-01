import {after} from "next/server";
import {z} from "zod";
import {requireBearerToken,rpc} from "@/lib/db/supabase";
import {apiError,noStoreJson} from "@/lib/api/http";
import {generateResearchTutorTurn,generateStructuredTutorTurn,NVIDIA_MODEL} from "@/lib/ai/nvidia";
import {replayStoredTurn} from "@/lib/ai/stored-turn";
import {shouldUseWeb} from "@/lib/ai/web-mode";
import {captureEvent,captureGeneration} from "@/lib/analytics/posthog";

export const maxDuration=30;

const bodySchema=z.object({
  conversationId:z.string().uuid(),
  clientMessageId:z.string().uuid(),
  message:z.string().trim().min(1).max(12000),
  interaction:z.object({
    id:z.string().max(80),
    value:z.union([z.string().max(1200),z.array(z.string().max(300)).max(8)]),
    label:z.string().max(1200).optional()
  }).strict().optional()
}).strict();

type AiContext={
  student?:{id?:string;name?:string;level?:string;learningScore?:number};
  conversation?:{id?:string;title?:string;currentGoal?:string|null;studyState?:unknown;memorySummary?:string;messageCount?:number};
  memory?:Record<string,unknown>;
  messages?:Array<{role:"user"|"assistant";content:string}>;
};

export async function POST(request:Request){
  let traceId=crypto.randomUUID(),conversationId="",studentId="",research=false,started=Date.now(),generationStarted=false;
  try{
    const token=requireBearerToken(request);
    const body=bodySchema.parse(await request.json());
    conversationId=body.conversationId;
    const profile=await rpc<{student?:{id?:string}}>("biomed_profile",{p_token:token});
    studentId=String(profile.student?.id||"");

    const begin=await rpc<{duplicate?:boolean}>("biomed_ai_begin_message",{
      p_token:token,p_conversation_id:body.conversationId,p_client_message_id:body.clientMessageId,
      p_content:body.message,p_metadata:body.interaction?{interaction:body.interaction}:{}
    });

    if(!begin.duplicate&&studentId)after(()=>captureEvent(studentId,"message_sent",{
      conversation_id:body.conversationId,
      interaction:Boolean(body.interaction)
    }));

    if(begin.duplicate){
      const snapshot=await rpc<any>("biomed_ai_get_conversation",{
        p_token:token,p_conversation_id:body.conversationId,p_limit:200
      });
      const replay=replayStoredTurn(snapshot,body.clientMessageId);
      if(replay){
        traceId=replay.traceId||traceId;
        if(studentId)after(()=>captureEvent(studentId,"assistant_response_replayed",{
          conversation_id:body.conversationId,
          latency_ms:Date.now()-started
        }));
        return noStoreJson({...replay,traceId});
      }
    }

    const context=await rpc<AiContext>("biomed_ai_context",{
      p_token:token,p_conversation_id:body.conversationId,p_limit:24
    });
    research=shouldUseWeb(body.message);
    generationStarted=true;
    const generated=research
      ?await generateResearchTutorTurn(context,body.message)
      :await generateStructuredTutorTurn(context);
    const turn=generated.turn;

    const stored=await rpc("biomed_ai_complete_turn",{
      p_token:token,p_conversation_id:body.conversationId,p_client_message_id:body.clientMessageId,
      p_assistant_content:turn.message,p_ui:{schemaVersion:turn.schemaVersion,blocks:turn.blocks},
      p_metadata:{provider:generated.provider,model:generated.model,research,traceId},
      p_title:turn.conversation.suggestedTitle,p_learning:turn.learning,
      p_memory_summary:turn.conversation.memorySummary
    });

    if(studentId)after(async()=>{
      await Promise.allSettled([
        captureEvent(studentId,"assistant_response_completed",{
          conversation_id:body.conversationId,research,block_count:turn.blocks.length,mode:turn.learning.mode,
          latency_ms:Date.now()-started,provider:generated.provider,model:generated.model
        }),
        captureGeneration({
          distinctId:studentId,conversationId:body.conversationId,traceId,latencyMs:Date.now()-started,
          inputTokens:generated.usage.inputTokens,outputTokens:generated.usage.outputTokens,research,
          provider:generated.provider,model:generated.model
        }),
        ...(research?[captureEvent(studentId,"web_search_used",{
          conversation_id:body.conversationId,source:"europe_pmc"
        })]:[])
      ]);
    });

    return noStoreJson({turn,stored,traceId});
  }catch(error){
    const message=String((error as Error)?.message||"Falha no Tutor");
    const errorStatus=Number((error as {status?:number})?.status||0);
    if(studentId)after(async()=>{
      const tasks:Promise<unknown>[]=[
        captureEvent(studentId,"assistant_response_failed",{conversation_id:conversationId,error:message,research})
      ];
      if(generationStarted)tasks.push(captureGeneration({
        distinctId:studentId,conversationId,traceId,latencyMs:Date.now()-started,error:message,research,
        provider:"nvidia",model:NVIDIA_MODEL
      }));
      await Promise.allSettled(tasks);
    });
    const status=errorStatus===429?429:/timeout|timed out|aborted/i.test(message)?504:errorStatus||undefined;
    if(status===429||status===504)return noStoreJson({error:message,retryable:true,traceId},status);
    return apiError(error,"Falha no Tutor");
  }
}
