import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {generateStructuredTutorTurn,NVIDIA_MODEL} from "../lib/ai/nvidia";

const validTurn={
  schemaVersion:1,
  message:"Vamos estudar fibras.",
  blocks:[],
  learning:{mode:"teach",currentGoal:"fibras",nextGoal:"vias-ascendentes",progress:10,objectives:[],mastered:[],struggling:[],misconceptions:[]},
  conversation:{suggestedTitle:"Fibras",memorySummary:"",shouldSummarize:false}
};

describe("NVIDIA provider low-latency policy",()=>{
  beforeEach(()=>{
    process.env.NVIDIA_API_KEY="test-key";
    process.env.BIOMED_AI_MODEL=NVIDIA_MODEL;
  });
  afterEach(()=>vi.unstubAllGlobals());

  it("uses one compact request with a strict latency budget",async()=>{
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
      expect((init?.signal as AbortSignal).aborted).toBe(false);
      return new Response(JSON.stringify({
        choices:[{message:{content:JSON.stringify(validTurn)},finish_reason:"stop"}],
        usage:{prompt_tokens:500,completion_tokens:120}
      }),{status:200,headers:{"Content-Type":"application/json"}});
    });
    vi.stubGlobal("fetch",fetchMock);

    const result=await generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[{role:"user",content:"Explique fibras C"}]
    });

    expect(result.turn.message).toBe("Vamos estudar fibras.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [,init]=fetchMock.mock.calls[0]!;
    const body=JSON.parse(String(init?.body));
    expect(body.max_tokens).toBeLessThanOrEqual(700);
    expect(body.chat_template_kwargs).toEqual({enable_thinking:false});
    expect(body.response_format).toEqual({type:"json_object"});
  });

  it("does not chain a second provider call after timeout",async()=>{
    const fetchMock=vi.fn().mockRejectedValue(new DOMException("The operation was aborted due to timeout","TimeoutError"));
    vi.stubGlobal("fetch",fetchMock);

    await expect(generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[{role:"user",content:"oi"}]
    })).rejects.toThrow(/timeout|aborted/i);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
