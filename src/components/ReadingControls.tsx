import { Type, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useA11yStore } from "@/stores/a11yStore";

export default function ReadingControls() {
  const { fontScale, highContrast, set } = useA11yStore();
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="mc-icon-button" aria-label="Reading controls" title="Text size and contrast"><Type size={18} /></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-72 space-y-5 max-w-[calc(100vw-24px)]"><h2 className="font-semibold">Reading comfort</h2>
      <div className="space-y-3"><label htmlFor="reading-size" className="flex justify-between">Text size <output>{Math.round(fontScale * 100)}%</output></label><Slider id="reading-size" aria-label="Text size" min={1} max={1.4} step={0.05} value={[fontScale]} onValueChange={v => set({ fontScale: v[0] ?? 1 })} /></div>
      <label className="flex items-center justify-between gap-3">High contrast<Switch checked={highContrast} onCheckedChange={value => set({ highContrast: value })} aria-label="High contrast" /></label>
      <Button variant="outline" onClick={() => set({ fontScale: 1, highContrast: false })}><RotateCcw size={16} />Reset reading settings</Button>
    </PopoverContent></Popover>;
}