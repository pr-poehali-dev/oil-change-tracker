import { useState } from "react";
import Icon from "@/components/ui/icon";
import { ManualGuide, ManualStep } from "@/lib/cars";

type Props = {
  onAdd: (guide: ManualGuide) => void;
  onClose: () => void;
};

const ICONS = ["Droplets", "Wrench", "Settings", "Zap", "Flame", "Wind", "Gauge", "Shield"];

export default function AddGuideModal({ onAdd, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("Wrench");
  const [steps, setSteps] = useState<{ title: string; text: string; warning: string }[]>([
    { title: "", text: "", warning: "" },
  ]);

  function addStep() {
    setSteps([...steps, { title: "", text: "", warning: "" }]);
  }

  function removeStep(idx: number) {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: "title" | "text" | "warning", value: string) {
    setSteps(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function handleSubmit() {
    if (!title.trim()) return;
    const validSteps = steps.filter((s) => s.title.trim());
    if (validSteps.length === 0) return;

    const guideSteps: ManualStep[] = validSteps.map((s, i) => ({
      step: i + 1,
      title: s.title.trim(),
      items: s.text.trim() ? s.text.split("\n").map((l) => l.trim()).filter(Boolean) : ["Выполните данный шаг."],
      warning: s.warning.trim() || undefined,
    }));

    const guide: ManualGuide = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      icon,
      steps: guideSteps,
    };

    onAdd(guide);
    onClose();
  }

  const canSubmit = title.trim() && steps.some((s) => s.title.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon name="BookOpen" size={18} className="text-foreground" />
            </div>
            <p className="font-golos font-bold text-foreground text-base">Новая инструкция</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
            <Icon name="X" size={15} className="text-muted-foreground" />
          </button>
        </div>

        {/* Название */}
        <div className="mb-4">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Название инструкции</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Замена фильтра, проверка тормозов..."
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
          />
        </div>

        {/* Иконка */}
        <div className="mb-5">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">Иконка</label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  icon === ic ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon name={ic as "Wrench"} size={17} />
              </button>
            ))}
          </div>
        </div>

        {/* Шаги */}
        <div className="mb-4">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">Шаги</label>
          <div className="space-y-3">
            {steps.map((s, idx) => (
              <div key={idx} className="bg-secondary rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Шаг {idx + 1}</span>
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(idx)} className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors">
                      <Icon name="Minus" size={12} className="text-destructive" />
                    </button>
                  )}
                </div>
                <input
                  value={s.title} onChange={(e) => updateStep(idx, "title", e.target.value)}
                  placeholder="Название шага"
                  className="w-full bg-card rounded-xl px-3 py-2.5 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
                />
                <textarea
                  value={s.text} onChange={(e) => updateStep(idx, "text", e.target.value)}
                  placeholder={"Описание шага.\nКаждая строка — отдельный пункт."}
                  rows={3}
                  className="w-full bg-card rounded-xl px-3 py-2.5 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors resize-none"
                />
                <input
                  value={s.warning} onChange={(e) => updateStep(idx, "warning", e.target.value)}
                  placeholder="Предупреждение (необязательно)"
                  className="w-full bg-card rounded-xl px-3 py-2.5 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-amber-200 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            ))}
          </div>
          <button
            onClick={addStep}
            className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-border text-sm font-golos text-muted-foreground hover:text-foreground hover:border-muted-foreground flex items-center justify-center gap-2 transition-colors"
          >
            <Icon name="Plus" size={14} />
            Добавить шаг
          </button>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium hover:bg-muted transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-golos font-semibold hover:opacity-80 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
