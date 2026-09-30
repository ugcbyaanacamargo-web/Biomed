import {richTutorTurnSchema,type RichTutorTurn} from "./tutor-schema";

type StoredMessage={
  id?:string;
  role?:string;
  content?:string;
  ui?:{schemaVersion?:number;blocks?:unknown};
  metadata?:Record<string,unknown>;
  replyToClientMessageId?:string;
  createdAt?:string;
};

type ConversationSnapshot={
  conversation?:{
    title?:string;
    studyState?:Record<string,unknown>;
    memorySummary?:string;
  };
  messages?:StoredMessage[];
};

const MODES=new Set(["diagnose","teach","practice","review","assessment"]);

function list(value:unknown){return Array.isArray(value)?value:[]}

export function replayStoredTurn(data:ConversationSnapshot,clientMessageId:string):{
  turn:RichTutorTurn;
  stored:{duplicate:true;message:StoredMessage;studyState:Record<string,unknown>};
  traceId?:string;
  replayed:true;
}|null{
  const reply=(data.messages||[]).find(message=>
    message.role==="assistant"&&message.replyToClientMessageId===clientMessageId
  );
  if(!reply?.content)return null;

  const state=(data.conversation?.studyState&&typeof data.conversation.studyState==="object")
    ?data.conversation.studyState:{};
  const mode=typeof state.mode==="string"&&MODES.has(state.mode)?state.mode:"teach";
  const progress=Math.max(0,Math.min(100,Number(state.overall??0)||0));
  const title=String(data.conversation?.title||"Conversa").trim().slice(0,80)||"Conversa";
  const memorySummary=String(data.conversation?.memorySummary||"").trim().slice(0,5000);

  const candidate={
    schemaVersion:1 as const,
    message:reply.content,
    blocks:Array.isArray(reply.ui?.blocks)?reply.ui.blocks:[],
    learning:{
      mode,
      currentGoal:String(state.currentGoal||"").slice(0,400),
      nextGoal:String(state.nextGoal||"").slice(0,400),
      progress,
      objectives:list(state.objectives),
      mastered:list(state.mastered),
      struggling:list(state.struggling),
      misconceptions:list(state.misconceptions)
    },
    conversation:{suggestedTitle:title,memorySummary,shouldSummarize:false}
  };

  const parsed=richTutorTurnSchema.safeParse(candidate);
  if(!parsed.success)return null;

  return{
    turn:parsed.data,
    stored:{duplicate:true,message:reply,studyState:state},
    traceId:typeof reply.metadata?.traceId==="string"?reply.metadata.traceId:undefined,
    replayed:true
  };
}
