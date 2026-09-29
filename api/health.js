import {allowCors,json} from "./_lib/security.js";
import {BIOMED_DB} from "./_lib/biomed-rpc.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  return json(res,200,{
    ok:true,
    database:Boolean(BIOMED_DB.configured),
    databaseMode:"supabase-rpc",
    learningPlatform:"guided-v2",
    deploymentMarker:"guided-v2-production",
    learningState:true,
    assessments:true,
    visualTutor:true,
    tutorOpenCodeZen:Boolean(process.env.OPENCODE_API_KEY),
    tutorOpenCodeRuntime:process.env.RAILWAY_ENVIRONMENT?"railway-persistent-opencode":"vercel-sandbox-persistent-server",
    tutorDeadlineMs:12000,
    tutorRepair:"persistent-server-fast-fallback",
    hostRuntime:process.env.RAILWAY_ENVIRONMENT?"railway":"vercel",
    tutorOpenCodeModel:String(process.env.OPENCODE_MODEL||"muse-spark-1.3-contributor-free"),
    tutorGitHubOpenCode:"opencode/"+String(process.env.OPENCODE_MODEL||"muse-spark-1.3-contributor-free"),
    tutorBrowserLLM:true,
    tutorAI:true,
    posthogConfigured:Boolean(process.env.POSTHOG_PUBLIC_KEY)
  });
}
