import {allowCors,json} from "./_lib/security.js";
import {rpc,bearerToken} from "./_lib/biomed-rpc.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=="GET")return json(res,405,{error:"Método não permitido"});
  const token=bearerToken(req);
  if(!token)return json(res,401,{error:"Sessão ausente"});
  try{
    const data=await rpc("biomed_profile",{p_token:token});
    return json(res,200,data);
  }catch(e){
    return json(res,401,{error:"Sessão inválida ou expirada"});
  }
}