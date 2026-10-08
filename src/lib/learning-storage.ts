import { initialState } from "./content";
import { stateSchema, type LearningState } from "./learning";

export const STORAGE_KEY = "deutsch-journey-v2";
export const OWNER_KEY = `${STORAGE_KEY}:owner`;
export type LearningSnapshot = {
  data: LearningState;
  storageError: string | null;
  owner: string | null;
};
type BrowserStorage = Pick<Storage, "getItem" | "setItem">;
export function learningStorageKey(owner: string | null) {
  return `${STORAGE_KEY}:${owner ? `account:${encodeURIComponent(owner)}` : "guest"}`;
}
const unreadable =
  "Your saved data could not be read. The original is preserved. Export this session before leaving, or import a valid backup.";
const unsaved =
  "This browser could not save your progress. Export a backup before closing this tab.";

// Local scope selection follows a verified session; it does not authorize cloud access.
export class LearningStorage {
  current: LearningSnapshot;
  private memory = new Map<string | null, LearningSnapshot>();
  constructor(
    private storage: BrowserStorage,
    legacy: () => LearningState,
  ) {
    let owner: string | null = null;
    let data = initialState();
    let storageError: string | null = null;
    try {
      const tag = storage.getItem(OWNER_KEY);
      owner = tag || null;
      // A failed mirror write must not associate another user's data with a scope.
      const saved = storage.getItem(
        tag === null ? STORAGE_KEY : learningStorageKey(owner),
      );
      data = saved
        ? stateSchema.parse(JSON.parse(saved))
        : tag === null
          ? legacy()
          : initialState();
      if (!saved) storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      storageError = unreadable;
    }
    this.current = { owner, data, storageError };
  }
  write(data: LearningState, replaceCorrupt = false) {
    let storageError = this.current.storageError;
    try {
      if (storageError && !replaceCorrupt) throw new Error("Preserve original");
      const raw = JSON.stringify(data);
      this.storage.setItem(learningStorageKey(this.current.owner), raw);
      this.storage.setItem(OWNER_KEY, this.current.owner ?? "");
      this.storage.setItem(STORAGE_KEY, raw);
      storageError = null;
    } catch {
      storageError ||= unsaved;
    }
    this.current = { ...this.current, data, storageError };
    this.memory.set(this.current.owner, this.current);
  }
  activate(user: { id: string; name: string } | null) {
    const owner = user?.id ?? null;
    if (this.current.owner === owner) return false;
    this.memory.set(this.current.owner, this.current);
    let data = initialState();
    data.theme = this.current.data.theme;
    let storageError: string | null = null;
    let inheritedGuest = false;
    try {
      const memory = this.memory.get(owner);
      const raw = memory?.storageError
        ? null
        : this.storage.getItem(learningStorageKey(owner));
      if (memory?.storageError) {
        data = memory.data;
        storageError = memory.storageError;
      } else if (raw) {
        data = stateSchema.parse(JSON.parse(raw));
      } else if (user && this.current.owner === null) {
        // Move this browser's guest journey to its first learning account.
        data = this.current.data;
        inheritedGuest = true;
      }
      if (user && !raw && (!data.onboardingComplete || data.name === "Guest")) {
        data = { ...data, name: user.name.trim().slice(0, 60) || "Learner" };
      }
      if (user) data = { ...data, onboardingComplete: true };
    } catch {
      storageError = unreadable;
    }
    this.current = { owner, data, storageError };
    this.write(data);
    if (inheritedGuest && !this.current.storageError) {
      const guest = initialState();
      guest.theme = data.theme;
      // The guest view starts fresh after transfer; account work stays in its scope.
      let guestError: string | null = null;
      try {
        this.storage.setItem(learningStorageKey(null), JSON.stringify(guest));
      } catch {
        guestError = unsaved;
      }
      this.memory.set(null, {
        owner: null,
        data: guest,
        storageError: guestError,
      });
    }
    return true;
  }
  receive(key: string | null, raw: string | null) {
    if (!raw) return false;
    try {
      const matchingMirror =
        key === STORAGE_KEY &&
        (this.storage.getItem(OWNER_KEY) || null) === this.current.owner;
      if (key !== learningStorageKey(this.current.owner) && !matchingMirror)
        return false;
      this.current = {
        ...this.current,
        data: stateSchema.parse(JSON.parse(raw)),
        storageError: null,
      };
      this.memory.set(this.current.owner, this.current);
      return true;
    } catch {
      return false;
    }
  }
}
