// Локальные уведомления через Capacitor Local Notifications
// Работают только в нативном приложении (Android/iOS) после установки пакета
// В браузере — тихий режим без ошибок

const NOTIF_ID_BASE = 1000;
const NOTIF_COUNT = 48;
const STORAGE_KEY = "notif_scheduled_total";

const HOUR = 60 * 60 * 1000;

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

function getWarningMessages(remaining: number, carName: string) {
  return [
    { title: "Замена масла", body: `До замены осталось ${remaining} км на ${carName}. Не тяни!` },
    { title: "Напоминание о масле", body: `${carName}: осталось ${remaining} км. Запишись на замену.` },
    { title: "Масло на исходе", body: `${remaining} км до замены масла — ${carName} ждёт обслуживания.` },
    { title: "Замена масла", body: `Ресурс масла заканчивается. Осталось ${remaining} км (${carName}).` },
  ];
}

function getOverdueMessages(carName: string) {
  return [
    { title: "Срочно! Замена масла", body: `${carName}: пробег замены превышен! Замените масло как можно скорее.` },
    { title: "Масло просрочено", body: `${carName}: вы превысили интервал замены масла. Двигатель под угрозой!` },
    { title: "Замените масло!", body: `Интервал замены масла на ${carName} давно прошёл. Не откладывай!` },
  ];
}

export async function scheduleOilNotifications(remaining: number, carName: string) {
  const ln = getPlugin();
  if (!ln) return;

  // Если больше 300 км — уведомлений нет
  if (remaining > 300) {
    await cancelOilNotifications();
    return;
  }

  try {
    const { display } = await ln.requestPermissions();
    if (display !== "granted") return;

    await ln.cancel({ notifications: Array.from({ length: NOTIF_COUNT }, (_, i) => ({ id: NOTIF_ID_BASE + i })) });

    const isOverdue = remaining <= 0;
    const intervalMs = isOverdue ? 1 * HOUR : 2 * HOUR;
    const msgs = isOverdue ? getOverdueMessages(carName) : getWarningMessages(remaining, carName);

    const notifications = [];
    // Первое уведомление — сразу (через 5 сек чтобы успело сохраниться)
    const firstMsg = msgs[0];
    notifications.push({
      id: NOTIF_ID_BASE,
      title: firstMsg.title,
      body: firstMsg.body,
      schedule: { at: new Date(Date.now() + 5000) },
      smallIcon: "ic_stat_oil",
      channelId: "oil_reminder",
    });

    // Повторные уведомления
    let nextAt = Date.now();
    for (let i = 1; i < NOTIF_COUNT; i++) {
      nextAt += intervalMs;
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
