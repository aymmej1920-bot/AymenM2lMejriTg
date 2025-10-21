import * as XLSX from 'xlsx';

interface ExportTemplateOptions {
  headers: string[];    // Array of header names
  fileName?: string;    // Optional file name, defaults to 'template'
  sheetName?: string;   // Optional sheet name, defaults to 'Sheet1'
}

export const exportTemplateToXLSX = (options: ExportTemplateOptions) => {
  const { headers, fileName = 'template', sheetName = 'Sheet1' } = options;

  // Create a worksheet with only headers
  const ws = XLSX.utils.aoa_to_sheet([headers]);

  // Create a workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write the workbook to a file
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};