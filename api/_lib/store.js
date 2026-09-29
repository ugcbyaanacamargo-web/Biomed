const base=()=>String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||"";

export function dbConfigured(){return Boolean(base()&&key())}

async function request(path,{method="GET",body,headers={}}={}){
  if(!dbConfigured()) throw new Error("Banco persistente não configurado");
  const res=await fetch(base()+"/rest/v1/"+path,{
    method,
    headers:{
      apikey:key(),
      Authorization:"Bearer "+key(),
      "Content-Type":"application/json",
      Prefer:"return=representation",
      ...headers
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await res.text();
  const data=text?JSON.parse(text):null;
  if(!res.ok){
    const err=new Error(data?.message||data?.hint||("Erro de banco "+res.status));
    err.status=res.status;err.data=data;throw err;
  }
  return data;
}

export async function findByCpfHash(hash){
  const rows=await request("biomed_students?cpf_hash=eq."+encodeURIComponent(hash)+"&limit=1");
  return rows?.[0]||null;
}

export async function createStudent({cpfHash,name}){
  const rows=await request("biomed_students",{method:"POST",body:{cpf_hash:cpfHash,name}});
  return rows?.[0]||null;
}

export async function getStudent(id){
  const rows=await request("biomed_students?id=eq."+encodeURIComponent(id)+"&limit=1");
  return rows?.[0]||null;
}

export async function updateStudent(id,patch){
  const rows=await request("biomed_students?id=eq."+encodeURIComponent(id),{method:"PATCH",body:patch});
  return rows?.[0]||null;
}

export async function addEvent({studentId,eventKey,eventType,topic,payload}){
  try{
    const rows=await request("biomed_events",{method:"POST",body:{
      student_id:studentId,event_key:eventKey,event_type:eventType,topic:topic||null,payload:payload||{}
    }});
    return {inserted:true,event:rows?.[0]||null};
  }catch(e){
    if(e.status===409 || String(e.data?.code||"")==="23505") return {inserted:false,event:null};
    throw e;
  }
}

export async function topStudents(limit=50){
  const n=Math.max(1,Math.min(100,Number(limit)||50));
  return request("biomed_students?select=id,name,level,xp,learning_score,stats,updated_at&order=learning_score.desc,xp.desc&limit="+n);
}
