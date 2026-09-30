import {startAuthorization} from "@vercel/connect";
function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));}
export default async function handler(req,res){
  if(req.method!=="GET"||req.query?.probe!=="biomed-connect-20260930")return send(res,404,{ok:false});
  try{
    const result=await startAuthorization("opencode/bistre-ridge",{
      subject:{type:"user",id:"biomed-tutor-service"},
      returnUrl:"https://biomed-sepia.vercel.app/api/connect-runtime-probe?probe=biomed-connect-authorized"
    });
    return send(res,200,{ok:true,hasUrl:Boolean(result?.url),url:result?.url||null,expiresAt:result?.expiresAt||null,connectorUid:result?.connector?.uid||null});
  }catch(e){return send(res,200,{ok:false,errorType:String(e?.name||"Error").slice(0,80),code:String(e?.code||"").slice(0,80),message:String(e?.message||"").slice(0,180)});}
}
