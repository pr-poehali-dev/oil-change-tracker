import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIF_ID_BASE = 1000;
const NOTIF_COUNT = 48;
const STORAGE_KEY = "notif_scheduled_total";
const WEB_NOTIF_PERMISSION_KEY = "web_notif_asked";

const HOUR = 60 * 60 * 1000;

function isNative(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(window as any)?.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function isWebNotifSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestWebNotifPermission(): Promise<boolean> {
  if (!isWebNotifSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  localStorage.setItem(WEB_NOTIF_PERMISSION_KEY, '1');
  return result === 'granted';
}

export function getWebNotifPermission(): NotificationPermission | null {
  if (!isWebNotifSupported()) return null;
  return Notification.permission;
}

export async function registerServiceWorker() {
  if (!isWebNotifSupported()) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    //
  }
}

async function sendWebNotification(title: string, body: string, tag = 'autopilot') {
  if (!isWebNotifSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: '/favicon.svg', tag, renotify: true });
    } else {
      new Notification(title, { body, icon: '/favicon.svg', tag });
    }
  } catch {
    try { new Notification(title, { body }); } catch { /* */ }
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
  // Web-браузер
  if (!isNative()) {
    if (!isWebNotifSupported() || Notification.permission !== 'granted') return;
    if (remaining <= 0) {
      const msgs = getOverdueMessages(carName);
      await sendWebNotification(msgs[0].title, msgs[0].body, 'oil_overdue');
    } else if (remaining <= 300) {
      const msgs = getWarningMessages(remaining, carName);
      await sendWebNotification(msgs[0].title, msgs[0].body, 'oil_warning');
    }
    return;
  }

  // Нативное приложение
  if (remaining > 300) {
    await cancelOilNotifications();
    return;
  }

  try {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== "granted") return;

    await LocalNotifications.cancel({
      notifications: Array.from({ length: NOTIF_COUNT }, (_, i) => ({ id: NOTIF_ID_BASE + i }))
    });

    await LocalNotifications.createChannel({
      id: "oil_reminder",
      name: "Напоминания о замене масла",
      importance: 4,
      vibration: true,
    });

    const isOverdue = remaining <= 0;
    const intervalMs = isOverdue ? 1 * HOUR : 2 * HOUR;
    const msgs = isOverdue ? getOverdueMessages(carName) : getWarningMessages(remaining, carName);

    const notifications = [];
    notifications.push({
      id: NOTIF_ID_BASE,
      title: msgs[0].title,
      body: msgs[0].body,
      schedule: { at: new Date(Date.now() + 3000) },
      smallIcon: "ic_stat_oil",
      channelId: "oil_reminder",
    });

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

    await LocalNotifications.schedule({ notifications });
    localStorage.setItem(STORAGE_KEY, String(remaining));
  } catch {
    //
  }
}

export async function cancelOilNotifications() {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: Array.from({ length: NOTIF_COUNT }, (_, i) => ({ id: NOTIF_ID_BASE + i }))
    });
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    //
  }
}

export function getScheduledRemaining(): number | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v !== null ? Number(v) : null;
}