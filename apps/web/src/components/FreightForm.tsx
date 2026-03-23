import type { FormEvent, RefObject } from "react";
import { RECEIVER_OPTIONS, TAGGY_OPTIONS } from "../constants";
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
  onChange: (field: keyof FreightFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
}

function fieldClassName(error?: string): string {
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
  onChange,
  onSubmit,
  onCancelEdit,
}: FreightFormProps) {
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
              <div className={fieldClassName(errors.taggy)}>
                <label>Taggy*</label>
                <div className="pill-selector" role="radiogroup" aria-label="Taggy">
                  {TAGGY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      className={`pill-option ${values.taggy === option ? "pill-option-active" : ""}`}
                      type="button"
                      aria-pressed={values.taggy === option}
                      onClick={() => onChange("taggy", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {errors.taggy ? <span className="field-error">{errors.taggy}</span> : null}
              </div>

              <div className={fieldClassName(errors.observation)}>
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
