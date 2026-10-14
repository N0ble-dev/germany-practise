"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import Book02Icon from "@hugeicons/core-free-icons/Book02Icon";
import Note01Icon from "@hugeicons/core-free-icons/Note01Icon";
import Cards01Icon from "@hugeicons/core-free-icons/Cards01Icon";
import HeadphonesIcon from "@hugeicons/core-free-icons/HeadphonesIcon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import ChartHistogramIcon from "@hugeicons/core-free-icons/ChartHistogramIcon";
import { useApp } from "./learning-app";

const GlassIcons = dynamic(() => import("./GlassIcons"));

const shortcuts = [
  {
    icon: Book02Icon,
    color: "purple",
    label: "My journey",
    href: "/lessons",
  },
  { icon: Note01Icon, color: "blue", label: "Words", href: "/vocabulary" },
  { icon: Cards01Icon, color: "red", label: "Review", href: "/review" },
  {
    icon: HeadphonesIcon,
    color: "indigo",
    label: "Listen",
    href: "/listening",
  },
  {
    icon: Calendar03Icon,
    color: "orange",
    label: "Calendar",
    href: "/planner",
  },
  {
    icon: ChartHistogramIcon,
    color: "green",
    label: "Progress",
    href: "/progress",
  },
];

const layouts = {
  compact: { size: 48, gap: 22, columns: 3 },
  mobile: { size: 56, gap: 32, columns: 3 },
  roomy: { size: 64, gap: 44, columns: 3 },
  desktop: { size: 72, gap: 44, columns: 6 },
  wide: { size: 82, gap: 66, columns: 6 },
};

export function StudyShortcuts() {
  const { state } = useApp();
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<keyof typeof layouts>("compact");

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setLayout(
        width >= 900
          ? "wide"
          : width >= 700
            ? "desktop"
            : width >= 340
              ? "roomy"
              : width >= 250
                ? "mobile"
                : "compact",
      );
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  function navigate(event: MouseEvent<HTMLElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    router.push(href);
  }

  return (
    <section
      className="study-shortcuts"
      aria-labelledby="study-shortcuts-title"
    >
      <div className="study-shortcuts-heading">
        <h2 id="study-shortcuts-title">Your study desk</h2>
        <p>Pick a small step for today.</p>
      </div>
      <nav aria-label="Study shortcuts">
        <div
          className="study-shortcuts-stage"
          ref={stageRef}
          data-layout={layout}
        >
          <GlassIcons
            items={shortcuts.map(({ icon, ...item }) => ({
              ...item,
              id: item.href,
              icon: <HugeiconsIcon icon={icon} strokeWidth={1.8} />,
              onClick: (event) => navigate(event, item.href),
            }))}
            {...layouts[layout]}
            roundness={0.6}
            refraction={0.8}
            bevel={0.6}
            dispersion={0}
            frost={0.2}
            shine={0.85}
            tint="#dfdfdf"
            tintOpacity={0.2}
            iconColor="#ffffff"
            plate="tilt"
            tilt={30}
            spread={0.5}
            hover="press"
            parallax={1}
            labels="always"
            intro={true}
            theme={state.theme}
            style={{ "--glass-icons-label": "var(--text)" } as CSSProperties}
          />
        </div>
      </nav>
    </section>
  );
}
