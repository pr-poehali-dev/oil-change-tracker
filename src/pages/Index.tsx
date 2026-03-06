import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

type DayEntry = { date: string; km: number };

const CAR = { brand: "Toyota", model: "Camry V30", year: "1990" };
const CAR_ID = "camry_v30_1990";
const OIL_INTERVAL = 5000;

const MANUAL = [
  {
    step: 1,
    title: "Подготовка",
    items: [
      "Прогрейте двигатель 5–7 минут и заглушите",
      "Подготовьте ёмкость для слива отработки (мин. 5 л)",
      "Моторное масло: 10W-30 или 10W-40 (4 л)",
      "Фильтр масляный: Toyota 90915-YZZD4 или аналог",
    ],
  },
  {
    step: 2,
    title: "Слив старого масла",
    items: [
      "Снимите защиту картера (если есть)",
      "Отверните сливную пробку картера (ключ 14 мм) против часовой стрелки",
      "Дайте маслу полностью стечь — 10–15 минут",
      "Замените уплотнительное кольцо пробки (при необходимости)",
    ],
  },
  {
    step: 3,
    title: "Замена фильтра",
    items: [
      "Масляный фильтр расположен с левой стороны двигателя",
      "Открутите фильтр специальным ключом или вручную",
      "Смажьте уплотнитель нового фильтра чистым маслом",
      "Заверните новый фильтр от руки, затем доверните на ¾ оборота",
    ],
  },
  {
    step: 4,
    title: "Заливка нового масла",
    items: [
      "Заверните сливную пробку картера и затяните (момент ~35 Н·м)",
      "Залейте масло через маслозаливную горловину (крышка сверху)",
      "Объём: 4,0 л (с заменой фильтра — 4,3 л)",
      "Проверьте уровень щупом: отметка MAX или между MIN и MAX",
    ],
  },
  {
    step: 5,
    title: "Проверка",
    items: [
      "Запустите двигатель на 1–2 минуты, следите за лампой давления масла",
      "Заглушите и проверьте нет ли течи под фильтром и пробкой",
      "Через 5 минут ещё раз проверьте уровень щупом",
      "Сбросьте счётчик замены масла в приложении",
    ],
  },
];

function entriesKey() { return `oil_entries_${CAR_ID}`; }
function totalKey()   { return `oil_total_${CAR_ID}`; }

function loadEntries(): DayEntry[] {
  try { return JSON.parse(localStorage.getItem(entriesKey()) || "[]"); }
  catch { return []; }
}

function loadTotal(): number {
  try { return Number(localStorage.getItem(totalKey()) || "0"); }
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

export default function Index() {
  const [tab, setTab] = useState<"counter" | "calendar" | "manual">("counter");
  const [dailyInput, setDailyInput] = useState("");
  const [entries, setEntries] = useState<DayEntry[]>(loadEntries);
  const [totalKm, setTotalKm] = useState<number>(loadTotal);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [notification, setNotification] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<number | null>(null);

  const remaining = Math.max(0, OIL_INTERVAL - totalKm);
  const progress = Math.min(1, totalKm / OIL_INTERVAL);
  const urgency = progress >= 1 ? "danger" : progress >= 0.8 ? "warn" : "ok";

  useEffect(() => {
    localStorage.setItem(entriesKey(), JSON.stringify(entries));
    localStorage.setItem(totalKey(), String(totalKm));
  }, [entries, totalKm]);

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
      ? entries.map((e) => e.date === today ? { ...e, km: +(e.km + val).toFixed(1) } : e)
      : [...entries, { date: today, km: val }];
    const newTotal = +(totalKm + val).toFixed(1);
    setEntries(newEntries);
    setTotalKm(newTotal);
    setDailyInput("");
    if (newTotal >= OIL_INTERVAL) {
      showNotif("Пора менять масло! Пробег достигнут.");
    } else if (newTotal >= OIL_INTERVAL * 0.8) {
      showNotif(`Осталось ${Math.round(OIL_INTERVAL - newTotal)} км до замены`);
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

  const TABS = [
    { id: "counter", label: "Счётчик" },
    { id: "calendar", label: "Календарь" },
    { id: "manual", label: "Мануал" },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-10 pb-4 px-6 max-w-md mx-auto w-full">
        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-1">
          Контроль автомобиля
        </p>
        <h1 className="text-2xl font-golos font-bold text-foreground tracking-tight">
          Замена масла
        </h1>
      </header>

      {/* Car badge */}
      <div className="px-6 max-w-md mx-auto w-full mb-3">
        <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon name="Car" size={15} className="text-muted-foreground" />
            <span className="font-golos text-sm font-semibold text-foreground">
              {CAR.brand} {CAR.model}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{CAR.year}</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            интервал {OIL_INTERVAL.toLocaleString("ru-RU")} км
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 max-w-md mx-auto w-full">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-golos font-medium transition-all duration-200 ${
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
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

        {/* ── СЧЁТЧИК ── */}
        {tab === "counter" && (
          <div className="animate-fade-in space-y-4">
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
                    из {OIL_INTERVAL.toLocaleString("ru-RU")}
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
                <button
                  onClick={handleAddKm}
                  className="bg-foreground text-background rounded-xl px-5 py-3 text-sm font-golos font-semibold hover:opacity-80 active:scale-95 transition-all"
                >
                  Добавить
                </button>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-center text-sm text-muted-foreground hover:text-destructive transition-colors py-2 font-golos"
            >
              Сбросить счётчик после замены масла
            </button>
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
                Пока нет записей.<br />Добавьте первый пробег в счётчике.
              </div>
            )}
          </div>
        )}

        {/* ── МАНУАЛ ── */}
        {tab === "manual" && (
          <div className="animate-fade-in space-y-3">
            <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-start gap-3">
              <Icon name="Info" size={15} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground font-golos leading-relaxed">
                Пошаговая инструкция по замене масла для <span className="font-medium text-foreground">Toyota Camry V30 (1990)</span>. Двигатель 3S-FE, объём картера 4,0–4,3 л.
              </p>
            </div>

            {MANUAL.map((section) => {
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
                      <span className="font-golos font-semibold text-foreground text-sm">{section.title}</span>
                    </div>
                    <Icon
                      name="ChevronDown"
                      size={16}
                      className="text-muted-foreground transition-transform duration-200"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 border-t border-border/50 space-y-2 animate-fade-in">
                      {section.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0 mt-2" />
                          <p className="text-sm text-foreground/80 font-golos leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="bg-card rounded-2xl border border-border px-5 py-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Расходники</p>
              <div className="space-y-2">
                {[
                  ["Масло", "10W-30 / 10W-40 минерал или полусинтетика"],
                  ["Объём", "4,0 л (с фильтром — 4,3 л)"],
                  ["Фильтр", "Toyota 90915-YZZD4 / MANN W67/1"],
                  ["Пробка картера", "М14×1,5, момент затяжки 35 Н·м"],
                  ["Интервал", "5 000 км или 6 месяцев"],
                ].map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{key}</span>
                    <span className="text-xs font-golos text-foreground text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
