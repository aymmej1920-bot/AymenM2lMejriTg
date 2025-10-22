import * as XLSX from 'xlsx';

/**
 * Reads an XLSX file and returns its data as an array of JSON objects.
 * @param file The File object to read.
 * @param sheetName Optional name of the sheet to read. Defaults to the first sheet.
 * @returns A Promise that resolves with an array of JSON objects, or rejects with an error.
 */
export const readXLSXFile = (file: File, sheetName?: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const targetSheetName = sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[targetSheetName];

        if (!worksheet) {
          throw new Error(`Sheet "${targetSheetName}" not found in the workbook.`);
        }

        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (error: unknown) {
        reject(new Error(`Failed to read XLSX file: ${error instanceof Error ? error.message : String(error)}`));
      }
    };

    reader.onerror = (error: ProgressEvent<FileReader>) => {
      reject(new Error(`FileReader error: ${error.type}`));
    };

    reader.readAsBinaryString(file);
  });
};