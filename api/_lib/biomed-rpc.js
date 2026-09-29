const SUPABASE_URL=String(process.env.SUPABASE_URL||"https://eesafxairdoygzifajgw.supabase.co").replace(/\\\/$/,"");
const SUPABASE_KEY=String(process.env.SUPABASE_PUBLISHABLE_KEY||"sb_publishable_01PF787plcwThHKGsRUnxA_17pVHebL");

export async function rpc(name,args={}){
  const res=await fetch(SUPABASE_URL+"/rest/v1/rpc/"+name,{
    method:"POST",
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:"Bearer "+SUPABASE_KEY,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(args)
  });
  const text=await res.text();
  let data=null;
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!res.ok){
    const msg=data?.message||data?.hint||("Supabase RPC "+res.status);
    const e=new Error(msg);e.status=res.status;e.data=data;throw e;
  }
  return data;
}

export function bearerToken(req){
  const auth=String(req.headers.authorization||"");
  return auth.startsWith("Bearer ")?auth.slice(7):"";
}

export const BIOMED_DB={url:SUPABASE_URL,configured:true};
