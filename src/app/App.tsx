import { lazy, Suspense, useEffect, useState } from "react";
import { getStorageScope, setStorageScope, usePersistentState } from "./storage";
import { activateAccountWorkspace } from "./accountSync";
import { DataManagementPanel } from "./DataManagementPanel";
import { motion } from "motion/react";
import { VACCINES } from "./healthData";
import type { Child, Section, VaccineStatus } from "./models";
import { Sidebar } from "./Sidebar";

const LifeMapSection = lazy(() => import("./LifeMapSection").then(module => ({ default: module.LifeMapSection })));
const HealthSection = lazy(() => import("./HealthSection").then(module => ({ default: module.HealthSection })));
const FamilySection = lazy(() => import("./FamilySection").then(module => ({ default: module.FamilySection })));
const CalendarSection = lazy(() => import("./CalendarSection").then(module => ({ default: module.CalendarSection })));
const AnalyticsSection = lazy(() => import("./AnalyticsSection").then(module => ({ default: module.AnalyticsSection })));

function SectionFallback() {
  return <div role="status" aria-live="polite" aria-busy="true" className="p-8 text-sm text-muted-foreground">Загрузка раздела…</div>;
}

export default function App() {
  const [workspaceReady, setWorkspaceReady] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Account service unavailable");
        return response.json() as Promise<{ user: { id: string } | null }>;
      })
      .then(async result => { if (!active) return; if (result.user) await activateAccountWorkspace(result.user.id, getStorageScope() === "guest"); else setStorageScope("guest"); })
      .catch(() => {
        // Retain the last authenticated workspace while offline.
        if (active) setStorageScope(getStorageScope());
      })
      .finally(() => { if (active) setWorkspaceReady(true); });
    return () => { active = false; };
  }, []);
  if (!workspaceReady) return <div role="status" aria-live="polite" aria-busy="true"
    className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
    Проверка локального пространства аккаунта…
  </div>;
  return <AppContent />;
}

function AppContent() {
  const [section, setSection] = useState<Section>("map");
  const [healthInitialTab, setHealthInitialTab] = useState<"roadmap" | "history">("roadmap");
  const [visitedSections, setVisitedSections] = useState<Set<Section>>(() => new Set(["map"]));
  const [children, , childrenReady, childrenError] = usePersistentState<Child[]>("children", []);
  const [vaccineStatuses, setVaccineStatuses, storageReady, storageError] = usePersistentState<Record<string, VaccineStatus>>(
    "vaccineStatuses",
    Object.fromEntries(VACCINES.map(v => [v.id, v.status]))
  );

  function navigateTo(nextSection: Section) {
    setVisitedSections(previous => previous.has(nextSection) ? previous : new Set(previous).add(nextSection));
    setSection(nextSection);
  }

  if (!storageReady || !childrenReady) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        Подключение локальной базы данных…
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col sm:flex-row bg-background overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-lg focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Перейти к основному содержимому
      </a>
      <Sidebar active={section} onSelect={navigateTo} />
      <main
        id="main-content"
        tabIndex={-1}
        className="order-first sm:order-last min-h-0 min-w-0 flex-1 overflow-y-auto pb-28 sm:pb-8 focus:outline-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(44,95,90,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      >
        <DataManagementPanel storageReady={storageReady && childrenReady} storageError={storageError ?? childrenError} />
        {visitedSections.has("map") && (
          <motion.div hidden={section !== "map"} initial={false} animate={section === "map" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><LifeMapSection /></Suspense>
          </motion.div>
        )}
        {visitedSections.has("health") && (
          <motion.div hidden={section !== "health"} initial={false} animate={section === "health" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><HealthSection vaccineStatuses={vaccineStatuses} setVaccineStatuses={setVaccineStatuses} onNavigate={navigateTo} children={children} initialTab={healthInitialTab} /></Suspense>
          </motion.div>
        )}
        {visitedSections.has("family") && (
          <motion.div hidden={section !== "family"} initial={false} animate={section === "family" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><FamilySection /></Suspense>
          </motion.div>
        )}
        {visitedSections.has("calendar") && (
          <motion.div hidden={section !== "calendar"} initial={false} animate={section === "calendar" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><CalendarSection onOpenHistory={() => { setHealthInitialTab("history"); navigateTo("health"); }} /></Suspense>
          </motion.div>
        )}
        {visitedSections.has("analytics") && (
          <motion.div hidden={section !== "analytics"} initial={false} animate={section === "analytics" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><AnalyticsSection children={children} onNavigate={navigateTo} /></Suspense>
          </motion.div>
        )}
      </main>
    </div>
  );
}
