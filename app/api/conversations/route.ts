import {z} from "zod";
import {requireBearerToken,rpc} from "@/lib/db/supabase";
import {apiError,noStoreJson} from "@/lib/api/http";
import {captureEvent} from "@/lib/analytics/posthog";

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
    const data=await rpc("biomed_ai_create_conversation",{p_token:token,p_title:body.title||"Nova conversa"});
    if(profile.student?.id)void captureEvent(profile.student.id,"conversation_created");
    return noStoreJson(data,201);
  }catch(error){return apiError(error)}
}
