import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { apiGetDocuments, apiUpdateDocument } from "@/api";

type DocStatus = "draft" | "sent" | "paid" | "overdue";

interface DocItem { name: string; qty: number; price: number; }
interface Doc {
  id: number;
  doc_number: string;
  type: "estimate" | "invoice";
  client_name: string;
  issue_date: string | null;
  due_date: string | null;
  status: DocStatus;
  items: DocItem[];
}

const STATUS_LABELS: Record<DocStatus, string> = { draft: "Черновик", sent: "Отправлен", paid: "Оплачен", overdue: "Просрочен" };
const STATUS_CLASSES: Record<DocStatus, string> = {
  draft: "bg-secondary text-muted-foreground border border-border",
  sent: "status-badge-new", paid: "status-badge-done", overdue: "status-badge-cancelled",
};

const total = (doc: Doc) => doc.items.reduce((s, i) => s + i.qty * i.price, 0);
const fmtDate = (d: string | null) => d ? d.split("-").reverse().join(".") : "—";

export default function EstimatesPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "estimate" | "invoice">("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGetDocuments({ type: typeFilter !== "all" ? typeFilter : "" });
      setDocs(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleStatus = async (doc: Doc, status: DocStatus) => {
    await apiUpdateDocument(doc.id, { status });
    setSelected({ ...doc, status });
    await load();
  };

  const summaries = {
    paid: docs.filter(d => d.status === "paid").reduce((s, d) => s + total(d), 0),
    sent: docs.filter(d => d.status === "sent").reduce((s, d) => s + total(d), 0),
    overdue: docs.filter(d => d.status === "overdue").reduce((s, d) => s + total(d), 0),
    draft: docs.filter(d => d.status === "draft").reduce((s, d) => s + total(d), 0),
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Сметы и счета</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Финансовые документы по заказам</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Icon name="FilePlus" size={16} />Новый документ
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Оплачено", value: summaries.paid, color: "text-green-600" },
          { label: "Ожидает оплаты", value: summaries.sent, color: "text-blue-600" },
          { label: "Просрочено", value: summaries.overdue, color: "text-red-500" },
          { label: "Черновики", value: summaries.draft, color: "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <div className={`text-xl font-semibold font-mono-ibm ${s.color}`}>{s.value.toLocaleString("ru")} ₽</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-4">
        {(["all", "estimate", "invoice"] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
            {t === "all" ? "Все" : t === "estimate" ? "Сметы" : "Счета"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <Icon name="Loader2" size={28} className="mx-auto mb-2 opacity-40 animate-spin" fallback="Clock" />Загрузка...
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} onClick={() => setSelected(doc)} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name={doc.type === "estimate" ? "Calculator" : "FileText"} size={16} className="text-primary" fallback="File" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm font-mono-ibm">{doc.doc_number}</span>
                      <span className="text-xs text-muted-foreground">{doc.type === "estimate" ? "Смета" : "Счёт"}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{doc.client_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Выставлен: {fmtDate(doc.issue_date)} · Срок: {fmtDate(doc.due_date)}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-foreground font-mono-ibm">{total(doc).toLocaleString("ru")} ₽</div>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${STATUS_CLASSES[doc.status]}`}>{STATUS_LABELS[doc.status]}</span>
                </div>
              </div>
            </div>
          ))}
          {docs.length === 0 && (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Icon name="FileX" size={32} className="mx-auto mb-2 opacity-30" fallback="File" />Документы не найдены
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold font-mono-ibm text-foreground">{selected.doc_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_CLASSES[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">{selected.client_name}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
            </div>
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Услуга</th>
                    <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Кол-во</th>
                    <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Цена</th>
                    <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2.5 text-foreground">{item.name}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{item.qty}</td>
                      <td className="py-2.5 text-right text-muted-foreground font-mono-ibm">{item.price.toLocaleString("ru")}</td>
                      <td className="py-2.5 text-right font-medium font-mono-ibm">{(item.qty * item.price).toLocaleString("ru")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-3 text-right font-semibold text-foreground">Итого:</td>
                    <td className="pt-3 text-right font-bold text-foreground font-mono-ibm text-base">{total(selected).toLocaleString("ru")} ₽</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2">Изменить статус:</div>
              <div className="flex gap-1.5 flex-wrap">
                {(["draft", "sent", "paid", "overdue"] as const).map(s => (
                  <button key={s} onClick={() => handleStatus(selected, s)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${selected.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-2">
              <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Icon name="Send" size={14} />Отправить
              </button>
              <button className="flex-1 border border-border py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2">
                <Icon name="Printer" size={14} />Печать
              </button>
              <button onClick={() => setSelected(null)} className="px-3 border border-border rounded-md hover:bg-secondary transition-colors"><Icon name="X" size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
