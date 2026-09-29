import {allowCors,json} from "./_lib/security.js";
import {BIOMED_DB} from "./_lib/biomed-rpc.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  const railway=Boolean(process.env.RAILWAY_ENVIRONMENT||process.env.BIOMED_RUNTIME==="railway");
  return json(res,200,{
    ok:true,
    database:Boolean(BIOMED_DB.configured),
    databaseMode:"supabase-rpc",
    learningPlatform:"guided-v3",
    deploymentMarker:"persistent-opencode-railway-v4",
    learningState:true,
    assessments:true,
    visualTutor:true,
    tutorOpenCodeZen:Boolean(process.env.OPENCODE_API_KEY),
    tutorOpenCodeRuntime:railway?"railway-persistent-opencode":"railway-proxy",
    tutorFreeTierMode:"inside-opencode",
    tutorDeadlineMs:Number(process.env.OPENCODE_DEADLINE_MS||12000),
    tutorRepair:"local-safe-plan",
    hostRuntime:railway?"railway":"vercel",
    tutorOpenCodeModel:String(process.env.OPENCODE_MODEL||"muse-spark-1.3-contributor-free"),
    tutorAI:true,
    posthogConfigured:Boolean(process.env.POSTHOG_PUBLIC_KEY)
  });
}
