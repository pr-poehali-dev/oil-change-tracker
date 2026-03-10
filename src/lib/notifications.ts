// Локальные уведомления через Capacitor Local Notifications
// Работают только в нативном приложении (Android/iOS)
// В браузере — тихий режим без ошибок

const NOTIF_ID_BASE = 1000;
const NOTIF_INTERVAL_HOURS = [2, 2.5, 3]; // случайный интервал между уведомлениями
const NOTIF_COUNT = 24; // уведомлений на сутки вперёд
const STORAGE_KEY = "notif_scheduled_total";

function randomInterval() {
  const h = NOTIF_INTERVAL_HOURS[Math.floor(Math.random() * NOTIF_INTERVAL_HOURS.length)];
  return h * 60 * 60 * 1000;
}

function getMessages(remaining: number, carName: string): { title: string; body: string }[] {
  return [
    { title: "Замена масла", body: `До замены осталось ${remaining} км на ${carName}. Не тяни!` },
    { title: "Напоминание о масле", body: `${carName}: осталось ${remaining} км. Запишись на замену.` },
    { title: "Масло на исходе", body: `${remaining} км до замены масла — ${carName} ждёт обслуживания.` },
    { title: "Замена масла", body: `Ресурс масла заканчивается. Осталось ${remaining} км (${carName}).` },
  ];
}

export async function scheduleOilNotifications(remaining: number, carName: string) {
  // Если остаток >= 300 — отменяем все, не планируем
  if (remaining >= 300) {
    await cancelOilNotifications();
    return;
  }

  try {
    // Динамический импорт — не ломает браузер если пакет не установлен
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    const { display } = await LocalNotifications.requestPermissions();
    if (display !== "granted") return;

    await LocalNotifications.cancel({ notifications: Array.from({ length: NOTIF_COUNT }, (_, i) => ({ id: NOTIF_ID_BASE + i })) });

    const msgs = getMessages(remaining, carName);
    const now = Date.now();
    const notifications = [];

    let nextAt = now;
    for (let i = 0; i < NOTIF_COUNT; i++) {
      nextAt += randomInterval();
      const msg = msgs[i % msgs.length];
      notifications.push({
        id: NOTIF_ID_BASE + i,
        title: msg.title,
        body: msg.body,
        schedule: { at: new Date(nextAt) },
        sound: undefined,
        smallIcon: "ic_stat_oil",
        channelId: "oil_reminder",
      });
    }

    await LocalNotifications.schedule({ notifications });
    localStorage.setItem(STORAGE_KEY, String(remaining));
  } catch {
    // Capacitor не установлен (браузер) — просто ничего не делаем
  }
}

export async function cancelOilNotifications() {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({
      notifications: Array.from({ length: NOTIF_COUNT }, (_, i) => ({ id: NOTIF_ID_BASE + i })),
    });
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // браузер — игнорируем
  }
}

export function getScheduledRemaining(): number | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v !== null ? Number(v) : null;
}
