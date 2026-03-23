import { Check, LoaderCircle, PencilLine, Plus, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, FormEvent, RefObject } from "react";
import { RECEIVER_OPTIONS } from "../constants";
import type { FreightFormErrors, FreightFormValues } from "../types";
import { formatDate } from "../utils/date";

interface FreightFormProps {
  values: FreightFormValues;
  errors: FreightFormErrors;
  isEditing: boolean;
  editingId: string | null;
  isSubmitting: boolean;
  selectedDate: string;
  plateInputRef: RefObject<HTMLInputElement>;
  selectableTaggyOptions: string[];
  configuredTaggyOptions: string[];
  taggyDraft: string;
  taggyDraftError: string | null;
  isLoadingTaggies: boolean;
  isSavingTaggy: boolean;
  pendingTaggyDelete: string | null;
  onTaggyDraftChange: (value: string) => void;
  onAddTaggy: () => void;
  onDeleteTaggy: (taggy: string) => void;
  onChange: (field: keyof FreightFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
}

function fieldClassName(error?: string | null): string {
  return error ? "field field-invalid" : "field";
}

export function FreightForm({
  values,
  errors,
  isEditing,
  editingId,
  isSubmitting,
  selectedDate,
  plateInputRef,
  selectableTaggyOptions,
  configuredTaggyOptions,
  taggyDraft,
  taggyDraftError,
  isLoadingTaggies,
  isSavingTaggy,
  pendingTaggyDelete,
  onTaggyDraftChange,
  onAddTaggy,
  onDeleteTaggy,
  onChange,
  onSubmit,
  onCancelEdit,
}: FreightFormProps) {
  const [isTaggyPopoverOpen, setIsTaggyPopoverOpen] = useState(false);
  const [isAddTaggyOpen, setIsAddTaggyOpen] = useState(false);
  const [taggyPopoverStyle, setTaggyPopoverStyle] = useState<CSSProperties | null>(null);
  const taggyAnchorRef = useRef<HTMLDivElement | null>(null);
  const taggyPopoverRef = useRef<HTMLDivElement | null>(null);
  const isSelectedTaggyConfigured = values.taggy ? configuredTaggyOptions.includes(values.taggy) : false;

  useEffect(() => {
    if (!isTaggyPopoverOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const isInsideAnchor = taggyAnchorRef.current?.contains(target);
      const isInsidePopover = taggyPopoverRef.current?.contains(target);

      if (!isInsideAnchor && !isInsidePopover) {
        setIsTaggyPopoverOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTaggyPopoverOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTaggyPopoverOpen]);

  useEffect(() => {
    if (!isTaggyPopoverOpen) {
      setIsAddTaggyOpen(false);
    }
  }, [isTaggyPopoverOpen]);

  useLayoutEffect(() => {
    if (!isTaggyPopoverOpen || !taggyAnchorRef.current) {
      setTaggyPopoverStyle(null);
      return undefined;
    }

    const updatePosition = () => {
      const rect = taggyAnchorRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const viewportPadding = 16;
      const offset = 10;
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - offset;
      const spaceAbove = rect.top - viewportPadding - offset;
      const shouldOpenUpwards = spaceBelow < 280 && spaceAbove > spaceBelow;

      setTaggyPopoverStyle({
        position: "fixed",
        zIndex: 90,
        width: `${width}px`,
        left: `${left}px`,
        top: shouldOpenUpwards ? undefined : `${rect.bottom + offset}px`,
        bottom: shouldOpenUpwards ? `${window.innerHeight - rect.top + offset}px` : undefined,
        maxHeight: `${Math.max(120, shouldOpenUpwards ? spaceAbove : spaceBelow)}px`,
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isTaggyPopoverOpen]);

  useEffect(() => {
    if (!isSavingTaggy && !taggyDraft && !taggyDraftError) {
      setIsAddTaggyOpen(false);
    }
  }, [isSavingTaggy, taggyDraft, taggyDraftError]);

  return (
    <section className="panel panel-form">
      <div className="panel-header">
        <div className="panel-header-copy">
          <span className="panel-kicker">Cadastro operacional</span>
          <h2>{isEditing ? "Editando Frete" : "Novo Frete"}</h2>
          <p>
            {isEditing
              ? "Revise os dados do frete e salve para refletir a operacao atual."
              : "Preencha os campos essenciais para incluir o frete no painel do dia."}
          </p>
        </div>

        <div className="panel-header-side">
          {isEditing && editingId ? <span className="subtle-badge">Editando #{editingId.slice(-6)}</span> : null}
          <span className="date-chip">{formatDate(selectedDate)}</span>
        </div>
      </div>

      <div className="panel-body panel-body-form">
        <form className="freight-form" onSubmit={onSubmit} noValidate>
          <div className="freight-form-layout">
            <div className="freight-form-main">
              <div className="field-row field-row-double">
                <div className={fieldClassName(errors.plate)}>
                  <label htmlFor="plate">Placa*</label>
                  <input
                    ref={plateInputRef}
                    id="plate"
                    name="plate"
                    type="text"
                    placeholder="ABC1D23"
                    value={values.plate}
                    onChange={(event) => onChange("plate", event.target.value)}
                    aria-invalid={Boolean(errors.plate)}
                  />
                  {errors.plate ? <span className="field-error">{errors.plate}</span> : null}
                </div>

                <div className={fieldClassName(errors.client)}>
                  <label htmlFor="client">Nome do cliente*</label>
                  <input
                    id="client"
                    name="client"
                    type="text"
                    placeholder="Ex.: Transportadora X"
                    value={values.client}
                    onChange={(event) => onChange("client", event.target.value)}
                    aria-invalid={Boolean(errors.client)}
                  />
                  {errors.client ? <span className="field-error">{errors.client}</span> : null}
                </div>
              </div>

              <div className="field-row field-row-triple">
                <div className={fieldClassName(errors.loteMotz)}>
                  <label htmlFor="loteMotz">Lote MOTZ*</label>
                  <input
                    id="loteMotz"
                    name="loteMotz"
                    type="text"
                    placeholder="Ex.: 12345"
                    value={values.loteMotz}
                    onChange={(event) => onChange("loteMotz", event.target.value)}
                    aria-invalid={Boolean(errors.loteMotz)}
                  />
                  {errors.loteMotz ? <span className="field-error">{errors.loteMotz}</span> : null}
                </div>

                <div className={fieldClassName(errors.loteAtua)}>
                  <label htmlFor="loteAtua">Lote ATUA*</label>
                  <input
                    id="loteAtua"
                    name="loteAtua"
                    type="text"
                    placeholder="Ex.: 98765"
                    value={values.loteAtua}
                    onChange={(event) => onChange("loteAtua", event.target.value)}
                    aria-invalid={Boolean(errors.loteAtua)}
                  />
                  {errors.loteAtua ? <span className="field-error">{errors.loteAtua}</span> : null}
                </div>

                <div className={fieldClassName(errors.freight)}>
                  <label htmlFor="freight">Valor do frete (R$)*</label>
                  <div className="input-affix">
                    <span>R$</span>
                    <input
                      id="freight"
                      name="freight"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={values.freight}
                      onChange={(event) => onChange("freight", event.target.value)}
                      aria-invalid={Boolean(errors.freight)}
                    />
                  </div>
                  {errors.freight ? <span className="field-error">{errors.freight}</span> : null}
                </div>
              </div>

              <div className={fieldClassName(errors.receiver)}>
                <label>Recebedor do frete*</label>
                <div className="segmented-control" role="radiogroup" aria-label="Recebedor do frete">
                  {RECEIVER_OPTIONS.map((option) => (
                    <button
                      key={option}
                      className={`segmented-option ${values.receiver === option ? "segmented-option-active" : ""}`}
                      type="button"
                      aria-pressed={values.receiver === option}
                      onClick={() => onChange("receiver", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {errors.receiver ? <span className="field-error">{errors.receiver}</span> : null}
              </div>
            </div>

            <div className="freight-form-side">
              <div className={`${fieldClassName(errors.taggy)} taggy-field`}>
                <label>Taggy*</label>

                <div className="taggy-selector-shell" ref={taggyAnchorRef}>
                  <div className={`taggy-selector-summary ${values.taggy ? "taggy-selector-summary-selected" : ""}`}>
                    <span className="taggy-selector-label">Selecionada</span>
                    <strong>{values.taggy || "Nenhuma taggy selecionada"}</strong>
                    <span className="taggy-selector-meta">
                      {values.taggy
                        ? isSelectedTaggyConfigured
                          ? "Opcao pronta para uso."
                          : "Taggy antiga mantida para este registro."
                        : "Abra o editor para escolher ou criar uma nova."}
                    </span>
                  </div>

                  <button
                    className={`icon-button taggy-selector-edit ${isTaggyPopoverOpen ? "taggy-selector-edit-active" : ""}`}
                    type="button"
                    aria-label="Editar taggys"
                    aria-expanded={isTaggyPopoverOpen}
                    onClick={() => setIsTaggyPopoverOpen((current) => !current)}
                  >
                    <PencilLine size={16} aria-hidden="true" />
                  </button>
                </div>

                {errors.taggy ? <span className="field-error">{errors.taggy}</span> : null}

                {isTaggyPopoverOpen && taggyPopoverStyle && typeof document !== "undefined"
                  ? createPortal(
                      <div className="taggy-popover-portal" style={taggyPopoverStyle} ref={taggyPopoverRef}>
                        <div className="taggy-popover">
                          <div className="taggy-popover-header">
                            <div>
                              <strong>Selecionar Taggy</strong>
                              <span>{configuredTaggyOptions.length} salvas</span>
                            </div>

                            <button
                              className="icon-button"
                              type="button"
                              aria-label="Fechar editor de taggys"
                              onClick={() => setIsTaggyPopoverOpen(false)}
                            >
                              <X size={16} aria-hidden="true" />
                            </button>
                          </div>

                          <div className="taggy-popover-list" aria-live="polite">
                            {selectableTaggyOptions.length === 0 && !isLoadingTaggies ? (
                              <p className="taggy-popover-empty">Nenhuma Taggy configurada. Adicione uma nova opcao.</p>
                            ) : null}

                            {selectableTaggyOptions.map((option) => {
                              const isConfigured = configuredTaggyOptions.includes(option);

                              return (
                                <div key={`taggy-option-${option}`} className="taggy-popover-item">
                                  <button
                                    className={`taggy-popover-option ${
                                      values.taggy === option ? "taggy-popover-option-active" : ""
                                    }`}
                                    type="button"
                                    onClick={() => {
                                      onChange("taggy", option);
                                      setIsTaggyPopoverOpen(false);
                                    }}
                                  >
                                    <span className="taggy-popover-option-copy">
                                      <strong>{option}</strong>
                                      <span>{isConfigured ? "Disponivel para selecao." : "Em uso apenas neste registro."}</span>
                                    </span>
                                    {values.taggy === option ? <Check size={16} aria-hidden="true" /> : null}
                                  </button>

                                  {isConfigured ? (
                                    <button
                                      className="icon-button icon-button-danger"
                                      type="button"
                                      aria-label={`Excluir ${option}`}
                                      onClick={() => onDeleteTaggy(option)}
                                      disabled={pendingTaggyDelete === option}
                                    >
                                      {pendingTaggyDelete === option ? (
                                        <LoaderCircle size={16} aria-hidden="true" className="status-icon-spinning" />
                                      ) : (
                                        <Trash2 size={16} aria-hidden="true" />
                                      )}
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>

                          {!isAddTaggyOpen ? (
                            <button
                              className="button button-secondary button-compact taggy-add-toggle"
                              type="button"
                              onClick={() => setIsAddTaggyOpen(true)}
                            >
                              <Plus size={16} aria-hidden="true" />
                              <span>Adicionar Taggy</span>
                            </button>
                          ) : (
                            <div className="taggy-add-panel">
                              <label htmlFor="taggy-manager-input">Nova taggy</label>
                              <input
                                id="taggy-manager-input"
                                type="text"
                                placeholder="Ex.: NOVA TAGGY"
                                value={taggyDraft}
                                onChange={(event) => onTaggyDraftChange(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    onAddTaggy();
                                  }
                                }}
                                aria-invalid={Boolean(taggyDraftError)}
                              />

                              {taggyDraftError ? <span className="field-error">{taggyDraftError}</span> : null}

                              <div className="taggy-add-actions">
                                <button
                                  className="button button-primary button-compact"
                                  type="button"
                                  onClick={onAddTaggy}
                                  disabled={isSavingTaggy}
                                >
                                  {isSavingTaggy ? (
                                    <LoaderCircle size={16} aria-hidden="true" className="status-icon-spinning" />
                                  ) : (
                                    <Plus size={16} aria-hidden="true" />
                                  )}
                                  <span>Salvar</span>
                                </button>

                                <button
                                  className="button button-secondary button-compact"
                                  type="button"
                                  onClick={() => {
                                    onTaggyDraftChange("");
                                    setIsAddTaggyOpen(false);
                                  }}
                                  disabled={isSavingTaggy}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>,
                      document.body,
                    )
                  : null}
              </div>

              <div className={`${fieldClassName(errors.observation)} field-observation`}>
                <label htmlFor="observation">Observacao (opcional)</label>
                <textarea
                  id="observation"
                  name="observation"
                  rows={4}
                  placeholder="Informacoes uteis para a operacao do dia"
                  value={values.observation}
                  onChange={(event) => onChange("observation", event.target.value)}
                  aria-invalid={Boolean(errors.observation)}
                />
                {errors.observation ? <span className="field-error">{errors.observation}</span> : null}
              </div>
            </div>
          </div>

          <div className="form-actions form-actions-bar">
            <button className="button button-primary button-large" type="submit" disabled={isSubmitting}>
              {isEditing ? "Atualizar" : "Salvar frete"}
            </button>

            {isEditing ? (
              <button
                className="button button-secondary button-large"
                type="button"
                onClick={onCancelEdit}
                disabled={isSubmitting}
              >
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
