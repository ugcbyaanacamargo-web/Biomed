import {runOpenCodeTutor} from "./_lib/opencode-sandbox.js";

export default async function handler(req,res){
  if(req.method!=="GET"){res.statusCode=405;return res.end("method")}
  const apiKey=String(process.env.OPENCODE_API_KEY||"").trim();
  const model=String(process.env.OPENCODE_MODEL||"muse-spark-1.3-contributor-free").trim();
  try{
    const result=await runOpenCodeTutor({
      studentId:"smoke",
      apiKey,
      model,
      prompt:"Responda exatamente BIOMED_MUSE_OK e nada mais."
    });
    res.statusCode=200;
    res.setHeader("Content-Type","application/json");
    res.setHeader("Cache-Control","no-store");
    return res.end(JSON.stringify({ok:true,model:result.model,runtime:"vercel-sandbox",response:result.content.slice(0,200)}));
  }catch(e){
    res.statusCode=500;
    res.setHeader("Content-Type","application/json");
    res.setHeader("Cache-Control","no-store");
    return res.end(JSON.stringify({ok:false,error:String(e.message||e).slice(0,1200)}));
  }
}