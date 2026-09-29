import {allowCors,json,verifySession} from "./_lib/security.js";
import {dbConfigured,topStudents} from "./_lib/store.js";

function maskName(name){
  const p=String(name||"Aluno").trim().split(/\s+/).filter(Boolean);
  return p.length>1?p[0]+" "+p[p.length-1][0]+".":p[0];
}

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=="GET")return json(res,405,{error:"Método não permitido"});
  if(!dbConfigured())return json(res,503,{error:"Banco persistente ainda não configurado",code:"DB_NOT_CONFIGURED"});
  try{
    verifySession(req);
    const rows=await topStudents(50);
    const ranking=(rows||[]).map((r,i)=>({
      position:i+1,
      name:maskName(r.name),
      level:r.level||"bronze",
      learningScore:Number(r.learning_score||0),
      xp:Number(r.xp||0)
    }));
    return json(res,200,{ranking});
  }catch(e){
    return json(res,401,{error:e.message||"Sessão inválida"});
  }
}