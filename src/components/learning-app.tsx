"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  Layers,
  Headphones,
  Mic,
  PencilLine,
  Puzzle,
  MapPin,
  ChartNoAxesCombined,
  Settings,
  Search,
  Flame,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  Check,
  CircleHelp,
  Compass,
  CalendarDays,
  Users,
  GraduationCap,
  Globe2,
} from "lucide-react";
import { useLearning, updateState, activateLearningAccount } from "@/lib/store";
import { authClient } from "@/lib/auth-client";
import { dueWords, streak, type LearningState } from "@/lib/learning";
import { lessons } from "@/lib/content";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { AccountEntry } from "./account-entry";
import { BrandMark } from "./brand-mark";
import { CreatorCredit } from "./creator-credit";
export type LearningIdentity = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};
const AppContext = createContext<{
  state: LearningState;
  notify: (message: string) => void;
  cloudEnabled: boolean;
  identity: LearningIdentity | null;
  displayName: string;
} | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Learning context unavailable");
  return value;
}
const navigation = [
  {
    title: "Your workspace",
    items: [
      { href: "/", label: "Today", icon: LayoutDashboard },
      { href: "/lessons", label: "My learning path", icon: BookOpen },
      { href: "/courses", label: "Reviewed courses", icon: GraduationCap },
      { href: "/planner", label: "My study calendar", icon: CalendarDays },
      { href: "/vocabulary", label: "Vocabulary", icon: Library },
      { href: "/space", label: "Study together", icon: Users },
      { href: "/community", label: "Sentence gallery", icon: Globe2 },
    ],
  },
  {
    title: "A little practice",
    items: [
      { href: "/review", label: "Flashcards", icon: Layers },
      { href: "/listening", label: "Listening", icon: Headphones },
      { href: "/speaking", label: "Speaking", icon: Mic },
      { href: "/sentences", label: "Sentence lab", icon: PencilLine },
      { href: "/games", label: "Mini games", icon: Puzzle },
      { href: "/exams", label: "Exam Arena", icon: GraduationCap },
    ],
  },
  {
    title: "Make it real",
    items: [
      { href: "/germany", label: "Germany mode", icon: MapPin },
      { href: "/inspiration", label: "My Germany dream", icon: Compass },
      { href: "/progress", label: "My progress", icon: ChartNoAxesCombined },
    ],
  },
];
const titles: Record<string, string> = {
  "/": "Your German, every day",
  "/lessons": "My learning path",
  "/planner": "My study calendar",
  "/vocabulary": "My vocabulary",
  "/review": "Flashcard practice",
  "/listening": "Listening practice",
  "/speaking": "Speaking practice",
  "/sentences": "Sentence lab",
  "/grammar": "Grammar made simple",
  "/games": "A little playful practice",
  "/germany": "German for real life",
  "/inspiration": "My Germany dream",
  "/progress": "Look how far you’ve come",
  "/profile": "Your learning preferences",
  "/space": "Your shared study space",
  "/exams": "Prepare for your next step",
  "/signup": "Your German journey starts here",
  "/signin": "Welcome back",
};
function subscribeMobile(listener: () => void) {
  const query = window.matchMedia("(max-width: 760px)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const getMobileSnapshot = () => window.matchMedia("(max-width: 760px)").matches;
const getServerMobileSnapshot = () => false;
export function LearningApp({
  children,
  cloudEnabled,
}: {
  children: ReactNode;
  cloudEnabled: boolean;
}) {
  const pathname = usePathname();
  if (
    pathname.startsWith("/share/") ||
    pathname.startsWith("/admin/content") ||
    pathname.startsWith("/courses") ||
    pathname === "/exams/resources" ||
    pathname.startsWith("/admin/exams") ||
    pathname === "/community"
  )
    return (
      <div className="public-share-shell">
        <header>
          <Link href="/" className="brand">
            <BrandMark />
            <strong>deutsch journey.</strong>
          </Link>
        </header>
        <main id="main-content">{children}</main>
        <footer>
          <CreatorCredit />
        </footer>
      </div>
    );
  return cloudEnabled ? (
    <ManagedLearningApp>{children}</ManagedLearningApp>
  ) : (
    <LearningWorkspace cloudEnabled={false} identity={null} pending={false}>
      {children}
    </LearningWorkspace>
  );
}
function ManagedLearningApp({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  return (
    <LearningWorkspace
      key={session?.user.id ?? "guest"}
      cloudEnabled
      identity={session?.user ?? null}
      pending={isPending}
    >
      {children}
    </LearningWorkspace>
  );
}
function LearningWorkspace({
  children,
  cloudEnabled,
  identity,
  pending,
}: {
  children: ReactNode;
  cloudEnabled: boolean;
  identity: LearningIdentity | null;
  pending: boolean;
}) {
  const snapshot = useLearning();
  const userId = identity?.id;
  const userName = identity?.name;
  useEffect(() => {
    if (!pending)
      activateLearningAccount(
        userId ? { id: userId, name: userName ?? "Learner" } : null,
      );
  }, [pending, userId, userName]);
  const pathname = usePathname();
  const router = useRouter();
  const mobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const state = snapshot?.data;
  function notify(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4500);
  }
  useEffect(() => {
    if (state) document.documentElement.dataset.theme = state.theme;
  }, [state?.theme, state]);
  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", fn);
    return () => {
      window.removeEventListener("keydown", fn);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!mobile || !menu) return;
    const sidebar = document.getElementById("main-navigation");
    if (!sidebar) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>("a[href],button:not([disabled])"),
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      previousFocus?.focus();
    };
  }, [mobile, menu]);
  if (
    !state ||
    (pending && snapshot?.owner !== null) ||
    snapshot?.owner !== (identity?.id ?? null)
  )
    return (
      <div className="loading-screen">
        <BrandMark />
        <p>Opening your learning journey…</p>
      </div>
    );
  const reviewCount = dueWords(state).length;
  const displayName = identity ? state.name : "Guest";
  return (
    <AppContext.Provider
      key={identity?.id ?? "guest"}
      value={{ state, notify, cloudEnabled, identity, displayName }}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-shell">
        {menu && (
          <button
            className="mobile-scrim"
            aria-label="Close navigation"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setMenu(false)}
          />
        )}
        <aside
          id="main-navigation"
          inert={mobile && !menu}
          className={`sidebar ${menu ? "sidebar-open" : ""}`}
          aria-label="Main navigation"
        >
          <Link href="/" className="brand" onClick={() => setMenu(false)}>
            <BrandMark />
            <div>
              <strong>
                deutsch journey<span className="brand-dot">.</span>
              </strong>
              <small>German for the life you want</small>
            </div>
          </Link>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>

          <nav>
            {navigation.map((group) => (
              <div className="nav-group" key={group.title}>
                <p>{group.title}</p>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)
                        ? "page"
                        : undefined
                    }
                    className={`nav-item ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "active" : ""}`}
                    onClick={() => setMenu(false)}
                  >
                    <item.icon size={19} strokeWidth={1.7} />
                    <span>{item.label}</span>
                    {item.href === "/review" && reviewCount > 0 && (
                      <span className="nav-count">{reviewCount}</span>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <span className="tiny-spark">✦</span>
              <strong>Progress, at your pace.</strong>
              <p>
                Five minutes is a great place to start. You can always come
                back.
              </p>
            </div>
            <Link
              href="/profile"
              className="profile-link"
              onClick={() => setMenu(false)}
            >
              <span className="avatar">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{displayName}</strong>
                <small>
                  {identity
                    ? "Google account · German learner"
                    : "Guest · saved on this device"}
                </small>
              </div>
              <Settings size={18} />
            </Link>
          </div>
        </aside>
        <div className="workspace" inert={mobile && menu}>
          <header className="topbar">
            <div className="topbar-start">
              <Button
                size="icon"
                variant="ghost"
                className="mobile-menu"
                aria-label="Open navigation"
                aria-expanded={menu}
                aria-controls="main-navigation"
                onClick={() => setMenu(true)}
              >
                <Menu />
              </Button>
              <span>
                {pathname.startsWith("/lessons/")
                  ? "Book journey"
                  : (titles[pathname] ?? "Deutsch Journey")}
              </span>
            </div>
            <div className="topbar-actions">
              {cloudEnabled && <AccountEntry />}
              <button
                className="search-trigger"
                aria-label="Find a word or lesson"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={17} />
                <span>Find a word or lesson</span>
                <kbd>Ctrl K</kbd>
              </button>
              <span className="streak-chip">
                <Flame size={18} />
                <strong>{streak(state)}</strong>
                <span>day streak</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Switch to ${state.theme === "light" ? "dark" : "light"} theme`}
                onClick={() =>
                  updateState((s) => ({
                    ...s,
                    theme: s.theme === "light" ? "dark" : "light",
                  }))
                }
              >
                {state.theme === "light" ? (
                  <Moon size={19} />
                ) : (
                  <Sun size={19} />
                )}
              </Button>
            </div>
          </header>
          <main id="main-content" className="main-content" tabIndex={-1}>
            {snapshot.storageError && (
              <div className="notice" role="alert">
                {snapshot.storageError}{" "}
                <Link href="/profile">Manage backups</Link>
              </div>
            )}
            {children}
          </main>
          <footer className="app-footer">
            <CreatorCredit />
            <span className="footer-save-status">
              <span className="status-dot" />{" "}
              {snapshot.storageError
                ? "Export this session to keep it"
                : "Saved on this device"}{" "}
              <Link href="/profile" aria-label="Learning help and preferences">
                <CircleHelp size={15} />
              </Link>
            </span>
          </footer>
        </div>
      </div>
      <div
        className={`toast ${toast ? "toast-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        <Check size={18} />
        {toast}
      </div>
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Find your next step"
        description="Search your vocabulary, examples, notes, and lesson titles."
      >
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Search your learning"
            autoFocus
            placeholder="Try Bahnhof, family, or a memory hint…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <LearningSearch
          state={state}
          query={search}
          onChoose={(href) => {
            setSearchOpen(false);
            router.push(href);
          }}
        />
      </Dialog>
    </AppContext.Provider>
  );
}
function LearningSearch({
  state,
  query,
  onChoose,
}: {
  state: LearningState;
  query: string;
  onChoose: (href: string) => void;
}) {
  const needle = query.toLowerCase().trim();
  const words = state.words
    .filter((w) =>
      `${w.german} ${w.english} ${w.arabic} ${w.example} ${w.hint}`
        .toLowerCase()
        .includes(needle),
    )
    .slice(0, 6);
  const chapters = needle
    ? lessons
        .map((lesson, i) => ({ ...lesson, number: i + 1 }))
        .filter((l) =>
          `${l.title} ${l.translation} ${l.grammar} ${state.lessonNotes[l.number] ?? ""}`
            .toLowerCase()
            .includes(needle),
        )
        .slice(0, 4)
    : [];
  const sentences = needle
    ? state.savedSentences
        .filter((s) => s.toLowerCase().includes(needle))
        .slice(0, 3)
    : [];
  const pages = navigation
    .flatMap((g) => g.items)
    .filter((i) => i.label.toLowerCase().includes(needle))
    .slice(0, 3);
  return (
    <div className="search-results">
      {words.map((w) => (
        <button
          key={w.id}
          onClick={() =>
            onChoose(`/vocabulary?q=${encodeURIComponent(w.german)}`)
          }
        >
          <Library size={17} />
          <span>
            <strong lang="de">
              {w.article} {w.german}
            </strong>
            <small>{w.english}</small>
          </span>
          <ChevronRight size={16} />
        </button>
      ))}
      {chapters.map((l) => (
        <button key={l.number} onClick={() => onChoose(`/lessons/${l.number}`)}>
          <BookOpen size={17} />
          <span>
            <strong lang="de">{l.title}</strong>
            <small>
              Lesson {l.number} · {l.translation}
            </small>
          </span>
          <ChevronRight size={16} />
        </button>
      ))}
      {sentences.map((s) => (
        <button key={s} onClick={() => onChoose("/sentences")}>
          <PencilLine size={17} />
          <span lang="de">{s}</span>
          <ChevronRight size={16} />
        </button>
      ))}
      {pages.map((i) => (
        <button key={i.href} onClick={() => onChoose(i.href)}>
          <i.icon size={17} />
          {i.label}
          <ChevronRight size={16} />
        </button>
      ))}
      {!words.length &&
        !chapters.length &&
        !sentences.length &&
        !pages.length && (
          <p className="muted">
            No matches yet. Try a German word, a translation, or a lesson topic.
          </p>
        )}
    </div>
  );
}
