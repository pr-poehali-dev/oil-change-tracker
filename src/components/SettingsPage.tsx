import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [remindBefore, setRemindBefore] = useState("24");
  const [smsTemplate, setSmsTemplate] = useState(
    "Уважаемый клиент! Напоминаем о запланированной обработке {дата} в {время} по адресу: {адрес}. Служба дезинсекции ДезКонтроль."
  );
  const [companyName, setCompanyName] = useState("ООО «ДезКонтроль»");
  const [phone, setPhone] = useState("+7 (800) 555-00-00");
  const [inn, setInn] = useState("7701234567");

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Конфигурация приложения и уведомлений</p>
      </div>

      {/* Company info */}
      <section className="bg-card border border-border rounded-lg mb-4 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/40">
          <h2 className="font-medium text-sm text-foreground flex items-center gap-2">
            <Icon name="Building2" size={15} className="text-muted-foreground" fallback="Info" />
            Данные организации
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          {[
            { label: "Название компании", value: companyName, onChange: setCompanyName },
            { label: "Телефон", value: phone, onChange: setPhone },
            { label: "ИНН", value: inn, onChange: setInn },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
              <input
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-card border border-border rounded-lg mb-4 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/40">
          <h2 className="font-medium text-sm text-foreground flex items-center gap-2">
            <Icon name="Bell" size={15} className="text-muted-foreground" fallback="Bell" />
            Уведомления клиентов
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* SMS */}
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-sm font-medium text-foreground">SMS-уведомления</div>
              <div className="text-xs text-muted-foreground">Отправка SMS о дате и времени обработки</div>
            </div>
            <button
              onClick={() => setSmsEnabled(!smsEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${smsEnabled ? "bg-primary" : "bg-secondary border border-border"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${smsEnabled ? "left-5.5 translate-x-0.5" : "left-0.5"}`} />
            </button>
          </div>

          {/* Push */}
          <div className="flex items-center justify-between py-1 border-t border-border pt-4">
            <div>
              <div className="text-sm font-medium text-foreground">Push-уведомления</div>
              <div className="text-xs text-muted-foreground">Push в мобильное приложение клиента</div>
            </div>
            <button
              onClick={() => setPushEnabled(!pushEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${pushEnabled ? "bg-primary" : "bg-secondary border border-border"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${pushEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Remind before */}
          <div className="border-t border-border pt-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Напоминать за</label>
            <select
              value={remindBefore}
              onChange={(e) => setRemindBefore(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="1">1 час до обработки</option>
              <option value="3">3 часа до обработки</option>
              <option value="24">24 часа (за сутки)</option>
              <option value="48">48 часов (за двое суток)</option>
            </select>
          </div>

          {/* SMS Template */}
          <div className="border-t border-border pt-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Шаблон SMS-сообщения
            </label>
            <textarea
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Переменные: <span className="font-mono-ibm text-primary">{"{дата}"}</span>, <span className="font-mono-ibm text-primary">{"{время}"}</span>, <span className="font-mono-ibm text-primary">{"{адрес}"}</span>, <span className="font-mono-ibm text-primary">{"{клиент}"}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Document settings */}
      <section className="bg-card border border-border rounded-lg mb-6 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/40">
          <h2 className="font-medium text-sm text-foreground flex items-center gap-2">
            <Icon name="FileText" size={15} className="text-muted-foreground" fallback="File" />
            Документы
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Нумерация счетов</label>
            <input defaultValue="СЧ-{год}-{номер}" className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Нумерация смет</label>
            <input defaultValue="СМ-{год}-{номер}" className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Срок оплаты по умолчанию (дней)</label>
            <input defaultValue="10" type="number" className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </section>

      <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
        Сохранить настройки
      </button>

      {/* Profile */}
      <section className="bg-card border border-border rounded-lg mt-6 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/40">
          <h2 className="font-medium text-sm text-foreground flex items-center gap-2">
            <Icon name="User" size={15} className="text-muted-foreground" fallback="User" />
            Профиль
          </h2>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">{user?.phone ? `+${user.phone}` : "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Номер телефона для входа</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10 transition-colors"
          >
            <Icon name="LogOut" size={15} fallback="LogOut" />
            Выйти
          </button>
        </div>
      </section>
    </div>
  );
}