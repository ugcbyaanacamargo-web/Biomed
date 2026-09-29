import {allowCors,json,readJson} from "./_lib/security.js";
import {rpc,bearerToken} from "./_lib/biomed-rpc.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=="POST")return json(res,405,{error:"Método não permitido"});
  const token=bearerToken(req);
  if(!token)return json(res,401,{error:"Sessão ausente"});
  try{
    const body=await readJson(req);
    const data=await rpc("biomed_record_event",{
      p_token:token,
      p_event_key:String(body.eventKey||"").slice(0,120),
      p_event_type:String(body.type||""),
      p_topic:body.topic?String(body.topic).slice(0,40):null,
      p_payload:body.payload&&typeof body.payload==="object"?body.payload:{}
    });
    return json(res,200,data);
  }catch(e){
    const msg=String(e.message||"Erro ao registrar progresso");
    return json(res,/Sessão/.test(msg)?401:400,{error:msg});
  }
}