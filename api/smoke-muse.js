export default async function handler(req,res){
  if(req.method!=="GET"){res.statusCode=405;return res.end("method")}
  const key=String(process.env.OPENCODE_API_KEY||"").trim();
  if(!key){
    res.statusCode=503;
    res.setHeader("Content-Type","application/json");
    return res.end(JSON.stringify({ok:false,error:"OPENCODE_API_KEY ausente"}));
  }
  try{
    const r=await fetch("https://opencode.ai/zen/v1/responses",{
      method:"POST",
      headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"muse-spark-1.3-contributor-free",
        instructions:"Responda exatamente BIOMED_MUSE_OK.",
        input:"Teste de integração do Tutor BIOMED.",
        max_output_tokens:32
      })
    });
    const text=await r.text();
    let data={};try{data=JSON.parse(text)}catch{}
    const parts=[];
    if(typeof data?.output_text==="string")parts.push(data.output_text);
    if(Array.isArray(data?.output)){
      for(const item of data.output){
        if(Array.isArray(item?.content)){
          for(const part of item.content){
            if(typeof part?.text==="string")parts.push(part.text);
            else if(typeof part?.output_text==="string")parts.push(part.output_text);
          }
        }
      }
    }
    res.statusCode=r.ok?200:r.status;
    res.setHeader("Content-Type","application/json");
    res.setHeader("Cache-Control","no-store");
    return res.end(JSON.stringify({
      ok:r.ok,
      model:"muse-spark-1.3-contributor-free",
      response:parts.join("\n").trim().slice(0,200),
      upstreamStatus:r.status,
      error:data?.error?.message||data?.message||null
    }));
  }catch(e){
    res.statusCode=500;
    res.setHeader("Content-Type","application/json");
    return res.end(JSON.stringify({ok:false,error:e.message}));
  }
}