import {getToken} from "@vercel/connect";
function respond(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));}
export default async function handler(req,res){
  if(process.env.VERCEL_ENV!=="preview"||req.method!=="GET"||req.query?.check!=="bistre-ridge")return respond(res,404,{error:"Not found"});
  let token;
  try{
    token=await getToken("opencode/bistre-ridge",{subject:{type:"app"}});
  }catch(e){
    return respond(res,200,{connect:"rejected",errorType:String(e?.name||"Error").slice(0,100),code:String(e?.code||"").slice(0,100)});
  }
  if(typeof token!=="string"||token.length<8)return respond(res,200,{connect:"empty"});
  const credentials="retrieved";
  try{
    const r=await fetch("https://opencode.ai/zen/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify({model:"ling-3.0-flash-fin-free",messages:[{role:"user",content:"Responda apenas OK."}],max_tokens:20,stream:false}),
      signal:AbortSignal.timeout(15000)
    });
    let result={};try{result=await r.json()}catch{}
    const msg=String(result?.error?.message||result?.message||"").replace(/oc_sk_[A-Za-z0-9_-]+/g,"[redacted]").slice(0,190);
    return respond(res,200,{connect:credentials,model:"ling-3.0-flash-fin-free",openCodeHttp:r.status,providerMessage:msg,answered:!!result?.choices?.[0]?.message?.content});
  }catch(e){return respond(res,200,{connect:credentials,openCodeHttp:null,errorType:String(e?.name||"Error").slice(0,100)});}
}
