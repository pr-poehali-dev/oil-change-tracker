import { useState } from "react";
import Icon from "@/components/ui/icon";
import { ServiceInterval } from "@/lib/cars";

const CAR_SPECS_URL = "https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23";

interface Props {
  carId: string;
  brand: string;
  model: string;
  year: string;
  engine?: string;
  totalKm: number;
  intervals: ServiceInterval[];
  onIntervalsLoaded: (intervals: ServiceInterval[]) => void;
  onIntervalReset: (id: string) => void;
}

function getProgress(item: ServiceInterval, totalKm: number): number {
  if (item.unit === "km" && item.interval_km) {
    const kmSince = totalKm - (item.last_km ?? 0);
    return Math.min(1, kmSince / item.interval_km);
  }
  if (item.unit === "months" && item.interval_months) {
    if (!item.last_date) return 0;
    const msMonth = 30 * 24 * 3600 * 1000;
    const elapsed = (Date.now() - new Date(item.last_date).getTime()) / msMonth;
    return Math.min(1, elapsed / item.interval_months);
  }
  return 0;
}

function getRemaining(item: ServiceInterval, totalKm: number): string {
  if (item.unit === "km" && item.interval_km) {
    const kmSince = totalKm - (item.last_km ?? 0);
    const rem = Math.max(0, item.interval_km - kmSince);
    if (rem === 0) return "Заменить!";
    return `${rem.toLocaleString("ru-RU")} км`;
  }
  if (item.unit === "months" && item.interval_months) {
    if (!item.last_date) return `${item.interval_months} мес`;
    const msMonth = 30 * 24 * 3600 * 1000;
    const elapsed = (Date.now() - new Date(item.last_date).getTime()) / msMonth;
    const rem = Math.max(0, item.interval_months - elapsed);
    if (rem <= 0) return "Заменить!";
    return rem < 1 ? "< 1 мес" : `${Math.round(rem)} мес`;
  }
  return "—";
}

function getUrgency(progress: number): "ok" | "warn" | "danger" {
  if (progress >= 1) return "danger";
  if (progress >= 0.8) return "warn";
  return "ok";
}

const URGENCY_COLOR = {
  ok: "#4a7c59",
  warn: "#c9922a",
  danger: "#e05a2b",
};

const SIZE = 88;
const R = 36;
const CIRC = 2 * Math.PI * R;

function Circle({ item, totalKm, onReset }: { item: ServiceInterval; totalKm: number; onReset: () => void }) {
  const progress = getProgress(item, totalKm);
  const urgency = getUrgency(progress);
  const color = urgency === "ok" ? item.color : URGENCY_COLOR[urgency];
  const dash = CIRC * (1 - progress);
  const remaining = getRemaining(item, totalKm);
  const isDanger = urgency === "danger";

  return (
    <button
      onClick={onReset}
      className="flex flex-col items-center gap-2 shrink-0 active:scale-95 transition-transform"
      style={{ width: SIZE + 16 }}
      title={`${item.name} — нажмите чтобы сбросить`}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: "absolute", top: 0, left: 0 }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={dash}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <Icon name={item.icon as "Droplets"} size={16} style={{ color }} fallback="Wrench" />
          {isDanger && (
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-golos font-medium text-foreground leading-tight">{item.name}</p>
        <p className="text-xs font-mono leading-tight" style={{ color }}>{remaining}</p>
      </div>
    </button>
  );
}

export default function ServiceCircles({ carId, brand, model, year, engine, totalKm, intervals, onIntervalsLoaded, onIntervalReset }: Props) {
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<ServiceInterval | null>(null);

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
      if (data.intervals?.length) {
        onIntervalsLoaded(data.intervals);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!intervals.length) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-golos font-semibold text-foreground">Регламент обслуживания</p>
        </div>
        <button
          onClick={loadIntervals}
          disabled={loading}
          className="w-full py-3 rounded-xl border border-dashed border-border text-sm font-golos text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              Загружаем регламент...
            </>
          ) : (
            <>
              <Icon name="Sparkles" size={14} fallback="Zap" />
              Загрузить регламент ТО
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Reset confirm dialog */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: resetTarget.color + "20" }}>
              <Icon name={resetTarget.icon as "Droplets"} size={22} style={{ color: resetTarget.color }} fallback="Wrench" />
            </div>
            <p className="font-golos font-bold text-foreground text-base mb-1">Сбросить счётчик?</p>
            <p className="text-sm text-muted-foreground font-golos leading-relaxed mb-5">
              Подтверди замену <span className="text-foreground font-medium">{resetTarget.name}</span>. Счётчик обнулится от текущего пробега и даты.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setResetTarget(null)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium hover:bg-muted transition-colors">Отмена</button>
              <button
                onClick={() => { onIntervalReset(resetTarget.id); setResetTarget(null); }}
                className="flex-1 py-3 rounded-xl text-white text-sm font-golos font-semibold hover:opacity-85 active:scale-95 transition-all"
                style={{ background: resetTarget.color }}
              >
                Заменено!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-golos font-semibold text-foreground">Регламент обслуживания</p>
          <button
            onClick={loadIntervals}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="RefreshCw" size={12} fallback="RefreshCw" />
            )}
            Обновить
          </button>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-3 pb-2" style={{ minWidth: "max-content" }}>
            {intervals.map((item) => (
              <Circle
                key={item.id}
                item={item}
                totalKm={totalKm}
                onReset={() => setResetTarget(item)}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-golos mt-3">
          Нажми на круг — отметить замену
        </p>
      </div>
    </>
  );
}
