import "server-only";
import { getDb } from "@/db";
import release from "../../../content/library-release.json";
import { LibraryRepository } from "./repository";
export function libraryRepository() {
  return new LibraryRepository((query) => getDb().execute(query), release);
}
