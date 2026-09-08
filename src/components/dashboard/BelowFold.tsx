// Operational pulses moved off the first viewport. Loaded only when opened.
import SitePulse from "@/components/dashboard/SitePulse";
import ValidationPulse from "@/components/dashboard/ValidationPulse";
import IntelligencePulse from "@/components/dashboard/IntelligencePulse";
import ReliabilityPanel from "@/components/ReliabilityPanel";
import type { DailyOps } from "@/hooks/useDailyOps";

export default function BelowFold({ ops }: { ops: DailyOps }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <SitePulse rows={ops.sitePulse} />
        <ValidationPulse items={ops.validationPulse} today={ops.today} />
      </div>
      <div className="flex flex-col gap-4 lg:col-span-5">
        <ReliabilityPanel compact />
        <IntelligencePulse items={ops.intelligence} />
      </div>
    </div>
  );
}
