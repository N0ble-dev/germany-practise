import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { intakeConnection } from "./branch";
import { IntakeRepository } from "./repository";
export function intakeRepository() {
  const db = drizzle(neon(intakeConnection()));
  return new IntakeRepository((query) => db.execute(query));
}
