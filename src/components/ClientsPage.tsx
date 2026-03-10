import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { apiGetClients, apiCreateClient } from "@/api";

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: "company" | "individual";
  notes: string;
  orders_count: number;
  total_spent: number;
  last_visit: string | null;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "company" | "individual">("all");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", type: "individual", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGetClients({ search, type: typeFilter !== "all" ? typeFilter : "" });
      setClients(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, typeFilter]);

  const totalRevenue = clients.reduce((s, c) => s + c.total_spent, 0);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiCreateClient(form);
      setShowModal(false);
      setForm({ name: "", phone: "", email: "", address: "", type: "individual", notes: "" });
      await load();
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Клиенты</h1>
          <p className="text-sm text-muted-foreground mt-0.5">База клиентов и история обработок</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Icon name="UserPlus" size={16} />
          Добавить клиента
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-semibold text-foreground">{clients.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Всего клиентов</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-semibold text-foreground">{clients.filter(c => c.type === "company").length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Организаций</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 col-span-2 md:col-span-1">
          <div className="text-2xl font-semibold text-foreground font-mono-ibm">{totalRevenue.toLocaleString("ru")} ₽</div>
          <div className="text-xs text-muted-foreground mt-0.5">Общая выручка</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени, телефону, адресу..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "company", "individual"] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
              {t === "all" ? "Все" : t === "company" ? "Организации" : "Физлица"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <Icon name="Loader2" size={28} className="mx-auto mb-2 opacity-40 animate-spin" fallback="Clock" />
          Загрузка...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clients.map(client => (
            <div key={client.id} onClick={() => setSelected(client)} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all card-hover">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon name={client.type === "company" ? "Building2" : "User"} size={18} className="text-primary" fallback="User" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground text-sm leading-snug">{client.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${client.type === "company" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-secondary text-muted-foreground border border-border"}`}>
                      {client.type === "company" ? "Юр. лицо" : "Физ. лицо"}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon name="Phone" size={11} fallback="Dot" />{client.phone}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon name="MapPin" size={11} fallback="Dot" />{client.address}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Заказов</div>
                  <div className="font-semibold text-sm text-foreground">{client.orders_count}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Выручка</div>
                  <div className="font-semibold text-sm text-foreground font-mono-ibm">{client.total_spent.toLocaleString("ru")} ₽</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Посл. визит</div>
                  <div className="font-semibold text-sm text-foreground">{client.last_visit ? client.last_visit.split("-").reverse().join(".") : "—"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name={selected.type === "company" ? "Building2" : "User"} size={18} className="text-primary" fallback="User" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{selected.name}</h3>
                  <div className="text-xs text-muted-foreground">{selected.type === "company" ? "Юридическое лицо" : "Физическое лицо"}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { icon: "Phone", label: "Телефон", value: selected.phone },
                { icon: "Mail", label: "Email", value: selected.email || "—" },
                { icon: "MapPin", label: "Адрес", value: selected.address },
                { icon: "ClipboardList", label: "Заказов", value: String(selected.orders_count) },
                { icon: "Banknote", label: "Всего потрачено", value: `${selected.total_spent.toLocaleString("ru")} ₽` },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="text-muted-foreground w-4"><Icon name={row.icon} size={15} fallback="Dot" /></div>
                  <div>
                    <div className="text-xs text-muted-foreground">{row.label}</div>
                    <div className="text-sm font-medium text-foreground">{row.value}</div>
                  </div>
                </div>
              ))}
              {selected.notes && (
                <div className="bg-secondary/60 rounded-md p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Заметка: </span>{selected.notes}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-2">
              <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Icon name="Plus" size={14} />Новая заявка
              </button>
              <button onClick={() => setSelected(null)} className="px-3 border border-border rounded-md hover:bg-secondary transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Новый клиент</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Тип</label>
                <div className="flex gap-2">
                  {[["individual", "Физическое лицо"], ["company", "Юридическое лицо"]].map(([v, l]) => (
                    <button key={v} onClick={() => setForm(p => ({ ...p, type: v }))} className={`flex-1 py-2 text-xs rounded-md border transition-colors ${form.type === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{l}</button>
                  ))}
                </div>
              </div>
              {[
                { label: "Имя / Название", key: "name", placeholder: "ФИО или название организации" },
                { label: "Телефон", key: "phone", placeholder: "+7 (___) ___-__-__" },
                { label: "Email", key: "email", placeholder: "email@example.com" },
                { label: "Адрес", key: "address", placeholder: "Улица, дом" },
                { label: "Заметка", key: "notes", placeholder: "Дополнительно..." },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                  <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-2">
              <button onClick={handleCreate} disabled={saving || !form.name} className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? "Сохраняем..." : "Добавить клиента"}
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 border border-border rounded-md text-sm hover:bg-secondary transition-colors">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
