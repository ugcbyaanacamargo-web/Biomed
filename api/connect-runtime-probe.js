function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));}
export default async function handler(req,res){
  if(req.method!=="GET"||req.query?.probe!=="biomed-connect-20260930")return send(res,404,{ok:false});
  const oidc=String(req.headers["x-vercel-oidc-token"]||process.env.VERCEL_OIDC_TOKEN||"");
  if(!oidc)return send(res,200,{ok:false,stage:"oidc"});
  try{
    const r=await fetch("https://api.vercel.com/v1/connect/connectors/opencode%2Fbistre-ridge?teamId=team_uxYzObukO7cmmgbRMJF4PvO0",{headers:{Authorization:"Bearer "+oidc}});
    let d={};try{d=await r.json()}catch{}
    const pick={
      id:d?.id||null,uid:d?.uid||null,type:d?.type||null,typeName:d?.typeName||null,
      service:d?.service||null,serviceName:d?.serviceName||null,
      connectionMethod:d?.connectionMethod||null,target:d?.target||null,
      supportedSubjectTypes:d?.supportedSubjectTypes||null,
      appTokens:d?.appTokens||null,userTokens:d?.userTokens||null,
      supportsInstallation:d?.supportsInstallation??null,
      defaultInstallationId:d?.defaultInstallationId||null,
      installationCount:Array.isArray(d?.installations)?d.installations.length:null,
      topLevelKeys:Object.keys(d||{}).filter(k=>!/secret|token|credential|key/i.test(k)).slice(0,80)
    };
    return send(res,200,{ok:r.ok,http:r.status,connector:pick});
  }catch(e){return send(res,200,{ok:false,stage:"fetch",message:String(e?.message||e).slice(0,160)});}
}
