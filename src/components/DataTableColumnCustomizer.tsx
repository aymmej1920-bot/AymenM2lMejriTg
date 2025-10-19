import React, { useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { ProcessedDataTableColumn } from '../types';

interface DataTableColumnCustomizerProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allColumns: ProcessedDataTableColumn<T>[];
  columnVisibility: Record<string, boolean>;
  setColumnVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  columnOrder: string[];
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>;
  storageKeyPrefix: string; // To ensure unique localStorage keys per DataTable instance
}

const DataTableColumnCustomizer = <T extends { id: string }>({
  open,
  onOpenChange,
  allColumns,
  columnVisibility,
  setColumnVisibility,
  columnOrder,
  setColumnOrder,
  storageKeyPrefix,
}: React.PropsWithChildren<DataTableColumnCustomizerProps<T>>) => {

  // Initialize column visibility and order from localStorage or defaults
  useEffect(() => {
    const storageKeyVisibility = `${storageKeyPrefix}_columnsVisibility`;
    const storageKeyOrder = `${storageKeyPrefix}_columnsOrder`;

    const savedVisibilityRaw = localStorage.getItem(storageKeyVisibility);
    const savedOrderRaw = localStorage.getItem(storageKeyOrder);

    const defaultVisibility = allColumns.reduce((acc, col) => {
      acc[col.key] = col.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>);

    const defaultOrder = allColumns.map(col => col.key);

    let initialColumnVisibility = defaultVisibility;
    if (savedVisibilityRaw) {
      try {
        const parsed = JSON.parse(savedVisibilityRaw);
        if (typeof parsed === 'object' && parsed !== null) {
          initialColumnVisibility = { ...defaultVisibility, ...parsed };
        }
      } catch (e) {
        console.error("Error parsing saved column visibility from localStorage", e);
      }
    }

    let initialColumnOrder = defaultOrder;
    if (savedOrderRaw) {
      try {
        const parsed = JSON.parse(savedOrderRaw);
        if (Array.isArray(parsed)) {
          const validParsedOrder = parsed.filter(key => allColumns.some(col => col.key === key));
          const newKeys = allColumns.map(col => col.key).filter(key => !validParsedOrder.includes(key));
          initialColumnOrder = [...validParsedOrder, ...newKeys];
        }
      } catch (e) {
        console.error("Error parsing saved column order from localStorage", e);
      }
    }

    setColumnVisibility(initialColumnVisibility);
    setColumnOrder(initialColumnOrder);
  }, [allColumns, storageKeyPrefix, setColumnVisibility, setColumnOrder]);

  // Save column preferences to localStorage
  useEffect(() => {
    const storageKeyVisibility = `${storageKeyPrefix}_columnsVisibility`;
    const storageKeyOrder = `${storageKeyPrefix}_columnsOrder`;
    if (columnOrder.length > 0) {
      localStorage.setItem(storageKeyVisibility, JSON.stringify(columnVisibility));
      localStorage.setItem(storageKeyOrder, JSON.stringify(columnOrder));
    }
  }, [columnVisibility, columnOrder, storageKeyPrefix]);

  const handleToggleColumn = (key: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMoveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    setColumnOrder(prevOrder => {
      const index = prevOrder.indexOf(key);
      if (index === -1) return prevOrder;

      const newOrder = [...prevOrder];
      const [movedColumn] = newOrder.splice(index, 1);

      if (direction === 'up' && index > 0) {
        newOrder.splice(index - 1, 0, movedColumn);
      } else if (direction === 'down' && index < newOrder.length) {
        newOrder.splice(index + 1, 0, movedColumn);
      }
      return newOrder;
    });
  }, [setColumnOrder]);

  const handleResetColumns = () => {
    const defaultVisibility = allColumns.reduce((acc, col) => {
      acc[col.key] = col.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>);
    setColumnVisibility(defaultVisibility);
    setColumnOrder(allColumns.map(col => col.key));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
        <DialogHeader>
          <DialogTitle>Personnaliser les Colonnes</DialogTitle>
          <DialogDescription>
            Choisissez les colonnes à afficher et réorganisez-les.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {columnOrder.map((key, index) => {
            const col = allColumns.find(c => c.key === key);
            if (!col) return null;
            return (
              <div key={col.key} className="flex items-center justify-between p-2 border rounded-md bg-white/20 glass-effect">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`col-${col.key}`}
                    checked={columnVisibility[col.key]}
                    onChange={() => handleToggleColumn(col.key)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`col-${col.key}`} className="text-sm font-medium text-gray-700">
                    {col.label}
                  </label>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveColumn(col.key, 'up')}
                    disabled={index === 0}
                    className="hover-lift"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveColumn(col.key, 'down')}
                    disabled={index === columnOrder.length - 1}
                    className="hover-lift"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleResetColumns} className="hover-lift">
            Réinitialiser par défaut
          </Button>
          <Button onClick={() => onOpenChange(false)} className="hover-lift">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataTableColumnCustomizer;