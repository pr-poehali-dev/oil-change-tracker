import Icon from "@/components/ui/icon";

const MONTHLY = [
  { month: "Окт", revenue: 42000, orders: 14 },
  { month: "Ноя", revenue: 56000, orders: 18 },
  { month: "Дек", revenue: 48000, orders: 15 },
  { month: "Янв", revenue: 38000, orders: 12 },
  { month: "Фев", revenue: 61000, orders: 21 },
  { month: "Мар", revenue: 74500, orders: 24 },
];

const maxRevenue = Math.max(...MONTHLY.map((m) => m.revenue));

const TOP_SERVICES = [
  { name: "Обработка от тараканов", count: 28, revenue: 89600 },
  { name: "Комплексная дезинсекция", count: 12, revenue: 288000 },
  { name: "Уничтожение клопов", count: 19, revenue: 60800 },
  { name: "Профилактическая обработка", count: 15, revenue: 45000 },
  { name: "Обработка от муравьёв", count: 22, revenue: 52800 },
];
const maxServiceCount = Math.max(...TOP_SERVICES.map((s) => s.count));

export default function ReportsPage() {
  const totalRevenue = MONTHLY.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = MONTHLY.reduce((s, m) => s + m.orders, 0);
  const avgOrder = Math.round(totalRevenue / totalOrders);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Отчёты и аналитика</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Октябрь 2025 — Март 2026</p>
        </div>
        <button className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-md text-sm font-medium hover:bg-secondary transition-colors">
          <Icon name="Download" size={15} />
          Выгрузить
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Выручка за период", value: `${totalRevenue.toLocaleString("ru")} ₽`, icon: "TrendingUp", change: "+22%", up: true },
          { label: "Заказов выполнено", value: String(totalOrders), icon: "ClipboardCheck", change: "+18%", up: true },
          { label: "Средний чек", value: `${avgOrder.toLocaleString("ru")} ₽`, icon: "Receipt", change: "+4%", up: true },
          { label: "Клиентов всего", value: "6", icon: "Users", change: "+2", up: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="text-muted-foreground">
                <Icon name={kpi.icon} size={18} fallback="BarChart" />
              </div>
              <span className={`text-xs font-medium ${kpi.up ? "text-green-600" : "text-red-500"}`}>
                {kpi.change}
              </span>
            </div>
            <div className="mt-3 text-xl font-semibold text-foreground font-mono-ibm">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Revenue chart */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-medium text-foreground text-sm mb-4">Выручка по месяцам</h2>
          <div className="flex items-end gap-2 h-40">
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-mono-ibm text-muted-foreground">
                  {(m.revenue / 1000).toFixed(0)}к
                </div>
                <div
                  className="w-full rounded-t-sm bg-primary/80 transition-all hover:bg-primary"
                  style={{ height: `${(m.revenue / maxRevenue) * 120}px` }}
                />
                <div className="text-xs text-muted-foreground">{m.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders chart */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-medium text-foreground text-sm mb-4">Количество заказов</h2>
          <div className="space-y-2.5">
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <div className="w-8 text-xs text-muted-foreground text-right">{m.month}</div>
                <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center px-2 transition-all"
                    style={{
                      width: `${(m.orders / Math.max(...MONTHLY.map(x => x.orders))) * 100}%`,
                      background: "hsl(var(--gold))",
                    }}
                  />
                </div>
                <div className="w-6 text-xs font-medium text-foreground text-right">{m.orders}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top services */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-medium text-foreground text-sm mb-4">Популярность услуг</h2>
        <div className="space-y-3">
          {TOP_SERVICES.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground font-mono-ibm">{s.revenue.toLocaleString("ru")} ₽</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(s.count / maxServiceCount) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-8 text-right text-sm font-semibold text-foreground">{s.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
