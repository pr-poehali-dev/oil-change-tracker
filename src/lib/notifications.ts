// Локальные уведомления через Capacitor Local Notifications
// Работают только в нативном приложении (Android/iOS) после установки пакета
// В браузере — тихий режим без ошибок

const NOTIF_ID_BASE = 1000;
const NOTIF_INTERVAL_HOURS = [2, 2.5, 3];
const NOTIF_COUNT = 24;
const STORAGE_KEY = "notif_scheduled_total";

function randomInterval() {
  const h = NOTIF_INTERVAL_HOURS[Math.floor(Math.random() * NOTIF_INTERVAL_HOURS.length)];
  return h * 60 * 60 * 1000;
}

function getMessages(remaining: number, carName: string) {
  return [
    { title: "Замена масла", body: `До замены осталось ${remaining} км на ${carName}. Не тяни!` },
    { title: "Напоминание о масле", body: `${carName}: осталось ${remaining} км. Запишись на замену.` },
    { title: "Масло на исходе", body: `${remaining} км до замены масла — ${carName} ждёт обслуживания.` },
    { title: "Замена масла", body: `Ресурс масла заканчивается. Осталось ${remaining} км (${carName}).` },
  ];
}

// Возвращает плагин LocalNotifications только в Capacitor-среде (нативное приложение)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPlugin(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any)?.Capacitor;
    return cap?.Plugins?.LocalNotifications ?? null;
  } catch {
    return null;
  }
}

export async function scheduleOilNotifications(remaining: number, carName: string) {
  if (remaining >= 300) {
    await cancelOilNotifications();
    return;
  }

  const ln = getPlugin();
  if (!ln) return;

  try {
    const { display } = await ln.requestPermissions();
    if (display !== "granted") return;

    await ln.cancel({ notifications: Array.from({ length: NOTIF_COUNT }, (_, i) => ({ id: NOTIF_ID_BASE + i })) });

    const msgs = getMessages(remaining, carName);
    const notifications = [];
    let nextAt = Date.now();

    for (let i = 0; i < NOTIF_COUNT; i++) {
      nextAt += randomInterval();
      const msg = msgs[i % msgs.length];
      notifications.push({
        id: NOTIF_ID_BASE + i,
        title: msg.title,
        body: msg.body,
        schedule: { at: new Date(nextAt) },
        smallIcon: "ic_stat_oil",
        channelId: "oil_reminder",
      });
    }

    await ln.schedule({ notifications });
    localStorage.setItem(STORAGE_KEY, String(remaining));
  } catch {
    //
  }
}

export async function cancelOilNotifications() {
  const ln = getPlugin();
  if (!ln) return;
  try {
    await ln.cancel({ notifications: Array.from({ length: NOTIF_COUNT }, (_, i) => ({ id: NOTIF_ID_BASE + i })) });
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    //
  }
}

export function getScheduledRemaining(): number | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v !== null ? Number(v) : null;
}
