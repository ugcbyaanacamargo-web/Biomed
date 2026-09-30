"use client";
// Adapted from the official AI Elements Message component (vercel/chatbot).
import type {UIMessage} from "ai";
import type {HTMLAttributes} from "react";
import {memo} from "react";
import {Streamdown} from "streamdown";
import {cn} from "@/lib/utils";

export type MessageProps=HTMLAttributes<HTMLDivElement>&{from:UIMessage["role"]};
export function Message({className,from,...props}:MessageProps){
  return <div className={cn("ai-message",from==="user"?"ai-message-user":"ai-message-assistant",className)} {...props}/>;
}

export type MessageContentProps=HTMLAttributes<HTMLDivElement>;
export function MessageContent({className,...props}:MessageContentProps){
  return <div className={cn("ai-message-content",className)} {...props}/>;
}

export const MessageResponse=memo(function MessageResponse({children,className}:{children:string;className?:string}){
  return <Streamdown className={cn("ai-message-markdown",className)}>{children}</Streamdown>;
});
