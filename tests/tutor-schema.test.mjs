import test from "node:test";
import assert from "node:assert/strict";
import {normalizeTutorPlan,containsUnsafeTutorContent,TUTOR_BLOCK_TYPES} from "../tutor-schema.js";

test("visual tutor accepts allow-listed interactive blocks",()=>{
  const plan=normalizeTutorPlan({screen:{title:"Teste"},blocks:[{type:"multiple_choice",question:"Q?",options:["A","B"],answer:1}],nextAction:{type:"wait_for_answer"}});
  assert.equal(plan.blocks[0].type,"multiple_choice");
  assert.equal(plan.blocks[0].answer,1);
});

test("unknown and executable blocks do not survive",()=>{
  const plan=normalizeTutorPlan({blocks:[{type:"html",text:"<script>alert(1)</script>"},{type:"concept",title:"<b>x</b>",text:"ok"}]});
  assert.equal(plan.blocks.length,1);
  assert.equal(plan.blocks[0].type,"concept");
  assert.equal(TUTOR_BLOCK_TYPES.has("html"),false);
  assert.equal(containsUnsafeTutorContent(plan),false);
});
