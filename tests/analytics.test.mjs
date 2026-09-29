import test from "node:test";
import assert from "node:assert/strict";
import {EVENT_NAMES,sanitizeAnalyticsProperties,trackLearningEvent,setAnalyticsClient} from "../analytics.js";

test("analytics exposes required learning events",()=>{
  for(const n of ["student_dashboard_viewed","lesson_completed","exam_completed","tutor_action_rendered"]) assert.equal(EVENT_NAMES.has(n),true);
});

test("analytics strips sensitive identifiers",()=>{
  const x=sanitizeAnalyticsProperties({cpf:"11111111111",label:"ok",note:"123.456.789-09",token:"secret"});
  assert.deepEqual(x,{label:"ok"});
});

test("unknown events are rejected",()=>{
  let sent=0;
  setAnalyticsClient({capture(){sent++}});
  assert.equal(trackLearningEvent("not_allowed",{}),false);
  assert.equal(sent,0);
});
