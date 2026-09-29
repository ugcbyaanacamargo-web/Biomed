import {allowCors,json} from "./_lib/security.js";
import {BIOMED_DB} from "./_lib/biomed-rpc.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  return json(res,200,{
    ok:true,
    database:Boolean(BIOMED_DB.configured),
    databaseMode:"supabase-rpc",
    tutorOpenCode:Boolean(process.env.OPENCODE_API_KEY),
    vercelOidc:Boolean(process.env.VERCEL_OIDC_TOKEN),
    tutorAI:Boolean(process.env.OPENCODE_API_KEY||process.env.VERCEL_OIDC_TOKEN),
    preferredModel:process.env.OPENCODE_MODEL||"nemotron-3-ultra-free",
    fallbackModel:"inclusionai/ling-3.0-flash-vl"
  });
}