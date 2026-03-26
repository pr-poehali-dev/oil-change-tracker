import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

import { scheduleOilNotifications, cancelOilNotifications, getScheduledRemaining } from "@/lib/notifications";
import {
  CarConfig, ManualGuide, Consumable,
  DEFAULT_SPECS,
} from "@/lib/cars";
import {
  apiGetCars, apiCreateCar, apiDeleteCar, apiUpdateCar,
  apiGetEntries, apiSaveEntry, apiDeleteEntry,
} from "@/api";
import AddCarModal from "@/components/AddCarModal";
import AddGuideModal from "@/components/AddGuideModal";

type DayEntry = { date: string; km: number };

function selectedCarKey() { return "selected_car_id"; }
function loadSelectedCarId(): string {
  return localStorage.getItem(selectedCarKey()) || "";
}

// ─── Date helpers ─────────────────────────────────────────────────
function getTodayStr() { return new Date().toISOString().split("T")[0]; }
function formatDate(str: string) {
  return new Date(str + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}
function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1;
}
const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

// ─── Component ────────────────────────────────────────────────────
export default function Index() {
  const navigate = useNavigate();
  const [customCars, setCustomCars] = useState<CarConfig[]>([]);
  const [customSpecs, setCustomSpecs] = useState<Record<string, [string, string][]>>({});
  const [carsLoaded, setCarsLoaded] = useState(false);
  const allCars = customCars;

  const [selectedCarId, setSelectedCarId] = useState<string>(loadSelectedCarId);

  const [carDropdownOpen, setCarDropdownOpen] = useState(false);
  const [showAddCar, setShowAddCar] = useState(false);
  const [showAddGuide, setShowAddGuide] = useState(false);
  const [confirmDeleteCar, setConfirmDeleteCar] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const car = allCars.find((c) => c.id === selectedCarId) ?? allCars[0] ?? null;
  const OIL_INTERVAL = car?.oilInterval ?? 0;

  const [tab, setTab] = useState<"counter" | "calendar" | "instructions" | "consumables">("counter");
  const [dailyInput, setDailyInput] = useState("");
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [totalKm, setTotalKm] = useState<number>(0);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<number | null>(null);

  const remaining = OIL_INTERVAL > 0 ? Math.max(0, OIL_INTERVAL - totalKm) : 0;
  const progress = OIL_INTERVAL > 0 ? Math.min(1, totalKm / OIL_INTERVAL) : 0;
  const urgency = progress >= 1 ? "danger" : progress >= 0.8 ? "warn" : "ok";

  // Загрузка кастомных авто из БД
  useEffect(() => {
    apiGetCars().then((cars: Array<CarConfig & { specs?: [string,string][] }>) => {
      setCustomCars(cars.map(({ specs: _specs, ...c }) => c));
      const specsMap: Record<string, [string,string][]> = {};
      cars.forEach((c) => { if (c.specs?.length) specsMap[c.id] = c.specs; });
      setCustomSpecs(specsMap);
      setCarsLoaded(true);
    }).catch(() => setCarsLoaded(true));
  }, []);

  // Загрузка записей пробега при смене авто
  const loadEntriesForCar = useCallback((carId: string) => {
    apiGetEntries(carId).then((data: DayEntry[]) => {
      setEntries(data);
      setTotalKm(data.reduce((s, e) => +(s + e.km).toFixed(1), 0));
    }).catch(() => { setEntries([]); setTotalKm(0); });
  }, []);

  // Переключение автомобиля
  useEffect(() => {
    if (!selectedCarId) return;
    localStorage.setItem(selectedCarKey(), selectedCarId);
    setActiveGuide(null);
    setOpenStep(null);
    setTab("counter");
    if (carsLoaded) {
      loadEntriesForCar(selectedCarId);
    }
  }, [selectedCarId, carsLoaded, loadEntriesForCar]);

  // Локальные уведомления
  useEffect(() => {
    if (!car) return;
    const carName = `${car.brand} ${car.model}`;
    const prev = getScheduledRemaining();
    if (remaining < 300) {
      if (prev === null || Math.abs(prev - remaining) >= 10) {
        scheduleOilNotifications(Math.round(remaining), carName);
      }
    } else {
      if (prev !== null) cancelOilNotifications();
    }
  }, [remaining, car]);

  // Закрытие дропдауна при клике снаружи
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCarDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function showNotif(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2800);
  }

  async function handleAddKm() {
    const val = parseFloat(dailyInput.replace(",", "."));
    if (!val || val <= 0) return;
    const today = getTodayStr();
    const existing = entries.find((e) => e.date === today);
    const newKm = existing ? +(existing.km + val).toFixed(1) : val;
    const newEntries = existing
      ? entries.map((e) => e.date === today ? { ...e, km: newKm } : e)
      : [...entries, { date: today, km: val }];
    const newTotal = +(totalKm + val).toFixed(1);
    setEntries(newEntries);
    setTotalKm(newTotal);
    setDailyInput("");
    if (car) apiSaveEntry(car.id, today, newKm).catch(() => {});
    if (newTotal >= OIL_INTERVAL) {
      showNotif("Пора менять масло! Пробег достигнут.");
    } else if (newTotal >= OIL_INTERVAL * 0.8) {
      showNotif(`Осталось ${Math.round(OIL_INTERVAL - newTotal)} км до замены`);
    }
  }

  async function handleReset() {
    if (!car) return;
    for (const e of entries) {
      await apiDeleteEntry(car.id, e.date).catch(() => {});
    }
    setEntries([]);
    setTotalKm(0);
    setConfirmReset(false);
    showNotif("Счётчик сброшен. Новый отсчёт!");
  }

  async function handleAddCar(newCar: CarConfig, specs?: [string, string][]) {
    await apiCreateCar({ ...newCar, specs: specs ?? [] });
    setCustomCars((prev) => [...prev, newCar]);
    if (specs?.length) {
      setCustomSpecs((prev) => ({ ...prev, [newCar.id]: specs }));
    }
    setSelectedCarId(newCar.id);
    showNotif(`${newCar.brand} ${newCar.model} добавлен!`);
  }

  async function handleDeleteCar() {
    if (!car) return;
    const id = car.id;
    await apiDeleteCar(id).catch(() => {});
    const remaining = customCars.filter((c) => c.id !== id);
    setCustomCars(remaining);
    setCustomSpecs((prev) => { const s = { ...prev }; delete s[id]; return s; });
    setSelectedCarId(remaining[0]?.id ?? "");
    setConfirmDeleteCar(false);
    showNotif("Автомобиль удалён");
  }

  async function handleFiltersReady(carId: string, filterGuides: ManualGuide[]) {
    setCustomCars((prev) =>
      prev.map((c) => {
        if (c.id !== carId) return c;
        const existingIds = new Set(filterGuides.map((g) => g.id));
        const kept = c.guides.filter((g) => !existingIds.has(g.id));
        const updatedGuides = [...kept, ...filterGuides];
        apiUpdateCar(carId, { guides: updatedGuides }).catch(() => {});
        return { ...c, guides: updatedGuides };
      })
    );
    showNotif("Инструкции по фильтрам загружены!");
  }

  async function handleAddGuide(guide: ManualGuide) {
    if (!car) return;
    const updatedGuides = [...car.guides, guide];
    setCustomCars((prev) =>
      prev.map((c) => c.id === car.id ? { ...c, guides: updatedGuides } : c)
    );
    await apiUpdateCar(car.id, { guides: updatedGuides }).catch(() => {});
    showNotif("Инструкция добавлена!");
    setActiveGuide(guide.id);
  }

  async function handleDeleteGuide(guideId: string) {
    if (!car) return;
    const updatedGuides = car.guides.filter((g) => g.id !== guideId);
    setCustomCars((prev) =>
      prev.map((c) => c.id === car.id ? { ...c, guides: updatedGuides } : c)
    );
    await apiUpdateCar(car.id, { guides: updatedGuides }).catch(() => {});
    setActiveGuide(null);
    setOpenStep(null);
    showNotif("Инструкция удалена");
  }

  const [filtersRefreshing, setFiltersRefreshing] = useState(false);
  const [consumablesLoading, setConsumablesLoading] = useState(false);

  async function handleRefreshFilters() {
    if (!car?.custom || filtersRefreshing) return;
    setFiltersRefreshing(true);
    try {
      const baseBody = { brand: car.brand, model: car.model, year: car.year, carId: car.id, forceRefresh: true, ...(car.engine ? { engine: car.engine } : {}) };
      const specsRes = await fetch("https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseBody),
      });
      const filtersRes = await fetch("https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseBody, mode: "filters" }),
      });
      const specsData = await specsRes.json();
      const filtersData = await filtersRes.json();
      const oilGuides: ManualGuide[] = specsData.guides || [];
      const filterGuides: ManualGuide[] = (filtersData.filters || []).map((f: ManualGuide) => ({
        id: f.id, title: f.title, icon: f.icon, steps: f.steps || [],
        article: f.article, interval: f.interval,
      }));
      const customGuides = car.guides.filter((g) => g.id.startsWith("custom_"));
      const updatedGuides = [...oilGuides, ...filterGuides, ...customGuides];
      setCustomCars((prev) =>
        prev.map((c) => c.id === car.id ? { ...c, guides: updatedGuides } : c)
      );
      await apiUpdateCar(car.id, { guides: updatedGuides }).catch(() => {});
      showNotif("Инструкции обновлены!");
    } catch {
      showNotif("Не удалось обновить инструкции");
    } finally {
      setFiltersRefreshing(false);
    }
  }

  const CAR_SPECS_URL = "https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23";

  async function handleLoadConsumables(forceRefresh = false) {
    if (!car || consumablesLoading) return;
    if (!forceRefresh && car.consumables && car.consumables.length > 0) return;
    setConsumablesLoading(true);
    try {
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: car.brand, model: car.model, year: car.year,
          carId: car.id, mode: "consumables", forceRefresh,
          ...(car.engine ? { engine: car.engine } : {}),
        }),
      });
      const data = await res.json();
      const list: Consumable[] = data.consumables || [];
      if (list.length > 0) {
        setCustomCars((prev) =>
          prev.map((c) => c.id === car.id ? { ...c, consumables: list } : c)
        );
        await apiUpdateCar(car.id, { consumables: list }).catch(() => {});
      }
    } catch {
      showNotif("Не удалось загрузить расходники");
    } finally {
      setConsumablesLoading(false);
    }
  }

  const circumference = 2 * Math.PI * 54;
  const dash = circumference * (1 - progress);
  const urgencyColor = urgency === "danger" ? "#e05a2b" : urgency === "warn" ? "#c9922a" : "#4a7c59";

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const entryMap = Object.fromEntries(entries.map((e) => [e.date, e.km]));

  const guide = car?.guides.find((g) => g.id === activeGuide) ?? null;
  const allSpecs = { ...DEFAULT_SPECS, ...customSpecs };
  const specs = car ? (allSpecs[car.id] ?? []) : [];

  const TABS = [
    { id: "counter", label: "Счётчик" },
    { id: "calendar", label: "Календарь" },
    { id: "instructions", label: "Инструкции" },
    { id: "consumables", label: "Расходники" },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="pt-8 pb-4 px-6 max-w-md mx-auto w-full flex items-center justify-between">
        <Logo className="w-32 h-auto" />
        <button
          onClick={() => navigate("/settings")}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-secondary transition-colors"
        >
          <Icon name="Settings" size={18} />
        </button>
      </header>

      {/* Car selector dropdown */}
      <div className="px-6 max-w-md mx-auto w-full mb-3" ref={dropdownRef}>
        {!car ? (
          <button
            onClick={() => setShowAddCar(true)}
            className="w-full bg-card border border-dashed border-border rounded-2xl px-4 py-4 flex items-center gap-3 hover:border-muted-foreground transition-colors"
          >
            <Icon name="Plus" size={16} className="text-muted-foreground" />
            <span className="font-golos text-sm text-muted-foreground">Добавить первый автомобиль</span>
          </button>
        ) : (
        <button
          onClick={() => setCarDropdownOpen((v) => !v)}
          className="w-full bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between hover:border-muted-foreground transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Icon name="Car" size={15} className="text-muted-foreground" />
            <span className="font-golos text-sm font-semibold text-foreground">{car.brand} {car.model}</span>
            <span className="font-mono text-xs text-muted-foreground">{car.year}</span>
            {car.engine && <span className="font-mono text-xs text-muted-foreground hidden sm:inline">· {car.engine}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">интервал {OIL_INTERVAL.toLocaleString("ru-RU")} км</span>
            <Icon
              name="ChevronDown" size={14}
              className="text-muted-foreground transition-transform duration-200"
              style={{ transform: carDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </div>
        </button>
        )}

        {carDropdownOpen && (
          <div className="absolute z-40 mt-1 w-[calc(100%-3rem)] max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            {allCars.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCarId(c.id); setCarDropdownOpen(false); }}
                className={`w-full px-4 py-3.5 flex items-center justify-between hover:bg-secondary transition-colors text-left border-b border-border/50`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon name="Car" size={14} className={c.id === selectedCarId ? "text-foreground" : "text-muted-foreground"} />
                  <span className={`font-golos text-sm font-semibold ${c.id === selectedCarId ? "text-foreground" : "text-muted-foreground"}`}>
                    {c.brand} {c.model}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{c.year}</span>

                </div>
                {c.id === selectedCarId && <Icon name="Check" size={14} className="text-foreground shrink-0" />}
              </button>
            ))}
            <button
              onClick={() => { setCarDropdownOpen(false); setShowAddCar(true); }}
              className="w-full px-4 py-3.5 flex items-center gap-2.5 hover:bg-secondary transition-colors text-left"
            >
              <Icon name="Plus" size={14} className="text-muted-foreground" />
              <span className="font-golos text-sm text-muted-foreground">Добавить автомобиль</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`px-6 max-w-md mx-auto w-full${!car ? " hidden" : ""}`}>
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "instructions") { setActiveGuide(null); setOpenStep(null); }
                if (t.id === "consumables") { handleLoadConsumables(); }
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-golos font-medium transition-all duration-200 ${
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>



      {/* Confirm reset dialog */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <Icon name="RotateCcw" size={22} className="text-destructive" />
            </div>
            <p className="font-golos font-bold text-foreground text-base mb-1">Сбросить счётчик?</p>
            <p className="text-sm text-muted-foreground font-golos leading-relaxed mb-5">
              Весь накопленный пробег и история будут удалены. Это действие нельзя отменить.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium hover:bg-muted transition-colors">Отмена</button>
              <button onClick={handleReset} className="flex-1 py-3 rounded-xl bg-destructive text-white text-sm font-golos font-semibold hover:opacity-85 active:scale-95 transition-all">Сбросить</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete car */}
      {confirmDeleteCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <Icon name="Trash2" size={22} className="text-destructive" />
            </div>
            <p className="font-golos font-bold text-foreground text-base mb-1">Удалить автомобиль?</p>
            <p className="text-sm text-muted-foreground font-golos leading-relaxed mb-5">
              «{car.brand} {car.model}» и все его данные будут удалены без возможности восстановления.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteCar(false)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium hover:bg-muted transition-colors">Отмена</button>
              <button onClick={handleDeleteCar} className="flex-1 py-3 rounded-xl bg-destructive text-white text-sm font-golos font-semibold hover:opacity-85 active:scale-95 transition-all">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddCar && <AddCarModal onAdd={handleAddCar} onFiltersReady={handleFiltersReady} onClose={() => setShowAddCar(false)} />}
      {showAddGuide && <AddGuideModal onAdd={handleAddGuide} onClose={() => setShowAddGuide(false)} />}

      <main className={`flex-1 px-6 pt-5 pb-10 max-w-md mx-auto w-full${!car ? " hidden" : ""}`}>

        {/* ── СЧЁТЧИК ── */}
        {tab === "counter" && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-card rounded-3xl p-8 flex flex-col items-center border border-border">
              <div className="relative" style={{ width: 128, height: 128 }}>
                <svg width="128" height="128" viewBox="0 0 128 128" style={{ position: "absolute", top: 0, left: 0 }}>
                  <circle cx="64" cy="64" r="54" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
                  <circle
                    cx="64" cy="64" r="54" fill="none"
                    stroke={urgencyColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={dash}
                    transform="rotate(-90 64 64)"
                    style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span className="font-mono text-2xl font-medium text-foreground leading-none">{totalKm.toLocaleString("ru-RU")}</span>
                  <span className="text-xs font-mono text-muted-foreground mt-1">из {OIL_INTERVAL.toLocaleString("ru-RU")}</span>
                </div>
              </div>

              <div className="w-full border-t border-border pt-5 mt-5 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">До замены</p>
                  <p className="text-xl font-mono font-medium mt-0.5" style={{ color: urgencyColor }}>
                    {remaining > 0 ? `${remaining.toLocaleString("ru-RU")} км` : "0 км"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: urgencyColor + "20" }}>
                  <Icon name={urgency === "danger" ? "AlertTriangle" : urgency === "warn" ? "AlertCircle" : "CheckCircle2"} size={20} style={{ color: urgencyColor }} />
                </div>
              </div>

              {remaining <= 300 && remaining > 0 && (
                <div className="w-full mt-4 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3">
                  <Icon name="AlertCircle" size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-golos text-amber-800 leading-snug">Допустимая норма пробега скоро закончится. Замените масло.</p>
                </div>
              )}
              {remaining === 0 && (
                <div className="w-full mt-4 flex items-start gap-3 bg-red-50 border border-red-400 rounded-2xl px-4 py-3">
                  <Icon name="AlertTriangle" size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-golos font-semibold text-red-700 leading-snug">Эксплуатация автомобиля небезопасна! Замените масло.</p>
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <p className="text-sm font-golos font-semibold text-foreground">Пробег за сегодня</p>
              <div className="flex gap-2 items-center">
                <input
                  type="number" min="0" step="0.1"
                  value={dailyInput}
                  onChange={(e) => setDailyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKm()}
                  placeholder="0"
                  className="flex-1 bg-secondary rounded-xl px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
                />
                <span className="text-sm text-muted-foreground font-mono">км</span>
                <button onClick={handleAddKm} className="bg-foreground text-background rounded-xl px-5 py-3 text-sm font-golos font-semibold hover:opacity-80 active:scale-95 transition-all">Добавить</button>
              </div>
            </div>

            <button
              onClick={() => setConfirmReset(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-destructive/30 bg-destructive/5 text-destructive text-sm font-golos font-semibold hover:bg-destructive/10 hover:border-destructive/50 active:scale-95 transition-all"
            >
              <Icon name="RotateCcw" size={15} className="text-destructive" />
              Сбросить счётчик после замены масла
            </button>

            {car?.custom && (
              <button
                onClick={() => setConfirmDeleteCar(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border text-muted-foreground text-sm font-golos hover:text-destructive hover:border-destructive/30 active:scale-95 transition-all"
              >
                <Icon name="Trash2" size={15} />
                Удалить этот автомобиль
              </button>
            )}
          </div>
        )}

        {/* ── КАЛЕНДАРЬ ── */}
        {tab === "calendar" && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Icon name="ChevronLeft" size={16} />
                </button>
                <p className="font-golos font-semibold text-foreground">{MONTH_NAMES[calMonth]} {calYear}</p>
                <button
                  onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Icon name="ChevronRight" size={16} />
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d) => (
                  <div key={d} className="text-center text-xs font-mono text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const km = entryMap[dateStr];
                  const isToday = dateStr === getTodayStr();
                  return (
                    <div key={day} className="flex flex-col items-center py-0.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-mono transition-all ${
                        isToday ? "bg-foreground text-background font-semibold"
                        : km !== undefined ? "bg-accent/15 text-foreground"
                        : "text-foreground/70"
                      }`}>{day}</div>
                      {km !== undefined && (
                        <span className="text-[9px] font-mono text-muted-foreground mt-0.5 leading-none">{km}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-5 px-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-foreground" />
                <span className="text-xs text-muted-foreground font-golos">Сегодня</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-accent/20" />
                <span className="text-xs text-muted-foreground font-golos">Пробег внесён</span>
              </div>
            </div>

            {entries.length > 0 ? (
              <div className="bg-card rounded-2xl border border-border p-5">
                <p className="text-sm font-golos font-semibold text-foreground mb-3">История пробега</p>
                <div>
                  {[...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((e, idx, arr) => (
                    <div key={e.date} className={`flex justify-between items-center py-2.5 ${idx < arr.length - 1 ? "border-b border-border/50" : ""}`}>
                      <span className="text-sm text-foreground/70 font-golos">{formatDate(e.date)}</span>
                      <span className="font-mono text-sm font-medium text-foreground">+{e.km.toLocaleString("ru-RU")} км</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm font-golos">
                Пока нет записей.<br />Добавьте первый пробег в счётчике.
              </div>
            )}
          </div>
        )}

        {/* ── ИНСТРУКЦИИ: список ── */}
        {tab === "instructions" && !activeGuide && (
          <div className="animate-fade-in space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider px-1 mb-2">
              Инструкции для {car?.brand} {car?.model}
            </p>
            {car?.guides.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGuide(g.id)}
                className="w-full bg-card border border-border rounded-2xl overflow-hidden hover:border-muted-foreground transition-colors text-left"
              >
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Icon name={g.icon as "Droplets"} size={18} className="text-foreground" />
                    </div>
                    <div>
                      <p className="font-golos font-semibold text-foreground text-sm">{g.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="font-mono text-xs text-muted-foreground">{g.steps.length} шагов</p>
                        {g.article && <p className="font-mono text-xs text-muted-foreground">· {g.article}</p>}
                        {g.interval && <p className="font-mono text-xs text-muted-foreground">· {g.interval}</p>}
                      </div>
                    </div>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}

            {car?.guides.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm font-golos">
                Инструкций пока нет.<br />Добавьте свою ниже.
              </div>
            )}

            {car?.custom && (
              <button
                onClick={handleRefreshFilters}
                disabled={filtersRefreshing}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-secondary text-foreground text-sm font-golos hover:bg-muted active:scale-95 transition-all disabled:opacity-60"
              >
                <Icon name={filtersRefreshing ? "Loader2" : "RefreshCw"} size={15} className={filtersRefreshing ? "animate-spin" : ""} />
                {filtersRefreshing ? "Обновляю инструкции..." : "Обновить инструкции по фильтрам"}
              </button>
            )}

            <button
              onClick={() => setShowAddGuide(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-border text-muted-foreground text-sm font-golos hover:text-foreground hover:border-muted-foreground active:scale-95 transition-all"
            >
              <Icon name="Plus" size={15} />
              Добавить инструкцию
            </button>
          </div>
        )}

        {/* ── ИНСТРУКЦИИ: конкретная ── */}
        {tab === "instructions" && activeGuide && guide && (
          <div className="animate-fade-in space-y-3">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => { setActiveGuide(null); setOpenStep(null); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-golos"
              >
                <Icon name="ChevronLeft" size={15} />
                Назад к инструкциям
              </button>
              {guide.id.startsWith("custom_") && (
                <button
                  onClick={() => handleDeleteGuide(guide.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors font-golos"
                >
                  <Icon name="Trash2" size={13} />
                  Удалить
                </button>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4">
                <p className="font-golos font-bold text-foreground text-base">{guide.title}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{car.brand} {car.model} · {car.year}{car.engine ? ` · ${car.engine}` : ""}</p>
                {(guide.article || guide.interval) && (
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {guide.article && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-secondary px-2.5 py-1 rounded-lg text-foreground">
                        <Icon name="Tag" size={11} className="text-muted-foreground" />
                        {guide.article}
                      </span>
                    )}
                    {guide.interval && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-secondary px-2.5 py-1 rounded-lg text-foreground">
                        <Icon name="Clock" size={11} className="text-muted-foreground" />
                        {guide.interval}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground font-golos leading-relaxed mt-2">
                  Пошаговое руководство: {guide.steps.length} шагов.
                </p>
              </div>
            </div>

            {guide.steps.map((section) => {
              const isOpen = openStep === section.step;
              return (
                <div key={section.step} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <button
                    onClick={() => setOpenStep(isOpen ? null : section.step)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <span className="font-mono text-xs font-medium text-foreground">{section.step}</span>
                      </div>
                      <span className="font-golos font-semibold text-foreground text-sm text-left">{section.title}</span>
                    </div>
                    <Icon
                      name="ChevronDown" size={16}
                      className="text-muted-foreground transition-transform duration-200 shrink-0 ml-2"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-2 border-t border-border/50 space-y-2.5 animate-fade-in">
                      {section.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-[7px]" />
                          <p className="text-sm text-foreground/80 font-golos leading-relaxed">{item}</p>
                        </div>
                      ))}
                      {section.warning && (
                        <div className="mt-1 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                          <Icon name="AlertTriangle" size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800 font-golos leading-relaxed">{section.warning}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {specs.length > 0 && (
              <div className="bg-card rounded-2xl border border-border px-5 py-4">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Расходники</p>
                <div className="space-y-2.5">
                  {specs.map(([key, val]) => (
                    <div key={key} className="flex justify-between items-start gap-4 border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{key}</span>
                      <span className="text-xs font-golos text-foreground text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── РАСХОДНИКИ ── */}
        {tab === "consumables" && (
          <div className="animate-fade-in space-y-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider px-1">
              Расходники для {car?.brand} {car?.model} {car?.year}
            </p>

            {consumablesLoading && (
              <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center gap-3">
                <Icon name="Loader2" size={28} className="text-muted-foreground animate-spin" />
                <p className="text-sm font-golos text-muted-foreground">ИИ подбирает расходники...</p>
                <p className="text-xs font-mono text-muted-foreground/60">Это займёт несколько секунд</p>
              </div>
            )}

            {!consumablesLoading && (!car?.consumables || car.consumables.length === 0) && (
              <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                  <Icon name="Package" size={22} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-golos text-foreground font-semibold">Список расходников пуст</p>
                <p className="text-xs font-golos text-muted-foreground leading-relaxed">ИИ подберёт масло, фильтры, свечи и другие расходники для вашего автомобиля</p>
                <button
                  onClick={() => handleLoadConsumables(true)}
                  className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-golos font-semibold hover:opacity-80 active:scale-95 transition-all"
                >
                  <Icon name="Sparkles" size={15} />
                  Подобрать расходники
                </button>
              </div>
            )}

            {!consumablesLoading && car?.consumables && car.consumables.length > 0 && (() => {
              const grouped = car.consumables.reduce<Record<string, Consumable[]>>((acc, c) => {
                if (!acc[c.category]) acc[c.category] = [];
                acc[c.category].push(c);
                return acc;
              }, {});
              return (
                <>
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="bg-card rounded-2xl border border-border overflow-hidden">
                      <div className="px-5 py-3 border-b border-border/50 bg-secondary/30">
                        <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">{category}</p>
                      </div>
                      <div className="divide-y divide-border/40">
                        {items.map((item) => (
                          <div key={item.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <p className="font-golos font-semibold text-foreground text-sm leading-snug">{item.name}</p>
                              {item.qty && (
                                <span className="shrink-0 text-xs font-mono bg-secondary text-foreground px-2 py-0.5 rounded-lg">{item.qty}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                              {item.spec && (
                                <span className="text-xs font-mono text-muted-foreground">{item.spec}</span>
                              )}
                              {item.article && (
                                <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                  <Icon name="Tag" size={10} className="text-muted-foreground/60" />
                                  {item.article}
                                </span>
                              )}
                              {item.interval && (
                                <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                  <Icon name="Clock" size={10} className="text-muted-foreground/60" />
                                  {item.interval}
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-xs font-golos text-muted-foreground/70 mt-1.5 leading-relaxed">{item.note}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => handleLoadConsumables(true)}
                    disabled={consumablesLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-secondary text-foreground text-sm font-golos hover:bg-muted active:scale-95 transition-all disabled:opacity-60"
                  >
                    <Icon name="RefreshCw" size={15} />
                    Обновить список расходников
                  </button>
                </>
              );
            })()}
          </div>
        )}

      </main>
    </div>
  );
}