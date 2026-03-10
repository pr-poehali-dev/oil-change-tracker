import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { apiGetOrders, apiCreateOrder, apiUpdateOrder } from "@/api";

type OrderStatus = "new" | "progress" | "done" | "cancelled";

interface Order {
  id: number;
  client_id: number | null;
  client_name: string;
  phone: string;
  address: string;
  service: string;
  order_date: string | null;
  order_time: string | null;
  price: number;
  status: OrderStatus;
  notes: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новая", progress: "В работе", done: "Выполнена", cancelled: "Отменена",
};
const STATUS_CLASSES: Record<OrderStatus, string> = {
  new: "status-badge-new", progress: "status-badge-progress", done: "status-badge-done", cancelled: "status-badge-cancelled",
};
const STATUS_ICONS: Record<OrderStatus, string> = {
  new: "CirclePlus", progress: "Clock", done: "CheckCircle2", cancelled: "XCircle",
};

const fmtDate = (d: string | null) => d ? d.split("-").reverse().join(".") : "—";
const fmtTime = (t: string | null) => t ? t.slice(0, 5) : "—";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [form, setForm] = useState({ client_name: "", phone: "", address: "", service: "", order_date: "", order_time: "", price: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGetOrders({ search, status: filter !== "all" ? filter : "" });
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, filter]);

  const counts = {
    all: orders.length,
    new: orders.filter(o => o.status === "new").length,
    progress: orders.filter(o => o.status === "progress").length,
    done: orders.filter(o => o.status === "done").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiCreateOrder({ ...form, price: Number(form.price) || 0, status: "new" });
      setShowModal(false);
      setForm({ client_name: "", phone: "", address: "", service: "", order_date: "", order_time: "", price: "" });
      await load();
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    await apiUpdateOrder(order.id, { status });
    setSelectedOrder({ ...order, status });
    await load();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Заявки</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управление входящими заказами на обработку</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Icon name="Plus" size={16} />
          Новая заявка
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Новых", count: counts.new, icon: "CirclePlus", color: "text-blue-600" },
          { label: "В работе", count: counts.progress, icon: "Clock", color: "text-amber-600" },
          { label: "Выполнено", count: counts.done, icon: "CheckCircle2", color: "text-green-600" },
          { label: "Отменено", count: counts.cancelled, icon: "XCircle", color: "text-red-500" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className={s.color}><Icon name={s.icon} size={20} fallback="Circle" /></div>
            <div>
              <div className="text-xl font-semibold text-foreground">{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по клиенту, адресу, услуге..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "new", "progress", "done", "cancelled"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
              {s === "all" ? "Все" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Icon name="Loader2" size={28} className="mx-auto mb-2 opacity-40 animate-spin" fallback="Clock" />
            Загрузка...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">№</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Клиент</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Услуга</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Дата / Время</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Адрес</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Сумма</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <td className="px-4 py-3 font-mono-ibm text-xs text-muted-foreground">#{order.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{order.client_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{order.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{order.service}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{fmtDate(order.order_date)}</div>
                    <div className="text-xs text-muted-foreground">{fmtTime(order.order_time)}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">{order.address}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground font-mono-ibm">{order.price.toLocaleString("ru")} ₽</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_CLASSES[order.status]}`}>
                      <Icon name={STATUS_ICONS[order.status]} size={11} fallback="Circle" />
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="ChevronRight" size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && orders.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Icon name="SearchX" size={32} className="mx-auto mb-2 opacity-30" fallback="Search" />
            Заявки не найдены
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <div className="text-xs text-muted-foreground font-mono-ibm">Заявка #{selectedOrder.id}</div>
                <h3 className="font-semibold text-foreground mt-0.5">{selectedOrder.client_name}</h3>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium ${STATUS_CLASSES[selectedOrder.status]}`}>
                <Icon name={STATUS_ICONS[selectedOrder.status]} size={12} fallback="Circle" />
                {STATUS_LABELS[selectedOrder.status]}
              </span>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { icon: "Wrench", label: "Услуга", value: selectedOrder.service },
                { icon: "MapPin", label: "Адрес", value: selectedOrder.address },
                { icon: "Calendar", label: "Дата", value: fmtDate(selectedOrder.order_date) },
                { icon: "Clock", label: "Время", value: fmtTime(selectedOrder.order_time) },
                { icon: "Phone", label: "Телефон", value: selectedOrder.phone },
                { icon: "Banknote", label: "Стоимость", value: `${selectedOrder.price.toLocaleString("ru")} ₽` },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3">
                  <div className="mt-0.5 text-muted-foreground"><Icon name={row.icon} size={15} fallback="Dot" /></div>
                  <div>
                    <div className="text-xs text-muted-foreground">{row.label}</div>
                    <div className="text-sm font-medium text-foreground">{row.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2">Изменить статус:</div>
              <div className="flex gap-1.5 flex-wrap">
                {(["new", "progress", "done", "cancelled"] as const).map(s => (
                  <button key={s} onClick={() => handleStatusChange(selectedOrder, s)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${selectedOrder.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-2">
              <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Icon name="MessageSquare" size={14} />
                Уведомить клиента
              </button>
              <button onClick={() => setSelectedOrder(null)} className="px-3 border border-border rounded-md hover:bg-secondary transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Новая заявка</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {[
                { label: "Клиент / Организация", key: "client_name", placeholder: "Название или ФИО" },
                { label: "Телефон", key: "phone", placeholder: "+7 (___) ___-__-__" },
                { label: "Адрес объекта", key: "address", placeholder: "Улица, дом, кв./офис" },
                { label: "Услуга", key: "service", placeholder: "Вид обработки" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                  <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Дата</label>
                  <input type="date" value={form.order_date} onChange={e => setForm(p => ({ ...p, order_date: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Время</label>
                  <input type="time" value={form.order_time} onChange={e => setForm(p => ({ ...p, order_time: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Стоимость, ₽</label>
                <input placeholder="0" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-2">
              <button onClick={handleCreate} disabled={saving || !form.client_name} className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? "Сохраняем..." : "Создать заявку"}
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 border border-border rounded-md text-sm hover:bg-secondary transition-colors">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
