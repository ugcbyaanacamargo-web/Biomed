import {allowCors,json} from "./_lib/security.js";
import {BIOMED_DB} from "./_lib/biomed-rpc.js";
import {ZEN_RUNTIME} from "./_lib/zen-client.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  return json(res,200,{
    ok:true,
    database:Boolean(BIOMED_DB.configured),
    databaseMode:"supabase-rpc",
    learningPlatform:"guided-v3",
    deploymentMarker:"clean-architecture-v3",
    learningState:true,
    assessments:true,
    visualTutor:true,
    tutorOpenCodeZen:Boolean(process.env.OPENCODE_API_KEY),
    tutorOpenCodeRuntime:"direct-zen-api",
    tutorDeadlineMs:ZEN_RUNTIME.deadlineMs,
    tutorRepair:"local-safe-plan",
    hostRuntime:process.env.RAILWAY_ENVIRONMENT?"railway":"vercel",
    tutorOpenCodeModel:String(process.env.OPENCODE_MODEL||"muse-spark-1.3-contributor-free"),
    tutorAI:true,
    posthogConfigured:Boolean(process.env.POSTHOG_PUBLIC_KEY)
  });
}
