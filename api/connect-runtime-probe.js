import {getToken} from "@vercel/connect";
function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));}
function clean(v){return String(v||"").replace(/oc_sk_[A-Za-z0-9_-]+/g,"[REDACTED]").replace(/stk_[A-Za-z0-9_-]+/g,"[REDACTED]").slice(0,220);}
const SUBJECT={type:"user",id:"biomed-tutor-service"};
export default async function handler(req,res){
  if(req.method!=="GET"||req.query?.probe!=="biomed-connect-20260930")return send(res,404,{ok:false});
  const oidc=String(req.headers["x-vercel-oidc-token"]||process.env.VERCEL_OIDC_TOKEN||"");
  const providerKey=String(process.env.OPENCODE_API_KEY||"");
  if(!oidc||!providerKey)return send(res,200,{ok:false,stage:"precheck",hasOidc:Boolean(oidc),hasProviderKey:Boolean(providerKey)});
  try{
    const expiresAt=Date.now()+365*24*60*60*1000;
    const imp=await fetch("https://api.vercel.com/v1/connect/token/opencode%2Fbistre-ridge/import?teamId=team_uxYzObukO7cmmgbRMJF4PvO0",{
      method:"POST",
      headers:{Authorization:"Bearer "+oidc,"Content-Type":"application/json"},
      body:JSON.stringify({tokens:[{name:"BIOMED Tutor",accessToken:providerKey,expiresAt,subject:SUBJECT,environment:"production",data:{}}]})
    });
    let impData={};try{impData=await imp.json()}catch{}
    if(!imp.ok)return send(res,200,{ok:false,stage:"import",http:imp.status,accepted:impData?.accepted??null,imported:impData?.imported??null,message:clean(impData?.error?.message||impData?.message||JSON.stringify(impData))});
    let token;
    try{token=await getToken("opencode/bistre-ridge",{subject:SUBJECT});}
    catch(e){return send(res,200,{ok:false,stage:"getToken",importHttp:imp.status,accepted:impData?.accepted??null,imported:impData?.imported??null,code:clean(e?.code),message:clean(e?.message)});}
    const ai=await fetch("https://opencode.ai/zen/v1/chat/completions",{
      method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify({model:"muse-spark-1.3-contributor-free",messages:[{role:"user",content:"Responda apenas OK."}],max_tokens:24,stream:false}),
      signal:AbortSignal.timeout(20000)
    });
    let aiData={};try{aiData=await ai.json()}catch{}
    return send(res,200,{ok:ai.ok,stage:"inference",importHttp:imp.status,accepted:impData?.accepted??null,imported:impData?.imported??null,tokenRetrieved:true,aiHttp:ai.status,answered:Boolean(aiData?.choices?.[0]?.message?.content),errorType:clean(aiData?.error?.type),message:clean(aiData?.error?.message||aiData?.message)});
  }catch(e){return send(res,200,{ok:false,stage:"exception",message:clean(e?.message)});}
}
