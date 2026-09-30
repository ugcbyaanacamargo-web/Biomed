"use client";
import {FormEvent,useState} from "react";
import {Brain,ShieldCheck,Sparkles} from "lucide-react";

export function AuthScreen({onAuthenticated}:{onAuthenticated:(session:{mode:"server";token:string;student:unknown})=>void}){
  const [cpf,setCpf]=useState(""),[name,setName]=useState(""),[needsName,setNeedsName]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setError("");setBusy(true);
    try{
      const response=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cpf,name:needsName?name:null})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível entrar.");
      if(data.newStudent){setNeedsName(true);return}
      if(!data.token)throw new Error("Sessão não retornada.");
      onAuthenticated({mode:"server",token:data.token,student:data.student});
    }catch(e){setError(String((e as Error).message||e))}finally{setBusy(false)}
  }
  return <main className="auth-page"><section className="auth-story"><div className="brand-mark"><Brain size={28}/><strong>BIOMED</strong></div><span className="auth-kicker">SEU PROFESSOR DE FISIOLOGIA</span><h1>Não siga um curso.<br/><em>Converse até entender.</em></h1><p>O Tutor acompanha seu raciocínio, gera explicações visuais, cria exercícios e continua exatamente de onde você parou.</p><div className="auth-features"><div><Sparkles/><span><b>Aula criada para você</b><small>Conteúdo, desenhos e perguntas mudam conforme seu entendimento.</small></span></div><div><ShieldCheck/><span><b>Memória de aprendizagem</b><small>Seu histórico e suas dificuldades ficam disponíveis nas próximas sessões.</small></span></div></div></section><section className="auth-panel"><form onSubmit={submit}><div className="mini-brand"><Brain size={22}/>BIOMED</div><h2>{needsName?"Como podemos te chamar?":"Entrar no Tutor"}</h2><p>{needsName?"Seu nome será usado pelo professor durante os estudos.":"Use seu CPF para recuperar sua conversa e seu progresso."}</p>{!needsName?<label>CPF<input value={cpf} onChange={e=>setCpf(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" required/></label>:<label>Nome completo<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Seu nome" required minLength={2}/></label>}<button className="auth-submit" disabled={busy}>{busy?"Entrando...":needsName?"Criar meu ambiente":"Continuar"}</button>{error&&<div className="form-error">{error}</div>}<small className="privacy-note">Seu CPF é usado somente para localizar sua conta. Ele não é enviado para a IA.</small></form></section></main>;
}
