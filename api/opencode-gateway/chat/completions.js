import {createPublicKey,verify as verifySignature} from "node:crypto";
import {Readable} from "node:stream";

const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="biomed-opencode";
const REPOSITORY="ugcbyaanacamargo-web/Biomed";
const FREE_MODEL="inclusionai/ling-3.0-flash-vl";

function decodePart(v){
  return JSON.parse(Buffer.from(v,"base64url").toString("utf8"));
}

async function verifyGithubOidc(token){
  const parts=String(token||"").split(".");
  if(parts.length!==3)throw new Error("Token OIDC inválido");
  const [head,body,sig]=parts;
  const header=decodePart(head),payload=decodePart(body);
  if(payload.iss!==ISSUER)throw new Error("Issuer inválido");
  const aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
  if(!aud.includes(AUDIENCE))throw new Error("Audience inválida");
  if(payload.repository!==REPOSITORY)throw new Error("Repositório não autorizado");
  if(payload.ref!=="refs/heads/main")throw new Error("Branch não autorizada");
  const now=Math.floor(Date.now()/1000);
  if(Number(payload.exp||0)<now||Number(payload.nbf||0)>now+30)throw new Error("Token expirado");

  const jwksRes=await fetch(ISSUER+"/.well-known/jwks");
  if(!jwksRes.ok)throw new Error("JWKS indisponível");
  const jwks=await jwksRes.json();
  const jwk=(jwks.keys||[]).find(k=>k.kid===header.kid);
  if(!jwk)throw new Error("Chave OIDC não encontrada");
  const key=createPublicKey({key:jwk,format:"jwk"});
  const ok=verifySignature("RSA-SHA256",Buffer.from(head+"."+body),key,Buffer.from(sig,"base64url"));
  if(!ok)throw new Error("Assinatura OIDC inválida");
  return payload;
}

export default async function handler(req,res){
  if(req.method!=="POST"){
    res.statusCode=405;res.setHeader("Content-Type","application/json");return res.end(JSON.stringify({error:"Método não permitido"}));
  }
  try{
    const auth=String(req.headers.authorization||"");
    const githubToken=auth.startsWith("Bearer ")?auth.slice(7):"";
    await verifyGithubOidc(githubToken);

    const oidc=String(req.headers["x-vercel-oidc-token"]||process.env.VERCEL_OIDC_TOKEN||"");
    if(!oidc){
      res.statusCode=503;res.setHeader("Content-Type","application/json");
      return res.end(JSON.stringify({error:"OIDC da Vercel indisponível"}));
    }

    let body=req.body;
    if(typeof body==="string")body=JSON.parse(body);
    if(!body||typeof body!=="object")body={};
    body={...body,model:FREE_MODEL};

    const upstream=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{
      method:"POST",
      headers:{
        Authorization:"Bearer "+oidc,
        "Content-Type":"application/json",
        "X-Vercel-AI-Gateway-App":"biomed-opencode"
      },
      body:JSON.stringify(body)
    });

    res.statusCode=upstream.status;
    res.setHeader("Content-Type",upstream.headers.get("content-type")||"application/json");
    res.setHeader("Cache-Control","no-store");
    if(!upstream.body)return res.end();
    Readable.fromWeb(upstream.body).pipe(res);
  }catch(e){
    res.statusCode=401;res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({error:e.message||"Não autorizado"}));
  }
}