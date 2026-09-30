import {getToken} from "@vercel/connect";
function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));}
export default async function handler(req,res){
  if(req.method!=="GET"||req.query?.probe!=="biomed-connect-20260930")return send(res,404,{ok:false});
  const started=Date.now();
  try{
    const token=await getToken("opencode/bistre-ridge",{subject:{type:"app"}});
    const r=await fetch("https://opencode.ai/zen/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify({model:"muse-spark-1.3-contributor-free",messages:[{role:"user",content:"Responda apenas OK."}],max_tokens:24,stream:false}),
      signal:AbortSignal.timeout(20000)
    });
    let data={};try{data=await r.json()}catch{}
    return send(res,200,{ok:r.ok,tokenRetrieved:true,http:r.status,durationMs:Date.now()-started,answered:Boolean(data?.choices?.[0]?.message?.content),errorType:String(data?.error?.type||"").slice(0,80),errorMessage:String(data?.error?.message||data?.message||"").slice(0,180)});
  }catch(e){return send(res,200,{ok:false,tokenRetrieved:false,errorType:String(e?.name||"Error").slice(0,80),code:String(e?.code||"").slice(0,80),message:String(e?.message||"").slice(0,180),durationMs:Date.now()-started});}
}
