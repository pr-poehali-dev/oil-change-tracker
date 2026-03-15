import { useState } from "react";
import Icon from "@/components/ui/icon";
import { CarConfig, ManualStep, generateCarId } from "@/lib/cars";

const CAR_SPECS_URL = "https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23";

type Engine = {
  id: string;
  name: string;
  volume: string;
  fuel: string;
  power: string;
};

type Props = {
  onAdd: (car: CarConfig, specs?: [string, string][]) => void;
  onClose: () => void;
};

export default function AddCarModal({ onAdd, onClose }: Props) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [interval, setInterval] = useState("");

  const [engines, setEngines] = useState<Engine[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);
  const [enginesLoading, setEnginesLoading] = useState(false);
  const [enginesLoaded, setEnginesLoaded] = useState(false);
  const [enginesError, setEnginesError] = useState("");

  const [specsLoading, setSpecsLoading] = useState(false);
  const [specsLoaded, setSpecsLoaded] = useState(false);
  const [specsError, setSpecsError] = useState("");
  const [aiGuides, setAiGuides] = useState<CarConfig["guides"]>([]);
  const [aiSpecs, setAiSpecs] = useState<[string, string][]>([]);

  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  const canFetchEngines = brand.trim().length > 0 && model.trim().length > 0 && year.trim().length === 4;

  function resetOnCarChange() {
    setEnginesLoaded(false);
    setEngines([]);
    setSelectedEngine(null);
    setSpecsLoaded(false);
    setAiSpecs([]);
    setAiGuides([]);
    setInterval("");
    setFiltersLoading(false);
    setFiltersLoaded(false);
  }

  async function handleFetchEngines() {
    setEnginesLoading(true);
    setEnginesError("");
    setEnginesLoaded(false);
    setSelectedEngine(null);
    setSpecsLoaded(false);
    setAiSpecs([]);
    setAiGuides([]);
    try {
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand.trim(), model: model.trim(), year: year.trim(), mode: "engines" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сервера");
      setEngines(data.engines || []);
      setEnginesLoaded(true);
    } catch (e: unknown) {
      setEnginesError(e instanceof Error ? e.message : "Не удалось получить данные");
    } finally {
      setEnginesLoading(false);
    }
  }

  async function handleFetchSpecs(engine: Engine | null) {
    setSpecsLoading(true);
    setSpecsError("");
    setSpecsLoaded(false);
    setFiltersLoading(true);
    setFiltersLoaded(false);
    try {
      const baseBody = { brand: brand.trim(), model: model.trim(), year: year.trim() };
      const engineName = engine?.name;

      const [specsRes, filtersRes] = await Promise.all([
        fetch(CAR_SPECS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(engineName ? { ...baseBody, engine: engineName } : baseBody),
        }),
        fetch(CAR_SPECS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(engineName ? { ...baseBody, engine: engineName, mode: "filters" } : { ...baseBody, mode: "filters" }),
        }),
      ]);

      const specsData = await specsRes.json();
      if (!specsRes.ok) throw new Error(specsData.error || "Ошибка сервера");
      if (specsData.oilInterval) setInterval(String(specsData.oilInterval));

      const filtersData = await filtersRes.json();
      const filterGuides: CarConfig["guides"] = (filtersData.filters || []).map((f: { id: string; title: string; icon: string; steps: ManualStep[]; article?: string; interval?: string }) => ({
        id: f.id,
        title: f.title,
        icon: f.icon,
        steps: f.steps || [],
        article: f.article,
        interval: f.interval,
      }));
      setFiltersLoaded(true);

      const oilGuides: CarConfig["guides"] = specsData.guides || [];
      setAiGuides([...oilGuides, ...filterGuides]);
      if (specsData.specs?.length) setAiSpecs(specsData.specs);
      setSpecsLoaded(true);
    } catch (e: unknown) {
      setSpecsError(e instanceof Error ? e.message : "Не удалось получить данные");
    } finally {
      setSpecsLoading(false);
      setFiltersLoading(false);
    }
  }

  function handleSelectEngine(engine: Engine) {
    setSelectedEngine(engine);
    handleFetchSpecs(engine);
  }

  function handleSubmit() {
    if (!brand.trim() || !model.trim() || !year.trim() || !interval.trim()) return;
    const id = generateCarId(brand, model, year);
    const car: CarConfig = {
      id,
      brand: brand.trim(),
      model: model.trim(),
      year: year.trim(),
      engine: selectedEngine?.name,
      oilInterval: Number(interval),
      guides: aiGuides,
      custom: true,
    };
    onAdd(car, aiSpecs.length ? aiSpecs : undefined);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
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
          {/* Марка, модель, год */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Марка</label>
            <input
              value={brand} onChange={(e) => { setBrand(e.target.value); resetOnCarChange(); }}
              placeholder="Toyota, УАЗ, Lada..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Модель</label>
            <input
              value={model} onChange={(e) => { setModel(e.target.value); resetOnCarChange(); }}
              placeholder="Camry, Патриот, Веста..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Год</label>
              <input
                value={year} onChange={(e) => { setYear(e.target.value); resetOnCarChange(); }}
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

          {/* Шаг 1: кнопка подбора двигателей */}
          {!enginesLoaded && (
            <button
              onClick={handleFetchEngines}
              disabled={!canFetchEngines || enginesLoading}
              className="w-full py-3 rounded-xl border border-ring/40 bg-secondary text-sm font-golos font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {enginesLoading ? (
                <>
                  <Icon name="Loader" size={15} className="animate-spin text-muted-foreground" />
                  Подбираю двигатели...
                </>
              ) : (
                <>
                  <Icon name="Sparkles" size={15} className="text-muted-foreground" />
                  Подобрать двигатель
                </>
              )}
            </button>
          )}

          {enginesError && (
            <p className="text-xs text-red-500 text-center">{enginesError}</p>
          )}

          {/* Список двигателей */}
          {enginesLoaded && engines.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Двигатель</label>
                <button
                  onClick={() => { setEnginesLoaded(false); setSelectedEngine(null); setSpecsLoaded(false); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-golos"
                >
                  Сменить
                </button>
              </div>
              <div className="space-y-1.5">
                {engines.map((eng) => {
                  const isSelected = selectedEngine?.id === eng.id;
                  return (
                    <button
                      key={eng.id}
                      onClick={() => handleSelectEngine(eng)}
                      disabled={specsLoading}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-golos transition-all flex items-center justify-between gap-2 disabled:opacity-50 ${
                        isSelected
                          ? "border-ring bg-ring/10 text-foreground"
                          : "border-border bg-secondary text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{eng.name}</span>
                      {isSelected && specsLoading && (
                        <Icon name="Loader" size={13} className="animate-spin text-muted-foreground flex-shrink-0" />
                      )}
                      {isSelected && specsLoaded && (
                        <Icon name="CheckCircle" size={13} className="text-green-500 flex-shrink-0" />
                      )}
                      {!isSelected && (
                        <Icon name="ChevronRight" size={13} className="text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {enginesLoaded && engines.length === 0 && (
            <div className="bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-muted-foreground text-center">
              Двигатели не найдены — введите интервал вручную
            </div>
          )}

          {specsError && (
            <p className="text-xs text-red-500 text-center">{specsError}</p>
          )}

          {/* Спецификации */}
          {specsLoaded && aiSpecs.length > 0 && (
            <div className="bg-secondary rounded-2xl p-3 space-y-1">
              {aiSpecs.map(([key, val]) => (
                <div key={key} className="flex justify-between gap-2 text-xs font-golos">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="text-foreground text-right">{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Статус загрузки фильтров */}
          {filtersLoading && (
            <div className="flex items-center gap-2 px-1">
              <Icon name="Loader" size={13} className="animate-spin text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground font-golos">Подбираю инструкции по фильтрам...</p>
            </div>
          )}
          {filtersLoaded && aiGuides.length > 1 && (
            <div className="flex items-center gap-2 px-1">
              <Icon name="CheckCircle" size={13} className="text-green-500 shrink-0" />
              <p className="text-xs text-muted-foreground font-golos">
                Готово: {aiGuides.length} инструкц{aiGuides.length === 1 ? "ия" : aiGuides.length < 5 ? "ии" : "ий"} по замене масла и фильтров
              </p>
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