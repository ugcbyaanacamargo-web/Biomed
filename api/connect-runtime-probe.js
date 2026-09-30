function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));}
function shape(v,depth=0){
  if(depth>3||v==null)return null;
  if(Array.isArray(v))return {kind:"array",length:v.length,sample:v.length?shape(v[0],depth+1):null};
  if(typeof v==="object"){
    const out={kind:"object",keys:Object.keys(v).filter(k=>!/secret|token|credential|value/i.test(k)).slice(0,60)};
    for(const k of out.keys){if(typeof v[k]==="object"&&v[k]!=null)out[k]=shape(v[k],depth+1)}
    return out;
  }
  return {kind:typeof v};
}
export default async function handler(req,res){
  if(req.method!=="GET"||req.query?.probe!=="biomed-connect-20260930")return send(res,404,{ok:false});
  const oidc=String(req.headers["x-vercel-oidc-token"]||process.env.VERCEL_OIDC_TOKEN||"");
  if(!oidc)return send(res,200,{ok:false,stage:"oidc"});
  try{
    const r=await fetch("https://api.vercel.com/v1/connect/connectors/opencode%2Fbistre-ridge?teamId=team_uxYzObukO7cmmgbRMJF4PvO0",{headers:{Authorization:"Bearer "+oidc}});
    let d={};try{d=await r.json()}catch{}
    return send(res,200,{ok:r.ok,http:r.status,dataShape:shape(d?.data),connectorShape:shape(d)});
  }catch(e){return send(res,200,{ok:false,stage:"fetch",message:String(e?.message||e).slice(0,160)});}
}
