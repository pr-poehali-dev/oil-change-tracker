import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { ServiceInterval } from "@/lib/cars";

const CAR_SPECS_URL = "https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23";

const SIZE = 100;
const R = 40;
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
  transmission?: "auto" | "manual";
  totalKm: number;
  oilInterval: number;
  intervals: ServiceInterval[];
  onIntervalsLoaded: (intervals: ServiceInterval[]) => void;
  onIntervalsChange: (intervals: ServiceInterval[]) => void;
  onIntervalReset: (id: string, date: string, km: number) => void;
}

const ICON_CHOICES = [
  "Droplets", "Settings", "Cog", "GitFork", "Circle", "Gauge",
  "AlertTriangle", "Thermometer", "Wind", "Zap", "Wrench", "Disc",
  "Filter", "Battery", "Fuel", "Snowflake",
];
const COLOR_CHOICES = [
  "#e05a2b", "#f97316", "#84cc16", "#a78bfa", "#fb923c", "#f43f5e",
  "#38bdf8", "#f59e0b", "#06b6d4", "#10b981", "#8b5cf6", "#eab308", "#3b82f6",
];

type EditDraft = {
  id: string;
  name: string;
  icon: string;
  color: string;
  unit: "km" | "months";
  interval_km: string;
  interval_months: string;
};

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

function Circle({ item, totalKm, oilInterval, onReset, editMode, onEdit, onDelete }: {
  item: ServiceInterval; totalKm: number; oilInterval: number; onReset: () => void;
  editMode?: boolean; onEdit?: () => void; onDelete?: () => void;
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

  const canDelete = editMode && !isOil;

  return (
    <button
      onClick={editMode ? (isOil ? undefined : onEdit) : onReset}
      className="relative flex flex-col items-center gap-2 flex-1 min-w-0 active:scale-95 transition-transform"
      style={{ maxWidth: SIZE + 16 }}
    >
      {canDelete && (
        <span
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          className="absolute -top-1 right-1 z-10 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md"
        >
          <Icon name="X" size={14} />
        </span>
      )}
      {editMode && !isOil && (
        <span className="absolute top-7 left-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-foreground/80 text-background flex items-center justify-center pointer-events-none">
          <Icon name="Pencil" size={12} />
        </span>
      )}
      <div className="relative w-full" style={{ aspectRatio: "1 / 1", maxWidth: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
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
      <div className="text-center space-y-0.5 w-full px-1">
        <p className="text-xs font-golos font-semibold text-foreground leading-tight truncate">{item.name}</p>
        <p className="text-xs font-mono leading-tight truncate" style={{ color }}>{mainLabel}</p>
        <p className="text-xs font-mono text-muted-foreground leading-tight truncate">{subLabel}</p>
      </div>
    </button>
  );
}

export default function ServiceCircles({
  carId, brand, model, year, engine, transmission,
  totalKm, oilInterval, intervals,
  onIntervalsLoaded, onIntervalsChange, onIntervalReset,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<ServiceInterval | null>(null);
  const [resetDate, setResetDate] = useState("");
  const [resetKm, setResetKm] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [page, setPage] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function openReset(item: ServiceInterval) {
    setResetTarget(item);
    setResetDate(new Date().toISOString().split("T")[0]);
    setResetKm(String(totalKm));
  }

  const cleanIntervals = () => intervals.filter((i) => i.id !== "__oil__" && i.id !== "oil");

  function openEditDraft(item: ServiceInterval) {
    setIsNew(false);
    setEditDraft({
      id: item.id,
      name: item.name,
      icon: item.icon,
      color: item.color,
      unit: item.unit,
      interval_km: item.interval_km != null ? String(item.interval_km) : "",
      interval_months: item.interval_months != null ? String(item.interval_months) : "",
    });
  }

  function openNewDraft() {
    setIsNew(true);
    setEditDraft({
      id: "custom_" + Date.now(),
      name: "",
      icon: "Wrench",
      color: COLOR_CHOICES[Math.floor(Math.random() * COLOR_CHOICES.length)],
      unit: "km",
      interval_km: "10000",
      interval_months: "",
    });
  }

  function saveDraft() {
    if (!editDraft || !editDraft.name.trim()) return;
    const km = editDraft.unit === "km" ? parseInt(editDraft.interval_km) || null : null;
    const months = editDraft.unit === "months" ? parseInt(editDraft.interval_months) || null : null;
    const built: ServiceInterval = {
      id: editDraft.id,
      name: editDraft.name.trim(),
      icon: editDraft.icon,
      color: editDraft.color,
      unit: editDraft.unit,
      interval_km: km,
      interval_months: months,
    };
    const list = cleanIntervals();
    const exists = list.some((i) => i.id === built.id);
    const next = exists
      ? list.map((i) => (i.id === built.id ? { ...i, ...built } : i))
      : [...list, built];
    onIntervalsChange(next);
    setEditDraft(null);
  }

  function deleteInterval(id: string) {
    onIntervalsChange(cleanIntervals().filter((i) => i.id !== id));
  }

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

  const baseItems: ServiceInterval[] = [oilItem, ...intervals.filter((i) => i.id !== "__oil__" && i.id !== "oil")];
  const ADD_TILE: ServiceInterval = { id: "__add__", name: "", icon: "Plus", color: "#888", interval_km: null, interval_months: null, unit: "km" };
  const allItems: ServiceInterval[] = editMode ? [...baseItems, ADD_TILE] : baseItems;
  const totalPages = Math.max(1, Math.ceil(allItems.length / PER_PAGE));

  function handleReset(item: ServiceInterval) {
    openReset(item);
  }

  function handleSwipeEnd(dx: number) {
    const containerW = containerRef.current?.offsetWidth ?? 300;
    if (dx < -containerW * 0.2 && page < totalPages - 1) setPage((p) => p + 1);
    else if (dx > containerW * 0.2 && page > 0) setPage((p) => p - 1);
    setDragOffset(0);
    setDragging(false);
  }

  async function loadIntervals() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, model, year, carId, engine, transmission, mode: "intervals" }),
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
            {/* Заголовок — название круга */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: resetTarget.color + "20" }}>
                <Icon name={resetTarget.icon as "Droplets"} size={20} style={{ color: resetTarget.color }} fallback="Wrench" />
              </div>
              <p className="font-golos font-bold text-foreground text-lg leading-tight">{resetTarget.name}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-golos text-muted-foreground mb-1">Дата замены</label>
                <input
                  type="date"
                  value={resetDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setResetDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {resetTarget.unit === "km" && (
                <div>
                  <label className="block text-xs font-golos text-muted-foreground mb-1">Пробег при замене, км</label>
                  <input
                    type="number"
                    value={resetKm}
                    min={0}
                    onChange={(e) => setResetKm(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={String(totalKm)}
                  />
                </div>
              )}
            </div>

            {/* Кнопки */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => {
                  const km = resetTarget.unit === "km" ? (parseFloat(resetKm) || totalKm) : totalKm;
                  onIntervalReset(resetTarget.id, resetDate, km);
                  setResetTarget(null);
                }}
                className="w-full py-3 rounded-xl text-sm font-golos font-semibold"
                style={{ background: resetTarget.color, color: "#fff" }}
              >
                Сохранить замену: {resetTarget.name}
              </button>
              <button
                onClick={() => {
                  onIntervalReset(resetTarget.id, new Date().toISOString().split("T")[0], totalKm);
                  setResetTarget(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-destructive/30 bg-destructive/5 text-destructive text-sm font-golos font-semibold hover:bg-destructive/10 transition-colors"
              >
                <Icon name="RotateCcw" size={15} className="text-destructive" />
                Сбросить круг
              </button>
              <button
                onClick={() => setResetTarget(null)}
                className="w-full py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-golos font-semibold text-foreground">Регламент обслуживания</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setEditMode((v) => !v); setPage(0); }}
              className={`text-xs transition-colors flex items-center gap-1 ${editMode ? "text-accent-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name={editMode ? "Check" : "Pencil"} size={12} />
              {editMode ? "Готово" : "Изменить"}
            </button>
            {!editMode && (
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
            )}
          </div>
        </div>

        {/* Circles slider */}
        <div
          ref={containerRef}
          className="overflow-hidden"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
            setDragging(true);
          }}
          onTouchMove={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.touches[0].clientX - touchStartX.current;
            // Ограничиваем: нельзя тянуть за края
            if ((dx > 0 && page === 0) || (dx < 0 && page === totalPages - 1)) {
              setDragOffset(dx * 0.2);
            } else {
              setDragOffset(dx);
            }
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current !== null) {
              handleSwipeEnd(e.changedTouches[0].clientX - touchStartX.current);
              touchStartX.current = null;
            }
          }}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(calc(${-page * 100}% + ${dragOffset}px))`,
              transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              willChange: "transform",
            }}
          >
            {Array.from({ length: totalPages }).map((_, pageIdx) => {
              const items = allItems.slice(pageIdx * PER_PAGE, pageIdx * PER_PAGE + PER_PAGE);
              return (
                <div key={pageIdx} className="flex items-start py-2 gap-1 shrink-0 w-full">
                  {items.map((item) =>
                    item.id === "__add__" ? (
                      <button
                        key="__add__"
                        onClick={openNewDraft}
                        className="flex flex-col items-center gap-2 flex-1 min-w-0 active:scale-95 transition-transform"
                        style={{ maxWidth: SIZE + 16 }}
                      >
                        <div className="relative w-full flex items-center justify-center" style={{ aspectRatio: "1 / 1", maxWidth: SIZE }}>
                          <div className="w-[72%] h-[72%] rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                            <Icon name="Plus" size={26} className="text-muted-foreground" />
                          </div>
                        </div>
                        <p className="text-xs font-golos font-semibold text-muted-foreground">Добавить</p>
                      </button>
                    ) : (
                      <Circle
                        key={item.id}
                        item={item}
                        totalKm={totalKm}
                        oilInterval={oilInterval}
                        onReset={() => handleReset(item)}
                        editMode={editMode}
                        onEdit={() => openEditDraft(item)}
                        onDelete={() => deleteInterval(item.id)}
                      />
                    )
                  )}
                  {items.length < PER_PAGE && Array.from({ length: PER_PAGE - items.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex-1" />
                  ))}
                </div>
              );
            })}
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
          {editMode ? "Нажми на круг — редактировать, ✕ — удалить" : "Нажми на круг — отметить замену"}
        </p>
      </div>

      {/* Модалка редактора круга */}
      {editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: editDraft.color + "20" }}>
                <Icon name={editDraft.icon as "Droplets"} size={20} style={{ color: editDraft.color }} fallback="Wrench" />
              </div>
              <p className="font-golos font-bold text-foreground text-lg leading-tight">
                {isNew ? "Новый круг" : "Редактировать круг"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-golos text-muted-foreground mb-1">Название</label>
                <input
                  type="text"
                  value={editDraft.name}
                  maxLength={20}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  placeholder="Напр. Масло АКПП"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-golos text-muted-foreground mb-1.5">Иконка</label>
                <div className="grid grid-cols-8 gap-1.5">
                  {ICON_CHOICES.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setEditDraft({ ...editDraft, icon: ic })}
                      className={`aspect-square rounded-lg flex items-center justify-center border transition-colors ${editDraft.icon === ic ? "border-foreground bg-secondary" : "border-border"}`}
                    >
                      <Icon name={ic as "Droplets"} size={16} className="text-foreground" fallback="Wrench" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-golos text-muted-foreground mb-1.5">Цвет</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_CHOICES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditDraft({ ...editDraft, color: c })}
                      className="w-7 h-7 rounded-full transition-transform active:scale-90"
                      style={{ background: c, outline: editDraft.color === c ? "2px solid hsl(var(--foreground))" : "none", outlineOffset: 2 }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-golos text-muted-foreground mb-1.5">Замена по</label>
                <div className="flex gap-1 bg-secondary rounded-xl p-1">
                  <button
                    onClick={() => setEditDraft({ ...editDraft, unit: "km" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-golos font-medium transition-all ${editDraft.unit === "km" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Пробегу (км)
                  </button>
                  <button
                    onClick={() => setEditDraft({ ...editDraft, unit: "months" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-golos font-medium transition-all ${editDraft.unit === "months" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Времени (мес)
                  </button>
                </div>
              </div>

              {editDraft.unit === "km" ? (
                <div>
                  <label className="block text-xs font-golos text-muted-foreground mb-1">Интервал, км</label>
                  <input
                    type="number" min={0}
                    value={editDraft.interval_km}
                    onChange={(e) => setEditDraft({ ...editDraft, interval_km: e.target.value })}
                    placeholder="10000"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-golos text-muted-foreground mb-1">Интервал, месяцев</label>
                  <input
                    type="number" min={0}
                    value={editDraft.interval_months}
                    onChange={(e) => setEditDraft({ ...editDraft, interval_months: e.target.value })}
                    placeholder="12"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={saveDraft}
                disabled={!editDraft.name.trim()}
                className="w-full py-3 rounded-xl text-sm font-golos font-semibold disabled:opacity-40"
                style={{ background: editDraft.color, color: "#fff" }}
              >
                {isNew ? "Добавить круг" : "Сохранить"}
              </button>
              {!isNew && (
                <button
                  onClick={() => { deleteInterval(editDraft.id); setEditDraft(null); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-destructive/30 bg-destructive/5 text-destructive text-sm font-golos font-semibold"
                >
                  <Icon name="Trash2" size={15} className="text-destructive" />
                  Удалить круг
                </button>
              )}
              <button
                onClick={() => setEditDraft(null)}
                className="w-full py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}