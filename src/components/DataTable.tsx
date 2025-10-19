import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Search, Download, Settings } from 'lucide-react';
import { Button } from './ui/button';
import ConfirmDialog from './ConfirmDialog'; // Corrected import path
import { exportToXLSX } from '../utils/export';
import { showSuccess, showError } from '../utils/toast';
import SkeletonLoader from './SkeletonLoader'; // Corrected import path
import { DataTableColumn, ProcessedDataTableColumn, Resource } from '../types'; // Removed Action from import
import DataTableColumnCustomizer from './DataTableColumnCustomizer'; // Corrected import path
import { usePermissions } from '../hooks/usePermissions'; // Import usePermissions

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
  resourceType: Resource; // New prop to specify the resource type for permissions
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
  resourceType, // Destructure resourceType
}: React.PropsWithChildren<DataTableProps<T>>) => {
  const { canAccess } = usePermissions(); // Use usePermissions hook

  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | string>(initialColumns.find((col: DataTableColumn<T>) => col.sortable)?.key || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);

  const [showColumnCustomizeDialog, setShowColumnCustomizeDialog] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const allColumns = useMemo(() => {
    return initialColumns.map((col: DataTableColumn<T>) => ({
      ...col,
      key: col.key as string, // Ensure key is string for internal use
      defaultVisible: col.defaultVisible !== false, // This makes it boolean
    })) as ProcessedDataTableColumn<T>[]; // Cast to the new type
  }, [initialColumns]);

  // Adjust sortColumn if the currently sorted column becomes invisible
  useEffect(() => {
    if (sortColumn && !columnVisibility[sortColumn as string] && columnOrder.length > 0) {
      // Find the first visible column to sort by
      const firstVisibleColumnKey = columnOrder.find(key => columnVisibility[key]);
      setSortColumn(firstVisibleColumnKey || '');
    }
  }, [columnVisibility, columnOrder, sortColumn]);


  const visibleColumns = useMemo(() => {
    return columnOrder
      .map(key => allColumns.find(col => col.key === key))
      .filter((col): col is ProcessedDataTableColumn<T> => col !== undefined && columnVisibility[col.key]);
  }, [columnVisibility, columnOrder, allColumns]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter((item: T) => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = Object.values(item).some(value =>
        (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      );

      const matchesCustomFilter = customFilter ? customFilter(item) : true; // Apply custom filter

      return matchesSearch && matchesCustomFilter;
    });

    if (sortColumn) {
      filtered.sort((a: T, b: T) => {
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

  const handleExport = () => {
    if (filteredAndSortedData.length === 0) {
      showError('Aucune donnée à exporter.');
      return;
    }

    const headers = visibleColumns.map(col => col.label);
    const dataToExport = filteredAndSortedData.map((item: T) => {
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

  // Determine if the current user can perform write actions (add, edit, delete) based on resourceType
  const canAdd = onAdd && canAccess(resourceType, 'add');
  const canEdit = onEdit && canAccess(resourceType, 'edit');
  const canDelete = onDelete && canAccess(resourceType, 'delete');
  const canPerformAnyAction = canAdd || canEdit || canDelete || (renderRowActions && canAccess(resourceType, 'edit')); // Assuming renderRowActions implies some edit/delete capability

  if (isLoading) {
    return <SkeletonLoader count={5} height="h-12" className="w-full" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">{title}</h2>
        <div className="flex space-x-4">
          <Button
            onClick={handleExport}
            className="bg-gradient-success text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
            disabled={data.length === 0}
          >
            <Download className="w-5 h-5" />
            <span>Exporter XLSX</span>
          </Button>
          <Button
            onClick={() => setShowColumnCustomizeDialog(true)}
            className="bg-white/20 hover:bg-white/30 text-gray-800 px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 glass hover-lift"
          >
            <Settings className="w-5 h-5" />
            <span>Personnaliser Colonnes</span>
          </Button>
          {canAdd && ( // Conditionally render Add button
            <Button
              onClick={onAdd}
              className="bg-gradient-brand text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
            />
          </div>
        )}
      </div>

      <div className="glass rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white/20">
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider ${col.sortable ? 'cursor-pointer' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center">
                      {col.label} {col.sortable && renderSortIcon(col.key)}
                    </div>
                  </th>
                ))}
                {canPerformAnyAction && ( // Conditionally render Actions header
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white/10 divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (canPerformAnyAction ? 1 : 0)} className="px-6 py-4 text-center text-gray-600">
                    Aucune donnée trouvée.
                  </td>
                </tr>
              ) : (
                currentItems.map((item: T) => (
                  <tr key={item.id} className="hover:bg-white/20 transition-colors">
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                    {canPerformAnyAction && ( // Conditionally render action buttons
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit && onEdit(item)}
                              className="text-blue-600 hover:text-blue-900 transition-colors hover-lift"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-900 transition-colors hover-lift"
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
            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed glass"
          >
            Précédent
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page: number) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg ${
                currentPage === page ? 'bg-gradient-brand text-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-gray-800 glass'
              }`}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed glass"
          >
            Suivant
          </Button>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Reset to first page when items per page changes
            }}
            className="ml-4 bg-white/20 border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm glass"
          >
            {itemsPerPageOptions.map((option: number) => (
              <option key={option} value={option}>{option} par page</option>
            ))}
          </select>
        </div>
      )}

      {/* Column Customization Dialog */}
      <DataTableColumnCustomizer
        open={showColumnCustomizeDialog}
        onOpenChange={setShowColumnCustomizeDialog}
        allColumns={allColumns}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        columnOrder={columnOrder}
        setColumnOrder={setColumnOrder}
        storageKeyPrefix={`dataTable_${exportFileName}`}
      />

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