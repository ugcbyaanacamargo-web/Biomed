import {allowCors,json,readJson} from "./_lib/security.js";
import {rpc} from "./_lib/biomed-rpc.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=="POST")return json(res,405,{error:"Método não permitido"});
  try{
    const body=await readJson(req);
    const data=await rpc("biomed_auth",{p_cpf:String(body.cpf||""),p_name:body.name?String(body.name):null});
    return json(res,200,data);
  }catch(e){
    const msg=String(e.message||"Erro de acesso");
    const status=/CPF inválido|Nome inválido/.test(msg)?400:500;
    return json(res,status,{error:msg});
  }
}