import {allowCors,json,readJson,validCPF,cpfHash,cleanName,signSession,publicStudent} from "./_lib/security.js";
import {dbConfigured,findByCpfHash,createStudent,updateStudent} from "./_lib/store.js";

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=="POST")return json(res,405,{error:"Método não permitido"});
  if(!dbConfigured())return json(res,503,{error:"Banco persistente ainda não configurado",code:"DB_NOT_CONFIGURED"});
  try{
    const body=await readJson(req);
    const cpf=String(body.cpf||"");
    if(!validCPF(cpf))return json(res,400,{error:"CPF inválido"});
    const hash=cpfHash(cpf);
    let row=await findByCpfHash(hash);
    if(!row){
      const name=cleanName(body.name);
      if(!name)return json(res,200,{newStudent:true});
      row=await createStudent({cpfHash:hash,name});
    }else{
      await updateStudent(row.id,{last_seen_at:new Date().toISOString()});
    }
    return json(res,200,{newStudent:false,token:signSession(row.id),student:publicStudent(row)});
  }catch(e){
    return json(res,500,{error:"Não foi possível concluir o acesso",detail:process.env.NODE_ENV==="development"?e.message:undefined});
  }
}
