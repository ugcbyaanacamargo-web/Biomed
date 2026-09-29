import {allowCors,json} from "./_lib/security.js";
import {BIOMED_DB} from "./_lib/biomed-rpc.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  return json(res,200,{
    ok:true,
    database:Boolean(BIOMED_DB.configured),
    databaseMode:"supabase-rpc",
    tutorOpenCodeZen:Boolean(process.env.OPENCODE_API_KEY),
    tutorBrowserLLM:true,
    tutorGitHubOpenCode:"ollama/qwen2.5:3b",
    tutorAI:true
  });
}