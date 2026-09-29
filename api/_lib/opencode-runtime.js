export async function runOpenCodeTutor(args){
  if(process.env.RAILWAY_ENVIRONMENT||process.env.BIOMED_RUNTIME==="railway"){
    const {runOpenCodeLocalTutor}=await import("./opencode-local.js");
    return runOpenCodeLocalTutor(args);
  }
  const {runOpenCodeTutor:runSandboxTutor}=await import("./opencode-sandbox.js");
  return runSandboxTutor(args);
}
