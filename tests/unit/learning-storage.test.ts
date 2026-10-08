import { expect, it } from "vitest";
import { initialState } from "../../src/lib/content";
import {
  LearningStorage,
  learningStorageKey,
  OWNER_KEY,
  STORAGE_KEY,
} from "../../src/lib/learning-storage";

function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
const alice = { id: "alice", name: "Alice" },
  bob = { id: "bob", name: "Bob" };
it("moves existing guest/legacy learning into an account and shows a fresh guest after logout", () => {
  const disk = storage();
  const old = initialState();
  old.name = "Nabil Mohamed";
  old.xp = 42;
  old.savedSentences = ["Ich lerne jeden Tag."];
  disk.setItem(STORAGE_KEY, JSON.stringify(old));
  const repository = new LearningStorage(disk, initialState);
  repository.activate(alice);
  expect(repository.current.data.savedSentences).toEqual(old.savedSentences);
  expect(repository.current.owner).toBe(alice.id);
  repository.activate(null);
  expect(repository.current.data.name).toBe("Guest");
  expect(repository.current.data.xp).toBe(0);
  expect(repository.current.data.savedSentences).toEqual([]);
  expect(JSON.parse(disk.getItem(learningStorageKey(alice.id))!).xp).toBe(42);
});
it("restores each account after logout, reload, expiry and account switching without sharing records", () => {
  const disk = storage();
  const repository = new LearningStorage(disk, initialState);
  repository.activate(alice);
  repository.write({
    ...repository.current.data,
    savedSentences: ["Only Alice"],
    xp: 123,
  });
  repository.activate(bob);
  expect(repository.current.data.name).toBe("Bob");
  expect(repository.current.data.savedSentences).toEqual([]);
  repository.write({
    ...repository.current.data,
    savedSentences: ["Only Bob"],
  });
  repository.activate(null);
  const reloaded = new LearningStorage(disk, initialState);
  expect(reloaded.current.owner).toBeNull();
  expect(reloaded.current.data.savedSentences).toEqual([]);
  reloaded.activate(alice);
  expect(reloaded.current.data.savedSentences).toEqual(["Only Alice"]);
  expect(reloaded.current.data.xp).toBe(123);
  reloaded.activate(bob);
  expect(reloaded.current.data.savedSentences).toEqual(["Only Bob"]);
});
it("only receives storage changes for the active scope", () => {
  const disk = storage();
  const repository = new LearningStorage(disk, initialState);
  repository.activate(alice);
  const other = {
    ...initialState(),
    name: "Bob",
    savedSentences: ["Private Bob"],
  };
  disk.setItem(OWNER_KEY, bob.id);
  expect(repository.receive(STORAGE_KEY, JSON.stringify(other))).toBe(false);
  expect(
    repository.receive(learningStorageKey(bob.id), JSON.stringify(other)),
  ).toBe(false);
  expect(repository.current.data.name).toBe("Alice");
  expect(
    repository.receive(
      learningStorageKey(alice.id),
      JSON.stringify({ ...repository.current.data, xp: 15 }),
    ),
  ).toBe(true);
  expect(repository.current.data.xp).toBe(15);
});
it("preserves corrupted originals until an explicit import replaces them", () => {
  const disk = storage();
  disk.setItem(STORAGE_KEY, "broken");
  const repository = new LearningStorage(disk, initialState);
  repository.write({ ...repository.current.data, xp: 1 });
  expect(disk.getItem(STORAGE_KEY)).toBe("broken");
  expect(repository.current.storageError).toContain("original is preserved");
  repository.write(initialState(), true);
  expect(repository.current.storageError).toBeNull();
});
it("a partially failed active mirror never shows account records to a guest on reload", () => {
  const disk = storage();
  const repository = new LearningStorage(disk, initialState);
  repository.activate(alice);
  repository.write({
    ...repository.current.data,
    name: "Alice",
    savedSentences: ["Private Alice"],
  });
  const failing = {
    getItem: disk.getItem,
    setItem: (key: string, value: string) => {
      if (key === STORAGE_KEY) throw new Error("quota");
      disk.setItem(key, value);
    },
  };
  const next = new LearningStorage(failing, initialState);
  next.activate(null);
  expect(disk.getItem(OWNER_KEY)).toBe("");
  expect(JSON.parse(disk.getItem(STORAGE_KEY)!).savedSentences).toEqual([
    "Private Alice",
  ]);
  const reloaded = new LearningStorage(disk, initialState);
  expect(reloaded.current.data.savedSentences).toEqual([]);
  expect(reloaded.current.data.name).toBe("Guest");
});
it("keeps a usable in-memory journey when storage is blocked", () => {
  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  const repository = new LearningStorage(blocked, initialState);
  repository.activate(alice);
  repository.write({
    ...repository.current.data,
    savedSentences: ["Offline learning"],
  });
  repository.activate(null);
  expect(repository.current.data.savedSentences).toEqual([]);
  repository.activate(alice);
  expect(repository.current.data.savedSentences).toEqual(["Offline learning"]);
});
