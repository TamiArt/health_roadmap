import { lazy, Suspense, useState } from "react";
import { usePersistentState } from "./storage";
import { DataManagementPanel } from "./DataManagementPanel";
import { motion } from "motion/react";
import { VACCINES, type Section, type VaccineStatus } from "./data";
import { Sidebar } from "./Sidebar";

const LifeMapSection = lazy(() => import("./LifeMapSection").then(module => ({ default: module.LifeMapSection })));
const HealthSection = lazy(() => import("./HealthSection").then(module => ({ default: module.HealthSection })));
const FamilySection = lazy(() => import("./FamilySection").then(module => ({ default: module.FamilySection })));
const AnalyticsSection = lazy(() => import("./AnalyticsSection").then(module => ({ default: module.AnalyticsSection })));

function SectionFallback() {
  return (
    <div role="status" className="p-8 text-sm text-muted-foreground">
      Загрузка раздела…
    </div>
  );
}

export default function App() {
  const [section, setSection] = useState<Section>("map");
  const [visitedSections, setVisitedSections] = useState<Set<Section>>(() => new Set(["map"]));
  const [vaccineStatuses, setVaccineStatuses, storageReady, storageError] = usePersistentState<Record<string, VaccineStatus>>(
    "vaccineStatuses",
    Object.fromEntries(VACCINES.map(v => [v.id, v.status]))
  );

  function navigateTo(nextSection: Section) {
    setVisitedSections(previous => {
      if (previous.has(nextSection)) return previous;
      return new Set(previous).add(nextSection);
    });
    setSection(nextSection);
  }

  if (!storageReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        Подключение локальной базы данных…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col sm:flex-row bg-background overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
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
        className="order-first sm:order-last min-h-0 min-w-0 flex-1 overflow-y-auto focus:outline-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(44,95,90,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      >
        <DataManagementPanel storageReady={storageReady} storageError={storageError} />
        {visitedSections.has("map") && (
          <motion.div hidden={section !== "map"} initial={false} animate={section === "map" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><LifeMapSection /></Suspense>
          </motion.div>
        )}
        {visitedSections.has("health") && (
          <motion.div hidden={section !== "health"} initial={false} animate={section === "health" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><HealthSection vaccineStatuses={vaccineStatuses} setVaccineStatuses={setVaccineStatuses} /></Suspense>
          </motion.div>
        )}
        {visitedSections.has("family") && (
          <motion.div hidden={section !== "family"} initial={false} animate={section === "family" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><FamilySection /></Suspense>
          </motion.div>
        )}
        {visitedSections.has("analytics") && (
          <motion.div hidden={section !== "analytics"} initial={false} animate={section === "analytics" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<SectionFallback />}><AnalyticsSection vaccineStatuses={vaccineStatuses} onNavigate={navigateTo} /></Suspense>
          </motion.div>
        )}
      </main>
    </div>
  );
}
