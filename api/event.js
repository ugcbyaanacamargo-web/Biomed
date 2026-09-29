import crypto from "node:crypto";
import {allowCors,json,verifySession,readJson,publicStudent} from "./_lib/security.js";
import {dbConfigured,getStudent,updateStudent,addEvent} from "./_lib/store.js";
import {applyEvent,computeLearningScore,determineLevel,xpForEvent} from "./_lib/scoring.js";

const allowed=new Set(["content_complete","diagnostic","question","progress_snapshot","exam","simulation","case","open_answer","retention","tutor_turn"]);

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=="POST")return json(res,405,{error:"Método não permitido"});
  if(!dbConfigured())return json(res,503,{error:"Banco persistente ainda não configurado",code:"DB_NOT_CONFIGURED"});
  try{
    const session=verifySession(req);
    const body=await readJson(req);
    const type=String(body.type||"");
    if(!allowed.has(type))return json(res,400,{error:"Evento inválido"});
    const row=await getStudent(session.sub);
    if(!row)return json(res,404,{error:"Aluno não encontrado"});
    const payload=body.payload&&typeof body.payload==="object"?body.payload:{};
    const topic=typeof body.topic==="string"?body.topic.slice(0,40):null;
    const eventKey=String(body.eventKey||crypto.randomUUID()).slice(0,120);
    const inserted=await addEvent({studentId:row.id,eventKey,eventType:type,topic,payload});
    if(!inserted.inserted)return json(res,200,{duplicate:true,student:publicStudent(row)});
    const stats=applyEvent(row.stats,type,{...payload,topic});
    const learningScore=computeLearningScore(stats);
    const level=determineLevel(stats,learningScore);
    const xp=Math.max(0,Number(row.xp||0)+xpForEvent(type,payload));
    const updated=await updateStudent(row.id,{stats,learning_score:learningScore,level,xp,last_seen_at:new Date().toISOString()});
    return json(res,200,{duplicate:false,student:publicStudent(updated||row)});
  }catch(e){
    return json(res,/Sessão/.test(e.message||"")?401:500,{error:e.message||"Erro ao registrar progresso"});
  }
}