import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Upload, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { readXLSXFile } from '../utils/excelUtils';
import { showError, showLoading, updateToast } from '../utils/toast';
import { z } from 'zod';
import { cn } from '../utils/cn';

interface XLSXImportDialogProps<T extends z.ZodTypeAny> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  schema: T; // Zod schema for validation
  columnMapping: { [excelHeader: string]: keyof z.infer<T> }; // Mapping from Excel headers to schema keys
  onImport: (data: z.infer<T>[]) => Promise<void>; // Function to call with validated data
  isLoading?: boolean;
}

interface RowValidationResult<T> {
  originalRow: any;
  validatedData: T | null;
  errors: string[];
  isValid: boolean;
}

const XLSXImportDialog = <T extends z.ZodTypeAny>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  columnMapping,
  onImport,
  isLoading = false,
}: React.PropsWithChildren<XLSXImportDialogProps<T>>) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<RowValidationResult<z.infer<T>>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setParsedData([]);
      setValidationResults([]);
    }
  };

  const processFile = useCallback(async () => {
    if (!file) {
      showError('Veuillez sélectionner un fichier.');
      return;
    }

    setIsProcessing(true);
    const loadingToastId = showLoading('Lecture et validation du fichier...');

    try {
      const rawData = await readXLSXFile(file);
      setParsedData(rawData);

      const results: RowValidationResult<z.infer<T>>[] = rawData.map(row => {
        const mappedRow: { [key: string]: any } = {};
        for (const excelHeader in columnMapping) {
          if (Object.prototype.hasOwnProperty.call(row, excelHeader)) {
            mappedRow[columnMapping[excelHeader] as string] = row[excelHeader];
          }
        }

        const validation = schema.safeParse(mappedRow);
        if (validation.success) {
          return {
            originalRow: row,
            validatedData: validation.data,
            errors: [],
            isValid: true,
          };
        } else {
          return {
            originalRow: row,
            validatedData: null,
            errors: validation.error.issues.map((err: z.ZodIssue) => `${err.path.join('.')} : ${err.message}`),
            isValid: false,
          };
        }
      });
      setValidationResults(results);
      updateToast(loadingToastId, 'Fichier traité et validé.', 'success');
    } catch (error: any) {
      console.error('Error processing file:', error);
      showError(`Erreur lors du traitement du fichier: ${error.message}`);
      updateToast(loadingToastId, `Erreur lors du traitement du fichier: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [file, schema, columnMapping]);

  const handleImportConfirmed = async () => {
    const validData = validationResults.filter(res => res.isValid).map(res => res.validatedData!);
    if (validData.length === 0) {
      showError('Aucune donnée valide à importer.');
      return;
    }

    const importToastId = showLoading(`Importation de ${validData.length} enregistrement(s)...`);
    try {
      await onImport(validData);
      updateToast(importToastId, 'Importation terminée avec succès !', 'success');
      onOpenChange(false);
      setFile(null);
      setParsedData([]);
      setValidationResults([]);
    } catch (error: any) {
      console.error('Error during import:', error);
      updateToast(importToastId, `Erreur lors de l'importation: ${error.message}`, 'error');
    }
  };

  const totalValidRows = useMemo(() => validationResults.filter(res => res.isValid).length, [validationResults]);
  const totalInvalidRows = useMemo(() => validationResults.filter(res => !res.isValid).length, [validationResults]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) { // Reset state when dialog closes
        setFile(null);
        setParsedData([]);
        setValidationResults([]);
        setIsProcessing(false);
      }
    }}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl glass animate-scale-in">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Input
              id="xlsx-file"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="flex-1 glass border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing || isLoading}
            />
            <Button onClick={processFile} disabled={!file || isProcessing || isLoading} className="hover-lift">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Charger & Valider
                </>
              )}
            </Button>
          </div>

          {validationResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/20 rounded-lg shadow-sm">
                <p className="text-gray-700 font-medium">
                  Total de lignes traitées: <span className="font-bold">{parsedData.length}</span>
                </p>
                <p className="text-green-600 font-medium">
                  Valides: <span className="font-bold">{totalValidRows}</span>
                </p>
                <p className="text-red-600 font-medium">
                  Invalides: <span className="font-bold">{totalInvalidRows}</span>
                </p>
              </div>

              {totalInvalidRows > 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                    <div>
                      <h3 className="text-red-800 font-semibold">Erreurs de Validation</h3>
                      <p className="text-red-700">
                        Veuillez corriger les lignes invalides dans votre fichier XLSX ou les ignorer.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto border rounded-lg bg-white/10">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white/20 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Ligne</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Statut</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Détails</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Erreurs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validationResults.map((result, index) => (
                      <tr key={index} className={cn("hover:bg-white/20", !result.isValid ? 'bg-red-50/50' : '')}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {result.isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {Object.entries(result.originalRow).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="font-semibold">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-600">
                          {result.errors.length > 0 ? result.errors.join('; ') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover-lift" disabled={isProcessing || isLoading}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleImportConfirmed}
            disabled={totalValidRows === 0 || isProcessing || isLoading}
            className="hover-lift"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importation...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Confirmer l'Importation ({totalValidRows})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default XLSXImportDialog;