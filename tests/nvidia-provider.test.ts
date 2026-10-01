import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {generateStructuredTutorTurn,NVIDIA_MODEL} from "../lib/ai/nvidia";

const validTurn={
  schemaVersion:1,
  message:"Vamos estudar fibras.",
  blocks:[],
  learning:{mode:"teach",currentGoal:"fibras",nextGoal:"vias-ascendentes",progress:10,objectives:[],mastered:[],struggling:[],misconceptions:[]},
  conversation:{suggestedTitle:"Fibras",memorySummary:"",shouldSummarize:false}
};

describe("NVIDIA DiffusionGemma provider",()=>{
  beforeEach(()=>{
    process.env.NVIDIA_API_KEY="test-key";
    process.env.BIOMED_AI_MODEL="nvidia/nemotron-3.5-lightning-30b-a3b";
  });
  afterEach(()=>vi.unstubAllGlobals());

  it("uses DiffusionGemma regardless of the stale BIOMED_AI_MODEL env",async()=>{
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
      return new Response(JSON.stringify({
        choices:[{message:{content:JSON.stringify(validTurn)},finish_reason:"stop"}],
        usage:{prompt_tokens:300,completion_tokens:100}
      }),{status:200,headers:{"Content-Type":"application/json"}});
    });
    vi.stubGlobal("fetch",fetchMock);

    const result=await generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[{role:"user",content:"Explique fibras C"}]
    });

    expect(result.turn.message).toBe("Vamos estudar fibras.");
    expect(NVIDIA_MODEL).toBe("google/diffusiongemma-26b-a4b-it");
    const [,init]=fetchMock.mock.calls[0]!;
    const body=JSON.parse(String(init?.body));
    expect(body.model).toBe("google/diffusiongemma-26b-a4b-it");
    expect(body.chat_template_kwargs).toEqual({enable_thinking:false});
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.name).toBe("biomed_tutor_turn");
    expect(body.response_format.json_schema.schema.type).toBe("object");
    expect(JSON.stringify(body.response_format.json_schema.schema)).not.toContain('"format"');
    expect(body.max_tokens).toBeLessThanOrEqual(650);
  });

  it("accepts a valid JSON object wrapped by model text or markdown fences",async()=>{
    const wrapped=`<|channel|>final\n\`\`\`json\n${JSON.stringify(validTurn)}\n\`\`\``;
    const fetchMock=vi.fn(async()=>new Response(JSON.stringify({
      choices:[{message:{content:wrapped},finish_reason:"stop"}],
      usage:{prompt_tokens:100,completion_tokens:80}
    }),{status:200,headers:{"Content-Type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);

    const result=await generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[{role:"user",content:"oi"}]
    });

    expect(result.turn.message).toBe("Vamos estudar fibras.");
  });

  it("keeps the conversational message when optional structured fields are invalid",async()=>{
    const malformed={
      schemaVersion:1,
      message:"Sim. Vamos seguir pela via espinotalâmica.",
      blocks:[{type:"unknown_block",content:"ignorar"}],
      learning:{mode:"conversation",progress:999},
      conversation:{suggestedTitle:"",memorySummary:42,shouldSummarize:"no"}
    };
    const fetchMock=vi.fn(async()=>new Response(JSON.stringify({
      choices:[{message:{content:JSON.stringify(malformed)},finish_reason:"stop"}],
      usage:{prompt_tokens:120,completion_tokens:60}
    }),{status:200,headers:{"Content-Type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);

    const result=await generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[
        {role:"assistant",content:"Você sabe que existem diferentes tipos de fibras nervosas para isso?"},
        {role:"user",content:"sim"}
      ]
    });

    expect(result.turn.message).toBe("Sim. Vamos seguir pela via espinotalâmica.");
    expect(result.turn.blocks).toEqual([]);
    expect(result.turn.learning.mode).toBe("teach");
    expect(result.turn.learning.progress).toBe(0);
    expect(result.turn.conversation.suggestedTitle).toBe("Estudo BIOMED");
  });

  it("uses only one provider call on timeout",async()=>{
    const fetchMock=vi.fn().mockRejectedValue(new DOMException("The operation was aborted due to timeout","TimeoutError"));
    vi.stubGlobal("fetch",fetchMock);

    await expect(generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[{role:"user",content:"oi"}]
    })).rejects.toThrow(/timeout|aborted/i);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
