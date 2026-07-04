import { useState, useRef, useEffect, ChangeEvent } from "react";
import Icon from "@/components/ui/icon";
import { CarConfig, ManualGuide, ManualStep, generateCarId } from "@/lib/cars";
import { apiSearchCar } from "@/api";
import { CAR_BRANDS, CAR_MODELS, CAR_GENERATIONS, Generation } from "@/lib/car-database";

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
  onFiltersReady?: (carId: string, guides: ManualGuide[]) => void;
  onClose: () => void;
};

export default function AddCarModal({ onAdd, onFiltersReady, onClose }: Props) {
  const [brand, setBrand] = useState("");
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  const [model, setModel] = useState("");
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);

  const [generation, setGeneration] = useState<Generation | null>(null);

  const [year, setYear] = useState("");
  const [interval, setInterval] = useState("");
  const [transmission, setTransmission] = useState<"auto" | "manual" | "">("");

  const [vin, setVin] = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinResult, setVinResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [stsLoading, setStsLoading] = useState(false);
  const stsCameraRef = useRef<HTMLInputElement>(null);
  const stsGalleryRef = useRef<HTMLInputElement>(null);

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
  const [fromDb, setFromDb] = useState(false);
  const [dbCarId, setDbCarId] = useState<string | null>(null);

  const [carImage, setCarImage] = useState("");
  const [carImageLoading, setCarImageLoading] = useState(false);

  const generations = brand && model ? (CAR_GENERATIONS[brand]?.[model] ?? []) : [];

  // Ищем фото авто, когда заполнены марка, модель и год (4 цифры)
  useEffect(() => {
    const b = brand.trim();
    const m = model.trim();
    const y = year.trim();
    if (!b || !m || y.length !== 4) {
      setCarImage("");
      return;
    }
    let cancelled = false;
    setCarImageLoading(true);
    const genName = generation?.name;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(CAR_SPECS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "car_image", brand: b, model: m, year: y, ...(genName ? { generation: genName } : {}) }),
        });
        const data = await res.json();
        if (!cancelled) setCarImage(data.image || "");
      } catch {
        if (!cancelled) setCarImage("");
      } finally {
        if (!cancelled) setCarImageLoading(false);
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [brand, model, year, generation]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleBrandChange(value: string) {
    setBrand(value);
    resetOnCarChange();
    setModel("");
    setGeneration(null);
    if (value.trim().length > 0) {
      const q = value.toLowerCase();
      const filtered = CAR_BRANDS.filter(b => b.toLowerCase().startsWith(q)).slice(0, 6);
      setBrandSuggestions(filtered);
      setShowBrandDropdown(filtered.length > 0);
    } else {
      setBrandSuggestions([]);
      setShowBrandDropdown(false);
    }
  }

  function selectBrand(b: string) {
    setBrand(b);
    setBrandSuggestions([]);
    setShowBrandDropdown(false);
    resetOnCarChange();
    setModel("");
    setGeneration(null);
  }

  function findGenerationByYear(b: string, m: string, y: string): Generation | null {
    const gens = CAR_GENERATIONS[b]?.[m];
    if (!gens || !gens.length) return null;
    const yr = parseInt(y, 10);
    if (!yr) return null;
    for (const g of gens) {
      const [rawStart, rawEnd] = g.years.split(/[–-]/).map((s) => s.trim());
      const start = parseInt(rawStart, 10);
      const end = !rawEnd || rawEnd.includes("н.в") ? new Date().getFullYear() + 1 : parseInt(rawEnd, 10);
      if (start && yr >= start && yr <= end) return g;
    }
    return null;
  }

  // Общая логика: заполняет форму по распознанным данным (VIN / код кузова / СТС)
  // и запускает подбор двигателей. Возвращает {ok, msg} для показа пользователю.
  function applyRecognized(data: {
    brand?: string; model?: string; year?: string; country?: string; volume?: string; power?: string;
  }): { ok: boolean; msg: string } {
    const matchedBrand = data.brand
      ? CAR_BRANDS.find((b) => b.toLowerCase() === data.brand!.toLowerCase())
      : "";
    const parts: string[] = [];
    if (matchedBrand) {
      selectBrand(matchedBrand);
      parts.push(matchedBrand);
    } else if (data.brand) {
      parts.push(`${data.brand} (нет в списке)`);
    }
    // Модель. Ставим после selectBrand — он очищает модель.
    let matchedModel = "";
    if (data.model && matchedBrand) {
      const models = CAR_MODELS[matchedBrand] ?? [];
      matchedModel = models.find((m) => m.toLowerCase() === data.model!.toLowerCase()) || data.model;
      setModel(matchedModel);
      setModelSuggestions([]);
      setShowModelDropdown(false);
      parts.push(matchedModel);
    } else if (data.model && !matchedBrand) {
      setModel(data.model);
      matchedModel = data.model;
      parts.push(data.model);
    }
    const matchedYear = data.year || "";
    if (matchedYear) {
      setYear(matchedYear);
      parts.push(matchedYear);
    }
    if (data.country && !data.model) parts.push(data.country);

    // Подбираем поколение (кузов) по году и сразу грузим двигатели
    let matchedGen: Generation | null = null;
    if (matchedBrand && matchedModel && matchedYear) {
      matchedGen = findGenerationByYear(matchedBrand, matchedModel, matchedYear);
      if (matchedGen) {
        setGeneration(matchedGen);
        parts.push(`кузов ${matchedGen.name}`);
      }
    }

    if (parts.length && (matchedBrand || matchedYear)) {
      const canAutoEngines = !!(matchedBrand && matchedModel && matchedYear.length === 4);
      const needModel = matchedBrand && !matchedModel;
      if (canAutoEngines) {
        handleFetchEngines({ brand: matchedBrand as string, model: matchedModel, year: matchedYear, generation: matchedGen, hintVolume: data.volume, hintPower: data.power });
      }
      return {
        ok: true,
        msg: `Определено: ${parts.join(", ")}.`
          + (needModel ? " Укажите модель вручную." : "")
          + (canAutoEngines ? " Подбираю двигатели..." : ""),
      };
    }
    return { ok: false, msg: "Марку определить не удалось. Заполните вручную." };
  }

  async function decodeVin() {
    const v = vin.trim().toUpperCase();
    if (v.length < 3) {
      setVinResult({ ok: false, msg: "Введите VIN (17 символов) или номер кузова" });
      return;
    }
    setVinLoading(true);
    setVinResult(null);
    try {
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "vin", vin: v }),
      });
      const data = await res.json();
      if (!data.valid) {
        setVinResult({ ok: false, msg: data.error || "Не удалось распознать номер" });
        return;
      }
      setVinResult(applyRecognized(data));
    } catch {
      setVinResult({ ok: false, msg: "Ошибка сети. Попробуйте позже." });
    } finally {
      setVinLoading(false);
    }
  }

  // Сжимаем фото перед отправкой: уменьшаем размер и качество,
  // чтобы не упереться в лимит размера запроса и ускорить распознавание.
  function compressImage(file: File, maxSide = 1600, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read error"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("image error"));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSide || height > maxSide) {
            const scale = maxSide / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("no ctx")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleStsPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStsLoading(true);
    setVinResult({ ok: true, msg: "Распознаю данные со СТС..." });
    try {
      const b64 = await compressImage(file);
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sts_photo", image: b64 }),
      });
      if (!res.ok) {
        console.error("STS photo HTTP error", res.status);
        setVinResult({ ok: false, msg: "Сервер не ответил. Попробуйте ещё раз." });
        return;
      }
      const data = await res.json();
      if (!data.valid) {
        setVinResult({ ok: false, msg: data.error || "Не удалось распознать СТС" });
        return;
      }
      if (data.vin && String(data.vin).length === 17) setVin(String(data.vin).toUpperCase());
      setVinResult(applyRecognized(data));
    } catch (err) {
      console.error("STS photo error", err);
      setVinResult({ ok: false, msg: "Ошибка сети. Попробуйте ещё раз." });
    } finally {
      setStsLoading(false);
    }
  }

  function handleModelChange(value: string) {
    setModel(value);
    setGeneration(null);
    resetOnCarChange();
    if (value.trim().length > 0) {
      const models = CAR_MODELS[brand] ?? [];
      const q = value.toLowerCase();
      const filtered = models.filter(m => m.toLowerCase().startsWith(q)).slice(0, 6);
      setModelSuggestions(filtered);
      setShowModelDropdown(filtered.length > 0);
    } else {
      const models = CAR_MODELS[brand] ?? [];
      setModelSuggestions(models.slice(0, 6));
      setShowModelDropdown(models.length > 0);
    }
  }

  function selectModel(m: string) {
    setModel(m);
    setModelSuggestions([]);
    setShowModelDropdown(false);
    setGeneration(null);
    resetOnCarChange();
  }

  function selectGeneration(g: Generation) {
    setGeneration(g);
    const startYear = g.years.split("–")[0].trim();
    if (startYear && startYear !== "н.в." && startYear.length === 4) {
      setYear(startYear);
    }
    resetOnCarChange();
  }

  const canFetchEngines = brand.trim().length > 0 && model.trim().length > 0 && year.trim().length === 4;

  function resetOnCarChange() {
    setEnginesLoaded(false);
    setEngines([]);
    setSelectedEngine(null);
    setSpecsLoaded(false);
    setAiSpecs([]);
    setAiGuides([]);
    setInterval("");
    setTransmission("");
    setFromDb(false);
    setDbCarId(null);
  }

  // По данным со СТС берёт двигатель ТОЧНО из СТС.
  // Если такой уже есть в списке — использует его, иначе создаёт новый
  // двигатель прямо из СТС и добавляет его в список.
  // Возвращает { engine, list } — двигатель для выбора и обновлённый список.
  function buildEngineFromSts(list: Engine[], hintVolume?: string, hintPower?: string): { engine: Engine | null; list: Engine[]; isNew: boolean } {
    const v = parseFloat((hintVolume || "").replace(",", "."));
    const p = parseInt((hintPower || "").replace(/\D/g, ""), 10);
    if (!v && !p) return { engine: null, list, isNew: false };

    // Ищем точное совпадение по объёму и мощности
    const exact = list.find((e) => {
      const ev = parseFloat((e.volume || "").replace(",", "."));
      const ep = parseInt((e.power || "").replace(/\D/g, ""), 10);
      const volOk = v ? Math.abs(ev - v) < 0.05 : true;
      const powOk = p ? ep === p : true;
      return volOk && powOk;
    });
    if (exact) return { engine: exact, list, isNew: false };

    // Точного нет — создаём двигатель прямо из СТС
    const volStr = v ? v.toFixed(1) : "";
    const parts = [volStr ? `${volStr} л` : "", p ? `${p} л.с.` : ""].filter(Boolean);
    const name = parts.length ? `${parts.join(", ")} (из СТС)` : "Двигатель из СТС";
    const stsEngine: Engine = {
      id: `sts_${Date.now()}`,
      name,
      volume: volStr,
      power: p ? String(p) : "",
      fuel: "бензин",
    };
    return { engine: stsEngine, list: [stsEngine, ...list], isNew: true };
  }

  // Сохраняет двигатель из СТС в общую базу, чтобы использовать его в будущем
  async function saveStsEngineToDb(b: string, m: string, genName: string | undefined, engine: Engine) {
    try {
      await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "save_engine",
          brand: b, model: m, generation: genName || "",
          name: engine.name, volume: engine.volume, power: engine.power, fuel: engine.fuel,
        }),
      });
    } catch {
      // сохранение в фоне — молча игнорируем ошибку
    }
  }

  async function handleFetchEngines(override?: { brand?: string; model?: string; year?: string; generation?: Generation | null; hintVolume?: string; hintPower?: string }) {
    setEnginesLoading(true);
    setEnginesError("");
    setEnginesLoaded(false);
    setSelectedEngine(null);
    setSpecsLoaded(false);
    setAiSpecs([]);
    setAiGuides([]);
    setFromDb(false);
    setDbCarId(null);
    try {
      const b = (override?.brand ?? brand).trim();
      const m = (override?.model ?? model).trim();
      const y = (override?.year ?? year).trim();
      const gen = override && "generation" in override ? override.generation : generation;
      const genName = gen?.name;
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: b, model: m, year: y, mode: "engines", ...(genName ? { generation: genName } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сервера");
      let list: Engine[] = data.engines || [];
      // Если пришли данные со СТС — берём двигатель точно из СТС
      const hasStsHint = !!(override?.hintVolume || override?.hintPower);
      let stsEngine: Engine | null = null;
      if (hasStsHint) {
        const built = buildEngineFromSts(list, override?.hintVolume, override?.hintPower);
        list = built.list;
        stsEngine = built.engine;
        // Новый двигатель из СТС — сохраняем в общую базу для будущего использования
        if (built.isNew && stsEngine) {
          saveStsEngineToDb(b, m, genName, stsEngine);
        }
      }
      setEngines(list);
      setEnginesLoaded(true);
      if (stsEngine) {
        setSelectedEngine(stsEngine);
        handleFetchSpecs(stsEngine);
      }
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
    setFromDb(false);
    setDbCarId(null);
    try {
      const dbResult = await apiSearchCar(brand.trim(), model.trim(), year.trim());
      if (dbResult.found) {
        setFromDb(true);
        setDbCarId(dbResult.id);
        if (dbResult.oilInterval) setInterval(String(dbResult.oilInterval));
        if (dbResult.guides?.length) setAiGuides(dbResult.guides);
        if (dbResult.specs?.length) setAiSpecs(dbResult.specs);
        setSpecsLoaded(true);
        return;
      }
      const tempId = generateCarId(brand.trim(), model.trim(), year.trim());
      const baseBody = { brand: brand.trim(), model: model.trim(), year: year.trim(), carId: tempId, ...(generation?.name ? { generation: generation.name } : {}) };
      const engineName = engine?.name;
      const body = engineName ? { ...baseBody, engine: engineName } : baseBody;
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const specsData = await res.json();
      if (!res.ok) throw new Error(specsData.error || "Ошибка сервера");
      if (specsData.oilInterval) setInterval(String(specsData.oilInterval));
      setAiGuides(specsData.guides || []);
      if (specsData.specs?.length) setAiSpecs(specsData.specs);
      setSpecsLoaded(true);
    } catch (e: unknown) {
      setSpecsError(e instanceof Error ? e.message : "Не удалось получить данные");
    } finally {
      setSpecsLoading(false);
    }
  }

  function handleSelectEngine(engine: Engine) {
    setSelectedEngine(engine);
    handleFetchSpecs(engine);
  }

  async function fetchFiltersInBackground(carId: string, engineName?: string) {
    try {
      const baseBody = { brand: brand.trim(), model: model.trim(), year: year.trim(), carId, ...(generation?.name ? { generation: generation.name } : {}) };
      const body = engineName ? { ...baseBody, engine: engineName, mode: "filters" } : { ...baseBody, mode: "filters" };
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const filterGuides: ManualGuide[] = (data.filters || []).map((f: { id: string; title: string; icon: string; steps: ManualStep[]; article?: string; interval?: string }) => ({
        id: f.id, title: f.title, icon: f.icon, steps: f.steps || [], article: f.article, interval: f.interval,
      }));
      if (filterGuides.length > 0 && onFiltersReady) {
        onFiltersReady(carId, filterGuides);
      }
    } catch (_e) { /* фоновая загрузка */ }
  }

  function handleSubmit() {
    if (!brand.trim() || !model.trim() || !year.trim() || !interval.trim()) return;
    const id = dbCarId ?? generateCarId(brand, model, year);
    const car: CarConfig = {
      id,
      brand: brand.trim(),
      model: model.trim(),
      year: year.trim(),
      engine: selectedEngine?.name,
      transmission: transmission || undefined,
      oilInterval: Number(interval),
      guides: aiGuides,
      custom: true,
    };
    onAdd(car, aiSpecs.length ? aiSpecs : undefined);
    onClose();
    if (!fromDb) fetchFiltersInBackground(id, selectedEngine?.name);
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
          {/* Распознавание по фото СТС */}
          <div>
            <input ref={stsCameraRef} type="file" accept="image/*" capture="environment" onChange={handleStsPhoto} className="hidden" />
            <input ref={stsGalleryRef} type="file" accept="image/*" onChange={handleStsPhoto} className="hidden" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => stsCameraRef.current?.click()}
                disabled={stsLoading}
                className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-golos font-semibold disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {stsLoading
                  ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  : <Icon name="Camera" size={16} />}
                Сфотографировать СТС
              </button>
              <button
                type="button"
                onClick={() => stsGalleryRef.current?.click()}
                disabled={stsLoading}
                className="shrink-0 px-4 rounded-xl bg-secondary text-foreground border border-border disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center"
                title="Выбрать из галереи"
              >
                <Icon name="Image" size={16} />
              </button>
            </div>
            <p className="text-xs font-golos text-muted-foreground mt-1.5 text-center">
              Сфоткай свидетельство — данные заполнятся сами
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs font-golos text-muted-foreground">или по номеру</span>
            <div className="h-px bg-border flex-1" />
          </div>

          {/* VIN (опционально) */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">
              VIN / номер кузова <span className="text-muted-foreground/60 normal-case">— необязательно</span>
            </label>
            <div className="flex gap-2">
              <input
                value={vin}
                onChange={(e) => { setVin(e.target.value.toUpperCase().slice(0, 20)); setVinResult(null); }}
                placeholder="VIN или № кузова (GX110-...)"
                maxLength={20}
                autoCapitalize="characters"
                className="flex-1 min-w-0 bg-secondary rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-foreground placeholder:text-muted-foreground placeholder:font-golos placeholder:tracking-normal border border-transparent focus:outline-none focus:border-ring transition-colors"
              />
              <button
                type="button"
                onClick={decodeVin}
                disabled={vinLoading || vin.trim().length < 3}
                className="shrink-0 px-4 rounded-xl bg-foreground text-background text-sm font-golos font-semibold disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {vinLoading
                  ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  : <Icon name="Search" size={15} />}
                Найти
              </button>
            </div>
            {vinResult && (
              <p className={`text-xs font-golos mt-1.5 flex items-start gap-1 ${vinResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                <Icon name={vinResult.ok ? "CircleCheck" : "CircleAlert"} size={13} className="shrink-0 mt-0.5" />
                {vinResult.msg}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs font-golos text-muted-foreground">или вручную</span>
            <div className="h-px bg-border flex-1" />
          </div>

          {/* Марка */}
          <div ref={brandRef} className="relative">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Марка</label>
            <input
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              onFocus={() => { if (brandSuggestions.length > 0) setShowBrandDropdown(true); }}
              placeholder="Toyota, УАЗ, Lada..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
            />
            {showBrandDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                {brandSuggestions.map((b) => (
                  <button key={b} type="button" onMouseDown={() => selectBrand(b)}
                    className="w-full px-4 py-2.5 text-left text-sm font-golos text-foreground hover:bg-secondary transition-colors">
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Модель */}
          <div ref={modelRef} className="relative">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Модель</label>
            <input
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              onFocus={() => {
                const models = CAR_MODELS[brand] ?? [];
                if (models.length > 0) {
                  const q = model.toLowerCase();
                  const filtered = q ? models.filter(m => m.toLowerCase().startsWith(q)).slice(0, 6) : models.slice(0, 6);
                  setModelSuggestions(filtered);
                  setShowModelDropdown(filtered.length > 0);
                }
              }}
              placeholder="Camry, Патриот, Веста..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
            />
            {showModelDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                {modelSuggestions.map((m) => (
                  <button key={m} type="button" onMouseDown={() => selectModel(m)}
                    className="w-full px-4 py-2.5 text-left text-sm font-golos text-foreground hover:bg-secondary transition-colors">
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Поколение */}
          {generations.length > 0 && (
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Поколение</label>
              <div className="flex flex-wrap gap-1.5">
                {generations.map((g) => {
                  const isSelected = generation?.name === g.name;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => selectGeneration(g)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-golos transition-all ${
                        isSelected
                          ? "border-ring bg-ring/10 text-foreground"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{g.name}</span>
                      <span className="ml-1.5 opacity-60">{g.years}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Год и интервал */}
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

          {/* Фото автомобиля */}
          {(carImageLoading || carImage) && (
            <div className="rounded-xl overflow-hidden border border-border bg-secondary">
              {carImageLoading ? (
                <div className="w-full h-40 flex items-center justify-center">
                  <Icon name="Loader" size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <img
                  src={carImage}
                  alt={`${brand} ${model}`}
                  className="w-full h-40 object-cover"
                  onError={() => setCarImage("")}
                />
              )}
            </div>
          )}

          {/* КПП */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">КПП</label>
            <div className="flex gap-2">
              {(["auto", "manual"] as const).map((t) => {
                const label = t === "auto" ? "Автомат" : "Механика";
                const isSelected = transmission === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransmission(isSelected ? "" : t)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-golos transition-all ${
                      isSelected
                        ? "border-ring bg-ring/10 text-foreground font-medium"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {!enginesLoaded && (
            <button
              onClick={() => handleFetchEngines()}
              disabled={!canFetchEngines || enginesLoading}
              className="w-full py-3 rounded-xl border border-ring/40 bg-secondary text-sm font-golos font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {enginesLoading ? (
                <><Icon name="Loader" size={15} className="animate-spin text-muted-foreground" />Подбираю двигатели...</>
              ) : (
                <><Icon name="Sparkles" size={15} className="text-muted-foreground" />Подобрать двигатель</>
              )}
            </button>
          )}

          {enginesError && <p className="text-xs text-red-500 text-center">{enginesError}</p>}

          {fromDb && enginesLoaded && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5">
              <Icon name="Database" size={14} className="text-green-500 shrink-0" />
              <p className="text-xs text-green-600 font-golos">Данные загружены из базы</p>
            </div>
          )}

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
              <div className="flex flex-wrap gap-1.5">
                {engines.map((eng) => {
                  const isSelected = selectedEngine?.id === eng.id;
                  return (
                    <button
                      key={eng.id}
                      onClick={() => handleSelectEngine(eng)}
                      disabled={specsLoading}
                      className={`text-left px-3 py-1.5 rounded-lg border text-xs font-golos transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                        isSelected ? "border-ring bg-ring/10 text-foreground" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{eng.name}</span>
                      {isSelected && specsLoading && <Icon name="Loader" size={11} className="animate-spin text-muted-foreground flex-shrink-0" />}
                      {isSelected && specsLoaded && <Icon name="CheckCircle" size={11} className="text-green-500 flex-shrink-0" />}
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

          {specsError && <p className="text-xs text-red-500 text-center">{specsError}</p>}

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

          {specsLoaded && (
            <div className="flex items-center gap-2 px-1">
              <Icon name="Info" size={13} className="text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground font-golos">Инструкции по фильтрам подгрузятся после добавления</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium hover:bg-muted transition-colors">
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