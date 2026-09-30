"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {ArrowRight,Brain,ChevronRight,Menu,MessageCirclePlus,MoreHorizontal,Plus,Trash2,X} from "lucide-react";
import {Conversation,ConversationContent,ConversationScrollButton} from "@/components/ai-elements/conversation";
import {Message,MessageContent,MessageResponse} from "@/components/ai-elements/message";
import {Composer} from "./composer";
import {RichTurn} from "@/components/learning/rich-turn";
import {richTutorTurnSchema,type RichTutorTurn} from "@/lib/ai/tutor-schema";

type Student={id:string;name:string;level?:string;learningScore?:number};
type ConversationItem={id:string;title:string;currentGoal?:string;studyState?:any;preview?:string;lastMessageAt?:string};
type StoredMessage={id:string;role:"user"|"assistant";content:string;ui?:any;metadata?:any;createdAt?:string;clientMessageId?:string};
type ConversationData={conversation:ConversationItem&{memorySummary?:string};messages:StoredMessage[];memory?:any};

function turnFromMessage(message:StoredMessage):RichTutorTurn{
  const raw={
    schemaVersion:message.ui?.schemaVersion===1?1:1,
    message:message.content,
    blocks:Array.isArray(message.ui?.blocks)?message.ui.blocks:[],
    learning:{mode:"teach",currentGoal:"",nextGoal:"",progress:0,objectives:[],mastered:[],struggling:[],misconceptions:[]},
    conversation:{suggestedTitle:"Conversa",memorySummary:"",shouldSummarize:false}
  };
  const parsed=richTutorTurnSchema.safeParse(raw);
  return parsed.success?parsed.data:{...raw,blocks:[]} as RichTutorTurn;
}

export function ChatShell({session,onLogout}:{session:{token:string;student?:Student};onLogout:()=>void}){
  const token=session.token;
  const [student,setStudent]=useState<Student|undefined>(session.student),[conversations,setConversations]=useState<ConversationItem[]>([]);
  const [activeId,setActiveId]=useState<string|null>(null),[data,setData]=useState<ConversationData|null>(null);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[sidebar,setSidebar]=useState(false);
  const [error,setError]=useState(""),[retry,setRetry]=useState<{clientMessageId:string;message:string;interaction?:any}|null>(null);

  const api=useCallback(async(path:string,options:RequestInit={})=>{
    const response=await fetch(path,{...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...(options.headers||{})}});
    const json=await response.json().catch(()=>({}));
    if(response.status===401){onLogout();throw new Error("Sessão expirada")}
    if(!response.ok)throw Object.assign(new Error(json.error||"Falha na solicitação"),{status:response.status,data:json});
    return json;
  },[token,onLogout]);

  const loadList=useCallback(async()=>{
    const [profile,list]=await Promise.all([api("/api/profile"),api("/api/conversations")]);
    setStudent(profile.student);setConversations(list.conversations||[]);
    return list.conversations||[] as ConversationItem[];
  },[api]);

  const openConversation=useCallback(async(id:string)=>{
    setLoading(true);setError("");
    try{const value=await api(`/api/conversations/${id}`);setData(value);setActiveId(id);setSidebar(false)}
    catch(e){setError(String((e as Error).message||e))}
    finally{setLoading(false)}
  },[api]);

  const createConversation=useCallback(async()=>{
    setBusy(true);setError("");
    try{
      const result=await api("/api/conversations",{method:"POST",body:JSON.stringify({})});
      const conversation=result.conversation as ConversationItem;
      await loadList();
      await openConversation(conversation.id);
    }catch(e){setError(String((e as Error).message||e))}
    finally{setBusy(false)}
  },[api,loadList,openConversation]);

  useEffect(()=>{let live=true;(async()=>{
    try{
      const list=await loadList();if(!live)return;
      if(list.length)await openConversation(list[0].id);
      else await createConversation();
    }catch(e){if(live)setError(String((e as Error).message||e));}
    finally{if(live)setLoading(false)}
  })();return()=>{live=false}},[loadList,openConversation,createConversation]);

  async function send(message:string,interaction?:any,clientMessageId=crypto.randomUUID()){
    if(!activeId||busy)return;
    setBusy(true);setError("");setRetry(null);
    const optimistic:StoredMessage={id:`local-${clientMessageId}`,role:"user",content:message,clientMessageId,createdAt:new Date().toISOString()};
    setData(prev=>prev?{...prev,messages:[...prev.messages.filter(m=>m.clientMessageId!==clientMessageId),optimistic]}:prev);
    try{
      const result=await api("/api/chat",{method:"POST",body:JSON.stringify({conversationId:activeId,clientMessageId,message,interaction})});
      const stored=result.stored?.message;
      const assistant:StoredMessage=stored?{
        id:stored.id||crypto.randomUUID(),role:"assistant",content:result.turn.message,
        ui:{schemaVersion:result.turn.schemaVersion,blocks:result.turn.blocks},metadata:stored.metadata,createdAt:stored.createdAt
      }:{id:crypto.randomUUID(),role:"assistant",content:result.turn.message,ui:{schemaVersion:1,blocks:result.turn.blocks}};
      setData(prev=>prev?{...prev,messages:[...prev.messages,assistant],conversation:{...prev.conversation,studyState:result.turn.learning}}:prev);
      void loadList();
    }catch(e){
      setRetry({clientMessageId,message,interaction});
      setError(String((e as Error).message||"O Tutor não conseguiu responder."));
    }finally{setBusy(false)}
  }

  async function archive(id:string){
    await api(`/api/conversations/${id}`,{method:"DELETE"});
    const list=await loadList();
    if(id===activeId){if(list.length)await openConversation(list[0].id);else await createConversation()}
  }

  const progress=Number(data?.conversation?.studyState?.overall||0);
  const first=(student?.name||"Aluno").split(" ")[0];

  return <main className="chat-app">
    <aside className={`chat-sidebar ${sidebar?"open":""}`}>
      <div className="sidebar-top"><a className="chat-brand" href="/" onClick={e=>e.preventDefault()}><span><Brain size={22}/></span><div><strong>BIOMED</strong><small>Tutor IA</small></div></a><button className="sidebar-close" onClick={()=>setSidebar(false)}><X size={20}/></button></div>
      <button className="new-chat" onClick={()=>void createConversation()} disabled={busy}><MessageCirclePlus size={18}/>Nova conversa</button>
      <div className="history-head"><span>CONVERSAS</span><small>{conversations.length}</small></div>
      <nav className="conversation-list">{conversations.map(item=><div className={`conversation-link ${item.id===activeId?"active":""}`} key={item.id}><button onClick={()=>void openConversation(item.id)}><strong>{item.title}</strong><small>{item.preview||item.currentGoal||"Conversa de estudo"}</small></button><button className="archive-button" title="Arquivar conversa" onClick={()=>void archive(item.id)}><Trash2 size={14}/></button></div>)}</nav>
      <div className="sidebar-progress"><div><span>SEU PROGRESSO</span><b>{Math.round(progress)}%</b></div><div className="mini-track"><i style={{width:`${progress}%`}}/></div><small>{data?.conversation?.studyState?.currentGoal||"O Tutor está construindo seu plano."}</small></div>
      <div className="profile-row"><div className="avatar">{first.slice(0,1).toUpperCase()}</div><div><strong>{first}</strong><small>{student?.level||"bronze"}</small></div><button onClick={onLogout} title="Sair"><MoreHorizontal size={18}/></button></div>
    </aside>
    {sidebar&&<button className="sidebar-backdrop" onClick={()=>setSidebar(false)} aria-label="Fechar menu"/>}
    <section className="chat-main">
      <header className="chat-header"><button className="mobile-menu" onClick={()=>setSidebar(true)}><Menu/></button><div><span className="tutor-dot"/><div><strong>Tutor BIOMED</strong><small>GPT-OSS 120B • professor adaptativo</small></div></div><button className="header-new" onClick={()=>void createConversation()}><Plus size={18}/><span>Nova conversa</span></button></header>
      <div className="chat-stage">
        {loading?<div className="center-state"><div className="brain-loader"><Brain/></div><strong>Preparando seu ambiente...</strong></div>:
        <Conversation><ConversationContent>
          {data?.messages?.length?data.messages.map(message=><Message from={message.role} key={message.id}><MessageContent>{message.role==="user"?<div className="user-bubble">{message.content}</div>:<div className="assistant-turn"><div className="assistant-avatar"><Brain size={17}/></div><div className="assistant-body"><RichTurn turn={turnFromMessage(message)} onInteraction={interaction=>void send(interaction.label||String(interaction.value),interaction)} onRendered={types=>void api("/api/events",{method:"POST",body:JSON.stringify({event:"rich_block_rendered",properties:{conversation_id:activeId,types}})}).catch(()=>{})}/></div></div>}</MessageContent></Message>):<WelcomeEmpty first={first} onStart={prompt=>void send(prompt)}/>}
          {busy&&<Message from="assistant"><MessageContent><div className="assistant-turn thinking"><div className="assistant-avatar"><Brain size={17}/></div><div><span/><span/><span/><small>O Tutor está pensando no próximo passo...</small></div></div></MessageContent></Message>}
          {error&&<div className="chat-error"><strong>Não consegui concluir este turno.</strong><span>{error}</span>{retry&&<button onClick={()=>void send(retry.message,retry.interaction,retry.clientMessageId)}>Tentar novamente <ChevronRight size={15}/></button>}</div>}
        </ConversationContent><ConversationScrollButton/></Conversation>}
      </div>
      <Composer disabled={busy||!activeId} onSend={text=>send(text)}/>
    </section>
  </main>;
}

function WelcomeEmpty({first,onStart}:{first:string;onStart:(prompt:string)=>void}){
  const prompts=["Quero começar do zero.","Quero revisar para uma prova.","Tenho dificuldade em vias da dor."];
  return <div className="empty-tutor"><div className="empty-icon"><Brain/></div><span className="auth-kicker">TUTOR BIOMED</span><h1>Oi, {first}.<br/>O que você precisa entender?</h1><p>Eu vou montar seu caminho de estudo conversando com você. Posso explicar com desenhos, comparar mecanismos, criar exercícios e adaptar o próximo passo às suas respostas.</p><div className="starter-grid">{prompts.map(prompt=><button key={prompt} onClick={()=>onStart(prompt)}>{prompt}<ArrowRight size={15}/></button>)}</div></div>;
}
