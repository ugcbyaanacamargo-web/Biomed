import {allowCors,json,verifySession,publicStudent} from "./_lib/security.js";
import {dbConfigured,getStudent,updateStudent} from "./_lib/store.js";
import {levelRequirements} from "./_lib/scoring.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=="GET")return json(res,405,{error:"Método não permitido"});
  if(!dbConfigured())return json(res,503,{error:"Banco persistente ainda não configurado",code:"DB_NOT_CONFIGURED"});
  try{
    const session=verifySession(req);
    let row=await getStudent(session.sub);
    if(!row)return json(res,404,{error:"Aluno não encontrado"});
    row=await updateStudent(row.id,{last_seen_at:new Date().toISOString()})||row;
    return json(res,200,{student:publicStudent(row),levels:levelRequirements()});
  }catch(e){
    return json(res,401,{error:e.message||"Sessão inválida"});
  }
}
