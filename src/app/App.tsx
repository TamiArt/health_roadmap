import { useState } from "react";
import { motion } from "motion/react";
import { VACCINES, type Section, type VaccineStatus } from "./data";
import { AnalyticsSection } from "./AnalyticsSection";
import { FamilySection } from "./FamilySection";
import { HealthSection } from "./HealthSection";
import { LifeMapSection } from "./LifeMapSection";
import { Sidebar } from "./Sidebar";

export default function App() {
  const [section, setSection] = useState<Section>("map");
  const [vaccineStatuses, setVaccineStatuses] = useState<Record<string, VaccineStatus>>(
    () => Object.fromEntries(VACCINES.map(v => [v.id, v.status]))
  );

  function renderSection() {
    switch (section) {
      case "map": return <LifeMapSection />;
      case "health": return <HealthSection vaccineStatuses={vaccineStatuses} setVaccineStatuses={setVaccineStatuses} />;
      case "family": return <FamilySection />;
      case "analytics": return <AnalyticsSection vaccineStatuses={vaccineStatuses} onNavigate={setSection} />;
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active={section} onSelect={setSection} />
      <main
        className="flex-1 overflow-y-auto"
        style={{ backgroundImage: "radial-gradient(circle, rgba(44,95,90,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      >
        <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          {renderSection()}
        </motion.div>
      </main>
    </div>
  );
}
