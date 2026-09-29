import crypto from "node:crypto";

export function json(res,status,data){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.end(JSON.stringify(data));
}

export function allowCors(req,res){
  const origin=req.headers.origin||"";
  const allowed=(process.env.ALLOWED_ORIGIN||"https://biomed-sepia.vercel.app").split(",").map(x=>x.trim());
  if(allowed.includes(origin)) res.setHeader("Access-Control-Allow-Origin",origin);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method==="OPTIONS"){res.statusCode=204;res.end();return true}
  return false;
}

export function digitsOnly(v){return String(v||"").replace(/\D/g,"")}

export function validCPF(input){
  const cpf=digitsOnly(input);
  if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf)) return false;
  const calc=(base,factor)=>{
    let total=0;
    for(const n of base){total+=Number(n)*factor--}
    const mod=(total*10)%11;
    return mod===10?0:mod;
  };
  const d1=calc(cpf.slice(0,9),10);
  const d2=calc(cpf.slice(0,10),11);
  return d1===Number(cpf[9])&&d2===Number(cpf[10]);
}

export function cpfHash(cpf){
  const secret=process.env.CPF_HMAC_SECRET;
  if(!secret) throw new Error("CPF_HMAC_SECRET ausente");
  return crypto.createHmac("sha256",secret).update(digitsOnly(cpf)).digest("hex");
}

const b64=v=>Buffer.from(v).toString("base64url");
const unb64=v=>Buffer.from(v,"base64url").toString("utf8");

export function signSession(studentId){
  const secret=process.env.SESSION_SECRET;
  if(!secret) throw new Error("SESSION_SECRET ausente");
  const payload={sub:studentId,exp:Date.now()+1000*60*60*24*30};
  const body=b64(JSON.stringify(payload));
  const sig=crypto.createHmac("sha256",secret).update(body).digest("base64url");
  return body+"."+sig;
}

export function verifySession(req){
  const auth=String(req.headers.authorization||"");
  const token=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(!token) throw new Error("Sessão ausente");
  const [body,sig]=token.split(".");
  if(!body||!sig) throw new Error("Sessão inválida");
  const secret=process.env.SESSION_SECRET;
  if(!secret) throw new Error("SESSION_SECRET ausente");
  const expected=crypto.createHmac("sha256",secret).update(body).digest("base64url");
  const a=Buffer.from(sig),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) throw new Error("Sessão inválida");
  const payload=JSON.parse(unb64(body));
  if(!payload.sub||!payload.exp||Date.now()>payload.exp) throw new Error("Sessão expirada");
  return payload;
}

export async function readJson(req){
  if(req.body&&typeof req.body==="object") return req.body;
  let raw="";
  for await (const chunk of req) raw+=chunk;
  if(!raw) return {};
  return JSON.parse(raw);
}

export function cleanName(v){
  return String(v||"").trim().replace(/\s+/g," ").slice(0,120);
}

export function publicStudent(row){
  const name=String(row.name||"Aluno");
  const parts=name.split(/\s+/).filter(Boolean);
  const rankingName=parts.length>1?parts[0]+" "+parts[parts.length-1][0]+".":parts[0];
  return {
    id:row.id,
    name,
    rankingName,
    level:row.level||"bronze",
    xp:Number(row.xp||0),
    learningScore:Number(row.learning_score||0),
    stats:row.stats||{},
    createdAt:row.created_at,
    updatedAt:row.updated_at,
    lastSeenAt:row.last_seen_at
  };
}
