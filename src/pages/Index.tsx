import { useState, useEffect, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

type DayEntry = { date: string; km: number };
type Car = { id: string; brand: string; model: string; year: string; interval: number };

const DEFAULT_INTERVAL = 10000;

// Ключи localStorage привязаны к carId
function entriesKey(carId: string) { return `oil_entries_${carId}`; }
function totalKey(carId: string)   { return `oil_total_${carId}`; }

function loadEntries(carId: string | null): DayEntry[] {
  if (!carId) return [];
  try { return JSON.parse(localStorage.getItem(entriesKey(carId)) || "[]"); }
  catch { return []; }
}

function loadTotal(carId: string | null): number {
  if (!carId) return 0;
  try { return Number(localStorage.getItem(totalKey(carId)) || "0"); }
  catch { return 0; }
}

function getTodayStr() { return new Date().toISOString().split("T")[0]; }

function formatDate(str: string) {
  return new Date(str + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

const MONTH_NAMES = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

function getActiveCar(): Car | null {
  try {
    const id = localStorage.getItem("oil_active_car");
    if (!id) return null;
    const cars: Car[] = JSON.parse(localStorage.getItem("oil_cars") || "[]");
    return cars.find((c) => c.id === id) ?? null;
  } catch { return null; }
}

export default function Index() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"counter" | "calendar">("counter");
  const [dailyInput, setDailyInput] = useState("");
  const [activeCar, setActiveCar] = useState<Car | null>(getActiveCar);
  const [entries, setEntries] = useState<DayEntry[]>(() => loadEntries(getActiveCar()?.id ?? null));
  const [totalKm, setTotalKm] = useState<number>(() => loadTotal(getActiveCar()?.id ?? null));
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [notification, setNotification] = useState<string | null>(null);

  const oilChangeKm = activeCar?.interval ?? DEFAULT_INTERVAL;
  const remaining = Math.max(0, oilChangeKm - totalKm);
  const progress = Math.min(1, totalKm / oilChangeKm);
  const urgency = progress >= 1 ? "danger" : progress >= 0.8 ? "warn" : "ok";

  // Сохраняем данные конкретного авто
  useEffect(() => {
    if (!activeCar) return;
    localStorage.setItem(entriesKey(activeCar.id), JSON.stringify(entries));
    localStorage.setItem(totalKey(activeCar.id), String(totalKm));
  }, [entries, totalKm, activeCar]);

  // При возврате на страницу перечитываем активное авто и его данные
  const refreshCar = useCallback(() => {
    const car = getActiveCar();
    setActiveCar(car);
    setEntries(loadEntries(car?.id ?? null));
    setTotalKm(loadTotal(car?.id ?? null));
  }, []);

  useEffect(() => {
    window.addEventListener("focus", refreshCar);
    return () => window.removeEventListener("focus", refreshCar);
  }, [refreshCar]);

  function showNotif(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2800);
  }

  function handleAddKm() {
    const val = parseFloat(dailyInput.replace(",", "."));
    if (!val || val <= 0) return;
    const today = getTodayStr();
    const existing = entries.find((e) => e.date === today);
    const newEntries = existing
      ? entries.map((e) => e.date === today ? { ...e, km: e.km + val } : e)
      : [...entries, { date: today, km: val }];
    const newTotal = totalKm + val;
    setEntries(newEntries);
    setTotalKm(newTotal);
    setDailyInput("");
    if (newTotal >= oilChangeKm) {
      showNotif("Пора менять масло! Пробег достигнут.");
    } else if (newTotal >= oilChangeKm * 0.8) {
      showNotif(`Осталось ${Math.round(oilChangeKm - newTotal)} км до замены`);
    }
  }

  function handleReset() {
    setEntries([]);
    setTotalKm(0);
    showNotif("Счётчик сброшен. Новый отсчёт!");
  }

  const circumference = 2 * Math.PI * 54;
  const dash = circumference * (1 - progress);
  const urgencyColor = urgency === "danger" ? "#e05a2b" : urgency === "warn" ? "#c9922a" : "#4a7c59";

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const entryMap = Object.fromEntries(entries.map((e) => [e.date, e.km]));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-10 pb-4 px-6 max-w-md mx-auto w-full flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-1">
            Контроль автомобиля
          </p>
          <h1 className="text-2xl font-golos font-bold text-foreground tracking-tight">
            Замена масла
          </h1>
        </div>
        <button
          onClick={() => navigate("/car")}
          className="mt-1 w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Icon name="Car" size={16} />
        </button>
      </header>

      {/* Active car banner */}
      <div className="px-6 max-w-md mx-auto w-full mb-3">
        {activeCar ? (
          <div
            onClick={() => navigate("/car")}
            className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-muted-foreground transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="Car" size={15} className="text-muted-foreground" />
              <span className="font-golos text-sm font-medium text-foreground">
                {activeCar.brand} {activeCar.model}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{activeCar.year}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-muted-foreground">
                {activeCar.interval.toLocaleString("ru-RU")} км
              </span>
              <Icon name="ChevronRight" size={13} className="text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate("/car")}
            className="bg-card border border-dashed border-border rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-foreground/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="Car" size={15} className="text-muted-foreground" />
              <span className="font-golos text-sm text-muted-foreground">Автомобиль не выбран</span>
            </div>
            <span className="font-golos text-xs text-muted-foreground underline underline-offset-2">Добавить</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 max-w-md mx-auto w-full">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {(["counter", "calendar"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-golos font-medium transition-all duration-200 ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "counter" ? "Счётчик" : "Календарь"}
            </button>
          ))}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-foreground text-background text-sm font-golos px-5 py-3 rounded-2xl shadow-lg whitespace-nowrap">
            {notification}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-6 pt-5 pb-10 max-w-md mx-auto w-full">
        {tab === "counter" && (
          <div className="animate-fade-in space-y-4">
            {/* Progress Ring */}
            <div className="bg-card rounded-3xl p-8 flex flex-col items-center border border-border">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg width="128" height="128" viewBox="0 0 128 128" className="absolute inset-0">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
                  <circle
                    cx="64" cy="64" r="54" fill="none"
                    stroke={urgencyColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={dash}
                    transform="rotate(-90 64 64)"
                    style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
                  />
                </svg>
                <div className="flex flex-col items-center z-10">
                  <span className="font-mono text-2xl font-medium text-foreground leading-none">
                    {totalKm.toLocaleString("ru-RU")}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground mt-1">
                    из {oilChangeKm.toLocaleString("ru-RU")}
                  </span>
                </div>
              </div>

              <div className="w-full border-t border-border pt-5 mt-5 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">До замены</p>
                  <p className="text-xl font-mono font-medium mt-0.5" style={{ color: urgencyColor }}>
                    {remaining > 0 ? `${remaining.toLocaleString("ru-RU")} км` : "Замените масло!"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: urgencyColor + "20" }}>
                  <Icon
                    name={urgency === "danger" ? "AlertTriangle" : urgency === "warn" ? "AlertCircle" : "CheckCircle2"}
                    size={20} style={{ color: urgencyColor }}
                  />
                </div>
              </div>
            </div>

            {/* No car selected */}
            {!activeCar && (
              <div className="bg-card border border-dashed border-border rounded-2xl px-5 py-4 flex items-center gap-3">
                <Icon name="Info" size={15} className="text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground font-golos">
                  Выберите автомобиль, чтобы вести отдельный счётчик
                </p>
              </div>
            )}

            {/* Input */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <p className="text-sm font-golos font-semibold text-foreground">Пробег за сегодня</p>
              <div className="flex gap-2 items-center">
                <input
                  type="number" min="0" step="0.1"
                  value={dailyInput}
                  onChange={(e) => setDailyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKm()}
                  placeholder="0"
                  disabled={!activeCar}
                  className="flex-1 bg-secondary rounded-xl px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors disabled:opacity-40"
                />
                <span className="text-sm text-muted-foreground font-mono">км</span>
                <button
                  onClick={handleAddKm}
                  disabled={!activeCar}
                  className="bg-foreground text-background rounded-xl px-5 py-3 text-sm font-golos font-semibold hover:opacity-80 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Добавить
                </button>
              </div>
            </div>

            {/* Reset */}
            {activeCar && (
              <button
                onClick={handleReset}
                className="w-full text-center text-sm text-muted-foreground hover:text-destructive transition-colors py-2 font-golos"
              >
                Сбросить счётчик после замены масла
              </button>
            )}
          </div>
        )}

        {tab === "calendar" && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Icon name="ChevronLeft" size={16} />
                </button>
                <p className="font-golos font-semibold text-foreground">
                  {MONTH_NAMES[calMonth]} {calYear}
                </p>
                <button
                  onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
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
                      }`}>
                        {day}
                      </div>
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
                {activeCar ? (
                  <>Пока нет записей.<br />Добавьте первый пробег в счётчике.</>
                ) : (
                  <>Выберите автомобиль,<br />чтобы увидеть историю пробега.</>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}