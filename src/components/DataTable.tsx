import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Search, Download, Settings } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import ConfirmDialog from './ConfirmDialog';
import { exportToXLSX } from '../utils/export';
import { showSuccess, showError } from '../utils/toast';
import SkeletonLoader from './SkeletonLoader';
import { DataTableColumn, ProcessedDataTableColumn } from '../types'; // Import the new interface

interface DataTableProps<T extends { id: string }> {
  title: string;
  data: T[];
  columns: DataTableColumn<T>[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  addLabel?: string;
  searchPlaceholder?: string;
  exportFileName?: string;
  isLoading?: boolean;
  itemsPerPageOptions?: number[];
  renderFilters?: (searchTerm: string, setSearchTerm: (term: string) => void) => React.ReactNode;
  renderAlerts?: () => React.ReactNode;
  // Optional custom row actions, if more than just edit/delete are needed
  renderRowActions?: (item: T) => React.ReactNode;
  customFilter?: (item: T) => boolean; // Added customFilter prop
}

const DataTable = <T extends { id: string }>({
  title,
  data,
  columns: initialColumns,
  onAdd,
  onEdit,
  onDelete,
  addLabel = 'Ajouter',
  searchPlaceholder = 'Rechercher...',
  exportFileName = 'data',
  isLoading = false,
  itemsPerPageOptions = [10, 25, 50],
  renderFilters,
  renderAlerts,
  renderRowActions,
  customFilter, // Destructure customFilter
}: React.PropsWithChildren<DataTableProps<T>>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | string>(initialColumns.find(col => col.sortable)?.key || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);

  const [showColumnCustomizeDialog, setShowColumnCustomizeDialog] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Initialize column visibility and order from localStorage or defaults
  useEffect(() => {
    const storageKeyVisibility = `dataTableColumnsVisibility_${exportFileName}`;
    const storageKeyOrder = `dataTableColumnsOrder_${exportFileName}`;

    const savedVisibilityRaw = localStorage.getItem(storageKeyVisibility);
    const savedOrderRaw = localStorage.getItem(storageKeyOrder);

    const defaultVisibility = initialColumns.reduce((acc, col) => {
      acc[col.key as string] = col.defaultVisible !== false; // Default to true if not explicitly false
      return acc;
    }, {} as Record<string, boolean>);

    const defaultOrder = initialColumns.map(col => col.key as string);

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
          const validParsedOrder = parsed.filter(key => initialColumns.some(col => col.key === key));
          const newKeys = initialColumns.map(col => col.key as string).filter(key => !validParsedOrder.includes(key));
          initialColumnOrder = [...validParsedOrder, ...newKeys];
        }
      } catch (e) {
        console.error("Error parsing saved column order from localStorage", e);
      }
    }

    setColumnVisibility(initialColumnVisibility);
    setColumnOrder(initialColumnOrder);
    
    // Reset sort column if the default one is not visible or doesn't exist
    if (!initialColumnVisibility[sortColumn as string] && initialColumnOrder.length > 0) {
      setSortColumn(initialColumnOrder[0]);
    }
  }, [initialColumns, exportFileName]);

  // Save column preferences to localStorage
  useEffect(() => {
    const storageKeyVisibility = `dataTableColumnsVisibility_${exportFileName}`;
    const storageKeyOrder = `dataTableColumnsOrder_${exportFileName}`;
    if (columnOrder.length > 0) {
      localStorage.setItem(storageKeyVisibility, JSON.stringify(columnVisibility));
      localStorage.setItem(storageKeyOrder, JSON.stringify(columnOrder));
    }
  }, [columnVisibility, columnOrder, exportFileName]);

  const allColumns = useMemo(() => {
    return initialColumns.map(col => ({
      ...col,
      key: col.key as string, // Ensure key is string for internal use
      defaultVisible: col.defaultVisible !== false, // This makes it boolean
    })) as ProcessedDataTableColumn<T>[]; // Cast to the new type
  }, [initialColumns]);

  const visibleColumns = useMemo(() => {
    return columnOrder
      .map(key => allColumns.find(col => col.key === key))
      .filter((col): col is ProcessedDataTableColumn<T> => col !== undefined && columnVisibility[col.key]);
  }, [columnVisibility, columnOrder, allColumns]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = Object.values(item).some(value =>
        (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      );

      const matchesCustomFilter = customFilter ? customFilter(item) : true; // Apply custom filter

      return matchesSearch && matchesCustomFilter;
    });

    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sortColumn];
        const bValue = (b as any)[sortColumn];

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
        if (bValue == null) return sortDirection === 'asc' ? 1 : -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          return sortDirection === 'asc' ? (aValue === bValue ? 0 : aValue ? 1 : -1) : (aValue === bValue ? 0 : aValue ? -1 : 1);
        }
        return 0;
      });
    }
    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, customFilter]); // Add customFilter to dependencies

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const handleSort = (columnKey: keyof T | string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (columnKey: keyof T | string) => {
    if (sortColumn === columnKey) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

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
  }, []);

  const handleResetColumns = () => {
    const defaultVisibility = allColumns.reduce((acc, col) => {
      acc[col.key] = col.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>);
    setColumnVisibility(defaultVisibility);
    setColumnOrder(allColumns.map(col => col.key));
  };

  const handleExport = () => {
    if (filteredAndSortedData.length === 0) {
      showError('Aucune donnée à exporter.');
      return;
    }

    const headers = visibleColumns.map(col => col.label);
    const dataToExport = filteredAndSortedData.map(item => {
      const exportedRow: { [key: string]: any } = {};
      visibleColumns.forEach(col => {
        exportedRow[col.label] = col.render ? col.render(item) : (item as any)[col.key];
        // Convert ReactNode to string for export if it's not already a primitive
        if (typeof exportedRow[col.label] === 'object' && exportedRow[col.label] !== null) {
          exportedRow[col.label] = (exportedRow[col.label] as React.ReactElement)?.props?.children?.toString() || '';
        }
      });
      return exportedRow;
    });

    exportToXLSX(dataToExport, {
      fileName: exportFileName,
      sheetName: title,
      headers: headers
    });
    showSuccess('Données exportées avec succès au format XLSX !');
  };

  const confirmDeleteItem = (id: string) => {
    setItemToDelete(id);
    setShowConfirmDialog(true);
  };

  const executeDeleteItem = () => {
    if (itemToDelete && onDelete) {
      onDelete(itemToDelete);
      showSuccess('Élément supprimé avec succès !');
      setItemToDelete(null);
    }
  };

  if (isLoading) {
    return <SkeletonLoader count={5} height="h-12" className="w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">{title}</h2>
        <div className="flex space-x-4">
          <Button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
            disabled={data.length === 0}
          >
            <Download className="w-5 h-5" />
            <span>Exporter XLSX</span>
          </Button>
          <Button
            onClick={() => setShowColumnCustomizeDialog(true)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Settings className="w-5 h-5" />
            <span>Personnaliser Colonnes</span>
          </Button>
          {onAdd && (
            <Button
              onClick={onAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              <span>{addLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {renderAlerts && renderAlerts()}

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderFilters && renderFilters(searchTerm, setSearchTerm)}
        {!renderFilters && ( // Only show default search if no custom filters are rendered
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${col.sortable ? 'cursor-pointer' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center">
                      {col.label} {col.sortable && renderSortIcon(col.key)}
                    </div>
                  </th>
                ))}
                {(onEdit || onDelete || renderRowActions) && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (onEdit || onDelete || renderRowActions ? 1 : 0)} className="px-6 py-4 text-center text-gray-500">
                    Aucune donnée trouvée.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                    {(onEdit || onDelete || renderRowActions) && (
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(item)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {renderRowActions && renderRowActions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg ${
                currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </Button>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Reset to first page when items per page changes
            }}
            className="ml-4 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>{option} par page</option>
            ))}
          </select>
        </div>
      )}

      {/* Column Customization Dialog */}
      <Dialog open={showColumnCustomizeDialog} onOpenChange={setShowColumnCustomizeDialog}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
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
                <div key={col.key} className="flex items-center justify-between p-2 border rounded-md bg-gray-100">
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
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveColumn(col.key, 'down')}
                      disabled={index === columnOrder.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleResetColumns}>
              Réinitialiser par défaut
            </Button>
            <Button onClick={() => setShowColumnCustomizeDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible."
        onConfirm={executeDeleteItem}
        confirmText="Supprimer"
        variant="destructive"
      />
    </div>
  );
};

export default DataTable;