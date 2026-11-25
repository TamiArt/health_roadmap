import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Download, LogIn, LogOut, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { exportBackup, importBackup, setStorageScope } from "./storage";
import { activateAccountWorkspace, startAccountSync, type SyncView } from "./accountSync";

type Account = { id: string; email: string; createdAt: string };
type AuthMode = "login" | "register";
type SyncChange = { revision: number; operation_id: string; created_at: string; record_count: number; change_summary: string[] };
const CHANGE_LABELS: Record<string, string> = {
  lifeEvents: "Карта жизни", familyMembers: "Члены семьи", children: "Профили детей", familyEvents: "Семейные даты",
  vaccineStatuses: "Статусы вакцинации", vaccineRecords: "История вакцинации", adultToothData: "Стоматология",
  labUploads: "Документы анализов", labMeasurements: "Измерения анализов", healthEvents: "Медицинские события",
  healthMonitoring: "Контрольные показатели", labResultEntries: "Результаты анализов", childHealth: "Данные детей",
  syncTombstones: "Удаления записей", notificationSettings: "Настройки уведомлений", calendarEvents: "Календарь и планы",
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // The server may be unavailable or a development server may return HTML.
  }
  return `Ошибка запроса (${response.status}).`;
}

export function DataManagementPanel({
  storageReady,
  storageError,
}: {
  storageReady: boolean;
  storageError: string | null;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [syncState, setSyncState] = useState<SyncView>({ status: "syncing", updatedAt: null, pending: false, detail: "Ожидание подключения аккаунта…" });
  const [workspaceConflicts, setWorkspaceConflicts] = useState<string[]>([]);
  const retrySync = useRef<(() => void) | null>(null);
  const resolveSync = useRef<((strategy: "local" | "remote") => Promise<void>) | null>(null);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(true);
  const [changeLog, setChangeLog] = useState<SyncChange[]>([]);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(await readApiError(response));
        return response.json() as Promise<{ user: Account | null }>;
      })
      .then(async result => {
        if (!active) return;
        setServerAvailable(true);
        if (result.user) {
          const activation = await activateAccountWorkspace(result.user.id);
          if (!active) return;
          setWorkspaceConflicts(activation.conflicts);
          setAccount(result.user);
          setAccountExpanded(true);
        } else {
          setStorageScope("guest");
          setAccount(null);
        }
      })
      .catch(() => {
        if (active) setServerAvailable(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const handleWorkspaceChange = (event: StorageEvent) => {
      if (event.key !== "life-maps:active-storage-scope") return;
      void fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
        .then(async response => {
          if (!response.ok) throw new Error(await readApiError(response));
          return response.json() as Promise<{ user: Account | null }>;
        })
        .then(async result => {
          if (!active) return;
          if (result.user) {
            const activation = await activateAccountWorkspace(result.user.id);
            if (!active) return;
            setWorkspaceConflicts(activation.conflicts);
            setAccount(result.user);
            setAccountExpanded(true);
          } else {
            setWorkspaceConflicts([]);
            setAccount(null);
            setAccountExpanded(false);
          }
        })
        .catch(() => { if (active) setServerAvailable(false); });
    };
    window.addEventListener("storage", handleWorkspaceChange);
    return () => {
      active = false;
      window.removeEventListener("storage", handleWorkspaceChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!account) { setChangeLog([]); return () => { active = false; }; }
    void fetch("/api/sync/changes?after=0", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(await readApiError(response));
        return response.json() as Promise<{ changes: SyncChange[] }>;
      })
      .then(result => { if (active) setChangeLog(result.changes.slice(0, 20)); })
      .catch(() => { if (active) setChangeLog([]); });
    return () => { active = false; };
  }, [account?.id, syncState.status, syncState.updatedAt]);

  useEffect(() => {
    if (!account || !storageReady || storageError || workspaceConflicts.length) return;
    const controller = startAccountSync(account.id, setSyncState);
    retrySync.current = controller.retry;
    resolveSync.current = controller.resolveConflict;
    return () => {
      controller.stop();
      retrySync.current = null;
      resolveSync.current = null;
    };
  }, [account?.id, storageReady, storageError, workspaceConflicts.length]);

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
  }

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    setMessageType(null);
    try {
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `life-maps-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showMessage("Резервная копия создана.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось создать резервную копию.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("Импорт заменит текущие локальные данные данными из выбранной копии. Продолжить?")) return;

    setBusy(true);
    setMessage(null);
    setMessageType(null);
    try {
      await importBackup(file);
      showMessage("Данные восстановлены. Разделы обновлены.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось восстановить данные.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = await response.json() as { user: Account };
      const activation = await activateAccountWorkspace(result.user.id, authMode === "register");
      setWorkspaceConflicts(activation.conflicts);
      setAccount(result.user);
      setPassword("");
      setServerAvailable(true);
      setAccountExpanded(true);
      if (activation.conflicts.length) {
        showMessage("В локальных данных найдены совпадающие записи с разными изменениями. Оба набора сохранены; автоматическая синхронизация приостановлена.", "error");
      } else {
        showMessage(activation.guestDataMoved
          ? "Локальные данные перенесены в пространство аккаунта. Автоматическая синхронизация запущена."
          : "Вход выполнен. Автоматическая синхронизация запущена.", "success");
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось выполнить вход.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error(await readApiError(response));
      setStorageScope("guest");
      setAccount(null);
      setWorkspaceConflicts([]);
      setAccountExpanded(false);
      showMessage("Вы вышли из аккаунта. Локальные данные этого браузера не удалены.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось выйти из аккаунта.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Резервное копирование" aria-busy={busy} className="backup-panel pointer-events-none fixed z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2">
      <div className="pointer-events-auto flex w-full flex-col gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur sm:w-auto">
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={() => void handleExport()} disabled={busy || !storageReady || !!storageError}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-foreground disabled:opacity-50 sm:flex-none">
            <Download size={13} /> Экспорт
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy || !storageReady || !!storageError}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50 sm:flex-none">
            <Upload size={13} /> Импорт
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
        </div>

        <div className="border-t border-border pt-2">
          <button type="button" onClick={() => setAccountExpanded(value => !value)} aria-expanded={accountExpanded}
            className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-muted/60">
            <span className="flex items-center gap-2"><ShieldCheck size={14} /> Аккаунт и синхронизация</span>
            <span aria-hidden="true">{accountExpanded ? "−" : "+"}</span>
          </button>
          {accountExpanded && (
            <div className="mt-2 w-[min(21rem,calc(100vw-3rem))] space-y-3 px-1 pb-1">
              {!serverAvailable && <p role="status" className="text-xs text-muted-foreground">Сервер аккаунтов пока недоступен. Локальное хранение и резервные копии продолжают работать.</p>}
              {account ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">Выполнен вход</p>
                      <p className="break-all text-xs text-muted-foreground">{account.email}</p>
                    </div>
                    <button type="button" onClick={() => void handleLogout()} disabled={busy}
                      className="flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-xs text-foreground disabled:opacity-50">
                      <LogOut size={13} /> Выйти
                    </button>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground" aria-live="polite">
                    <p className="font-medium text-foreground">
                      {syncState.status === "synced" ? "Синхронизировано" :
                        syncState.status === "syncing" ? "Синхронизация…" :
                        syncState.status === "offline" ? "Нет подключения" :
                        syncState.status === "conflict" ? "Требуется разрешить конфликт" :
                        syncState.status === "error" ? "Ошибка синхронизации" : "Проверка аккаунта…"}
                    </p>
                    <p>{syncState.detail}</p>
                    {syncState.updatedAt && <p className="mt-1">Последняя синхронизация: {new Date(syncState.updatedAt).toLocaleString("ru-RU")}</p>}
                    {syncState.pending && <p className="mt-1">Есть изменения, ожидающие отправки.</p>}
                    {workspaceConflicts.length > 0 && <p className="mt-1">Не объединены записи: {workspaceConflicts.slice(0, 3).join(", ")}</p>}
                  </div>
                  {changeLog.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Журнал синхронизации</p>
                      <ul className="max-h-36 space-y-1 overflow-y-auto text-[11px] text-muted-foreground">
                        {changeLog.map(item => <li key={item.operation_id} className="flex items-start justify-between gap-2 border-b border-border/50 pb-1">
                          <span className="min-w-0">Ревизия {item.revision} · {item.record_count} записей<br />{item.change_summary.map(key => CHANGE_LABELS[key] ?? "Изменения").join(", ") || "Изменений в разделах не найдено"}</span>
                          <time dateTime={item.created_at} className="shrink-0">{new Date(item.created_at).toLocaleString("ru-RU")}</time>
                        </li>)}
                      </ul>
                    </div>
                  )}
                  {syncState.status === "conflict" && (
                    <div className="space-y-2">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Выберите, какие значения оставить в конфликтующих полях. Независимые изменения обоих устройств сохраняются.
                      </p>
                      <button type="button" onClick={() => {
                        if (window.confirm("Для конфликтующих полей будут выбраны значения этого устройства. Продолжить?")) {
                          void resolveSync.current?.("local");
                        }
                      }} disabled={busy || !navigator.onLine}
                        className="flex min-h-10 w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
                        Оставить изменения этого устройства
                      </button>
                      <button type="button" onClick={() => {
                        if (window.confirm("Для конфликтующих полей будут выбраны серверные значения. Продолжить?")) {
                          void resolveSync.current?.("remote");
                        }
                      }} disabled={busy || !navigator.onLine}
                        className="flex min-h-10 w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-xs text-foreground disabled:opacity-50">
                        Использовать серверные значения
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => retrySync.current?.()} disabled={busy || !storageReady || !!storageError || workspaceConflicts.length > 0}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground disabled:opacity-50">
                    <RefreshCw size={13} /> Синхронизировать сейчас
                  </button>
                </>
              ) : (
                <>
                  <div className="flex rounded-lg bg-muted/60 p-1">
                    <button type="button" onClick={() => setAuthMode("login")} aria-pressed={authMode === "login"}
                      className={`min-h-9 flex-1 rounded-md px-2 text-xs ${authMode === "login" ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground"}`}>Вход</button>
                    <button type="button" onClick={() => setAuthMode("register")} aria-pressed={authMode === "register"}
                      className={`min-h-9 flex-1 rounded-md px-2 text-xs ${authMode === "register" ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground"}`}>Регистрация</button>
                  </div>
                  <form onSubmit={handleAuth} className="space-y-2">
                    <label className="block space-y-1 text-xs text-muted-foreground">
                      <span>Электронная почта</span>
                      <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}
                        className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                    </label>
                    <label className="block space-y-1 text-xs text-muted-foreground">
                      <span>Пароль {authMode === "register" ? "(не менее 12 символов)" : ""}</span>
                      <input type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} required minLength={authMode === "register" ? 12 : 1} maxLength={256}
                        value={password} onChange={event => setPassword(event.target.value)}
                        className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                    </label>
                    <button type="submit" disabled={busy}
                      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
                      <LogIn size={13} /> {authMode === "register" ? "Создать аккаунт" : "Войти"}
                    </button>
                  </form>
                  {authMode === "register" && <p className="text-[11px] leading-relaxed text-muted-foreground">Подтверждение почты и восстановление пароля потребуют настройки SMTP-сервера. Пока аккаунт создаётся без письма подтверждения.</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {storageError ? (
        <p id="backup-status" role="alert" className="pointer-events-none max-w-full rounded-lg bg-card/95 px-3 py-1.5 text-right text-[10px] text-red-700 shadow sm:max-w-72">
          {storageError}
        </p>
      ) : message ? (
        <p id="backup-status" role={messageType === "error" ? "alert" : "status"} aria-live={messageType === "error" ? "assertive" : "polite"} className="pointer-events-none max-w-full rounded-lg bg-card/95 px-3 py-1.5 text-right text-[10px] text-muted-foreground shadow sm:max-w-72">
          {message}
        </p>
      ) : (
        <p role="status" aria-live="polite" className="pointer-events-none hidden max-w-72 rounded-lg bg-card/95 px-3 py-1.5 text-right text-[10px] text-muted-foreground shadow sm:block">
          {storageReady ? (account ? syncState.detail : "Данные хранятся только в этом браузере.") : "Подключение локальной базы…"}
        </p>
      )}
    </section>
  );
}
