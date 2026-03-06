import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

type DayEntry = { date: string; km: number };
type ManualStep = { step: number; title: string; items: string[]; img?: string; imgCaption?: string; warning?: string };
type ManualGuide = { id: string; title: string; icon: string; steps: ManualStep[] };

const CAR = { brand: "Toyota", model: "Camry V30", year: "1990" };
const CAR_ID = "camry_v30_1990";
const OIL_INTERVAL = 5000;

// ─── Фото из мануала ──────────────────────────────────────────────
const IMG_COVER  = "https://cdn.poehali.dev/files/6977bfd9-00ec-4e45-9319-c61c86e2004f.png";
const IMG_STEP4  = "https://cdn.poehali.dev/files/a66ca15e-b956-4a1f-ab09-cc792ee15ca5.png"; // ёмкость 10 л
const IMG_STEP5  = "https://cdn.poehali.dev/files/a66ca15e-b956-4a1f-ab09-cc792ee15ca5.png"; // сливная пробка
const IMG_STEP6  = "https://cdn.poehali.dev/files/a66ca15e-b956-4a1f-ab09-cc792ee15ca5.png"; // стекание масла
const IMG_STEP7  = "https://cdn.poehali.dev/files/01f5fcb8-6a5c-437d-9f3c-97ca70c047ba.png"; // фильтр
const IMG_STEP9  = "https://cdn.poehali.dev/files/01f5fcb8-6a5c-437d-9f3c-97ca70c047ba.png"; // новый фильтр
const IMG_STEP10 = "https://cdn.poehali.dev/files/72ba902e-f228-4d8c-953e-c4c680c2b53a.png"; // заливка масла
const IMG_STEP11 = "https://cdn.poehali.dev/files/72ba902e-f228-4d8c-953e-c4c680c2b53a.png"; // щуп
const IMG_STEP13 = "https://cdn.poehali.dev/files/4ac05869-fa60-42af-8b03-c318e14c7094.png"; // уровень после прогрева

const GUIDES: ManualGuide[] = [
  {
    id: "oil",
    title: "Замена масла",
    icon: "Droplets",
    steps: [
      {
        step: 1,
        title: "Прогрейте двигатель",
        items: [
          "Заведите двигатель и прогрейте до рабочей температуры.",
          "Достаточно проехать до гаража или другого места замены.",
        ],
        img: IMG_COVER,
        imgCaption: "Прогреть до рабочей температуры",
      },
      {
        step: 2,
        title: "Заглушите и поднимите машину",
        items: [
          "Заглушите двигатель и поднимите машину.",
          "Заедьте на эстакаду (яму) или воспользуйтесь автоподъёмником — не домкратом.",
          "Меняем масло самотёком через сливное отверстие — нужен доступ снизу.",
        ],
        warning: "Замена вакуумными установками через отверстие для щупа — плохой вариант, от него отказываемся.",
      },
      {
        step: 3,
        title: "Снимите защиту картера",
        items: [
          "Снимите защиту картера (если присутствует).",
          "На Toyota Camry V30 крепится болтами на 8 или 10 к подрамнику.",
        ],
        img: IMG_COVER,
        imgCaption: "Снять защиту картера",
      },
      {
        step: 4,
        title: "Подготовьте ёмкость для слива",
        items: [
          "Подготовьте ёмкость для сбора отработанного масла.",
          "Самодельная ёмкость из 10 л канистры с отрезанной стенкой — хороший вариант.",
          "Или используйте специальный поддон на 10 л.",
        ],
        img: IMG_STEP4,
        imgCaption: "Ёмкость 10 л для слива",
      },
      {
        step: 5,
        title: "Выкрутите сливную пробку",
        items: [
          "Найдите сливное отверстие на дне двигателя.",
          "Выкрутите пробку ключом на 17, предварительно подставив поддон.",
          "Учитывая возраст машины, пробка могла быть заменена — уточните ключ заранее.",
        ],
        img: IMG_STEP5,
        imgCaption: "Откручиваем сливную пробку ключом на 17",
        warning: "После извлечения пробки масло сразу интенсивно потечёт. Работайте в перчатках — струя горячая.",
      },
      {
        step: 6,
        title: "Дайте маслу стечь",
        items: [
          "Масло выливается быстро, затем поток замедляется до капель.",
          "Обычно процесс длится около 20 минут — дождитесь полного стекания.",
          "Можно открыть крышку маслозаливной горловины и вытащить щуп — масло стечёт быстрее.",
        ],
        img: IMG_STEP6,
        imgCaption: "Оставьте масло стекать ~20 минут",
        warning: "Не оставляйте щуп открытым надолго — увеличивается риск попадания грязи в мотор.",
      },
      {
        step: 7,
        title: "Выкрутите масляный фильтр",
        items: [
          "Пока вытекает масло, выкрутите отработанный масляный фильтр.",
          "Попробуйте открутить рукой, если не получится — используйте ключ со специальной насадкой.",
        ],
        img: IMG_STEP7,
        imgCaption: "Выкрутить отработанный фильтр",
        warning: "При выкручивании фильтра из него может вытечь немного масла. Подложите тряпки.",
      },
      {
        step: 8,
        title: "Установите сливную пробку",
        items: [
          "После полного стекания протрите отверстие чистой сухой тряпкой.",
          "Прикрутите пробку (желательно новую) с новой прокладкой.",
          "Стандартное усилие затяжки: 30–35 Н·м. Не затягивайте сильнее.",
          "Опционально: залейте 0,5 л нового масла, дайте стечь — смоет тяжёлые отложения.",
        ],
      },
      {
        step: 9,
        title: "Установите новый фильтр",
        items: [
          "Смажьте новым маслом уплотнительное кольцо фильтра.",
          "Закрутите рукой с небольшим усилием или динамометрическим ключом на 25 Н·м.",
        ],
        img: IMG_STEP9,
        imgCaption: "Смазать уплотнитель → установить новый фильтр",
        warning: "Не заливайте масло в фильтр перед установкой — насос сам прокачает его.",
      },
      {
        step: 10,
        title: "Залейте новое масло",
        items: [
          "Откройте крышку маслозаливной горловины.",
          "Заливайте порциями: сначала 80% объёма, подождите 2 минуты, проверьте уровень.",
          "Используйте широкую воронку — чтобы не проливать мимо горловины.",
        ],
        img: IMG_STEP10,
        imgCaption: "Залить масло → подождать 2 мин → проверить уровень",
      },
      {
        step: 11,
        title: "Проверьте уровень по щупу",
        items: [
          "Посмотрите на показания уровня и долейте масло до нужной отметки.",
          "Зона A (верхняя) — не добавляйте масло.",
          "Зона B (средняя) — желательно долить.",
          "Зона C (нижняя) — необходимо долить.",
          "Доливайте в несколько подходов с паузой и проверкой после каждой заливки.",
        ],
        img: IMG_STEP11,
        imgCaption: "Сверить показания уровня щупа",
        warning: "Перелив выше метки A создаст давление на сальники. Недолив ниже C — масляное голодание двигателя.",
      },
      {
        step: 12,
        title: "Запустите двигатель",
        items: [
          "Закройте заливную горловину и запустите двигатель.",
          "Дайте мотору поработать 2 минуты — фильтр заполнится маслом.",
        ],
        warning: "После запуска на приборке может мигнуть лампа давления масла — это нормально, почти сразу пропадёт.",
      },
      {
        step: 13,
        title: "Проверьте уровень после прогрева",
        items: [
          "Заглушите мотор и через 5 минут снова проверьте уровень масла.",
          "Фильтр забирает 200–250 мл — уровень может немного снизиться.",
          "Если нужно — долейте необходимое количество.",
        ],
        img: IMG_STEP13,
        imgCaption: "Заглушить → подождать 5 мин → проверить уровень",
      },
      {
        step: 14,
        title: "Проверьте герметичность",
        items: [
          "Запустите мотор и проверьте, нет ли утечек вокруг фильтра и сливной пробки.",
        ],
        img: IMG_STEP13,
        imgCaption: "Проверить утечки масла",
      },
      {
        step: 15,
        title: "Завершение",
        items: [
          "Закройте капот и установите на место защиту картера.",
          "Сбросьте напоминание об интервале замены на приборке по руководству.",
          "Сбросьте счётчик в приложении на вкладке «Счётчик».",
        ],
      },
    ],
  },
];

// ─── localStorage helpers ─────────────────────────────────────────
function entriesKey() { return `oil_entries_${CAR_ID}`; }
function totalKey()   { return `oil_total_${CAR_ID}`; }
function loadEntries(): DayEntry[] {
  try { return JSON.parse(localStorage.getItem(entriesKey()) || "[]"); } catch { return []; }
}
function loadTotal(): number {
  try { return Number(localStorage.getItem(totalKey()) || "0"); } catch { return 0; }
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
  const [tab, setTab] = useState<"counter" | "calendar" | "manual">("counter");
  const [dailyInput, setDailyInput] = useState("");
  const [entries, setEntries] = useState<DayEntry[]>(loadEntries);
  const [totalKm, setTotalKm] = useState<number>(loadTotal);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Manual navigation
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
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
    setConfirmReset(false);
    showNotif("Счётчик сброшен. Новый отсчёт!");
  }

  const circumference = 2 * Math.PI * 54;
  const dash = circumference * (1 - progress);
  const urgencyColor = urgency === "danger" ? "#e05a2b" : urgency === "warn" ? "#c9922a" : "#4a7c59";

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const entryMap = Object.fromEntries(entries.map((e) => [e.date, e.km]));

  const guide = GUIDES.find((g) => g.id === activeGuide) ?? null;

  const TABS = [
    { id: "counter", label: "Счётчик" },
    { id: "calendar", label: "Календарь" },
    { id: "manual", label: "Мануал" },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="pt-10 pb-4 px-6 max-w-md mx-auto w-full">
        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-1">Контроль автомобиля</p>
        <h1 className="text-2xl font-golos font-bold text-foreground tracking-tight">Замена масла</h1>
      </header>

      {/* Car badge */}
      <div className="px-6 max-w-md mx-auto w-full mb-3">
        <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon name="Car" size={15} className="text-muted-foreground" />
            <span className="font-golos text-sm font-semibold text-foreground">{CAR.brand} {CAR.model}</span>
            <span className="font-mono text-xs text-muted-foreground">{CAR.year}</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">интервал {OIL_INTERVAL.toLocaleString("ru-RU")} км</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 max-w-md mx-auto w-full">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id !== "manual") { setActiveGuide(null); setOpenStep(null); } }}
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

      {/* Confirm reset dialog */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm animate-scale-in shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <Icon name="RotateCcw" size={22} className="text-destructive" />
            </div>
            <p className="font-golos font-bold text-foreground text-base mb-1">Сбросить счётчик?</p>
            <p className="text-sm text-muted-foreground font-golos leading-relaxed mb-5">
              Весь накопленный пробег и история будут удалены. Это действие нельзя отменить.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium hover:bg-muted transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl bg-destructive text-white text-sm font-golos font-semibold hover:opacity-85 active:scale-95 transition-all"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 px-6 pt-5 pb-10 max-w-md mx-auto w-full">

        {/* ── СЧЁТЧИК ── */}
        {tab === "counter" && (
          <div className="animate-fade-in space-y-4">
            {/* Ring */}
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

            {/* Reset button — заметная */}
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-destructive/30 bg-destructive/5 text-destructive text-sm font-golos font-semibold hover:bg-destructive/10 hover:border-destructive/50 active:scale-95 transition-all"
            >
              <Icon name="RotateCcw" size={15} className="text-destructive" />
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

        {/* ── МАНУАЛ ── */}
        {tab === "manual" && !activeGuide && (
          <div className="animate-fade-in space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider px-1 mb-2">
              Инструкции для {CAR.brand} {CAR.model}
            </p>
            {GUIDES.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGuide(g.id)}
                className="w-full bg-card border border-border rounded-2xl px-5 py-4 flex items-center justify-between hover:border-muted-foreground transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Icon name={g.icon as "Droplets"} size={18} className="text-foreground" />
                  </div>
                  <div>
                    <p className="font-golos font-semibold text-foreground text-sm">{g.title}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">{g.steps.length} шагов</p>
                  </div>
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* ── МАНУАЛ: конкретная инструкция ── */}
        {tab === "manual" && activeGuide && guide && (
          <div className="animate-fade-in space-y-3">
            {/* Back + title */}
            <button
              onClick={() => { setActiveGuide(null); setOpenStep(null); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-golos mb-1"
            >
              <Icon name="ChevronLeft" size={15} />
              Назад к инструкциям
            </button>

            {/* Cover */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <img
                src={IMG_COVER}
                alt="Toyota Camry V30"
                className="w-full object-cover object-top"
                style={{ maxHeight: 160 }}
              />
              <div className="px-5 py-4">
                <p className="font-golos font-bold text-foreground text-base">Инструкция по замене масла</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">Toyota Camry V30 · 1990–1992 · двигатель 3S-FE</p>
                <p className="text-sm text-muted-foreground font-golos leading-relaxed mt-2">
                  Пошаговое руководство по замене моторного масла самотёком через сливное отверстие.
                </p>
              </div>
            </div>

            {/* Steps */}
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
                      {/* Image */}
                      {section.img && (
                        <div className="rounded-xl overflow-hidden bg-secondary mb-3">
                          <img
                            src={section.img}
                            alt={section.imgCaption ?? section.title}
                            className="w-full object-cover object-top"
                            style={{ maxHeight: 180 }}
                          />
                          {section.imgCaption && (
                            <p className="text-xs font-mono text-muted-foreground px-3 py-2">{section.imgCaption}</p>
                          )}
                        </div>
                      )}
                      {/* Items */}
                      {section.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-[7px]" />
                          <p className="text-sm text-foreground/80 font-golos leading-relaxed">{item}</p>
                        </div>
                      ))}
                      {/* Warning */}
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

            {/* Расходники */}
            <div className="bg-card rounded-2xl border border-border px-5 py-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Расходники</p>
              <div className="space-y-2.5">
                {[
                  ["Масло", "10W-30 / 10W-40 (минерал или полусинтетика)"],
                  ["Объём", "4,0 л (с заменой фильтра — 4,3 л)"],
                  ["Фильтр", "Toyota 90915-YZZD4 / MANN W67/1"],
                  ["Пробка картера", "Ключ на 17, затяжка 30–35 Н·м"],
                  ["Фильтр (затяжка)", "25 Н·м"],
                  ["Интервал", "5 000 км или 6 месяцев"],
                ].map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start gap-4 border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
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