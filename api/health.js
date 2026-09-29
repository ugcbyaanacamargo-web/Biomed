import {allowCors,json} from "./_lib/security.js";
import {dbConfigured} from "./_lib/store.js";
export default async function handler(req,res){
  if(allowCors(req,res))return;
  return json(res,200,{
    ok:true,
    database:dbConfigured(),
    tutorAI:Boolean(process.env.OPENCODE_API_KEY),
    model:process.env.OPENCODE_MODEL||"nemotron-3.5-lightning-free"
  });
}
