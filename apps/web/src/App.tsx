import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";
import {
  ApiError,
  clearFreightsByDate,
  createFreight,
  createTaggy,
  deleteFreight,
  deleteTaggy,
  getFreights,
  getTaggies,
  updateFreight,
} from "./api";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FreightForm } from "./components/FreightForm";
import { FreightTable } from "./components/FreightTable";
import { Topbar } from "./components/Topbar";
import { ALL_TAGGY_FILTER, DEFAULT_TAGGY_OPTIONS, POLLING_INTERVAL_MS, RECEIVER_OPTIONS } from "./constants";
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
import { mergeTaggyOptions, normalizeTaggyName } from "./utils/taggies";
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
    if (activeTaggy !== ALL_TAGGY_FILTER && record.taggy !== activeTaggy) {
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
      detail: "Sem conexao com a operacao.",
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

function extractApiFieldError(details: unknown, field: string): string | null {
  if (!details || typeof details !== "object" || !("errors" in details)) {
    return null;
  }

  const errors = (details as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object") {
    return null;
  }

  const value = (errors as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function validateForm(values: FreightFormValues): FreightFormErrors {
  const errors: FreightFormErrors = {};

  if (!values.date || !isValidDateString(values.date)) {
    errors.date = "Informe uma data valida.";
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

  if (!normalizeTaggyName(values.taggy)) {
    errors.taggy = "Selecione uma opcao de Taggy.";
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
    taggy: normalizeTaggyName(values.taggy) as TaggyOption,
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

  if (activeTaggy !== ALL_TAGGY_FILTER) {
    parts.push(`Taggy: ${activeTaggy}`);
  }

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function ToastStatusIcon({ type }: { type?: ToastState["type"] }) {
  const Icon = type === "warning" ? WarningCircle : type === "error" ? XCircle : CheckCircle;

  return <Icon className="toast-icon" size={18} aria-hidden="true" weight="fill" />;
}

export default function App() {
  const previewMode = getPreviewMode();

  if (previewMode) {
    return <PreviewDashboard mode={previewMode} />;
  }

  const today = getTodayInSaoPaulo();
  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState<FreightRecord[]>([]);
  const [taggyOptions, setTaggyOptions] = useState<string[]>(() => [...DEFAULT_TAGGY_OPTIONS]);
  const [formValues, setFormValues] = useState<FreightFormValues>(() => createEmptyForm(today));
  const [formErrors, setFormErrors] = useState<FreightFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTaggy, setActiveTaggy] = useState<TaggyFilter>(ALL_TAGGY_FILTER);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: "loading",
    detail: "Atualizando operacao.",
  });
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isLoadingTaggies, setIsLoadingTaggies] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isSavingTaggy, setIsSavingTaggy] = useState(false);
  const [pendingTaggyDelete, setPendingTaggyDelete] = useState<string | null>(null);
  const [taggyDraft, setTaggyDraft] = useState("");
  const [taggyDraftError, setTaggyDraftError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const requestCounterRef = useRef(0);
  const plateInputRef = useRef<HTMLInputElement | null>(null);

  const filteredRecords = filterFreights(records, search, activeTaggy);
  const formTaggyOptions = mergeTaggyOptions(taggyOptions, formValues.taggy ? [formValues.taggy] : []);
  const filterTaggyOptions = mergeTaggyOptions(taggyOptions, records.map((record) => record.taggy));

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
        detail: "Atualizando operacao.",
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
        detail: "Sincronizado com a operacao.",
      });

      if (editingId && !nextRecords.some((record) => record._id === editingId)) {
        resetForm(selectedDate);
        showToast("warning", "O frete em edicao nao esta mais disponivel.");
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
      setBannerMessage("Sem conexao - tentando novamente...");

      if (options?.manual) {
        showToast("error", status.detail);
      }
    } finally {
      if (requestCounterRef.current === requestId && !options?.silent) {
        setIsLoadingRecords(false);
      }
    }
  }

  async function loadTaggyOptions(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setIsLoadingTaggies(true);
    }

    try {
      const response = await getTaggies();
      setTaggyOptions(mergeTaggyOptions(response.taggyOptions));
      setTaggyDraftError(null);
    } catch {
      if (!options?.silent) {
        showToast("error", "Falha ao carregar as taggys.");
      }
    } finally {
      if (!options?.silent) {
        setIsLoadingTaggies(false);
      }
    }
  }

  async function handleReload() {
    setIsReloading(true);
    try {
      await Promise.all([loadRecords({ manual: true }), loadTaggyOptions({ silent: true })]);
    } finally {
      setIsReloading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, [selectedDate]);

  useEffect(() => {
    void loadTaggyOptions();
  }, []);

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
        detail: "Sem conexao com a operacao.",
      });
      setBannerMessage("Sem conexao - tentando novamente...");
    };

    const onOnline = () => {
      void Promise.all([loadRecords(), loadTaggyOptions({ silent: true })]);
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

  useEffect(() => {
    if (activeTaggy === ALL_TAGGY_FILTER) {
      return;
    }

    const availableFilters = mergeTaggyOptions(taggyOptions, records.map((record) => record.taggy));
    if (!availableFilters.includes(activeTaggy)) {
      setActiveTaggy(ALL_TAGGY_FILTER);
    }
  }, [activeTaggy, records, taggyOptions]);

  function applySelectedDate(date: string) {
    if (!date || !isValidDateString(date)) {
      return;
    }

    setSelectedDate(date);
    setSearch("");
    setActiveTaggy(ALL_TAGGY_FILTER);
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

    if (field === "taggy") {
      nextValue = normalizeTaggyName(value);
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

  async function handleAddTaggy() {
    const nextTaggy = normalizeTaggyName(taggyDraft);

    if (!nextTaggy) {
      setTaggyDraftError("Informe o nome da Taggy.");
      return;
    }

    if (taggyOptions.includes(nextTaggy)) {
      setTaggyDraftError("Essa Taggy ja esta cadastrada.");
      return;
    }

    setIsSavingTaggy(true);

    try {
      const response = await createTaggy(nextTaggy);
      setTaggyOptions(mergeTaggyOptions(response.taggyOptions));
      setTaggyDraft("");
      setTaggyDraftError(null);
      handleFieldChange("taggy", response.taggy);
      showToast("success", "Taggy adicionada.");
    } catch (error) {
      const fieldError = error instanceof ApiError ? extractApiFieldError(error.details, "name") : null;
      setTaggyDraftError(fieldError ?? "Falha ao adicionar a Taggy.");
      showToast("error", fieldError ?? "Falha ao adicionar a Taggy.");
    } finally {
      setIsSavingTaggy(false);
    }
  }

  async function handleDeleteTaggy(option: string) {
    setPendingTaggyDelete(option);

    try {
      const response = await deleteTaggy(option);
      setTaggyOptions(mergeTaggyOptions(response.taggyOptions));
      setTaggyDraftError(null);

      if (!editingId && formValues.taggy === option) {
        setFormValues((current) => ({
          ...current,
          taggy: "",
        }));
      }

      if (activeTaggy === option && !records.some((record) => record.taggy === option)) {
        setActiveTaggy(ALL_TAGGY_FILTER);
      }

      showToast("warning", "Taggy removida.");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Falha ao remover a Taggy.";
      showToast("error", message);
    } finally {
      setPendingTaggyDelete(null);
    }
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
        detail: "Sincronizado com a operacao.",
      });
      void loadRecords({ silent: true });
    } catch (error) {
      const status = classifyRequestError(error);
      setConnectionStatus(status);
      setBannerMessage("Sem conexao - tentando novamente...");
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
      showToast("error", "Revise os campos obrigatorios.");
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
        detail: "Sincronizado com a operacao.",
      });
      void loadRecords({ silent: true });
    } catch (error) {
      const status = classifyRequestError(error);
      setConnectionStatus(status);

      if (status.state !== "online") {
        setBannerMessage("Sem conexao - tentando novamente...");
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
          selectableTaggyOptions={formTaggyOptions}
          configuredTaggyOptions={taggyOptions}
          taggyDraft={taggyDraft}
          taggyDraftError={taggyDraftError}
          isLoadingTaggies={isLoadingTaggies}
          isSavingTaggy={isSavingTaggy}
          pendingTaggyDelete={pendingTaggyDelete}
          onTaggyDraftChange={(value) => {
            setTaggyDraft(value);
            setTaggyDraftError(null);
          }}
          onAddTaggy={handleAddTaggy}
          onDeleteTaggy={handleDeleteTaggy}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancelEdit={() => {
            resetForm(selectedDate);
            showToast("warning", "Edicao cancelada");
          }}
        />

        <FreightTable
          records={records}
          filteredRecords={filteredRecords}
          search={search}
          activeTaggy={activeTaggy}
          taggyOptions={filterTaggyOptions}
          isLoading={isLoadingRecords}
          bannerMessage={bannerMessage}
          lastUpdatedAt={lastUpdatedAt}
          onSearchChange={setSearch}
          onTaggyFilterChange={setActiveTaggy}
          onClearFilters={() => {
            setSearch("");
            setActiveTaggy(ALL_TAGGY_FILTER);
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
        variant={confirmDialog?.type === "clear" ? "clear" : "delete"}
        title={confirmDialog?.type === "delete" ? "Excluir frete" : "Limpar Dia"}
        description={
          confirmDialog?.type === "delete"
            ? `Este frete da placa ${confirmDialog.record.plate} sera removido permanentemente.`
            : "Todos os registros da data selecionada serao apagados permanentemente."
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
        <ToastStatusIcon type={toast?.type} />
        <span>{toast?.message}</span>
      </div>
    </div>
  );
}
