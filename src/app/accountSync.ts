import { clearStorageWorkspace, exportBackup, getStorageScope, importBackup, readSyncMetadata, setStorageScope, writeSyncMetadata, type BackupPayload } from "./storage";
import { backupsEqual, isPristineBackup, mergeBackups } from "./syncMerge";
export type SyncStatus = "syncing" | "synced" | "offline" | "conflict" | "error";
export type SyncView = { status: SyncStatus; updatedAt: string | null; pending: boolean; detail: string };
type Meta = { accountId: string; revision: number | null; updatedAt: string | null; base: BackupPayload | null; pending: boolean; conflicts?: string[]; conflictLocal?: BackupPayload; conflictRemote?: BackupPayload };
type Remote = { payload: BackupPayload | null; revision: number | null; updatedAt: string | null };
const key = (id: string) => `sync:${id}`;
async function errorFor(response: Response): Promise<Error & { status: number }> {
  let message = `Ошибка синхронизации (${response.status}).`;
  try { const body = await response.json() as { error?: unknown }; if (typeof body.error === "string") message = body.error; } catch {}
  return Object.assign(new Error(message), { status: response.status });
}
async function syncStatus(): Promise<{ revision: number | null; updatedAt: string | null }> {
  const response = await fetch("/api/sync/status", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw await errorFor(response);
  return await response.json() as { revision: number | null; updatedAt: string | null };
}
async function pull(): Promise<Remote> {
  const response = await fetch("/api/data", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw await errorFor(response);
  return await response.json() as Remote;
}
async function push(payload: BackupPayload, revision: number | null): Promise<number> {
  const response = await fetch("/api/data", { method: "PUT", credentials: "same-origin",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload, expectedRevision: revision }) });
  if (!response.ok) throw await errorFor(response);
  return (await response.json() as { revision: number }).revision;
}
async function local(): Promise<BackupPayload> {
  return JSON.parse(await (await exportBackup()).text()) as BackupPayload;
}
async function restore(payload: BackupPayload): Promise<void> {
  await importBackup(new File([JSON.stringify(payload)], "account-sync.json", { type: "application/json" }));
}
export async function activateAccountWorkspace(accountId: string, claimGuest = false): Promise<{ guestDataMoved: boolean; conflicts: string[] }> {
  const previousScope = getStorageScope();
  if (previousScope === accountId) return { guestDataMoved: false, conflicts: [] };
  const guestPayload = claimGuest && previousScope === "guest" ? await local() : null;
  setStorageScope(accountId);
  if (!guestPayload || isPristineBackup(guestPayload)) return { guestDataMoved: false, conflicts: [] };
  const accountPayload = await local();
  if (isPristineBackup(accountPayload)) {
    await restore(guestPayload);
    await clearStorageWorkspace("guest");
    return { guestDataMoved: true, conflicts: [] };
  }
  const combined = mergeBackups(null, accountPayload, guestPayload);
  if (combined.conflicts.length) return { guestDataMoved: false, conflicts: combined.conflicts };
  await restore(combined.payload);
  await clearStorageWorkspace("guest");
  return { guestDataMoved: true, conflicts: [] };
}

export function startAccountSync(accountId: string, notify: (state: SyncView) => void) {
  let stopped = false, running = false, queued = false, retryDelay = 2000;
  let debounce: ReturnType<typeof setTimeout> | undefined, retry: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("life-maps:records") : undefined;
  const ensureActive = () => {
    if (stopped || getStorageScope() !== accountId) throw new Error("Локальное пространство аккаунта изменилось; синхронизация остановлена.");
  };
  const emit = (status: SyncStatus, pending: boolean, detail: string, updatedAt: string | null = null) =>
    notify({ status, pending, detail, updatedAt });
  const savePending = async () => {
    const old = await readSyncMetadata<Meta>(key(accountId));
    await writeSyncMetadata(key(accountId), { accountId, revision: old?.revision ?? null,
      updatedAt: old?.updatedAt ?? null, base: old?.base ?? null, pending: true, conflicts: old?.conflicts, conflictLocal: old?.conflictLocal, conflictRemote: old?.conflictRemote } satisfies Meta);
  };
  const schedule = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void run(), 600);
  };
  const run = async () => {
    if (stopped || getStorageScope() !== accountId) return;
    if (running) { queued = true; return; }
    if (!navigator.onLine) { await savePending(); emit("offline", true, "Нет интернета. Изменения сохранены в очереди."); return; }
    running = true; emit("syncing", true, "Синхронизация с аккаунтом…");
    try {
      let meta = await readSyncMetadata<Meta>(key(accountId));
      ensureActive();
      if (meta?.accountId !== accountId) meta = undefined;
      let localData = await local();
      const remoteStatus = await syncStatus();
      ensureActive();
      if (meta?.base && !meta.pending && meta.revision === remoteStatus.revision && backupsEqual(localData, meta.base)) {
        emit("synced", false, "Все изменения синхронизированы.", remoteStatus.updatedAt ?? meta.updatedAt);
        return;
      }
      let remote = await pull(), result: BackupPayload;
      ensureActive();
      if (!remote.payload) result = localData;
      else if (!meta?.base && isPristineBackup(localData)) {
        ensureActive();
        await restore(remote.payload); result = remote.payload;
      } else {
        const combined = mergeBackups(meta?.base ?? null, localData, remote.payload);
        if (combined.conflicts.length) {
          await writeSyncMetadata(key(accountId), { accountId, revision: remote.revision,
            updatedAt: remote.updatedAt, base: meta?.base ?? null, pending: true,
            conflicts: combined.conflicts.slice(0, 30), conflictLocal: localData, conflictRemote: remote.payload } satisfies Meta);
          emit("conflict", true, `Конфликт одновременных изменений: ${combined.conflicts.slice(0, 3).join(", ")}. Данные не перезаписаны.`, remote.updatedAt);
          return;
        }
        result = combined.payload;
      }
      if (remote.payload && !backupsEqual(result, localData)) {
        ensureActive();
        await restore(result);
        localData = result;
      }
      let revision = remote.revision;
      if (!remote.payload || !backupsEqual(result, remote.payload)) {
        ensureActive();
        try { revision = await push(result, remote.revision); }
        catch (cause) {
          if (!(cause instanceof Error) || (cause as Error & {status?:number}).status !== 409) throw cause;
          remote = await pull();
          ensureActive();
          if (!remote.payload) throw cause;
          const retryLocal = await local();
          const retryMerge = mergeBackups(meta?.base ?? null, retryLocal, remote.payload);
          if (retryMerge.conflicts.length) {
            await writeSyncMetadata(key(accountId), { accountId, revision: remote.revision,
              updatedAt: remote.updatedAt, base: meta?.base ?? null, pending: true,
              conflicts: retryMerge.conflicts.slice(0, 30), conflictLocal: retryLocal, conflictRemote: remote.payload } satisfies Meta);
            emit("conflict", true, "Другое устройство изменило те же записи. Автоматическая перезапись остановлена.", remote.updatedAt);
            return;
          }
          result = retryMerge.payload;
          if (!backupsEqual(result, retryLocal)) { ensureActive(); await restore(result); }
          if (!backupsEqual(result, remote.payload)) ensureActive();
          revision = backupsEqual(result, remote.payload) ? remote.revision : await push(result, remote.revision);
        }
      }
      const updatedAt = new Date().toISOString();
      await writeSyncMetadata(key(accountId), { accountId, revision, updatedAt, base: result, pending: false } satisfies Meta);
      retryDelay = 2000; emit("synced", false, "Все изменения синхронизированы.", updatedAt);
    } catch (cause) {
      if (stopped || getStorageScope() !== accountId) return;
      await savePending().catch(() => undefined);
      emit("error", true, cause instanceof Error ? cause.message : "Не удалось выполнить синхронизацию.");
      if (!stopped) { retry = setTimeout(() => void run(), retryDelay); retryDelay = Math.min(retryDelay * 2, 60000); }
    } finally { running = false; if (queued && !stopped) { queued = false; schedule(); } }
  };
  const changed = (event: MessageEvent) => {
    if ((event.data as {scope?:unknown})?.scope !== accountId) return;
    void savePending().catch(() => undefined); schedule();
  };
  const online = () => { if (retry) clearTimeout(retry); void run(); };
  const offline = () => { void savePending().catch(() => undefined); emit("offline", true, "Нет соединения. Изменения поставлены в очередь."); };
  channel?.addEventListener("message", changed);
  window.addEventListener("online", online); window.addEventListener("offline", offline);
  poll = setInterval(() => void run(), 5000);
  void run();
  return {
    retry: () => { if (retry) clearTimeout(retry); void run(); },
    resolveConflict: async (strategy: "local" | "remote") => {
      ensureActive();
      if (!navigator.onLine) { emit("offline", true, "Для разрешения конфликта необходимо подключение к интернету."); return; }
      const meta = await readSyncMetadata<Meta>(key(accountId));
      if (!meta?.conflictLocal || !meta.conflictRemote || meta.revision === null) {
        emit("error", true, "Сохранённые данные конфликта не найдены. Повторите синхронизацию.");
        return;
      }
      try {
        const resolved = mergeBackups(meta.base, meta.conflictLocal, meta.conflictRemote, strategy);
        if (resolved.conflicts.length) throw new Error("Не удалось разрешить все конфликтующие поля.");
        ensureActive();
        const revision = await push(resolved.payload, meta.revision);
        ensureActive();
        await restore(resolved.payload);
        const updatedAt = new Date().toISOString();
        await writeSyncMetadata(key(accountId), { accountId, revision, updatedAt, base: resolved.payload, pending: false } satisfies Meta);
        emit("synced", false, strategy === "local" ? "Конфликт разрешён: выбраны изменения этого устройства; остальные независимые изменения сохранены." :
          "Конфликт разрешён: выбраны серверные значения; остальные независимые изменения сохранены.", updatedAt);
      } catch (cause) {
        emit("error", true, cause instanceof Error ? cause.message : "Не удалось разрешить конфликт.");
      }
    },
    stop: () => { stopped = true; if (debounce) clearTimeout(debounce); if (retry) clearTimeout(retry);
      if (poll) clearInterval(poll); channel?.removeEventListener("message", changed); channel?.close();
      window.removeEventListener("online", online); window.removeEventListener("offline", offline); },
  };
}
