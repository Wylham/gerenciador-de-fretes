import { CalendarDays, FileDown, LoaderCircle, MoreHorizontal, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ConnectionStatus } from "../types";

interface TopbarProps {
  connectionStatus: ConnectionStatus;
  selectedDate: string;
  onSelectedDateChange: (value: string) => void;
  onReload: () => void;
  onDownloadPdf: () => void;
  onClearDay: () => void;
  isReloading: boolean;
  disableClear: boolean;
}

function getStatusLabel(state: ConnectionStatus["state"]): string {
  if (state === "online") {
    return "Online";
  }

  if (state === "loading") {
    return "Carregando";
  }

  return "Offline";
}

export function Topbar({
  connectionStatus,
  selectedDate,
  onSelectedDateChange,
  onReload,
  onDownloadPdf,
  onClearDay,
  isReloading,
  disableClear,
}: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const StatusIcon =
    connectionStatus.state === "online" ? Wifi : connectionStatus.state === "loading" ? LoaderCircle : WifiOff;

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [selectedDate]);

  function handleAction(action: () => void) {
    action();
    setMenuOpen(false);
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-brand-logo">
          <img src="/brand/pianettosym.PNG" alt="Pianetto" />
        </div>

        <div className="topbar-brand-copy">
          <span className="eyebrow">Painel operacional</span>
          <div className="topbar-title">
            <h1>Fretes do Dia</h1>
            <p>Controle diario de cargas, lotes e repasses.</p>
          </div>
        </div>
      </div>

      <label className="topbar-date-field" htmlFor="dashboard-date">
        <span>Data</span>
        <div className="topbar-date-input">
          <CalendarDays size={16} aria-hidden="true" />
          <input
            id="dashboard-date"
            type="date"
            value={selectedDate}
            onChange={(event) => onSelectedDateChange(event.target.value)}
          />
        </div>
      </label>

      <div className="topbar-actions-wrap">
        <div className={`status-badge status-${connectionStatus.state}`}>
          <StatusIcon
            size={16}
            aria-hidden="true"
            className={connectionStatus.state === "loading" ? "status-icon-spinning" : undefined}
          />
          <div>
            <strong>{getStatusLabel(connectionStatus.state)}</strong>
            <span>{connectionStatus.detail}</span>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="button button-secondary" type="button" onClick={onReload} disabled={isReloading}>
            <RefreshCw size={16} aria-hidden="true" className={isReloading ? "status-icon-spinning" : undefined} />
            <span>Recarregar</span>
          </button>
          <button className="button button-primary" type="button" onClick={onDownloadPdf}>
            <FileDown size={16} aria-hidden="true" />
            <span>Exportar PDF</span>
          </button>
          <button className="button button-danger-outline" type="button" onClick={onClearDay} disabled={disableClear}>
            <Trash2 size={16} aria-hidden="true" />
            <span>Limpar Dia</span>
          </button>
        </div>

        <div className="topbar-mobile-menu" ref={menuRef}>
          <button
            className="icon-button topbar-menu-trigger"
            type="button"
            aria-label="Abrir acoes"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>

          {menuOpen ? (
            <div className="topbar-menu">
              <button
                className="menu-action"
                type="button"
                onClick={() => handleAction(onReload)}
                disabled={isReloading}
              >
                <RefreshCw size={16} aria-hidden="true" />
                <span>Recarregar</span>
              </button>
              <button className="menu-action" type="button" onClick={() => handleAction(onDownloadPdf)}>
                <FileDown size={16} aria-hidden="true" />
                <span>Exportar PDF</span>
              </button>
              <button
                className="menu-action menu-action-danger"
                type="button"
                onClick={() => handleAction(onClearDay)}
                disabled={disableClear}
              >
                <Trash2 size={16} aria-hidden="true" />
                <span>Limpar Dia</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
