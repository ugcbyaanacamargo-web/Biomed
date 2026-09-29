import {allowCors,json} from "./_lib/security.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=="GET")return json(res,405,{error:"Método não permitido"});
  const posthogKey=String(process.env.POSTHOG_PUBLIC_KEY||"").trim();
  const posthogHost=String(process.env.POSTHOG_HOST||"https://us.i.posthog.com").trim();
  return json(res,200,{
    posthog:posthogKey?{enabled:true,key:posthogKey,host:posthogHost}:{enabled:false}
  });
}
