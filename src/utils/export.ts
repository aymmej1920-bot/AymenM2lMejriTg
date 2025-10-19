import * as XLSX from 'xlsx';

interface ExportDataOptions {
  headers?: string[]; // Optional array of header names
  fileName?: string;  // Optional file name, defaults to 'data'
  sheetName?: string; // Optional sheet name, defaults to 'Sheet1'
}

export const exportToXLSX = (data: any[], options?: ExportDataOptions) => {
  const { headers, fileName = 'data', sheetName = 'Sheet1' } = options || {};

  // Create a worksheet
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });

  // Create a workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write the workbook to a file
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};