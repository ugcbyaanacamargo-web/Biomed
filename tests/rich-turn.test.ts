import {describe,expect,it} from "vitest";
import {richTutorTurnSchema} from "../lib/ai/tutor-schema";

describe("richTutorTurnSchema",()=>{
  it("accepts a conversational turn with a semantic diagram and choice",()=>{
    const value=richTutorTurnSchema.parse({
      schemaVersion:1,
      message:"Vamos comparar as fibras.",
      blocks:[
        {type:"diagram",variant:"neural_path",title:"Via sensorial",nodes:[
          {id:"skin",label:"Receptor",kind:"receptor"},
          {id:"cord",label:"Medula",kind:"spinal_cord"}
        ],edges:[{from:"skin",to:"cord",label:"aferência"}]},
        {type:"choice",id:"fiber-speed",question:"Qual é mais lenta?",options:[
          {label:"Aβ",value:"abeta"},{label:"C",value:"c"}
        ]}
      ],
      learning:{
        mode:"teach",currentGoal:"comparar fibras",nextGoal:"relacionar mielina e velocidade",
        progress:35,mastered:["receptores"],struggling:["fibras"],misconceptions:[]
      },
      conversation:{suggestedTitle:"Fibras sensoriais",memorySummary:"Estudando fibras.",shouldSummarize:false}
    });
    expect(value.blocks).toHaveLength(2);
  });

  it("rejects arbitrary HTML/script blocks",()=>{
    expect(()=>richTutorTurnSchema.parse({
      schemaVersion:1,message:"x",blocks:[{type:"html",content:"<script>alert(1)</script>"}],
      learning:{mode:"teach",currentGoal:"x",nextGoal:"x",progress:0,mastered:[],struggling:[],misconceptions:[]},
      conversation:{suggestedTitle:"x",memorySummary:"",shouldSummarize:false}
    })).toThrow();
  });
});
