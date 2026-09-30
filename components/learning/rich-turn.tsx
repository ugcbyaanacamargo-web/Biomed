"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowRight,Check,ExternalLink,RotateCcw,Sparkles} from "lucide-react";
import {MessageResponse} from "@/components/ai-elements/message";
import type {RichBlock,RichTutorTurn} from "@/lib/ai/tutor-schema";

type Interaction={id:string;value:string|string[];label?:string};
type Props={turn:RichTutorTurn;onInteraction:(interaction:Interaction)=>void;onRendered?:(types:string[])=>void};

export function RichTurn({turn,onInteraction,onRendered}:Props){
  useEffect(()=>{onRendered?.(turn.blocks.map(block=>block.type))},[turn.blocks,onRendered]);
  return <div className="rich-turn">
    <MessageResponse>{turn.message}</MessageResponse>
    {turn.blocks.map((block,index)=><RichBlockView key={`${block.type}-${index}`} block={block} onInteraction={onInteraction}/>)}
  </div>;
}

function RichBlockView({block,onInteraction}:{block:RichBlock;onInteraction:Props["onInteraction"]}){
  switch(block.type){
    case "markdown":return <section className="learning-block prose-block"><MessageResponse>{block.content}</MessageResponse></section>;
    case "callout":return <section className={`learning-block callout ${block.tone}`}><span className="block-eyebrow">{block.tone==="key"?"IDEIA-CHAVE":"EM FOCO"}</span><h3>{block.title}</h3><p>{block.body}</p></section>;
    case "diagram":return <BioDiagram block={block}/>;
    case "comparison":return <section className="learning-block"><BlockTitle title={block.title}/><div className="comparison-grid">{block.columns.map((column,i)=><article className="comparison-card" key={i}><div className="comparison-head"><strong>{column.title}</strong><small>{column.subtitle}</small></div>{column.items.map((item,j)=><div className={`comparison-row ${item.emphasis?"emphasis":""}`} key={j}><span>{item.label}</span><b>{item.value}</b></div>)}</article>)}</div></section>;
    case "steps":return <section className="learning-block"><BlockTitle title={block.title}/><div className="steps-list">{block.items.map((item,i)=><div className="step-row" key={i}><span>{i+1}</span><div><strong>{item.title}</strong><p>{item.description}</p></div></div>)}</div></section>;
    case "timeline":return <section className="learning-block"><BlockTitle title={block.title}/><div className="timeline">{block.items.map((item,i)=><div className="timeline-item" key={i}><i/><div><strong>{item.label}</strong><p>{item.description}</p></div></div>)}</div></section>;
    case "table":return <section className="learning-block"><BlockTitle title={block.title}/><div className="table-wrap"><table><thead><tr>{block.columns.map((column,i)=><th key={i}>{column}</th>)}</tr></thead><tbody>{block.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
    case "flashcards":return <Flashcards block={block}/>;
    case "choice":return <section className="learning-block interaction-block"><QuestionLabel/><h3>{block.question}</h3><div className="choice-grid">{block.options.map(option=><button key={option.value} type="button" onClick={()=>onInteraction({id:block.id,value:option.value,label:option.label})}>{option.label}<ArrowRight size={16}/></button>)}</div></section>;
    case "true_false":return <section className="learning-block interaction-block"><QuestionLabel/><h3>{block.statement}</h3><div className="choice-grid two"><button type="button" onClick={()=>onInteraction({id:block.id,value:"true",label:"Verdadeiro"})}>Verdadeiro</button><button type="button" onClick={()=>onInteraction({id:block.id,value:"false",label:"Falso"})}>Falso</button></div></section>;
    case "short_answer":return <ShortAnswer block={block} onInteraction={onInteraction}/>;
    case "case":return <section className="learning-block case-card"><span className="block-eyebrow">CASO PARA RACIOCINAR</span><h3>{block.title}</h3><p>{block.scenario}</p>{block.question&&<strong className="case-question">{block.question}</strong>}</section>;
    case "sequence":return <Sequence block={block} onInteraction={onInteraction}/>;
    case "progress":return <section className="learning-block"><BlockTitle title={block.title}/><div className="progress-list">{block.items.map((item,i)=><div className="progress-item" key={i}><div><span>{item.label}</span><b>{Math.round(item.value)}%</b></div><div className="progress-track"><i style={{width:`${item.value}%`}}/></div></div>)}</div></section>;
    case "sources":return <section className="learning-block sources-block"><span className="block-eyebrow">FONTES CONSULTADAS</span>{block.items.map((source,i)=><a key={i} href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.title}</strong><small>{source.domain}</small></span><ExternalLink size={16}/></a>)}</section>;
    case "suggestions":return <div className="suggestion-row">{block.items.map((item,i)=><button key={i} type="button" onClick={()=>onInteraction({id:`suggestion-${i}`,value:item.value,label:item.label})}>{item.label}</button>)}</div>;
  }
}

function BlockTitle({title}:{title:string}){return <div className="block-title"><Sparkles size={17}/><h3>{title}</h3></div>}
function QuestionLabel(){return <span className="block-eyebrow"><Check size={13}/> SUA VEZ</span>}

function Flashcards({block}:{block:Extract<RichBlock,{type:"flashcards"}>}){
  const [open,setOpen]=useState<number|null>(null);
  return <section className="learning-block"><BlockTitle title={block.title}/><div className="flash-grid">{block.cards.map((card,i)=><button type="button" className={`flash-card ${open===i?"open":""}`} key={i} onClick={()=>setOpen(open===i?null:i)}><span>{open===i?card.back:card.front}</span><small>{open===i?"Clique para voltar":"Clique para revelar"}</small></button>)}</div></section>;
}

function ShortAnswer({block,onInteraction}:{block:Extract<RichBlock,{type:"short_answer"}>;onInteraction:Props["onInteraction"]}){
  const [value,setValue]=useState("");
  return <section className="learning-block interaction-block"><QuestionLabel/><h3>{block.question}</h3><form onSubmit={event=>{event.preventDefault();const text=value.trim();if(text){onInteraction({id:block.id,value:text,label:text});setValue("")}}}><textarea value={value} onChange={e=>setValue(e.target.value)} placeholder={block.placeholder||"Explique com suas palavras..."} rows={3}/><button className="small-primary" type="submit" disabled={!value.trim()}>Responder</button></form></section>;
}

function Sequence({block,onInteraction}:{block:Extract<RichBlock,{type:"sequence"}>;onInteraction:Props["onInteraction"]}){
  const [order,setOrder]=useState<string[]>([]);
  const lookup=useMemo(()=>new Map(block.items.map(item=>[item.value,item.label])),[block.items]);
  const remaining=block.items.filter(item=>!order.includes(item.value));
  return <section className="learning-block interaction-block"><QuestionLabel/><h3>{block.instruction}</h3><div className="sequence-picked">{order.map((value,i)=><span key={value}><b>{i+1}</b>{lookup.get(value)}</span>)}</div><div className="choice-grid">{remaining.map(item=><button key={item.value} type="button" onClick={()=>setOrder([...order,item.value])}>{item.label}</button>)}</div><div className="sequence-actions"><button type="button" className="ghost-button" onClick={()=>setOrder([])} disabled={!order.length}><RotateCcw size={15}/>Recomeçar</button><button type="button" className="small-primary" disabled={order.length!==block.items.length} onClick={()=>onInteraction({id:block.id,value:order,label:order.map(value=>lookup.get(value)).join(" → ")})}>Enviar ordem</button></div></section>;
}

function BioDiagram({block}:{block:Extract<RichBlock,{type:"diagram"}>}){
  const width=820,height=Math.max(260,160+Math.ceil(block.nodes.length/4)*140);
  const cols=Math.min(4,block.nodes.length);
  const positions=new Map(block.nodes.map((node,index)=>{
    const row=Math.floor(index/cols),col=index%cols;
    const inRow=Math.min(cols,block.nodes.length-row*cols);
    const x=(col+1)*(width/(inRow+1)),y=90+row*135;
    return[node.id,{x,y}] as const;
  }));
  return <section className="learning-block diagram-block"><BlockTitle title={block.title}/><div className="diagram-scroll"><svg role="img" aria-label={block.title} viewBox={`0 0 ${width} ${height}`}>
    <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto"><polygon points="0 0, 8 3.5, 0 7"/></marker></defs>
    {block.edges.map((edge,i)=>{const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b)return null;const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;return <g key={i}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} markerEnd="url(#arrow)"/>{edge.label&&<text x={mx} y={my-9} textAnchor="middle">{edge.label}</text>}</g>})}
    {block.nodes.map(node=>{const p=positions.get(node.id)!;return <g key={node.id}><rect x={p.x-78} y={p.y-30} width="156" height="60" rx="22"/><text x={p.x} y={p.y+5} textAnchor="middle">{node.label}</text></g>})}
  </svg></div>{block.caption&&<p className="diagram-caption">{block.caption}</p>}</section>;
}
