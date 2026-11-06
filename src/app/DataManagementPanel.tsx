import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { exportBackup, importBackup } from "./storage";

export function DataManagementPanel({
  storageReady,
  storageError,
}: {
  storageReady: boolean;
  storageError: string | null;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `life-maps-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage("Резервная копия создана.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось создать резервную копию.");
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
    try {
      await importBackup(file);
      setMessage("Данные восстановлены. Разделы обновлены.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось восстановить данные.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Резервное копирование" className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
        <button type="button" onClick={() => void handleExport()} disabled={busy || !storageReady || !!storageError}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-foreground disabled:opacity-50">
          <Download size={13} /> Экспорт
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy || !storageReady || !!storageError}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50">
          <Upload size={13} /> Импорт
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
      </div>
      <p role="status" aria-live="polite" className="max-w-72 rounded-lg bg-card/95 px-3 py-1.5 text-right text-[10px] text-muted-foreground shadow">
        {storageError ?? message ?? (storageReady ? "Данные хранятся только в этом браузере." : "Подключение локальной базы…")}
      </p>
    </section>
  );
}
