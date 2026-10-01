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

  it("calls the NVIDIA endpoint with Nemotron, JSON mode and thinking disabled",async()=>{
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
      return new Response(JSON.stringify({
        choices:[{message:{content:JSON.stringify(validTurn)},finish_reason:"stop"}],
        usage:{prompt_tokens:120,completion_tokens:90}
      }),{status:200,headers:{"Content-Type":"application/json"}});
    });
    vi.stubGlobal("fetch",fetchMock);

    const result=await generateStructuredTutorTurn({
      student:{level:"bronze",learningScore:0},
      messages:[{role:"user",content:"Explique fibras C"}]
    });

    expect(result.turn.message).toBe("Vamos estudar fibras.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url,init]=fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    const body=JSON.parse(String(init?.body));
    expect(body.model).toBe(NVIDIA_MODEL);
    expect(body.response_format).toEqual({type:"json_object"});
    expect(body.chat_template_kwargs).toEqual({enable_thinking:false});
    expect(body.stream).toBe(false);
  });
});
