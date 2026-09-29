import test from "node:test";
import assert from "node:assert/strict";
import {MODULES,LESSONS,moduleProgress,overallProgress,recommendedNext} from "../data/course-model.js";

test("course has five ordered modules",()=>{
  assert.deepEqual(MODULES.map(m=>m.id),["perceber","conduzir","processar","modular","aplicar"]);
  assert.equal(MODULES.length,5);
  assert.ok(LESSONS.length>=15);
});

test("progress and recommendation work",()=>{
  const done=MODULES[0].lessons.map(l=>l.id);
  assert.equal(moduleProgress("perceber",done),100);
  assert.ok(overallProgress(done)>0);
  assert.equal(recommendedNext({completedLessons:done,currentLesson:"perceber-3"}).moduleId,"conduzir");
});
