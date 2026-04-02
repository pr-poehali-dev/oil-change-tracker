import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const AUTH_URL = "https://functions.poehali.dev/942caddf-e666-440d-9d89-682d8a35bae3";

async function authRequest(body: Record<string, unknown>) {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  return { ok: res.ok, data: parsed };
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  let d = digits;
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  const parts = [];
  if (d.length > 0) parts.push("+" + d.slice(0, 1));
  if (d.length > 1) parts.push(" (" + d.slice(1, 4));
  if (d.length >= 4) parts[1] += ")";
  if (d.length > 4) parts.push(" " + d.slice(4, 7));
  if (d.length > 7) parts.push("-" + d.slice(7, 9));
  if (d.length > 9) parts.push("-" + d.slice(9, 11));
  return parts.join("");
}

interface LoginPageProps {
  onLogin: (token: string, phone: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [phoneFormatted, setPhoneFormatted] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [yandexLoading, setYandexLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Обработка callback от Яндекса (code в URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yaCode = params.get("code");
    if (yaCode) {
      window.history.replaceState({}, "", window.location.pathname);
      setYandexLoading(true);
      authRequest({ action: "yandex_token", code: yaCode })
        .then(({ ok, data }) => {
          if (ok && data.ok) {
            onLogin(data.token, data.phone);
          } else {
            setError(data.error || "Ошибка входа через Яндекс");
          }
        })
        .catch(() => setError("Нет соединения"))
        .finally(() => setYandexLoading(false));
    }
  }, [onLogin]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCountdown() {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handlePhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setPhone(raw);
    setPhoneFormatted(formatPhone(raw));
    setError("");
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      setError("Введите корректный номер телефона");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { ok, data } = await authRequest({ action: "send", phone });
      if (ok && data.ok && data.dev) {
        onLogin(data.token, data.phone);
      } else if (ok && data.ok) {
        setStep("code");
        startCountdown();
      } else {
        setError(data.error || "Ошибка отправки SMS");
      }
    } catch {
      setError("Нет соединения, попробуйте ещё раз");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(val: string) {
    if (val.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const { ok, data } = await authRequest({ action: "verify", phone, code: val });
      if (ok && data.ok) {
        onLogin(data.token, data.phone);
      } else {
        setError(data.error || "Неверный код");
        setCode("");
      }
    } catch {
      setError("Нет соединения, попробуйте ещё раз");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setCode("");
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await authRequest({ action: "send", phone });
      if (ok && data.ok) {
        startCountdown();
      } else {
        setError(data.error || "Ошибка отправки SMS");
      }
    } catch {
      setError("Нет соединения");
    } finally {
      setLoading(false);
    }
  }

  async function handleYandexLogin() {
    setYandexLoading(true);
    setError("");
    try {
      const { ok, data } = await authRequest({ action: "yandex_url" });
      if (ok && data.url) {
        window.location.href = data.url;
      } else {
        setError("Не удалось получить ссылку Яндекс");
        setYandexLoading(false);
      }
    } catch {
      setError("Нет соединения");
      setYandexLoading(false);
    }
  }

  if (yandexLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4">
          <img
            src="https://cdn.poehali.dev/files/3e44bb14-1f15-42c9-936f-974135635972.png"
            alt="АвтоПилот"
            className="h-16 object-contain mx-auto"
          />
          <p className="text-muted-foreground text-sm">Входим через Яндекс...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.poehali.dev/files/3e44bb14-1f15-42c9-936f-974135635972.png"
            alt="АвтоПилот"
            className="h-16 object-contain"
          />
        </div>

        {step === "phone" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Вход</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Выберите способ входа
              </p>
            </div>

            {/* Яндекс */}
            <button
              type="button"
              onClick={handleYandexLogin}
              disabled={yandexLoading || loading}
              className="w-full h-12 flex items-center justify-center gap-3 border border-border rounded-md bg-card hover:bg-secondary transition-colors text-sm font-medium text-foreground disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#FC3F1D"/>
                <path d="M13.48 6.4H12.2c-1.72 0-2.62.86-2.62 2.14 0 1.44.62 2.16 1.9 3.02L12.8 12.6 9.6 17.6H7.4l2.96-4.6c-1.68-1.12-2.62-2.2-2.62-4.08C7.74 6.9 9.26 5.6 12.14 5.6H15.6V17.6h-2.12V6.4z" fill="white"/>
              </svg>
              {yandexLoading ? "Переходим..." : "Войти через Яндекс"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">или</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSendCode} className="space-y-3">
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="+7 (___) ___-__-__"
                value={phoneFormatted}
                onChange={handlePhoneInput}
                className="text-center text-lg h-12 tracking-wide"
                autoFocus
              />

              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || phone.replace(/\D/g, "").length < 10}
              >
                {loading ? "Отправляем..." : "Войти по SMS"}
              </Button>
            </form>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Код из SMS</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Отправили на <span className="text-foreground font-medium">{phoneFormatted}</span>
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(val) => {
                  setCode(val);
                  setError("");
                  handleVerifyCode(val);
                }}
                disabled={loading}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <InputOTPSlot key={i} index={i} className="w-12 h-12 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            {loading && (
              <p className="text-muted-foreground text-sm text-center">Проверяем...</p>
            )}

            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className="text-sm text-muted-foreground disabled:opacity-50 underline-offset-4 hover:underline disabled:no-underline disabled:cursor-default"
              >
                {countdown > 0 ? `Отправить повторно через ${countdown} сек` : "Отправить код ещё раз"}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Изменить номер
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}