import { useState } from "react";
import Icon from "@/components/ui/icon";
import { CarConfig, generateCarId } from "@/lib/cars";

const CAR_SPECS_URL = "https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23";

type Props = {
  onAdd: (car: CarConfig, specs?: [string, string][]) => void;
  onClose: () => void;
};

export default function AddCarModal({ onAdd, onClose }: Props) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [interval, setInterval] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiGuides, setAiGuides] = useState<CarConfig["guides"]>([]);
  const [aiSpecs, setAiSpecs] = useState<[string, string][]>([]);

  const canFetch = brand.trim().length > 0 && model.trim().length > 0 && year.trim().length === 4;

  async function handleFetchAI() {
    setLoading(true);
    setAiError("");
    setAiLoaded(false);
    try {
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand.trim(), model: model.trim(), year: year.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сервера");
      if (data.oilInterval) setInterval(String(data.oilInterval));
      if (data.guides?.length) setAiGuides(data.guides);
      if (data.specs?.length) setAiSpecs(data.specs);
      setAiLoaded(true);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Не удалось получить данные");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!brand.trim() || !model.trim() || !year.trim() || !interval.trim()) return;
    const id = generateCarId(brand, model, year);
    const car: CarConfig = {
      id,
      brand: brand.trim(),
      model: model.trim(),
      year: year.trim(),
      oilInterval: Number(interval),
      guides: aiGuides,
      custom: true,
    };
    onAdd(car, aiSpecs.length ? aiSpecs : undefined);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon name="Car" size={18} className="text-foreground" />
            </div>
            <p className="font-golos font-bold text-foreground text-base">Новый автомобиль</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
            <Icon name="X" size={15} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Марка</label>
            <input
              value={brand} onChange={(e) => { setBrand(e.target.value); setAiLoaded(false); }}
              placeholder="Toyota, УАЗ, Lada..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Модель</label>
            <input
              value={model} onChange={(e) => { setModel(e.target.value); setAiLoaded(false); }}
              placeholder="Camry, Патриот, Веста..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Год</label>
              <input
                value={year} onChange={(e) => { setYear(e.target.value); setAiLoaded(false); }}
                placeholder="2010"
                type="number" min="1900" max="2099"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Интервал, км</label>
              <input
                value={interval} onChange={(e) => setInterval(e.target.value)}
                placeholder="7500"
                type="number" min="100"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleFetchAI}
            disabled={!canFetch || loading}
            className="w-full py-3 rounded-xl border border-ring/40 bg-secondary text-sm font-golos font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Icon name="Loader" size={15} className="animate-spin text-muted-foreground" />
                Подбираю данные...
              </>
            ) : aiLoaded ? (
              <>
                <Icon name="CheckCircle" size={15} className="text-green-500" />
                Данные подобраны
              </>
            ) : (
              <>
                <Icon name="Sparkles" size={15} className="text-muted-foreground" />
                Подобрать масло и инструкцию
              </>
            )}
          </button>

          {aiError && (
            <p className="text-xs text-red-500 text-center">{aiError}</p>
          )}

          {aiLoaded && aiSpecs.length > 0 && (
            <div className="bg-secondary rounded-2xl p-3 space-y-1">
              {aiSpecs.map(([key, val]) => (
                <div key={key} className="flex justify-between gap-2 text-xs font-golos">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="text-foreground text-right">{val}</span>
                </div>
              ))}
            </div>
          )}
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
            disabled={!brand.trim() || !model.trim() || !year.trim() || !interval.trim()}
            className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-golos font-semibold hover:opacity-80 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}
