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
  return { ok: res.ok, data };
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
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (ok && data.ok) {
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
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Вход</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Введите номер телефона — пришлём код
              </p>
            </div>

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
              {loading ? "Отправляем..." : "Получить код"}
            </Button>
          </form>
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
