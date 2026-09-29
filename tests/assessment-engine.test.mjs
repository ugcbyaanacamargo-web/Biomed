import test from "node:test";
import assert from "node:assert/strict";
import {PASS_THRESHOLD,buildExam,gradeExam,bestAndLatest,recoveryMessage} from "../assessment-engine.js";

test("stage exams are ten questions and use 70 pass threshold",()=>{
  assert.equal(PASS_THRESHOLD,70);
  assert.equal(buildExam("conduzir",10,123).length,10);
});

test("grading distinguishes pass and fail",()=>{
  const qs=buildExam("perceber",10,11);
  const pass=gradeExam(qs,qs.map(q=>q.correctIndex));
  assert.equal(pass.score,100);
  assert.equal(pass.passed,true);
  const fail=gradeExam(qs,Array(qs.length).fill(99));
  assert.equal(fail.passed,false);
  assert.ok(recoveryMessage(fail).length>10);
});

test("best and latest attempts are tracked independently",()=>{
  const s=bestAndLatest([{moduleId:"perceber",score:72,passed:true},{moduleId:"perceber",score:91,passed:true}],"perceber");
  assert.equal(s.latest,72);
  assert.equal(s.best,91);
  assert.equal(s.attempts,2);
});
