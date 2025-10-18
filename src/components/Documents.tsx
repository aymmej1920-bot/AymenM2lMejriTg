import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { FleetData, Document } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentSchema } from '../types/formSchemas'; // Import the schema
import { z } from 'zod'; // Import z
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'; // Import shadcn/ui Dialog components

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentsProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (document: Omit<Document, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (document: Document) => void;
  onDelete: (id: string) => void;
}

const Documents: React.FC<DocumentsProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      vehicle_id: '',
      type: '',
      number: '',
      expiration: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    if (editingDocument) {
      reset(editingDocument);
    } else {
      reset({
        vehicle_id: '',
        type: '',
        number: '',
        expiration: new Date().toISOString().split('T')[0],
      });
    }
  }, [editingDocument, reset]);

  // State for filtering, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Document>('expiration');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // You can adjust this value

  // Filtered and sorted data
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = data.documents.filter(doc => {
      const vehicle = data.vehicles.find(v => v.id === doc.vehicle_id);
      return (
        (vehicle?.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.expiration.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined values first (though not expected for these columns)
      if (aValue === null || aValue === undefined) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (bValue === null || bValue === undefined) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      // Special handling for vehicle_id to sort by plate
      if (sortColumn === 'vehicle_id') {
        const aVehicle = data.vehicles.find(v => v.id === a.vehicle_id);
        const bVehicle = data.vehicles.find(v => v.id === b.vehicle_id);
        const aPlate = aVehicle?.plate || '';
        const bPlate = bVehicle?.plate || '';
        return sortDirection === 'asc' ? aPlate.localeCompare(bPlate) : bPlate.localeCompare(aPlate);
      }

      // For date strings (like 'expiration'), compare them directly as strings
      if (sortColumn === 'expiration' && typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      // General string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      // Fallback for other types (should not be reached with current Document interface)
      return 0;
    });
    return filtered;
  }, [data.documents, data.vehicles, searchTerm, sortColumn, sortDirection]);

  // Paginated data
  const totalPages = Math.ceil(filteredAndSortedDocuments.length / itemsPerPage);
  const currentDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedDocuments.slice(startIndex, endIndex);
  }, [filteredAndSortedDocuments, currentPage, itemsPerPage]);

  const handleAddDocument = () => {
    setEditingDocument(null);
    setShowModal(true);
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowModal(true);
  };

  const confirmDeleteDocument = (documentId: string) => {
    setDocumentToDelete(documentId);
    setShowConfirmDialog(true);
  };

  const executeDeleteDocument = () => {
    if (documentToDelete) {
      onDelete(documentToDelete);
      showSuccess('Document supprimé avec succès !');
      setDocumentToDelete(null);
    }
  };

  const onSubmit = (formData: DocumentFormData) => {
    if (editingDocument) {
      onUpdate({ ...formData, id: editingDocument.id, user_id: editingDocument.user_id, created_at: editingDocument.created_at });
      showSuccess('Document mis à jour avec succès !');
    } else {
      onAdd(formData);
      showSuccess('Document ajouté avec succès !');
    }
    setShowModal(false);
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
    expiry.setHours(0, 0, 0, 0);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const getDocumentStatusBadge = (daysLeft: number) => {
    if (daysLeft < 0) {
      return { text: 'Expiré', class: 'bg-red-200 text-red-800' };
    } else if (daysLeft < 30) {
      return { text: 'Urgent', class: 'bg-red-100 text-red-800' };
    } else if (daysLeft < 60) {
      return { text: 'Attention', class: 'bg-orange-100 text-orange-800' };
    } else {
      return { text: 'Valide', class: 'bg-green-100 text-green-800' };
    }
  };

  const expiringDocs = data.documents.filter(doc => getDaysUntilExpiration(doc.expiration) < 30);

  const handleSort = (column: keyof Document) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof Document) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Suivi des Documents</h2>
          <Button
            onClick={handleAddDocument}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter Document</span>
          </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un document par véhicule, type, numéro ou expiration..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page on new search
          }}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Alerts */}
      {expiringDocs.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold">Attention!</h3>
              <p className="text-red-700">
                {expiringDocs.length} document(s) expirent dans moins de 30 jours.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('vehicle_id')}>
                <div className="flex items-center">
                  Véhicule {renderSortIcon('vehicle_id')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('type')}>
                <div className="flex items-center">
                  Type Document {renderSortIcon('type')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('number')}>
                <div className="flex items-center">
                  N° Document {renderSortIcon('number')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('expiration')}>
                <div className="flex items-center">
                  Expiration {renderSortIcon('expiration')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Jours Restants</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentDocuments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Aucun document trouvé.
                </td>
              </tr>
            ) : (
              currentDocuments.map((doc) => {
                const daysLeft = getDaysUntilExpiration(doc.expiration);
                const statusClass = daysLeft < 30 ? 'text-red-600 font-semibold' : daysLeft < 60 ? 'text-orange-600' : 'text-green-600';
                const status = getDocumentStatusBadge(daysLeft);
                const vehicle = data.vehicles.find(v => v.id === doc.vehicle_id);
                
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{vehicle?.plate || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.number}</td>
                    <td className={`px-6 py-4 text-sm ${daysLeft < 30 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                      {formatDate(doc.expiration)}
                    </td>
                    <td className={`px-6 py-4 text-sm ${statusClass}`}>
                      {daysLeft < 0 ? 'Expiré' : `${daysLeft} jours`}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${status.class}`}>
                        {status.text}
                      </span>
                    </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDocument(doc)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDeleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Modifier un Document' : 'Ajouter un Document'}</DialogTitle>
            <DialogDescription>
              {editingDocument ? 'Modifiez les détails du document.' : 'Ajoutez un nouveau document.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <label htmlFor="vehicle_id" className="block text-sm font-medium mb-2 text-gray-900">Véhicule</label>
              <select
                id="vehicle_id"
                {...register('vehicle_id')}
                className="w-full bg-white border border-gray-900 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un véhicule</option>
                {data.vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.type}
                  </option>
                ))}
              </select>
              {errors.vehicle_id && <p className="text-red-500 text-sm mt-1">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-2 text-gray-900">Type de document</label>
              <select
                id="type"
                {...register('type')}
                className="w-full bg-white border border-gray-900 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un type</option>
                <option value="Assurance">Assurance</option>
                <option value="Contrôle Technique">Contrôle Technique</option>
                <option value="Taxe Véhicule">Taxe Véhicule</option>
                <option value="Vignette">Vignette</option>
                <option value="Permis de Circulation">Permis de Circulation</option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label htmlFor="number" className="block text-sm font-medium mb-2 text-gray-900">Numéro de document</label>
              <input
                id="number"
                type="text"
                {...register('number')}
                className="w-full bg-white border border-gray-900 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number.message}</p>}
            </div>
            <div>
              <label htmlFor="expiration" className="block text-sm font-medium mb-2 text-gray-900">Date d'expiration</label>
              <input
                id="expiration"
                type="date"
                {...register('expiration')}
                className="w-full bg-white border border-gray-900 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.expiration && <p className="text-red-500 text-sm mt-1">{errors.expiration.message}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
              >
                Sauvegarder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible."
        onConfirm={executeDeleteDocument}
        confirmText="Supprimer"
        variant="destructive"
      />
    </div>
  );
};

export default Documents;