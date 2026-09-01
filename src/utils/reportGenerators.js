import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from './formatters';

/**
 * Generate and download branded PDF Report
 */
export const generatePdfReport = ({
  reportTitle = 'Financial Statement Report',
  subtitle = '',
  dateRangeText = 'All Time',
  filterInfo = '',
  summary = { received: 0, transferred: 0, balance: 0, count: 0 },
  tableColumns = [],
  tableRows = [],
  filename = 'finflow-report.pdf',
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Header Background Banner
  doc.setFillColor(16, 47, 39); // #102f27
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Company Brand Mark & Name
  doc.setFillColor(213, 255, 105); // #d5ff69
  doc.roundedRect(margin, 20, 26, 26, 4, 4, 'F');

  doc.setTextColor(20, 51, 42); // #14332a
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('F', margin + 8, 38);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Finflow', margin + 35, 37);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(183, 214, 201);
  doc.text('COMPANY FINANCE MANAGEMENT · NORTHSTAR HOLDINGS', margin + 35, 49);

  // Generated Date in Header
  doc.setFontSize(8.5);
  doc.setTextColor(213, 255, 105);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, 38, {
    align: 'right',
  });

  // Report Title & Scope
  let currentY = 105;
  doc.setTextColor(20, 42, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(reportTitle, margin, currentY);

  currentY += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 109);
  doc.text(`Reporting Period: ${dateRangeText}${filterInfo ? `  |  ${filterInfo}` : ''}`, margin, currentY);

  if (subtitle) {
    currentY += 13;
    doc.text(subtitle, margin, currentY);
  }

  // Summary Metrics KPI Box
  currentY += 18;
  const boxWidth = (pageWidth - margin * 2 - 24) / 4;
  const boxHeight = 44;

  const kpis = [
    { label: 'Total Inflow (Recv)', val: formatCurrency(summary.received), color: [35, 115, 78], bg: [230, 246, 233] },
    { label: 'Total Outflow (Paid)', val: formatCurrency(summary.transferred), color: [178, 93, 55], bg: [250, 234, 227] },
    { label: 'Net Position', val: (summary.balance >= 0 ? '+ ' : '') + formatCurrency(summary.balance), color: [21, 58, 48], bg: [237, 244, 240] },
    { label: 'Total Entries', val: String(summary.count || tableRows.length), color: [50, 70, 62], bg: [240, 244, 241] },
  ];

  kpis.forEach((kpi, index) => {
    const x = margin + index * (boxWidth + 8);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(215, 225, 220);
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 4, 4, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(90, 105, 98);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.label.toUpperCase(), x + 8, currentY + 14);

    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, x + 8, currentY + 31);
  });

  currentY += boxHeight + 20;

  // AutoTable Data Render
  autoTable(doc, {
    startY: currentY,
    head: [tableColumns],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      lineColor: [230, 236, 232],
      lineWidth: 0.75,
      textColor: [30, 45, 38],
    },
    headStyles: {
      fillColor: [21, 58, 48],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 249],
    },
    margin: { left: margin, right: margin, bottom: 45 },
    didDrawPage: (data) => {
      // Page Number Footer
      const str = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(140, 155, 148);
      doc.text(str, pageWidth / 2, pageHeight - 20, { align: 'center' });

      doc.text('Confidential Financial Report · Finflow Platform', margin, pageHeight - 20);
    },
  });

  // Save the PDF
  doc.save(filename);
};

/**
 * Generate and download formatted Excel spreadsheet (.xlsx)
 */
export const generateExcelReport = ({
  reportTitle = 'Finflow Financial Report',
  dateRangeText = 'All Time',
  filterInfo = '',
  summary = { received: 0, transferred: 0, balance: 0, count: 0 },
  columns = [],
  data = [],
  filename = 'finflow-report.xlsx',
}) => {
  const wb = XLSX.utils.book_new();

  // Meta & Header Rows
  const wsData = [
    ['FINFLOW — COMPANY FINANCE PLATFORM'],
    [`Report: ${reportTitle}`],
    [`Workspace: Northstar Holdings`],
    [`Reporting Period: ${dateRangeText}`],
    [`Filter Scope: ${filterInfo || 'All Records'}`],
    [`Generated Date: ${new Date().toLocaleString('en-IN')}`],
    [],
    // KPI Summary Row
    ['SUMMARY METRICS'],
    ['Total Received (Inflow)', 'Total Transferred (Outflow)', 'Net Balance', 'Total Records'],
    [summary.received, summary.transferred, summary.balance, summary.count || data.length],
    [],
    // Table Headers
    columns,
    // Data Rows
    ...data,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column Widths Auto-fit
  const colWidths = columns.map((col, i) => {
    let maxLen = String(col).length;
    data.forEach((row) => {
      const cell = row[i];
      if (cell !== undefined && cell !== null) {
        maxLen = Math.max(maxLen, String(cell).length);
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
  });

  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Financial Report');
  XLSX.writeFile(wb, filename);
};
