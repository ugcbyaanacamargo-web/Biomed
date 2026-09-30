function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));}
export default async function handler(req,res){
  if(req.method!=="GET"||req.query?.probe!=="biomed-connect-20260930")return send(res,404,{ok:false});
  return send(res,200,{ok:true,hasOpenCodeKey:Boolean(process.env.OPENCODE_API_KEY),hasGatewayKey:Boolean(process.env.AI_GATEWAY_API_KEY),hasOidc:Boolean(req.headers["x-vercel-oidc-token"]||process.env.VERCEL_OIDC_TOKEN)});
}
