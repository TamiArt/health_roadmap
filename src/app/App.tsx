import { useState } from "react";
import { usePersistentState } from "./storage";
import { DataManagementPanel } from "./DataManagementPanel";
import { motion } from "motion/react";
import { VACCINES, type Section, type VaccineStatus } from "./data";
import { AnalyticsSection } from "./AnalyticsSection";
import { FamilySection } from "./FamilySection";
import { HealthSection } from "./HealthSection";
import { LifeMapSection } from "./LifeMapSection";
import { Sidebar } from "./Sidebar";

export default function App() {
  const [section, setSection] = useState<Section>("map");
  const [vaccineStatuses, setVaccineStatuses, storageReady, storageError] = usePersistentState<Record<string, VaccineStatus>>(
    "vaccineStatuses",
    Object.fromEntries(VACCINES.map(v => [v.id, v.status]))
  );

  return (
    <div className="flex h-screen flex-col sm:flex-row bg-background overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active={section} onSelect={setSection} />
      <main
        className="order-first sm:order-last min-h-0 min-w-0 flex-1 overflow-y-auto"
        style={{ backgroundImage: "radial-gradient(circle, rgba(44,95,90,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      >
        <DataManagementPanel storageReady={storageReady} storageError={storageError} />
        <motion.div hidden={section !== "map"} initial={false} animate={section === "map" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
          <LifeMapSection />
        </motion.div>
        <motion.div hidden={section !== "health"} initial={false} animate={section === "health" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
          <HealthSection vaccineStatuses={vaccineStatuses} setVaccineStatuses={setVaccineStatuses} />
        </motion.div>
        <motion.div hidden={section !== "family"} initial={false} animate={section === "family" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
          <FamilySection />
        </motion.div>
        <motion.div hidden={section !== "analytics"} initial={false} animate={section === "analytics" ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.22 }}>
          <AnalyticsSection vaccineStatuses={vaccineStatuses} onNavigate={setSection} />
        </motion.div>
      </main>
    </div>
  );
}
