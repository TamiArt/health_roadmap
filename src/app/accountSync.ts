import { exportBackup, importBackup, readSyncMetadata, writeSyncMetadata, type BackupPayload } from "./storage";
import { backupsEqual, isPristineBackup, mergeBackups } from "./syncMerge";
export type SyncStatus = "syncing" | "synced" | "offline" | "conflict" | "error";
export type SyncView = { status: SyncStatus; updatedAt: string | null; pending: boolean; detail: string };
type Meta = { accountId: string; revision: number | null; updatedAt: string | null; base: BackupPayload | null; pending: boolean; conflicts?: string[] };
type Remote = { payload: BackupPayload | null; revision: number | null; updatedAt: string | null };
const key = (id: string) => `sync:${id}`;
async function errorFor(response: Response): Promise<Error & { status: number }> {
  let message = `Ошибка синхронизации (${response.status}).`;
  try { const body = await response.json() as { error?: unknown }; if (typeof body.error === "string") message = body.error; } catch {}
  return Object.assign(new Error(message), { status: response.status });
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
export function startAccountSync(accountId: string, notify: (state: SyncView) => void) {
  let stopped = false, running = false, queued = false, retryDelay = 2000;
  let debounce: ReturnType<typeof setTimeout> | undefined, retry: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("life-maps:records") : undefined;
  const emit = (status: SyncStatus, pending: boolean, detail: string, updatedAt: string | null = null) =>
    notify({ status, pending, detail, updatedAt });
  const savePending = async () => {
    const old = await readSyncMetadata<Meta>(key(accountId));
    await writeSyncMetadata(key(accountId), { accountId, revision: old?.revision ?? null,
      updatedAt: old?.updatedAt ?? null, base: old?.base ?? null, pending: true } satisfies Meta);
  };
  const schedule = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void run(), 600);
  };
  const run = async () => {
    if (stopped) return;
    if (running) { queued = true; return; }
    if (!navigator.onLine) { await savePending(); emit("offline", true, "Нет интернета. Изменения сохранены в очереди."); return; }
    running = true; emit("syncing", true, "Синхронизация с аккаунтом…");
    try {
      let meta = await readSyncMetadata<Meta>(key(accountId));
      if (meta?.accountId !== accountId) meta = undefined;
      const localData = await local();
      let remote = await pull(), result: BackupPayload;
      if (!remote.payload) result = localData;
      else if (!meta?.base && isPristineBackup(localData)) {
        await restore(remote.payload); result = remote.payload;
      } else {
        const combined = mergeBackups(meta?.base ?? null, localData, remote.payload);
        if (combined.conflicts.length) {
          await writeSyncMetadata(key(accountId), { accountId, revision: remote.revision,
            updatedAt: remote.updatedAt, base: meta?.base ?? null, pending: true,
            conflicts: combined.conflicts.slice(0, 30) } satisfies Meta);
          emit("conflict", true, `Конфликт одновременных изменений: ${combined.conflicts.slice(0, 3).join(", ")}. Данные не перезаписаны.`, remote.updatedAt);
          return;
        }
        result = combined.payload;
      }
      let revision = remote.revision;
      if (!remote.payload || !backupsEqual(result, remote.payload)) {
        try { revision = await push(result, remote.revision); }
        catch (cause) {
          if (!(cause instanceof Error) || (cause as Error & {status?:number}).status !== 409) throw cause;
          remote = await pull();
          if (!remote.payload) throw cause;
          const retryMerge = mergeBackups(meta?.base ?? null, await local(), remote.payload);
          if (retryMerge.conflicts.length) {
            await writeSyncMetadata(key(accountId), { accountId, revision: remote.revision,
              updatedAt: remote.updatedAt, base: meta?.base ?? null, pending: true,
              conflicts: retryMerge.conflicts.slice(0, 30) } satisfies Meta);
            emit("conflict", true, "Другое устройство изменило те же записи. Автоматическая перезапись остановлена.", remote.updatedAt);
            return;
          }
          result = retryMerge.payload;
          revision = backupsEqual(result, remote.payload) ? remote.revision : await push(result, remote.revision);
        }
      }
      const updatedAt = new Date().toISOString();
      await writeSyncMetadata(key(accountId), { accountId, revision, updatedAt, base: result, pending: false } satisfies Meta);
      retryDelay = 2000; emit("synced", false, "Все изменения синхронизированы.", updatedAt);
    } catch (cause) {
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
  poll = setInterval(() => void run(), 20000);
  void run();
  return {
    retry: () => { if (retry) clearTimeout(retry); void run(); },
    stop: () => { stopped = true; if (debounce) clearTimeout(debounce); if (retry) clearTimeout(retry);
      if (poll) clearInterval(poll); channel?.removeEventListener("message", changed); channel?.close();
      window.removeEventListener("online", online); window.removeEventListener("offline", offline); },
  };
}
