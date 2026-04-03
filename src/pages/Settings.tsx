import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { AuthContext } from "@/lib/auth";


function getTheme(): "light" | "dark" {
  return (localStorage.getItem("theme") as "light" | "dark") || "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [theme, setTheme] = useState<"light" | "dark">(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="pt-8 pb-4 px-6 max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-secondary transition-colors"
          >
            <Icon name="ChevronLeft" size={20} />
          </button>
          <img src="https://cdn.poehali.dev/files/3e44bb14-1f15-42c9-936f-974135635972.png" alt="АвтоПилот" className="w-16 h-auto" />
        </div>
        <h1 className="text-lg font-golos font-bold text-foreground tracking-tight">Настройки</h1>
      </header>

      <div className="px-6 max-w-md mx-auto w-full flex-1 space-y-4 pb-10">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <Icon name={theme === "dark" ? "Moon" : "Sun"} size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Тёмная тема</p>
                <p className="text-xs text-muted-foreground">Бережёт глаза в темноте</p>
              </div>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative w-12 h-7 rounded-full transition-colors ${theme === "dark" ? "bg-accent" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
              <Icon name="Info" size={18} />
            </div>
            <p className="text-sm font-medium text-foreground">О приложении</p>
          </div>
          <div className="px-5 py-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Название</span>
              <span className="text-sm font-medium text-foreground">АвтоПилот</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Версия</span>
              <span className="text-sm font-mono text-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Билд</span>
              <span className="text-sm font-mono text-foreground">79b5f0f</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Создатель</span>
              <span className="text-sm font-medium text-foreground">vcomm</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <Icon name="User" size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Профиль</p>
                <p className="text-xs text-muted-foreground">{user?.phone || "—"}</p>
              </div>
            </div>
          </div>
          <div className="px-5 pb-4">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/40 text-destructive text-sm font-golos font-medium hover:bg-destructive/5 active:scale-95 transition-all"
            >
              <Icon name="LogOut" size={15} />
              Выйти из профиля
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}