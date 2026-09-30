"use client";
// Adapted from the official AI Elements Conversation component (vercel/chatbot).
import type {ComponentProps} from "react";
import {ArrowDown} from "lucide-react";
import {StickToBottom,useStickToBottomContext} from "use-stick-to-bottom";
import {cn} from "@/lib/utils";

export type ConversationProps=ComponentProps<typeof StickToBottom>;
export function Conversation({className,...props}:ConversationProps){
  return <StickToBottom className={cn("ai-conversation",className)} initial="smooth" resize="smooth" role="log" {...props}/>;
}

export type ConversationContentProps=ComponentProps<typeof StickToBottom.Content>;
export function ConversationContent({className,...props}:ConversationContentProps){
  return <StickToBottom.Content className={cn("ai-conversation-content",className)} {...props}/>;
}

export function ConversationScrollButton(){
  const {isAtBottom,scrollToBottom}=useStickToBottomContext();
  if(isAtBottom)return null;
  return <button type="button" className="scroll-bottom" onClick={()=>void scrollToBottom()} aria-label="Ir para a mensagem mais recente"><ArrowDown size={18}/></button>;
}
