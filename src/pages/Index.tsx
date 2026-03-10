import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { scheduleOilNotifications, cancelOilNotifications, getScheduledRemaining } from "@/lib/notifications";

type DayEntry = { date: string; km: number };
type ManualStep = { step: number; title: string; items: string[]; img?: string; imgCaption?: string; warning?: string };
type ManualGuide = { id: string; title: string; icon: string; steps: ManualStep[] };
type CarConfig = {
  id: string;
  brand: string;
  model: string;
  year: string;
  oilInterval: number;
  guides: ManualGuide[];
};

// ─── Фото (Toyota) ────────────────────────────────────────────────
const IMG_COVER   = "https://cdn.poehali.dev/files/6977bfd9-00ec-4e45-9319-c61c86e2004f.png";
const IMG_FILTER  = "https://cdn.poehali.dev/files/01f5fcb8-6a5c-437d-9f3c-97ca70c047ba.png";
const IMG_POUR    = "https://cdn.poehali.dev/files/72ba902e-f228-4d8c-953e-c4c680c2b53a.png";
const IMG_LEVEL   = "https://cdn.poehali.dev/files/4ac05869-fa60-42af-8b03-c318e14c7094.png";
const IMG_DRAIN   = "https://cdn.poehali.dev/files/a66ca15e-b956-4a1f-ab09-cc792ee15ca5.png";

// ─── Конфигурация автомобилей ─────────────────────────────────────
const CARS: CarConfig[] = [
  {
    id: "camry_v30_1990",
    brand: "Toyota",
    model: "Camry V30",
    year: "1990",
    oilInterval: 5000,
    guides: [
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
            img: IMG_DRAIN,
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
            img: IMG_DRAIN,
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
            img: IMG_DRAIN,
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
            img: IMG_FILTER,
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
            img: IMG_FILTER,
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
            img: IMG_POUR,
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
            img: IMG_POUR,
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
            img: IMG_LEVEL,
            imgCaption: "Заглушить → подождать 5 мин → проверить уровень",
          },
          {
            step: 14,
            title: "Проверьте герметичность",
            items: [
              "Запустите мотор и проверьте, нет ли утечек вокруг фильтра и сливной пробки.",
            ],
            img: IMG_LEVEL,
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
    ],
  },
  {
    id: "uaz_396219_2008",
    brand: "УАЗ",
    model: "396219",
    year: "2008",
    oilInterval: 8000,
    guides: [
      {
        id: "oil",
        title: "Замена масла",
        icon: "Droplets",
        steps: [
          {
            step: 1,
            title: "Прогрейте двигатель",
            items: [
              "Запустите двигатель ЗМЗ-409 и прогрейте до рабочей температуры (80–90 °С по указателю).",
              "Достаточно проехать 5–10 км или прогреть на месте до стабилизации температуры.",
            ],
            img: IMG_COVER,
            imgCaption: "Прогреть до рабочей температуры",
          },
          {
            step: 2,
            title: "Заглушите и подготовьте машину",
            items: [
              "Заглушите двигатель, поставьте авто на ровную горизонтальную поверхность.",
              "Затяните стояночный тормоз, подложите упоры под колёса.",
              "Благодаря высокому клиренсу УАЗ — доступ снизу возможен без эстакады, но лучше использовать яму.",
            ],
          },
          {
            step: 3,
            title: "Подготовьте ёмкость для слива",
            items: [
              "Подготовьте ёмкость объёмом не менее 6 л для сбора отработки.",
              "Двигатель ЗМЗ-409 вмещает около 5,5 л масла — ёмкость должна быть с запасом.",
            ],
            img: IMG_DRAIN,
            imgCaption: "Ёмкость для слива — не менее 6 л",
          },
          {
            step: 4,
            title: "Выкрутите сливную пробку",
            items: [
              "Сливное отверстие расположено в нижней части масляного картера двигателя.",
              "Выкрутите пробку ключом на 19, подставив поддон.",
              "На УАЗах пробка нередко прикипает — при необходимости используйте вороток с удлинителем.",
            ],
            img: IMG_DRAIN,
            imgCaption: "Сливная пробка — ключ на 19",
            warning: "Масло горячее! Работайте в перчатках. Струя может быть интенсивной сразу после откручивания.",
          },
          {
            step: 5,
            title: "Дайте маслу стечь",
            items: [
              "Дождитесь полного стекания масла — не менее 20–25 минут.",
              "Для ускорения откройте маслозаливную горловину и снимите щуп.",
            ],
            img: IMG_DRAIN,
            imgCaption: "Подождите полного стекания",
            warning: "Не оставляйте щуп и горловину открытыми надолго — внутрь может попасть грязь.",
          },
          {
            step: 6,
            title: "Выкрутите масляный фильтр",
            items: [
              "На ЗМЗ-409 полнопоточный масляный фильтр расположен с правой стороны блока цилиндров.",
              "Открутите фильтр рукой или специальным съёмником.",
              "Подложите ветошь — из фильтра вытечет остаток масла.",
            ],
            img: IMG_FILTER,
            imgCaption: "Масляный фильтр ЗМЗ-409 — правая сторона блока",
            warning: "Будьте осторожны — корпус фильтра может быть горячим.",
          },
          {
            step: 7,
            title: "Установите сливную пробку",
            items: [
              "Протрите поверхность картера вокруг сливного отверстия чистой тряпкой.",
              "Установите новую уплотнительную шайбу на пробку (медную или алюминиевую).",
              "Затяните пробку ключом на 19 с усилием 38–42 Н·м.",
            ],
            warning: "Не перетягивайте — резьба в картере алюминиевая, легко срывается.",
          },
          {
            step: 8,
            title: "Установите новый фильтр",
            items: [
              "Рекомендуемый фильтр: FRAM PH10575 / Mann W811/80 / оригинальный ЗМЗ 406.1012005.",
              "Нанесите тонкий слой свежего масла на уплотнительное кольцо нового фильтра.",
              "Закрутите фильтр рукой до упора, затем доверните на 3/4 оборота.",
            ],
            img: IMG_FILTER,
            imgCaption: "Смазать уплотнитель → установить новый фильтр",
            warning: "Не перетягивайте фильтр инструментом — достаточно усилия рук.",
          },
          {
            step: 9,
            title: "Залейте новое масло",
            items: [
              "Рекомендуемое масло: 5W-40 или 10W-40 полусинтетика / синтетика.",
              "Объём заправки: 5,0 л (без фильтра) / 5,5 л (с фильтром).",
              "Заливайте через горловину с воронкой. Начните с 4,5 л, затем проверьте уровень.",
            ],
            img: IMG_POUR,
            imgCaption: "Залить масло — 5W-40 или 10W-40",
          },
          {
            step: 10,
            title: "Проверьте уровень по щупу",
            items: [
              "Щуп расположен с правой стороны двигателя ЗМЗ-409.",
              "Уровень должен быть между метками MIN и MAX, ближе к MAX.",
              "Доливайте по 200–300 мл с паузой и повторной проверкой.",
            ],
            img: IMG_POUR,
            imgCaption: "Уровень масла — между MIN и MAX",
            warning: "Перелив опасен: избыток масла вспенивается и попадает в систему вентиляции картера.",
          },
          {
            step: 11,
            title: "Запустите двигатель",
            items: [
              "Закройте маслозаливную горловину, вставьте щуп.",
              "Запустите двигатель и дайте поработать 2–3 минуты на холостых оборотах.",
              "Следите за лампой давления масла — должна погаснуть в течение 3–5 секунд после пуска.",
            ],
            warning: "Если лампа давления масла не гаснет спустя 5–7 секунд — немедленно заглушите двигатель и найдите причину.",
          },
          {
            step: 12,
            title: "Проверьте уровень и герметичность",
            items: [
              "Заглушите двигатель, подождите 5 минут.",
              "Снова проверьте уровень по щупу — при необходимости долейте.",
              "Осмотрите фильтр и пробку на предмет подтёков.",
            ],
            img: IMG_LEVEL,
            imgCaption: "Проверка герметичности и уровня после прогрева",
          },
          {
            step: 13,
            title: "Завершение",
            items: [
              "Запишите пробег на момент замены — следующая замена через 8 000 км.",
              "Сбросьте счётчик в приложении на вкладке «Счётчик».",
              "Утилизируйте отработанное масло на специализированном пункте приёма.",
            ],
          },
        ],
      },
    ],
  },
];

// ─── localStorage helpers ─────────────────────────────────────────
function entriesKey(carId: string) { return `oil_entries_${carId}`; }
function totalKey(carId: string)   { return `oil_total_${carId}`; }
function selectedCarKey()          { return "selected_car_id"; }

function loadEntries(carId: string): DayEntry[] {
  try { return JSON.parse(localStorage.getItem(entriesKey(carId)) || "[]"); } catch { return []; }
}
function loadTotal(carId: string): number {
  try { return Number(localStorage.getItem(totalKey(carId)) || "0"); } catch { return 0; }
}
function loadSelectedCarId(): string {
  return localStorage.getItem(selectedCarKey()) || CARS[0].id;
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

// ─── UAZ specs for manual ─────────────────────────────────────────
const CAR_SPECS: Record<string, [string, string][]> = {
  camry_v30_1990: [
    ["Масло", "10W-30 / 10W-40 (минерал или полусинтетика)"],
    ["Объём", "4,0 л (с заменой фильтра — 4,3 л)"],
    ["Фильтр", "Toyota 90915-YZZD4 / MANN W67/1"],
    ["Пробка картера", "Ключ на 17, затяжка 30–35 Н·м"],
    ["Фильтр (затяжка)", "25 Н·м"],
    ["Интервал", "5 000 км или 6 месяцев"],
  ],
  uaz_396219_2008: [
    ["Масло", "5W-40 / 10W-40 полусинтетика или синтетика"],
    ["Объём", "5,0 л без фильтра / 5,5 л с фильтром"],
    ["Фильтр", "FRAM PH10575 / Mann W811/80 / ЗМЗ 406.1012005"],
    ["Пробка картера", "Ключ на 19, затяжка 38–42 Н·м"],
    ["Фильтр (затяжка)", "Руками + 3/4 оборота"],
    ["Интервал", "8 000 км или 12 месяцев"],
  ],
};

// ─── Component ────────────────────────────────────────────────────
export default function Index() {
  const [selectedCarId, setSelectedCarId] = useState<string>(loadSelectedCarId);
  const [carDropdownOpen, setCarDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const car = CARS.find((c) => c.id === selectedCarId) ?? CARS[0];
  const OIL_INTERVAL = car.oilInterval;

  const [tab, setTab] = useState<"counter" | "calendar" | "instructions">("counter");
  const [dailyInput, setDailyInput] = useState("");
  const [entries, setEntries] = useState<DayEntry[]>(() => loadEntries(car.id));
  const [totalKm, setTotalKm] = useState<number>(() => loadTotal(car.id));
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<number | null>(null);

  const remaining = Math.max(0, OIL_INTERVAL - totalKm);
  const progress = Math.min(1, totalKm / OIL_INTERVAL);
  const urgency = progress >= 1 ? "danger" : progress >= 0.8 ? "warn" : "ok";

  // Переключение автомобиля
  useEffect(() => {
    localStorage.setItem(selectedCarKey(), selectedCarId);
    setEntries(loadEntries(selectedCarId));
    setTotalKm(loadTotal(selectedCarId));
    setActiveGuide(null);
    setOpenStep(null);
  }, [selectedCarId]);

  // Сохранение данных
  useEffect(() => {
    localStorage.setItem(entriesKey(car.id), JSON.stringify(entries));
    localStorage.setItem(totalKey(car.id), String(totalKm));
  }, [entries, totalKm, car.id]);

  // Локальные уведомления — планируем при остатке < 300 км
  useEffect(() => {
    const carName = `${car.brand} ${car.model}`;
    const prev = getScheduledRemaining();
    // Перепланируем если остаток изменился или не было запланировано
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

  const guide = car.guides.find((g) => g.id === activeGuide) ?? null;
  const specs = CAR_SPECS[car.id] ?? [];

  const TABS = [
    { id: "counter", label: "Счётчик" },
    { id: "calendar", label: "Календарь" },
    { id: "instructions", label: "Инструкции" },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="pt-10 pb-4 px-6 max-w-md mx-auto w-full">
        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-1">Контроль автомобиля</p>
        <h1 className="text-2xl font-golos font-bold text-foreground tracking-tight">Замена масла</h1>
      </header>

      {/* Car selector dropdown */}
      <div className="px-6 max-w-md mx-auto w-full mb-3" ref={dropdownRef}>
        <button
          onClick={() => setCarDropdownOpen((v) => !v)}
          className="w-full bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between hover:border-muted-foreground transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Icon name="Car" size={15} className="text-muted-foreground" />
            <span className="font-golos text-sm font-semibold text-foreground">{car.brand} {car.model}</span>
            <span className="font-mono text-xs text-muted-foreground">{car.year}</span>
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

        {carDropdownOpen && (
          <div className="absolute z-40 mt-1 w-[calc(100%-3rem)] max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            {CARS.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCarId(c.id); setCarDropdownOpen(false); }}
                className={`w-full px-4 py-3.5 flex items-center justify-between hover:bg-secondary transition-colors text-left ${idx < CARS.length - 1 ? "border-b border-border/50" : ""}`}
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
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 max-w-md mx-auto w-full">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id !== "instructions") { setActiveGuide(null); setOpenStep(null); } }}
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
          <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl">
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
                    {remaining > 0 ? `${remaining.toLocaleString("ru-RU")} км` : "0 км"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: urgencyColor + "20" }}>
                  <Icon
                    name={urgency === "danger" ? "AlertTriangle" : urgency === "warn" ? "AlertCircle" : "CheckCircle2"}
                    size={20} style={{ color: urgencyColor }}
                  />
                </div>
              </div>

              {remaining <= 300 && remaining > 0 && (
                <div className="w-full mt-4 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3">
                  <Icon name="AlertCircle" size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-golos text-amber-800 leading-snug">
                    Допустимая норма пробега скоро закончится. Замените масло.
                  </p>
                </div>
              )}

              {remaining === 0 && (
                <div className="w-full mt-4 flex items-start gap-3 bg-red-50 border border-red-400 rounded-2xl px-4 py-3">
                  <Icon name="AlertTriangle" size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-golos font-semibold text-red-700 leading-snug">
                    Эксплуатация ВВСТ невозможна! Замените масло.
                  </p>
                </div>
              )}
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

        {/* ── ИНСТРУКЦИИ: список ── */}
        {tab === "instructions" && !activeGuide && (
          <div className="animate-fade-in space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider px-1 mb-2">
              Инструкции для {car.brand} {car.model}
            </p>
            {car.guides.map((g) => (
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

        {/* ── ИНСТРУКЦИИ: конкретная ── */}
        {tab === "instructions" && activeGuide && guide && (
          <div className="animate-fade-in space-y-3">
            <button
              onClick={() => { setActiveGuide(null); setOpenStep(null); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-golos mb-1"
            >
              <Icon name="ChevronLeft" size={15} />
              Назад к инструкциям
            </button>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <img src={IMG_COVER} alt={`${car.brand} ${car.model}`} className="w-full object-cover object-top" style={{ maxHeight: 160 }} />
              <div className="px-5 py-4">
                <p className="font-golos font-bold text-foreground text-base">Инструкция по замене масла</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{car.brand} {car.model} · {car.year}</p>
                <p className="text-sm text-muted-foreground font-golos leading-relaxed mt-2">
                  Пошаговое руководство по замене моторного масла самотёком через сливное отверстие.
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
                      {section.img && (
                        <div className="rounded-xl overflow-hidden bg-secondary mb-3">
                          <img src={section.img} alt={section.imgCaption ?? section.title} className="w-full object-cover object-top" style={{ maxHeight: 180 }} />
                          {section.imgCaption && (
                            <p className="text-xs font-mono text-muted-foreground px-3 py-2">{section.imgCaption}</p>
                          )}
                        </div>
                      )}
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

            {/* Расходники */}
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
          </div>
        )}

      </main>
    </div>
  );
}