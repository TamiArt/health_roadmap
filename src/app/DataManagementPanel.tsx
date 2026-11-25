import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Download, LogIn, LogOut, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { exportBackup, importBackup } from "./storage";

type Account = { id: string; email: string; createdAt: string };
type RemoteState = { payload: Record<string, unknown> | null; revision: number | null; updatedAt: string | null };
type AuthMode = "login" | "register";

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
  const [remote, setRemote] = useState<RemoteState | null>(null);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async response => {
        if (!response.ok) throw new Error(await readApiError(response));
        return response.json() as Promise<{ user: Account | null }>;
      })
      .then(async result => {
        if (!active) return;
        setServerAvailable(true);
        setAccount(result.user);
        if (result.user) {
          const response = await fetch("/api/data", { credentials: "same-origin" });
          if (!response.ok) throw new Error(await readApiError(response));
          if (active) setRemote(await response.json() as RemoteState);
        }
      })
      .catch(() => {
        if (active) setServerAvailable(false);
      });
    return () => { active = false; };
  }, []);

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
  }

  async function refreshRemote(): Promise<RemoteState> {
    const response = await fetch("/api/data", { credentials: "same-origin" });
    if (!response.ok) throw new Error(await readApiError(response));
    const result = await response.json() as RemoteState;
    setRemote(result);
    return result;
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
      setAccount(result.user);
      setPassword("");
      setServerAvailable(true);
      const remoteData = await refreshRemote();
      setAccountExpanded(true);
      showMessage(
        remoteData.payload
          ? "Вход выполнен. На сервере есть сохранённые данные — выберите, что с ними сделать."
          : "Аккаунт создан. Локальные данные пока не загружены на сервер.",
        "success",
      );
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось выполнить вход.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadToServer() {
    if (!account || !storageReady || storageError) return;
    if (remote?.revision !== null && remote?.revision !== undefined &&
      !window.confirm("На сервере уже есть резервная копия. Заменить её всеми текущими локальными данными?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const backupBlob = await exportBackup();
      const payload: unknown = JSON.parse(await backupBlob.text());
      const response = await fetch("/api/data", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, expectedRevision: remote?.revision ?? null }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = await response.json() as { revision: number };
      setRemote({ payload: payload as Record<string, unknown>, revision: result.revision, updatedAt: new Date().toISOString() });
      showMessage("Все локальные данные и вложения сохранены в аккаунте.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось сохранить данные на сервере.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadFromServer() {
    if (!account) return;
    setBusy(true);
    setMessage(null);
    try {
      const latest = await refreshRemote();
      if (!latest.payload) {
        showMessage("В аккаунте пока нет резервной копии.", "error");
        return;
      }
      if (!window.confirm("Загрузка заменит все текущие локальные данные данными аккаунта, включая семейные профили и вложения. Перед продолжением рекомендуется скачать локальную резервную копию. Продолжить?")) return;
      const file = new File([JSON.stringify(latest.payload)], "life-maps-account-backup.json", { type: "application/json" });
      await importBackup(file);
      showMessage("Данные аккаунта восстановлены на этом устройстве.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось загрузить данные аккаунта.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error(await readApiError(response));
      setAccount(null);
      setRemote(null);
      setAccountExpanded(false);
      showMessage("Вы вышли из аккаунта. Локальные данные этого браузера не удалены.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось выйти из аккаунта.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Управление данными и аккаунтом" aria-busy={busy} className="backup-panel pointer-events-none fixed z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2">
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
                  <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                    {remote?.revision
                      ? `Резервная копия на сервере · версия ${remote.revision}${remote.updatedAt ? ` · ${new Date(remote.updatedAt).toLocaleString("ru-RU")}` : ""}`
                      : "На сервере пока нет сохранённых данных."}
                  </div>
                  <button type="button" onClick={() => void handleUploadToServer()} disabled={busy || !storageReady || !!storageError}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
                    <Upload size={13} /> Сохранить локальные данные в аккаунте
                  </button>
                  <button type="button" onClick={() => void handleDownloadFromServer()} disabled={busy || !remote?.payload}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground disabled:opacity-50">
                    <Download size={13} /> Восстановить данные из аккаунта
                  </button>
                  <button type="button" onClick={() => void refreshRemote().then(() => showMessage("Состояние аккаунта обновлено.", "success")).catch(error => showMessage(error instanceof Error ? error.message : "Не удалось обновить данные.", "error"))}
                    disabled={busy} className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 disabled:opacity-50">
                    <RefreshCw size={12} /> Проверить серверную копию
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
          {storageReady ? "Локальная база и резервные копии доступны." : "Подключение локальной базы…"}
        </p>
      )}
    </section>
  );
}
