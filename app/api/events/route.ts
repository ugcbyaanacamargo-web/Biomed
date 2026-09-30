import {z} from "zod";
import {requireBearerToken,rpc} from "@/lib/db/supabase";
import {captureEvent} from "@/lib/analytics/posthog";
import {apiError,noStoreJson} from "@/lib/api/http";

const schema=z.object({
  event:z.enum(["rich_block_rendered","interaction_answered"]),
  properties:z.record(z.string(),z.unknown()).optional()
}).strict();

export async function POST(request:Request){
  try{
    const token=requireBearerToken(request);
    const body=schema.parse(await request.json());
    const profile=await rpc<{student?:{id?:string}}>("biomed_profile",{p_token:token});
    if(profile.student?.id)await captureEvent(profile.student.id,body.event,body.properties||{});
    return noStoreJson({ok:true});
  }catch(error){return apiError(error)}
}
