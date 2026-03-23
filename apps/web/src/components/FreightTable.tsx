import { PackageSearch, PencilLine, Search, Trash2, WifiOff } from "lucide-react";
import { ALL_TAGGY_FILTER, ALL_TAGGY_FILTER_LABEL } from "../constants";
import type { FreightRecord, TaggyFilter, TaggyOption } from "../types";
import { formatDate, formatTime } from "../utils/date";
import { formatCentsToBRL } from "../utils/money";

interface FreightTableProps {
  records: FreightRecord[];
  filteredRecords: FreightRecord[];
  search: string;
  activeTaggy: TaggyFilter;
  taggyOptions: string[];
  isLoading: boolean;
  bannerMessage: string | null;
  lastUpdatedAt: string | null;
  onSearchChange: (value: string) => void;
  onTaggyFilterChange: (value: TaggyFilter) => void;
  onClearFilters: () => void;
  onTaggyClick: (taggy: TaggyOption) => void;
  onRetry: () => void;
  onEdit: (record: FreightRecord) => void;
  onDelete: (record: FreightRecord) => void;
  onAddFirstFreight: () => void;
}

function TableSkeleton() {
  return (
    <div className="table-skeleton" aria-hidden="true">
      <div className="skeleton-toolbar">
        <span className="skeleton-block skeleton-block-input" />
        <span className="skeleton-block skeleton-block-chip" />
        <span className="skeleton-block skeleton-block-chip" />
        <span className="skeleton-block skeleton-block-chip" />
      </div>

      <div className="skeleton-table">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="skeleton-row">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="skeleton-block skeleton-block-wide" />
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="skeleton-block skeleton-block-small" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FreightTable({
  records,
  filteredRecords,
  search,
  activeTaggy,
  taggyOptions,
  isLoading,
  bannerMessage,
  lastUpdatedAt,
  onSearchChange,
  onTaggyFilterChange,
  onClearFilters,
  onTaggyClick,
  onRetry,
  onEdit,
  onDelete,
  onAddFirstFreight,
}: FreightTableProps) {
  const totalFreightCents = filteredRecords.reduce((sum, record) => sum + record.freightCents, 0);

  return (
    <section className="panel panel-table">
      <div className="panel-header panel-header-table">
        <div className="panel-header-copy">
          <span className="panel-kicker">Visao consolidada</span>
          <h2>Registros</h2>
          <p>Busca rapida, filtros por Taggy e total consolidado da operacao.</p>
        </div>

        <div className="header-stats">
          {isLoading ? (
            <>
              <span className="skeleton-inline skeleton-inline-medium" />
              <span className="skeleton-inline skeleton-inline-small" />
            </>
          ) : (
            <>
              <span>
                Exibindo {filteredRecords.length} de {records.length}
              </span>
              <span>Atualizado as {lastUpdatedAt ? formatTime(lastUpdatedAt) : "--:--"}</span>
            </>
          )}
        </div>
      </div>

      <div className="panel-body panel-body-table">
        <div className="table-toolbar">
          <label className="search-field" htmlFor="freight-search">
            <Search size={16} aria-hidden="true" />
            <input
              id="freight-search"
              type="text"
              placeholder="Buscar por placa, cliente, lote, taggy..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <div className="filter-chip-row" role="tablist" aria-label="Filtro rapido por Taggy">
            <button
              className={`filter-chip ${activeTaggy === ALL_TAGGY_FILTER ? "filter-chip-active" : ""}`}
              type="button"
              onClick={() => onTaggyFilterChange(ALL_TAGGY_FILTER)}
            >
              {ALL_TAGGY_FILTER_LABEL}
            </button>
            {taggyOptions.map((option) => (
              <button
                key={option}
                className={`filter-chip ${activeTaggy === option ? "filter-chip-active" : ""}`}
                type="button"
                onClick={() => onTaggyFilterChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {bannerMessage ? (
          <div className="inline-banner" role="status">
            <div className="inline-banner-copy">
              <WifiOff size={16} aria-hidden="true" />
              <span>{bannerMessage}</span>
            </div>
            <button className="button button-secondary button-compact" type="button" onClick={onRetry}>
              Tentar agora
            </button>
          </div>
        ) : null}

        {isLoading ? <TableSkeleton /> : null}

        {!isLoading && records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <PackageSearch size={26} aria-hidden="true" />
            </div>
            <h3>Nenhum frete cadastrado para esta data.</h3>
            <button className="button button-primary" type="button" onClick={onAddFirstFreight}>
              Adicionar primeiro frete
            </button>
          </div>
        ) : null}

        {!isLoading && records.length > 0 && filteredRecords.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <div className="empty-state-icon">
              <Search size={22} aria-hidden="true" />
            </div>
            <h3>Nenhum resultado para os filtros atuais.</h3>
            <button className="button button-secondary" type="button" onClick={onClearFilters}>
              Limpar filtros
            </button>
          </div>
        ) : null}

        {!isLoading && filteredRecords.length > 0 ? (
          <>
            <div className="table-scroll">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Placa</th>
                    <th>Cliente</th>
                    <th>Lote MOTZ</th>
                    <th>Lote ATUA</th>
                    <th>Taggy</th>
                    <th className="numeric-cell">Valor</th>
                    <th>Recebedor</th>
                    <th className="actions-cell">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record._id}>
                      <td>{formatTime(record.createdAt)}</td>
                      <td className="mono">{record.plate}</td>
                      <td>{record.client}</td>
                      <td>{record.loteMotz}</td>
                      <td>{record.loteAtua}</td>
                      <td>
                        <button className="table-pill taggy-pill" type="button" onClick={() => onTaggyClick(record.taggy)}>
                          {record.taggy}
                        </button>
                      </td>
                      <td className="numeric-cell mono">{formatCentsToBRL(record.freightCents)}</td>
                      <td>
                        <span
                          className={`table-pill receiver-pill ${
                            record.receiver === "MOTORISTA" ? "receiver-pill-driver" : "receiver-pill-owner"
                          }`}
                        >
                          {record.receiver}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <div className="row-actions">
                          <button className="icon-button" type="button" aria-label="Editar" title="Editar" onClick={() => onEdit(record)}>
                            <PencilLine size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="icon-button icon-button-danger"
                            type="button"
                            aria-label="Excluir"
                            title="Excluir"
                            onClick={() => onDelete(record)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-records">
              {filteredRecords.map((record) => (
                <article key={record._id} className="mobile-record-card">
                  <div className="mobile-record-top">
                    <div>
                      <span className="mobile-record-time">{formatTime(record.createdAt)}</span>
                      <strong className="mobile-record-plate">{record.plate}</strong>
                    </div>
                    <div className="row-actions">
                      <button className="icon-button" type="button" aria-label="Editar" onClick={() => onEdit(record)}>
                        <PencilLine size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-button icon-button-danger" type="button" aria-label="Excluir" onClick={() => onDelete(record)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mobile-record-grid">
                    <div>
                      <span>Cliente</span>
                      <strong>{record.client}</strong>
                    </div>
                    <div>
                      <span>Valor</span>
                      <strong>{formatCentsToBRL(record.freightCents)}</strong>
                    </div>
                    <div>
                      <span>Lote MOTZ</span>
                      <strong>{record.loteMotz}</strong>
                    </div>
                    <div>
                      <span>Lote ATUA</span>
                      <strong>{record.loteAtua}</strong>
                    </div>
                    <div>
                      <span>Taggy</span>
                      <button className="table-pill taggy-pill" type="button" onClick={() => onTaggyClick(record.taggy)}>
                        {record.taggy}
                      </button>
                    </div>
                    <div>
                      <span>Recebedor</span>
                      <span
                        className={`table-pill receiver-pill ${
                          record.receiver === "MOTORISTA" ? "receiver-pill-driver" : "receiver-pill-owner"
                        }`}
                      >
                        {record.receiver}
                      </span>
                    </div>
                  </div>

                  {record.observation ? <p className="mobile-record-note">{record.observation}</p> : null}
                  <span className="mobile-record-date">{formatDate(record.date)}</span>
                </article>
              ))}
            </div>

            <footer className="table-footer">
              <span>Total de fretes: {filteredRecords.length}</span>
              <strong>Soma total: {formatCentsToBRL(totalFreightCents)}</strong>
            </footer>
          </>
        ) : null}
      </div>
    </section>
  );
}
