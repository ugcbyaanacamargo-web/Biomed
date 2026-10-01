import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {generateStructuredTutorTurn,NVIDIA_MODEL} from "../lib/ai/nvidia";

const validTurn={
  schemaVersion:1,
  message:"Vamos estudar fibras.",
  blocks:[],
  learning:{
    mode:"teach",currentGoal:"fibras",nextGoal:"vias-ascendentes",progress:10,
    objectives:[],mastered:[],struggling:[],misconceptions:[]
  },
  conversation:{suggestedTitle:"Fibras",memorySummary:"",shouldSummarize:false}
};

describe("NVIDIA provider",()=>{
  beforeEach(()=>{
    process.env.NVIDIA_API_KEY="test-key";
    process.env.BIOMED_AI_MODEL=NVIDIA_MODEL;
  });
  afterEach(()=>vi.unstubAllGlobals());

  it("uses compact JSON mode and keeps the normal output budget small",async()=>{
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
      return new Response(JSON.stringify({
        choices:[{message:{content:JSON.stringify(validTurn)},finish_reason:"stop"}],
        usage:{prompt_tokens:120,completion_tokens:90}
      }),{status:200,headers:{"Content-Type":"application/json"}});
    });
    vi.stubGlobal("fetch",fetchMock);

    await generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[{role:"user",content:"Explique fibras C"}]
    });

    const [,init]=fetchMock.mock.calls[0]!;
    const body=JSON.parse(String(init?.body));
    expect(body.model).toBe(NVIDIA_MODEL);
    expect(body.response_format).toEqual({type:"json_object"});
    expect(body.chat_template_kwargs).toEqual({enable_thinking:false});
    expect(body.stream).toBe(false);
    expect(body.max_tokens).toBeLessThanOrEqual(1200);
  });

  it("retries once with a smaller budget after a provider timeout",async()=>{
    const fetchMock=vi.fn()
      .mockRejectedValueOnce(new DOMException("The operation was aborted due to timeout","TimeoutError"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices:[{message:{content:JSON.stringify(validTurn)},finish_reason:"stop"}],
        usage:{prompt_tokens:90,completion_tokens:60}
      }),{status:200,headers:{"Content-Type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);

    const result=await generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[{role:"user",content:"Explique fibras C"}]
    });

    expect(result.turn.message).toBe("Vamos estudar fibras.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody=JSON.parse(String(fetchMock.mock.calls[1]![1]?.body));
    expect(secondBody.max_tokens).toBeLessThanOrEqual(700);
  });
});
