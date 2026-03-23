import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FreightForm } from "./components/FreightForm";
import { FreightTable } from "./components/FreightTable";
import { Topbar } from "./components/Topbar";
import { ALL_TAGGY_FILTER, DEFAULT_TAGGY_OPTIONS } from "./constants";
import type {
  ConnectionStatus,
  FreightFormErrors,
  FreightFormValues,
  FreightRecord,
  TaggyFilter,
} from "./types";
import { getTodayInSaoPaulo } from "./utils/date";
import { formatCentsToInput } from "./utils/money";
import { mergeTaggyOptions, normalizeTaggyName } from "./utils/taggies";

export type PreviewMode =
  | "default"
  | "empty"
  | "editing"
  | "delete-modal"
  | "clear-modal"
  | "offline";

function createMockRecords(date: string): FreightRecord[] {
  return [
    {
      _id: "67d7a0a20c9b1d00001f001",
      date,
      plate: "ABC1D23",
      client: "Transportadora X",
      loteMotz: "12345",
      loteAtua: "98765",
      taggy: "MOVE MAIS",
      freightCents: 185000,
      receiver: "MOTORISTA",
      observation: "Entrega agendada para 14h no centro de distribuicao.",
      createdAt: `${date}T08:12:00.000Z`,
      updatedAt: `${date}T08:12:00.000Z`,
    },
    {
      _id: "67d7a0a20c9b1d00001f002",
      date,
      plate: "QWE4R56",
      client: "Logistica Aurora",
      loteMotz: "12377",
      loteAtua: "98802",
      taggy: "SEM PARAR",
      freightCents: 245500,
      receiver: "PROPRIET\u00c1RIO",
      observation: "Prioridade alta para saida ate 10h.",
      createdAt: `${date}T09:05:00.000Z`,
      updatedAt: `${date}T09:05:00.000Z`,
    },
    {
      _id: "67d7a0a20c9b1d00001f003",
      date,
      plate: "HJK8L90",
      client: "Operacao Sul Cargo",
      loteMotz: "12410",
      loteAtua: "98855",
      taggy: "VELOE",
      freightCents: 132000,
      receiver: "MOTORISTA",
      observation: "Conferir nota fiscal antes da saida.",
      createdAt: `${date}T11:46:00.000Z`,
      updatedAt: `${date}T11:46:00.000Z`,
    },
  ];
}

function filterPreviewRecords(
  records: FreightRecord[],
  search: string,
  activeTaggy: TaggyFilter,
): FreightRecord[] {
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

function createPreviewForm(date: string, mode: PreviewMode, records: FreightRecord[]): FreightFormValues {
  if (mode === "editing") {
    const record = records[0];

    return {
      date,
      plate: record.plate,
      client: record.client,
      loteMotz: record.loteMotz,
      loteAtua: record.loteAtua,
      taggy: record.taggy,
      freight: formatCentsToInput(record.freightCents),
      receiver: record.receiver,
      observation: record.observation ?? "",
    };
  }

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

export function getPreviewMode(): PreviewMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = new URLSearchParams(window.location.search).get("preview");

  if (
    value === "default" ||
    value === "empty" ||
    value === "editing" ||
    value === "delete-modal" ||
    value === "clear-modal" ||
    value === "offline"
  ) {
    return value;
  }

  return null;
}

export function PreviewDashboard({ mode }: { mode: PreviewMode }) {
  const selectedDate = getTodayInSaoPaulo();
  const baseRecords = createMockRecords(selectedDate);
  const previewRecords = mode === "empty" ? [] : baseRecords;
  const [search, setSearch] = useState(mode === "default" ? "Transportadora" : "");
  const [activeTaggy, setActiveTaggy] = useState<TaggyFilter>(ALL_TAGGY_FILTER);
  const [taggyOptions, setTaggyOptions] = useState<string[]>(() => [...DEFAULT_TAGGY_OPTIONS]);
  const [taggyDraft, setTaggyDraft] = useState("");
  const [formValues, setFormValues] = useState<FreightFormValues>(
    createPreviewForm(selectedDate, mode, previewRecords),
  );
  const plateInputRef = useRef<HTMLInputElement | null>(null);
  const filteredRecords = filterPreviewRecords(previewRecords, search, activeTaggy);
  const formErrors: FreightFormErrors = {};
  const connectionStatus: ConnectionStatus =
    mode === "offline"
      ? { state: "offline", detail: "Conectividade instavel." }
      : { state: "online", detail: "Sincronizado com a operacao do dia." };
  const formTaggyOptions = mergeTaggyOptions(taggyOptions, formValues.taggy ? [formValues.taggy] : []);
  const filterTaggyOptions = mergeTaggyOptions(taggyOptions, previewRecords.map((record) => record.taggy));

  function handlePreviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="app-shell">
      <div className="app-ambient app-ambient-left" aria-hidden="true" />
      <div className="app-ambient app-ambient-right" aria-hidden="true" />

      <Topbar
        connectionStatus={connectionStatus}
        selectedDate={selectedDate}
        onSelectedDateChange={() => undefined}
        onReload={() => undefined}
        onDownloadPdf={() => undefined}
        onClearDay={() => undefined}
        isReloading={false}
        disableClear={previewRecords.length === 0}
      />

      <main className="content-grid">
        <FreightForm
          values={formValues}
          errors={formErrors}
          isEditing={mode === "editing"}
          editingId={mode === "editing" ? baseRecords[0]?._id ?? null : null}
          isSubmitting={false}
          selectedDate={selectedDate}
          plateInputRef={plateInputRef}
          selectableTaggyOptions={formTaggyOptions}
          configuredTaggyOptions={taggyOptions}
          taggyDraft={taggyDraft}
          taggyDraftError={null}
          isLoadingTaggies={false}
          isSavingTaggy={false}
          pendingTaggyDelete={null}
          onTaggyDraftChange={setTaggyDraft}
          onAddTaggy={() => {
            const nextTaggy = normalizeTaggyName(taggyDraft);
            if (!nextTaggy) {
              return;
            }

            setTaggyOptions((current) => mergeTaggyOptions(current, [nextTaggy]));
            setFormValues((current) => ({
              ...current,
              taggy: nextTaggy,
            }));
            setTaggyDraft("");
          }}
          onDeleteTaggy={(option) => {
            setTaggyOptions((current) => current.filter((item) => item !== option));
          }}
          onChange={(field, value) =>
            setFormValues((current) => ({
              ...current,
              [field]: field === "taggy" ? normalizeTaggyName(value) : value,
            }))
          }
          onSubmit={handlePreviewSubmit}
          onCancelEdit={() => undefined}
        />

        <FreightTable
          records={previewRecords}
          filteredRecords={filteredRecords}
          search={search}
          activeTaggy={activeTaggy}
          taggyOptions={filterTaggyOptions}
          isLoading={false}
          bannerMessage={mode === "offline" ? "Sem conexao - tentando novamente..." : null}
          lastUpdatedAt={`${selectedDate}T12:14:00.000Z`}
          onSearchChange={setSearch}
          onTaggyFilterChange={setActiveTaggy}
          onClearFilters={() => {
            setSearch("");
            setActiveTaggy(ALL_TAGGY_FILTER);
          }}
          onTaggyClick={setActiveTaggy}
          onRetry={() => undefined}
          onEdit={() => undefined}
          onDelete={() => undefined}
          onAddFirstFreight={() => undefined}
        />
      </main>

      <ConfirmDialog
        open={mode === "delete-modal" || mode === "clear-modal"}
        title={mode === "delete-modal" ? "Excluir frete" : "Limpar Dia"}
        description={
          mode === "delete-modal"
            ? `Este frete da placa ${baseRecords[0]?.plate ?? "ABC1D23"} sera removido permanentemente.`
            : "Todos os registros da data selecionada serao apagados permanentemente."
        }
        confirmLabel={mode === "delete-modal" ? "Excluir" : "Limpar Dia"}
        isLoading={false}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  );
}
