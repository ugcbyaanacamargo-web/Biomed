import {allowCors,json} from "./_lib/security.js";
import {BIOMED_DB} from "./_lib/biomed-rpc.js";
import {FREE_MODEL} from "./_lib/ai-gateway.js";
export default async function handler(req,res){
  if(allowCors(req,res))return;
  return json(res,200,{
    ok:true,database:Boolean(BIOMED_DB.configured),databaseMode:"supabase-rpc",
    learningPlatform:"guided-v3",deploymentMarker:"vercel-free-gateway-v1",
    learningState:true,assessments:true,visualTutor:true,
    tutorAIConfigured:Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN),
    tutorAIRuntime:"vercel-ai-gateway",tutorAIModel:FREE_MODEL,
    tutorAIFreeOnly:true,tutorAIStatus:"configured-not-probed",
    tutorDeadlineMs:Number(process.env.BIOMED_AI_TIMEOUT_MS||19000),
    tutorRepair:"local-safe-plan",hostRuntime:process.env.VERCEL?"vercel":"node-local",
    posthogConfigured:Boolean(process.env.POSTHOG_PUBLIC_KEY)
  });
}
