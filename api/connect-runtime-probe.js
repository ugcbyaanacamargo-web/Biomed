function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));}
export default async function handler(req,res){
  if(req.method!=="GET"||req.query?.probe!=="biomed-connect-20260930")return send(res,404,{ok:false});
  const oidc=String(req.headers["x-vercel-oidc-token"]||process.env.VERCEL_OIDC_TOKEN||"");
  if(!oidc)return send(res,200,{ok:false,stage:"oidc",message:"missing"});
  try{
    const r=await fetch("https://api.vercel.com/v1/connect/connectors/opencode%2Fbistre-ridge?teamId=team_uxYzObukO7cmmgbRMJF4PvO0",{headers:{Authorization:"Bearer "+oidc}});
    let data={};try{data=await r.json()}catch{}
    return send(res,200,{ok:r.ok,http:r.status,id:data?.id||null,uid:data?.uid||null,typeName:data?.typeName||null,hasDefaultInstallation:Boolean(data?.defaultInstallationId),defaultInstallationId:data?.defaultInstallationId||null,redirectUri:Boolean(data?.redirectUri),errorCode:data?.error?.code||data?.code||null,message:String(data?.error?.message||data?.message||"").slice(0,160)});
  }catch(e){return send(res,200,{ok:false,stage:"fetch",message:String(e?.message||e).slice(0,160)});}
}
