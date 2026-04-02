import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { ServiceInterval } from "@/lib/cars";

const CAR_SPECS_URL = "https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23";

const SIZE = 110;
const R = 44;
const CIRC = 2 * Math.PI * R;
const STROKE = 8;
const PER_PAGE = 3;

const URGENCY_COLOR = { ok: "#4a7c59", warn: "#c9922a", danger: "#e05a2b" };

interface Props {
  carId: string;
  brand: string;
  model: string;
  year: string;
  engine?: string;
  totalKm: number;
  oilInterval: number;
  intervals: ServiceInterval[];
  onIntervalsLoaded: (intervals: ServiceInterval[]) => void;
  onIntervalReset: (id: string) => void;
}

function getProgress(item: ServiceInterval, totalKm: number): number {
  if (item.unit === "km" && item.interval_km) {
    return Math.min(1, (totalKm - (item.last_km ?? 0)) / item.interval_km);
  }
  if (item.unit === "months" && item.interval_months) {
    if (!item.last_date) return 0;
    const elapsed = (Date.now() - new Date(item.last_date).getTime()) / (30 * 24 * 3600 * 1000);
    return Math.min(1, elapsed / item.interval_months);
  }
  return 0;
}

function getRemaining(item: ServiceInterval, totalKm: number): string {
  if (item.unit === "km" && item.interval_km) {
    const rem = Math.max(0, item.interval_km - (totalKm - (item.last_km ?? 0)));
    return rem === 0 ? "Заменить!" : `${rem.toLocaleString("ru-RU")} км`;
  }
  if (item.unit === "months" && item.interval_months) {
    if (!item.last_date) return `${item.interval_months} мес`;
    const elapsed = (Date.now() - new Date(item.last_date).getTime()) / (30 * 24 * 3600 * 1000);
    const rem = Math.max(0, item.interval_months - elapsed);
    if (rem <= 0) return "Заменить!";
    return rem < 1 ? "< 1 мес" : `${Math.round(rem)} мес`;
  }
  return "—";
}

function getLastLabel(item: ServiceInterval): string {
  if (item.unit === "km" && item.last_km != null)
    return `с ${item.last_km.toLocaleString("ru-RU")} км`;
  if (item.last_date)
    return new Date(item.last_date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return "не задано";
}

function getUrgency(p: number): "ok" | "warn" | "danger" {
  return p >= 1 ? "danger" : p >= 0.8 ? "warn" : "ok";
}

function Circle({ item, totalKm, oilInterval, onReset }: {
  item: ServiceInterval; totalKm: number; oilInterval: number; onReset: () => void;
}) {
  const isOil = item.id === "__oil__";
  const progress = isOil
    ? (oilInterval > 0 ? Math.min(1, totalKm / oilInterval) : 0)
    : getProgress(item, totalKm);
  const urgency = getUrgency(progress);
  const color = urgency === "ok" ? item.color : URGENCY_COLOR[urgency];
  const dash = CIRC * (1 - progress);

  let mainLabel: string;
  let subLabel: string;

  if (isOil) {
    const rem = Math.max(0, oilInterval - totalKm);
    mainLabel = rem === 0 ? "Заменить!" : `${rem.toLocaleString("ru-RU")} км`;
    subLabel = `из ${oilInterval.toLocaleString("ru-RU")} км`;
  } else {
    mainLabel = getRemaining(item, totalKm);
    subLabel = getLastLabel(item);
  }

  return (
    <button
      onClick={onReset}
      className="flex flex-col items-center gap-2 shrink-0 active:scale-95 transition-transform"
      style={{ width: SIZE + 8 }}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: "absolute", inset: 0 }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
            stroke={color} strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={dash}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          {isOil ? (
            <>
              <span className="font-mono text-base font-semibold text-foreground leading-none">
                {totalKm.toLocaleString("ru-RU")}
              </span>
              <span className="font-mono text-xs text-muted-foreground leading-none">
                из {oilInterval.toLocaleString("ru-RU")}
              </span>
            </>
          ) : (
            <>
              <Icon name={item.icon as "Droplets"} size={18} style={{ color }} fallback="Wrench" />
              {urgency === "danger" && (
                <div className="w-1.5 h-1.5 rounded-full animate-pulse mt-0.5" style={{ background: color }} />
              )}
            </>
          )}
        </div>
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-xs font-golos font-semibold text-foreground leading-tight">{item.name}</p>
        <p className="text-xs font-mono leading-tight" style={{ color }}>{mainLabel}</p>
        <p className="text-xs font-mono text-muted-foreground leading-tight">{subLabel}</p>
      </div>
    </button>
  );
}

export default function ServiceCircles({
  carId, brand, model, year, engine,
  totalKm, oilInterval, intervals,
  onIntervalsLoaded, onIntervalReset,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<ServiceInterval | null>(null);
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Масляный круг всегда первый
  const oilItem: ServiceInterval = {
    id: "__oil__",
    name: "Масло",
    icon: "Droplets",
    color: "#e05a2b",
    interval_km: oilInterval,
    interval_months: null,
    unit: "km",
  };

  const allItems: ServiceInterval[] = [oilItem, ...intervals.filter((i) => i.id !== "__oil__" && i.id !== "oil")];
  const totalPages = Math.ceil(allItems.length / PER_PAGE);
  const pageItems = allItems.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  function handleReset(item: ServiceInterval) {
    if (item.id === "__oil__") {
      onIntervalReset("__oil__");
    } else {
      setResetTarget(item);
    }
  }

  function handleSwipe(dx: number) {
    if (dx < -40 && page < totalPages - 1) setPage((p) => p + 1);
    if (dx > 40 && page > 0) setPage((p) => p - 1);
  }

  async function loadIntervals() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, model, year, carId, engine, mode: "intervals" }),
      });
      const data = await res.json();
      if (data.intervals?.length) onIntervalsLoaded(data.intervals);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  return (
    <>
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: resetTarget.color + "20" }}>
              <Icon name={resetTarget.icon as "Droplets"} size={22} style={{ color: resetTarget.color }} fallback="Wrench" />
            </div>
            <p className="font-golos font-bold text-foreground text-base mb-1">Замена выполнена?</p>
            <p className="text-sm text-muted-foreground font-golos leading-relaxed mb-5">
              Подтверди замену <span className="text-foreground font-medium">{resetTarget.name}</span>. Счётчик обнулится от текущего пробега и даты.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setResetTarget(null)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium">Отмена</button>
              <button
                onClick={() => { onIntervalReset(resetTarget.id); setResetTarget(null); }}
                className="flex-1 py-3 rounded-xl text-white text-sm font-golos font-semibold"
                style={{ background: resetTarget.color }}
              >
                Заменено!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-golos font-semibold text-foreground">Регламент обслуживания</p>
          <button
            onClick={loadIntervals}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {loading
              ? <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
              : <Icon name="RefreshCw" size={12} fallback="RefreshCw" />
            }
            {intervals.length === 0 ? "Загрузить ТО" : "Обновить"}
          </button>
        </div>

        {/* Circles */}
        <div
          className="touch-pan-y"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current !== null) {
              handleSwipe(e.changedTouches[0].clientX - touchStartX.current);
              touchStartX.current = null;
            }
          }}
        >
          <div className="flex justify-around items-start py-2">
            {pageItems.map((item) => (
              <Circle
                key={item.id}
                item={item}
                totalKm={totalKm}
                oilInterval={oilInterval}
                onReset={() => handleReset(item)}
              />
            ))}
            {/* Заглушки если меньше 3 на странице */}
            {pageItems.length < PER_PAGE && Array.from({ length: PER_PAGE - pageItems.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{ width: SIZE + 8 }} />
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === page ? 16 : 6,
                  height: 6,
                  background: i === page ? "hsl(var(--foreground))" : "hsl(var(--border))",
                }}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground font-golos mt-3 text-center">
          Нажми на круг — отметить замену
        </p>
      </div>
    </>
  );
}
