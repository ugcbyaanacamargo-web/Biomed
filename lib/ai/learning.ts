import {CURRICULUM_IDS} from "./curriculum";
import type {LearningUpdate,RichTutorTurn} from "./tutor-schema";

export function sanitizeLearning(update:LearningUpdate):LearningUpdate{
  const valid=(items:string[])=>[...new Set(items.filter(id=>CURRICULUM_IDS.has(id as never)))].slice(0,24);
  return{
    ...update,
    objectives:update.objectives.filter(item=>CURRICULUM_IDS.has(item.id as never)).slice(0,10),
    mastered:valid(update.mastered),
    struggling:valid(update.struggling),
    misconceptions:update.misconceptions.slice(0,12)
  };
}

export function sanitizeTurn(turn:RichTutorTurn):RichTutorTurn{
  return{...turn,learning:sanitizeLearning(turn.learning)};
}
