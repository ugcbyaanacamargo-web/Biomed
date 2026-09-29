import http from "node:http";
import {readFile,stat} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import auth from "./api/auth.js";
import event from "./api/event.js";
import health from "./api/health.js";
import learningEvent from "./api/learning-event.js";
import learningState from "./api/learning-state.js";
import profile from "./api/profile.js";
import ranking from "./api/ranking.js";
import runtimeConfig from "./api/runtime-config.js";
import tutor from "./api/tutor.js";
import {runModelBenchmark} from "./api/_lib/model-benchmark.js";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);

const apiRoutes=new Map([
  ["/api/auth",auth],
  ["/api/event",event],
  ["/api/health",health],
  ["/api/learning-event",learningEvent],
  ["/api/learning-state",learningState],
  ["/api/profile",profile],
  ["/api/ranking",ranking],
  ["/api/runtime-config",runtimeConfig],
  ["/api/tutor",tutor]
]);

const TYPES={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".ico":"image/x-icon",
  ".woff2":"font/woff2"
};

function send(res,status,body,type="text/plain; charset=utf-8"){
  res.statusCode=status;
  res.setHeader("Content-Type",type);
  res.setHeader("Cache-Control","no-cache");
  res.end(body);
}

async function serveStatic(req,res,pathname){
  if(pathname.startsWith("/api/"))return send(res,404,"API não encontrada");
  const requested=pathname==="/"?"/index.html":pathname;
  const target=path.resolve(__dirname,"."+decodeURIComponent(requested));
  if(!target.startsWith(__dirname+path.sep))return send(res,403,"Acesso negado");

  try{
    const info=await stat(target);
    if(!info.isFile())throw new Error("not-file");
    const body=await readFile(target);
    res.statusCode=200;
    res.setHeader("Content-Type",TYPES[path.extname(target).toLowerCase()]||"application/octet-stream");
    res.setHeader("Cache-Control",path.extname(target)===".html"?"no-store":"no-cache");
    if(req.method==="HEAD")return res.end();
    return res.end(body);
  }catch{
    if(req.method!=="GET"&&req.method!=="HEAD")return send(res,404,"Não encontrado");
    const body=await readFile(path.join(__dirname,"index.html"));
    res.statusCode=200;
    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    if(req.method==="HEAD")return res.end();
    return res.end(body);
  }
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url||"/","http://localhost");
  const handler=apiRoutes.get(url.pathname);
  if(handler){
    try{return await handler(req,res)}
    catch(error){
      console.error("api_unhandled",url.pathname,error);
      if(!res.headersSent)send(res,500,JSON.stringify({error:"Erro interno"}),"application/json; charset=utf-8");
      else if(!res.writableEnded)res.end();
      return;
    }
  }
  return serveStatic(req,res,url.pathname);
});

server.listen(PORT,"0.0.0.0",()=>{
  console.info("biomed_server_ready",JSON.stringify({port:PORT,runtime:"railway-node"}));
  if(process.env.BIOMED_MODEL_BENCHMARK==="1"){
    runModelBenchmark().catch(error=>console.error("model_benchmark_crash",String(error?.message||error)));
  }
});

for(const signal of ["SIGTERM","SIGINT"]){
  process.on(signal,()=>server.close(()=>process.exit(0)));
}
