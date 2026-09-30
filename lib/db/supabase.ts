const SUPABASE_URL=String(process.env.SUPABASE_URL||"https://eesafxairdoygzifajgw.supabase.co").replace(/\/$/,"");
const SUPABASE_KEY=String(process.env.SUPABASE_PUBLISHABLE_KEY||"sb_publishable_01PF787plcwThHKGsRUnxA_17pVHebL");

export async function rpc<T=unknown>(name:string,args:Record<string,unknown>={}):Promise<T>{
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
    method:"POST",
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:`Bearer ${SUPABASE_KEY}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(args),
    cache:"no-store"
  });
  const raw=await response.text();
  let data:unknown=null;
  if(raw){try{data=JSON.parse(raw)}catch{data=raw}}
  if(!response.ok){
    const message=typeof data==="object"&&data&&"message" in data?String((data as {message?:unknown}).message):`Supabase RPC ${response.status}`;
    const error=new Error(message) as Error&{status?:number;data?:unknown};
    error.status=response.status;error.data=data;throw error;
  }
  return data as T;
}

export function bearerToken(request:Request){
  const authorization=request.headers.get("authorization")||"";
  return authorization.startsWith("Bearer ")?authorization.slice(7).trim():"";
}

export function requireBearerToken(request:Request){
  const token=bearerToken(request);
  if(!token)throw Object.assign(new Error("Sessão ausente"),{status:401});
  return token;
}
