import {requireBearerToken,rpc} from "@/lib/db/supabase";
import {apiError,noStoreJson} from "@/lib/api/http";
import {captureEvent} from "@/lib/analytics/posthog";

type Ctx={params:Promise<{id:string}>};

export async function GET(request:Request,{params}:Ctx){
  try{
    const token=requireBearerToken(request),{id}=await params;
    const profile=await rpc<{student?:{id?:string}}>("biomed_profile",{p_token:token});
    const data=await rpc("biomed_ai_get_conversation",{p_token:token,p_conversation_id:id,p_limit:120});
    if(profile.student?.id)void captureEvent(profile.student.id,"conversation_opened",{conversation_id:id});
    return noStoreJson(data);
  }catch(error){return apiError(error)}
}

export async function DELETE(request:Request,{params}:Ctx){
  try{
    const token=requireBearerToken(request),{id}=await params;
    const data=await rpc("biomed_ai_archive_conversation",{p_token:token,p_conversation_id:id});
    return noStoreJson(data);
  }catch(error){return apiError(error)}
}
