import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ApiError, clearFreightsByDate, createFreight, deleteFreight, getFreights, updateFreight } from "./api";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FreightForm } from "./components/FreightForm";
import { FreightTable } from "./components/FreightTable";
import { Topbar } from "./components/Topbar";
import { POLLING_INTERVAL_MS, RECEIVER_OPTIONS, TAGGY_OPTIONS } from "./constants";
import type {
  ConnectionStatus,
  FreightFormErrors,
  FreightFormValues,
  FreightPayload,
  FreightRecord,
  ReceiverOption,
  TaggyFilter,
  TaggyOption,
  ToastState,
} from "./types";
import { getTodayInSaoPaulo, isValidDateString } from "./utils/date";
import { formatCentsToInput, parseMoneyInputToCents, sanitizeMoneyInput } from "./utils/money";
import { generateFreightsPdf } from "./utils/pdf";
import { isValidPlate, normalizePlateInput } from "./utils/plate";
import { getPreviewMode, PreviewDashboard } from "./preview";

type ConfirmDialogState =
  | {
      type: "delete";
      record: FreightRecord;
    }
  | {
      type: "clear";
    }
  | null;

function createEmptyForm(date: string): FreightFormValues {
  return {
    date,
    plate: "",
    client: "",
    loteMotz: "",
    loteAtua: "",
    taggy: "",
    freight: "",
    receiver: "",
    observation: "",
  };
}

function sortFreights(records: FreightRecord[]): FreightRecord[] {
  return [...records].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function filterFreights(records: FreightRecord[], search: string, activeTaggy: TaggyFilter): FreightRecord[] {
  const query = search.trim().toLowerCase();

  return records.filter((record) => {
    if (activeTaggy !== "Todos" && record.taggy !== activeTaggy) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      record.plate,
      record.client,
      record.loteMotz,
      record.loteAtua,
      record.taggy,
      record.receiver,
      record.observation ?? "",
    ].some((field) => field.toLowerCase().includes(query));
  });
}

function classifyRequestError(error: unknown): ConnectionStatus {
  if (!navigator.onLine || error instanceof TypeError) {
    return {
      state: "offline",
      detail: "Sem conexão com a API.",
    };
  }

  if (error instanceof ApiError) {
    return {
      state: "error",
      detail: error.message,
    };
  }

  return {
    state: "error",
    detail: error instanceof Error ? error.message : "Falha inesperada.",
  };
}

function normalizeApiErrors(errors: unknown): FreightFormErrors | null {
  if (!errors || typeof errors !== "object") {
    return null;
  }

  const nextErrors: FreightFormErrors = {};
  const formShape = createEmptyForm(getTodayInSaoPaulo());

  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (typeof value !== "string") {
      continue;
    }

    if (key === "freightCents") {
      nextErrors.freight = value;
      continue;
    }

    if (key in formShape) {
      nextErrors[key as keyof FreightFormValues] = value;
    }
  }

  return Object.keys(nextErrors).length > 0 ? nextErrors : null;
}

function validateForm(values: FreightFormValues): FreightFormErrors {
  const errors: FreightFormErrors = {};

  if (!values.date || !isValidDateString(values.date)) {
    errors.date = "Informe uma data válida.";
  }

  if (!values.plate) {
    errors.plate = "Informe a placa.";
  } else if (!isValidPlate(values.plate)) {
    errors.plate = "Use ABC1D23 ou ABC-1234.";
  }

  if (!values.client.trim()) {
    errors.client = "Informe o nome do cliente.";
  }

  if (!values.loteMotz.trim()) {
    errors.loteMotz = "Informe o lote MOTZ.";
  }

  if (!values.loteAtua.trim()) {
    errors.loteAtua = "Informe o lote ATUA.";
  }

  if (!TAGGY_OPTIONS.includes(values.taggy as TaggyOption)) {
    errors.taggy = "Selecione uma opção de Taggy.";
  }

  if (parseMoneyInputToCents(values.freight) === null) {
    errors.freight = "Informe o valor do frete.";
  }

  if (!RECEIVER_OPTIONS.includes(values.receiver as ReceiverOption)) {
    errors.receiver = "Selecione quem recebe o frete.";
  }

  return errors;
}

function toPayload(values: FreightFormValues): FreightPayload {
  return {
    date: values.date,
    plate: normalizePlateInput(values.plate),
    client: values.client.trim(),
    loteMotz: values.loteMotz.trim(),
    loteAtua: values.loteAtua.trim(),
    taggy: values.taggy as TaggyOption,
    freightCents: parseMoneyInputToCents(values.freight) as number,
    receiver: values.receiver as ReceiverOption,
    observation: values.observation.trim() || undefined,
  };
}

function buildFilterSummary(search: string, activeTaggy: TaggyFilter): string | undefined {
  const parts: string[] = [];

  if (search.trim()) {
    parts.push(`Busca: ${search.trim()}`);
  }

  if (activeTaggy !== "Todos") {
    parts.push(`Taggy: ${activeTaggy}`);
  }

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

export default function App() {
  const previewMode = getPreviewMode();

  if (previewMode) {
    return <PreviewDashboard mode={previewMode} />;
  }

  const today = getTodayInSaoPaulo();
  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState<FreightRecord[]>([]);
  const [formValues, setFormValues] = useState<FreightFormValues>(() => createEmptyForm(today));
  const [formErrors, setFormErrors] = useState<FreightFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTaggy, setActiveTaggy] = useState<TaggyFilter>("Todos");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: "loading",
    detail: "Carregando registros do dia.",
  });
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const requestCounterRef = useRef(0);
  const plateInputRef = useRef<HTMLInputElement | null>(null);

  const filteredRecords = filterFreights(records, search, activeTaggy);

  function focusForm() {
    plateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      plateInputRef.current?.focus();
    }, 120);
  }

  function showToast(type: ToastState["type"], message: string) {
    setToast({
      id: Date.now(),
      type,
      message,
    });
  }

  function resetForm(date = selectedDate) {
    setEditingId(null);
    setFormErrors({});
    setFormValues(createEmptyForm(date));
  }

  async function loadRecords(options?: { silent?: boolean; manual?: boolean }) {
    const requestId = requestCounterRef.current + 1;
    requestCounterRef.current = requestId;

    if (!options?.silent) {
      setIsLoadingRecords(true);
      setConnectionStatus({
        state: "loading",
        detail: "Carregando registros do dia.",
      });
    }

    try {
      const nextRecords = await getFreights(selectedDate);

      if (requestCounterRef.current !== requestId) {
        return;
      }

      setRecords(sortFreights(nextRecords));
      setLastUpdatedAt(new Date().toISOString());
      setBannerMessage(null);
      setConnectionStatus({
        state: "online",
        detail: "Sincronizado com a operação do dia.",
      });

      if (editingId && !nextRecords.some((record) => record._id === editingId)) {
        resetForm(selectedDate);
        showToast("warning", "O frete em edição não está mais disponível.");
      }

      if (options?.manual) {
        showToast("success", "Registros atualizados.");
      }
    } catch (error) {
      if (requestCounterRef.current !== requestId) {
        return;
      }

      const status = classifyRequestError(error);
      setConnectionStatus(status);
      setBannerMessage("Sem conexão — tentando novamente…");

      if (options?.manual) {
        showToast("error", status.detail);
      }
    } finally {
      if (requestCounterRef.current === requestId && !options?.silent) {
        setIsLoadingRecords(false);
      }
    }
  }

  async function handleReload() {
    setIsReloading(true);
    try {
      await loadRecords({ manual: true });
    } finally {
      setIsReloading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, [selectedDate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadRecords({ silent: true });
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [selectedDate]);

  useEffect(() => {
    const onOffline = () => {
      setConnectionStatus({
        state: "offline",
        detail: "Sem conexão com a internet.",
      });
      setBannerMessage("Sem conexão — tentando novamente…");
    };

    const onOnline = () => {
      void loadRecords();
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [toast]);

  function applySelectedDate(date: string) {
    if (!date || !isValidDateString(date)) {
      return;
    }

    setSelectedDate(date);
    setSearch("");
    setActiveTaggy("Todos");
    setBannerMessage(null);
    resetForm(date);
  }

  function handleFieldChange(field: keyof FreightFormValues, value: string) {
    let nextValue = value;

    if (field === "plate") {
      nextValue = normalizePlateInput(value);
    }

    if (field === "freight") {
      nextValue = sanitizeMoneyInput(value);
    }

    setFormValues((current) => ({
      ...current,
      [field]: nextValue,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function handleEdit(record: FreightRecord) {
    setEditingId(record._id);
    setFormErrors({});
    setFormValues({
      date: record.date,
      plate: record.plate,
      client: record.client,
      loteMotz: record.loteMotz,
      loteAtua: record.loteAtua,
      taggy: record.taggy,
      freight: formatCentsToInput(record.freightCents),
      receiver: record.receiver,
      observation: record.observation ?? "",
    });
    focusForm();
  }

  async function handleConfirmAction() {
    if (!confirmDialog) {
      return;
    }

    setIsConfirming(true);

    try {
      if (confirmDialog.type === "delete") {
        const record = confirmDialog.record;
        await deleteFreight(record._id);
        setRecords((current) => current.filter((item) => item._id !== record._id));

        if (editingId === record._id) {
          resetForm(selectedDate);
        }

        showToast("success", "Frete removido");
      } else {
        await clearFreightsByDate(selectedDate);
        setRecords([]);
        resetForm(selectedDate);
        showToast("warning", "Registros do dia apagados");
      }

      setConfirmDialog(null);
      setBannerMessage(null);
      setConnectionStatus({
        state: "online",
        detail: "Sincronizado com a operação do dia.",
      });
      void loadRecords({ silent: true });
    } catch (error) {
      const status = classifyRequestError(error);
      setConnectionStatus(status);
      setBannerMessage("Sem conexão — tentando novamente…");
      showToast(
        "error",
        confirmDialog.type === "delete"
          ? "Falha ao remover. Tente novamente."
          : "Falha ao limpar o dia. Tente novamente.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateForm(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("error", "Revise os campos obrigatórios.");
      return;
    }

    const payload = toPayload(formValues);
    setIsSubmitting(true);

    try {
      if (editingId) {
        const updated = await updateFreight(editingId, payload);

        setRecords((current) =>
          sortFreights(
            current.filter((record) => record._id !== editingId).concat(updated.date === selectedDate ? [updated] : []),
          ),
        );

        showToast("success", "Frete atualizado");
      } else {
        const created = await createFreight(payload);

        if (created.date === selectedDate) {
          setRecords((current) => sortFreights([created, ...current]));
        }

        showToast("success", "Frete salvo com sucesso");
      }

      resetForm(selectedDate);
      setBannerMessage(null);
      setConnectionStatus({
        state: "online",
        detail: "Sincronizado com a operação do dia.",
      });
      void loadRecords({ silent: true });
    } catch (error) {
      const status = classifyRequestError(error);
      setConnectionStatus(status);

      if (status.state !== "online") {
        setBannerMessage("Sem conexão — tentando novamente…");
      }

      if (
        error instanceof ApiError &&
        typeof error.details === "object" &&
        error.details !== null &&
        "errors" in error.details
      ) {
        const nextErrors = normalizeApiErrors((error.details as { errors?: unknown }).errors);

        if (nextErrors) {
          setFormErrors(nextErrors);
        }
      }

      showToast("error", "Falha ao salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownloadPdf() {
    try {
      await generateFreightsPdf({
        date: selectedDate,
        filterSummary: buildFilterSummary(search, activeTaggy),
        records: filteredRecords,
      });
      showToast("success", "PDF exportado com sucesso.");
    } catch {
      showToast("error", "Falha ao exportar PDF.");
    }
  }

  return (
    <div className="app-shell">
      <div className="app-ambient app-ambient-left" aria-hidden="true" />
      <div className="app-ambient app-ambient-right" aria-hidden="true" />

      <Topbar
        connectionStatus={connectionStatus}
        selectedDate={selectedDate}
        onSelectedDateChange={applySelectedDate}
        onReload={handleReload}
        onDownloadPdf={handleDownloadPdf}
        onClearDay={() => setConfirmDialog({ type: "clear" })}
        isReloading={isReloading}
        disableClear={records.length === 0}
      />

      <main className="content-grid">
        <FreightForm
          values={formValues}
          errors={formErrors}
          isEditing={Boolean(editingId)}
          editingId={editingId}
          isSubmitting={isSubmitting}
          selectedDate={selectedDate}
          plateInputRef={plateInputRef}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancelEdit={() => {
            resetForm(selectedDate);
            showToast("warning", "Edição cancelada");
          }}
        />

        <FreightTable
          records={records}
          filteredRecords={filteredRecords}
          search={search}
          activeTaggy={activeTaggy}
          isLoading={isLoadingRecords}
          bannerMessage={bannerMessage}
          lastUpdatedAt={lastUpdatedAt}
          onSearchChange={setSearch}
          onTaggyFilterChange={setActiveTaggy}
          onClearFilters={() => {
            setSearch("");
            setActiveTaggy("Todos");
          }}
          onTaggyClick={setActiveTaggy}
          onRetry={handleReload}
          onEdit={handleEdit}
          onDelete={(record) => setConfirmDialog({ type: "delete", record })}
          onAddFirstFreight={focusForm}
        />
      </main>

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.type === "delete" ? "Excluir frete" : "Limpar Dia"}
        description={
          confirmDialog?.type === "delete"
            ? `Este frete da placa ${confirmDialog.record.plate} será removido permanentemente.`
            : "Todos os registros da data selecionada serão apagados permanentemente."
        }
        confirmLabel={confirmDialog?.type === "delete" ? "Excluir" : "Limpar Dia"}
        isLoading={isConfirming}
        onClose={() => {
          if (!isConfirming) {
            setConfirmDialog(null);
          }
        }}
        onConfirm={handleConfirmAction}
      />

      <div
        className={`toast toast-${toast?.type || "success"} ${toast ? "toast-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        <span className="toast-dot" aria-hidden="true" />
        <span>{toast?.message}</span>
      </div>
    </div>
  );
}
