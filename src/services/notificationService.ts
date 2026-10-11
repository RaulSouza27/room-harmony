export interface UserNotification {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "clinica-salas-notifications";

export function getNotifications(userId: string): UserNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const all: UserNotification[] = JSON.parse(data);
    return all.filter((n) => String(n.userId) === String(userId));
  } catch {
    return [];
  }
}

export function addNotification(userId: string, message: string): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const all: UserNotification[] = data ? JSON.parse(data) : [];
    const newNotif: UserNotification = {
      id: Math.random().toString(36).substring(2, 9),
      userId: String(userId),
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };
    all.push(newNotif);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Erro ao salvar notificação:", e);
  }
}

export function markNotificationsAsRead(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    const all: UserNotification[] = JSON.parse(data);
    const updated = all.map((n) => (String(n.userId) === String(userId) ? { ...n, read: true } : n));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
}
