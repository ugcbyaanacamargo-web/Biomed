import {runZenTutor} from "./zen-client.js";

const MODELS=["muse-spark-1.3-contributor-free","nemotron-3.5-lightning-free"];
const PROMPT="Compare Aβ, Aδ e C em três frases.";

export async function runModelBenchmark(){
  const apiKey=String(process.env.OPENCODE_API_KEY||"").trim();
  if(!apiKey){console.warn("model_benchmark",JSON.stringify({ok:false,error:"OPENCODE_API_KEY ausente"}));return[]}
  const results=[];
  for(const model of MODELS){
    const started=Date.now();
    try{
      const result=await runZenTutor({studentId:"benchmark",prompt:PROMPT,model,apiKey});
      const row={model,ok:true,latencyMs:Number(result.durationMs||Date.now()-started),runtime:result.runtime,chars:String(result.content||"").length};
      results.push(row);console.info("model_benchmark",JSON.stringify(row));
    }catch(error){
      const row={model,ok:false,latencyMs:Number(error?.durationMs||Date.now()-started),code:error?.code||"ERROR",error:String(error?.message||error).slice(0,300)};
      results.push(row);console.info("model_benchmark",JSON.stringify(row));
    }
  }
  return results;
}
