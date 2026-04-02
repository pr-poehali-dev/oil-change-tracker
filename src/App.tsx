
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import { AuthContext, AuthUser } from "./lib/auth";

const AUTH_URL = "https://functions.poehali.dev/942caddf-e666-440d-9d89-682d8a35bae3";


const queryClient = new QueryClient();

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

async function checkToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", token }),
    });
    const data = await res.json();
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return parsed?.ok === true;
  } catch {
    return false;
  }
}

function IOSInstallBanner() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const dismissed = localStorage.getItem("ios_install_dismissed");

  const [visible, setVisible] = useState(isIOS && !isInStandaloneMode && !dismissed);

  const dismiss = () => {
    localStorage.setItem("ios_install_dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10000,
      background: "#1a1a1a", borderTop: "1px solid #333",
      padding: "16px 20px 32px", display: "flex", alignItems: "flex-start", gap: 14,
      animation: "slideUp 0.3s ease both",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <img src="https://cdn.poehali.dev/files/4e1d93e8-81a3-4e82-849b-79d148023d28.png" alt="" style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Установить АвтоПилот</div>
        <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.4 }}>
          Нажмите <span style={{ color: "#fff" }}>«Поделиться»</span> <span style={{ fontSize: 16 }}>⬆️</span> внизу экрана, затем <span style={{ color: "#fff" }}>«На экран "Домой"»</span>
        </div>
      </div>
      <button onClick={dismiss} style={{ background: "none", border: "none", color: "#666", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
    </div>
  );
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "#0a0a0a",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        zIndex: 9999, animation: "splashFadeOut 0.4s ease 1.4s both",
      }}
    >
      <style>{`
        @keyframes splashFadeOut { to { opacity: 0; pointer-events: none; } }
        @keyframes splashLogo { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      `}</style>
      <img
        src="https://cdn.poehali.dev/files/3e44bb14-1f15-42c9-936f-974135635972.png"
        alt="АвтоПилот"
        style={{ width: 220, animation: "splashLogo 0.5s ease both" }}
      />
    </div>
  );
}

const App = () => {
  const [splash, setSplash] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const phone = localStorage.getItem("auth_phone") || "";
    if (!token) { setAuthChecked(true); return; }
    checkToken(token).then(valid => {
      if (valid) setUser({ token, phone });
      else { localStorage.removeItem("auth_token"); localStorage.removeItem("auth_phone"); }
      setAuthChecked(true);
    });
  }, []);

  function handleLogin(token: string, phone: string) {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_phone", phone);
    setUser({ token, phone });
  }

  function handleLogout() {
    fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", token: user?.token }),
    }).catch(() => {});
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_phone");
    setUser(null);
  }

  if (!authChecked) return null;

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LoginPage onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {splash && <SplashScreen onDone={() => setSplash(false)} />}
          <IOSInstallBanner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

export default App;