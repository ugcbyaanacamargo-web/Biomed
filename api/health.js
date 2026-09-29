import {allowCors,json} from "./_lib/security.js";
import {BIOMED_DB} from "./_lib/biomed-rpc.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  return json(res,200,{
    ok:true,
    database:Boolean(BIOMED_DB.configured),
    databaseMode:"supabase-rpc",
    tutorOpenCodeZen:Boolean(process.env.OPENCODE_API_KEY),
    tutorOpenCodeRuntime:"vercel-sandbox",
    tutorOpenCodeModel:"muse-spark-1.3-contributor-free",
    tutorGitHubOpenCode:"opencode/muse-spark-1.3-contributor-free",
    tutorBrowserLLM:true,
    tutorAI:true
  });
}
