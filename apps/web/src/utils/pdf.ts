import type { FreightRecord } from "../types";
import { formatDate, formatDateTime, formatTime } from "./date";
import { formatCentsToBRL } from "./money";

interface GeneratePdfParams {
  date: string;
  filterSummary?: string;
  records: FreightRecord[];
}

export async function generateFreightsPdf({
  date,
  filterSummary,
  records,
}: GeneratePdfParams): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const totalValue = records.reduce((sum, record) => sum + record.freightCents, 0);
  const summary = filterSummary?.trim() ?? "";

  doc.setFontSize(18);
  doc.text(`Fretes do Dia — ${formatDate(date)}`, 40, 42);

  doc.setFontSize(10);
  doc.text(`Gerado em: ${formatDateTime(new Date())}`, 40, 64);

  let cursorY = 84;

  if (summary) {
    doc.text(`Filtros: ${summary}`, 40, cursorY);
    cursorY += 18;
  }

  doc.text(`Total de fretes: ${records.length} • Soma total: ${formatCentsToBRL(totalValue)}`, 40, cursorY);
  cursorY += 18;

  if (records.length === 0) {
    doc.text("Nenhum frete cadastrado para esta data.", 40, cursorY + 12);
  } else {
    autoTable(doc, {
      startY: cursorY,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 6,
      },
      headStyles: {
        fillColor: [17, 24, 39],
      },
      head: [["HORA", "PLACA", "CLIENTE", "LOTE MOTZ", "LOTE ATUA", "TAGGY", "VALOR", "RECEBEDOR"]],
      body: records.map((record) => [
        formatTime(record.createdAt),
        record.plate,
        record.client,
        record.loteMotz,
        record.loteAtua,
        record.taggy,
        formatCentsToBRL(record.freightCents),
        record.receiver,
      ]),
    });
  }

  doc.save(`fretes-do-dia-${date}.pdf`);
}
