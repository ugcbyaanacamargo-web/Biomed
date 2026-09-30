import {describe,expect,it} from "vitest";
import {replayStoredTurn} from "../lib/ai/stored-turn";

describe("replayStoredTurn",()=>{
  it("reuses the persisted assistant reply without another generation",()=>{
    const replay=replayStoredTurn({
      conversation:{
        title:"Fibras sensoriais",
        memorySummary:"Aluno está comparando fibras.",
        studyState:{
          overall:42,
          mode:"practice",
          currentGoal:"comparar fibras",
          nextGoal:"relacionar mielina",
          objectives:[],
          mastered:["receptores"],
          struggling:["fibras"],
          misconceptions:[]
        }
      },
      messages:[
        {id:"u1",role:"user",content:"Qual é mais lenta?"},
        {
          id:"a1",
          role:"assistant",
          content:"A fibra C é mais lenta.",
          replyToClientMessageId:"11111111-1111-4111-8111-111111111111",
          ui:{schemaVersion:1,blocks:[{type:"markdown",content:"A fibra C é mais lenta."}]},
          metadata:{traceId:"trace-original"}
        }
      ]
    },"11111111-1111-4111-8111-111111111111");

    expect(replay?.replayed).toBe(true);
    expect(replay?.turn.message).toBe("A fibra C é mais lenta.");
    expect(replay?.turn.learning.progress).toBe(42);
    expect(replay?.traceId).toBe("trace-original");
    expect(replay?.stored.duplicate).toBe(true);
  });

  it("returns null when the original assistant reply was never completed",()=>{
    const replay=replayStoredTurn({
      conversation:{title:"Nova conversa",studyState:{}},
      messages:[{id:"u1",role:"user",content:"Explique dor"}]
    },"22222222-2222-4222-8222-222222222222");

    expect(replay).toBeNull();
  });
});
