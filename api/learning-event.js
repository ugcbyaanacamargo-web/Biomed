import {allowCors,json,readJson} from "./_lib/security.js";
import {rpc,bearerToken} from "./_lib/biomed-rpc.js";

const ACTIONS=new Set(["lesson_started","lesson_completed","checkpoint","practice","exam_completed","tutor_action","tutor_answer","resume"]);

export default async function handler(req,res){
  if(allowCors(req,res)) return;
  if(req.method!=="POST") return json(res,405,{error:"Método não permitido"});
  const token=bearerToken(req);
  if(!token) return json(res,401,{error:"Sessão ausente"});
  try{
    const body=await readJson(req);
    const action=String(body.action||"").slice(0,40);
    const eventKey=String(body.eventKey||"").slice(0,120);
    const payload=body.payload&&typeof body.payload==="object"&&!Array.isArray(body.payload)?body.payload:{};
    if(!ACTIONS.has(action)) return json(res,400,{error:"Ação de aprendizagem inválida"});
    if(eventKey.length<4) return json(res,400,{error:"eventKey inválida"});
    const data=await rpc("biomed_learning_action",{
      p_token:token,p_event_key:eventKey,p_action:action,p_payload:payload
    });
    return json(res,200,data);
  }catch(e){
    const msg=String(e.message||"Erro ao salvar progresso");
    return json(res,/Sessão/.test(msg)?401:400,{error:msg});
  }
}
