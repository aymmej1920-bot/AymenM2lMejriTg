import React, { useState, useMemo, useEffect } from 'react';
    import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Search, Download, Settings } from 'lucide-react';
    import { Button } from './ui/button';
    import ConfirmDialog from './ConfirmDialog';
    import { exportToXLSX } from '../utils/export';
    import { showSuccess, showError } from '../utils/toast';
    import SkeletonLoader from './SkeletonLoader';
    import { DataTableColumn, ProcessedDataTableColumn, Resource } from '../types';
    import DataTableColumnCustomizer from './DataTableColumnCustomizer'; // Added import
    // import { usePermissions } from '../hooks/usePermissions'; // Removed import

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
      // Props for server-side pagination
      currentPage: number;
      onPageChange: (page: number) => void;
      itemsPerPage: number;
      onItemsPerPageChange: (count: number) => void;
      totalCount: number; // Total number of items across all pages
      itemsPerPageOptions?: number[];
      // Props for server-side sorting
      sortColumn: string;
      onSortChange: (column: string, direction: 'asc' | 'desc') => void;
      sortDirection: 'asc' | 'desc';

      renderFilters?: (searchTerm: string, setSearchTerm: (term: string) => void) => React.ReactNode;
      renderAlerts?: () => React.ReactNode;
      renderRowActions?: (item: T) => React.ReactNode;
      customFilter?: (item: T) => boolean; // This will now only filter the *current page* data if used
      resourceType: Resource;
      renderCustomHeaderButtons?: () => React.ReactNode;
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
      // Server-side pagination props
      currentPage,
      onPageChange,
      itemsPerPage,
      onItemsPerPageChange,
      totalCount,
      itemsPerPageOptions = [10, 25, 50],
      // Server-side sorting props
      sortColumn,
      onSortChange,
      sortDirection,

      renderFilters,
      renderAlerts,
      renderRowActions,
      customFilter,
      resourceType,
      renderCustomHeaderButtons,
    }: React.PropsWithChildren<DataTableProps<T>>) => {
      // const { canAccess } = usePermissions(); // Removed usePermissions
      void resourceType; // Suppress TS6133 for resourceType

      const [searchTerm, setSearchTerm] = useState(''); // Search remains client-side for current page
      
      const [showColumnCustomizeDialog, setShowColumnCustomizeDialog] = useState(false);
      const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
      const [columnOrder, setColumnOrder] = useState<string[]>([]);

      const [showConfirmDialog, setShowConfirmDialog] = useState(false);
      const [itemToDelete, setItemToDelete] = useState<string | null>(null);

      const allColumns = useMemo(() => {
        return initialColumns.map((col: DataTableColumn<T>) => ({
          ...col,
          key: col.key as string,
          defaultVisible: col.defaultVisible !== false,
        })) as ProcessedDataTableColumn<T>[];
      }, [initialColumns]);

      useEffect(() => {
        // Initialize column visibility and order from localStorage or defaults
        const storageKeyVisibility = `dataTable_${exportFileName}_columnsVisibility`;
        const storageKeyOrder = `dataTable_${exportFileName}_columnsOrder`;

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
      }, [allColumns, exportFileName]);

      const visibleColumns = useMemo(() => {
        return columnOrder
          .map(key => allColumns.find(col => col.key === key))
          .filter((col): col is ProcessedDataTableColumn<T> => col !== undefined && columnVisibility[col.key]);
      }, [columnVisibility, columnOrder, allColumns]);

      // Client-side filtering for the current page's data based on searchTerm
      const filteredDataForDisplay = useMemo(() => {
        let filtered = data.filter((item: T) => {
          const lowerCaseSearchTerm = searchTerm.toLowerCase();
          const matchesSearch = Object.values(item).some(value =>
            (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
            String(value).toLowerCase().includes(lowerCaseSearchTerm)
          );

          const matchesCustomFilter = customFilter ? customFilter(item) : true;

          return matchesSearch && matchesCustomFilter;
        });
        return filtered;
      }, [data, searchTerm, customFilter]);

      const totalPages = Math.ceil(totalCount / itemsPerPage);

      const handleSort = (columnKey: string) => {
        const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
        onSortChange(columnKey, newDirection);
      };

      const renderSortIcon = (columnKey: string) => {
        if (sortColumn === columnKey) {
          return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
        }
        return null;
      };

      const handleExport = () => {
        if (data.length === 0) {
          showError('Aucune donnée à exporter.');
          return;
        }

        const headers = visibleColumns.map(col => col.label);
        const dataToExport = data.map((item: T) => {
          const exportedRow: { [key: string]: any } = {};
          visibleColumns.forEach(col => {
            exportedRow[col.label] = col.render ? col.render(item) : (item as any)[col.key];
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

      // All actions are now available to any authenticated user
      const canAdd = !!onAdd;
      const canEdit = !!onEdit;
      const canDelete = !!onDelete;
      const canPerformAnyAction = canAdd || canEdit || canDelete || !!renderRowActions;

      if (isLoading) {
        return <SkeletonLoader count={5} height="h-12" className="w-full" />;
      }

      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-bold text-gray-800">{title}</h2>
            <div className="flex space-x-4">
              {renderCustomHeaderButtons && renderCustomHeaderButtons()}
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
              {canAdd && (
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderFilters && renderFilters(searchTerm, setSearchTerm)}
            {!renderFilters && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
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
                    {canPerformAnyAction && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white/10 divide-y divide-gray-200">
                  {filteredDataForDisplay.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + (canPerformAnyAction ? 1 : 0)} className="px-6 py-4 text-center text-gray-600">
                        Aucune donnée trouvée.
                      </td>
                    </tr>
                  ) : (
                    filteredDataForDisplay.map((item: T) => (
                      <tr key={item.id} className="hover:bg-white/20 transition-colors">
                        {visibleColumns.map((col) => (
                          <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {col.render ? col.render(item) : (item as any)[col.key]}
                          </td>
                        ))}
                        {canPerformAnyAction && (
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

          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed glass"
              >
                Précédent
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page: number) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  onClick={() => onPageChange(page)}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === page ? 'bg-gradient-brand text-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-gray-800 glass'
                  }`}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed glass"
              >
                Suivant
              </Button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  onItemsPerPageChange(Number(e.target.value));
                  onPageChange(1); // Reset to first page when items per page changes
                }}
                className="ml-4 bg-white/20 border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm glass"
              >
                {itemsPerPageOptions.map((option: number) => (
                  <option key={option} value={option}>{option} par page</option>
                ))}
              </select>
            </div>
          )}

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