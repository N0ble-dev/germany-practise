import "server-only";
import starter from "../../../content/exams/goethe-a1-sd1-adult/starter-01.v1.json";
import { examPackSchema } from "./model";
export const examStarter = examPackSchema.parse(starter);
