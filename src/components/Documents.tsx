import React, { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { FleetData, Document } from '../types';

interface DocumentsProps {
  data: FleetData;
  onUpdate: (data: FleetData) => void;
}

const Documents: React.FC<DocumentsProps> = ({ data, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  const handleAddDocument = () => {
    setEditingDocument(null);
    setShowModal(true);
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowModal(true);
  };

  const handleDeleteDocument = (documentId: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      const newData = {
        ...data,
        documents: data.documents.filter(d => d.id !== documentId)
      };
      onUpdate(newData);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const documentData: Document = {
      id: editingDocument?.id || Date.now(),
      vehicle: formData.get('vehicle') as string,
      type: formData.get('type') as string,
      number: formData.get('number') as string,
      expiration: formData.get('expiration') as string
    };

    const newData = editingDocument
      ? {
          ...data,
          documents: data.documents.map(d => d.id === editingDocument.id ? documentData : d)
        }
      : {
          ...data,
          documents: [...data.documents, documentData]
        };

    onUpdate(newData);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Suivi des Documents</h2>
        <button
          onClick={handleAddDocument}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter Document</span>
        </button>
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Véhicule</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type Document</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">N° Document</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expiration</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Jours Restants</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.documents.map((doc) => {
              const daysLeft = getDaysUntilExpiration(doc.expiration);
              const statusClass = daysLeft < 30 ? 'text-red-600 font-semibold' : daysLeft < 60 ? 'text-orange-600' : 'text-green-600';
              const status = getDocumentStatusBadge(daysLeft);
              
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.vehicle}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{doc.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{doc.number}</td>
                  <td className={`px-6 py-4 text-sm ${daysLeft < 30 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                    {doc.expiration}
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
                      <button
                        onClick={() => handleEditDocument(doc)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                {editingDocument ? 'Modifier un Document' : 'Ajouter un Document'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Véhicule</label>
                  <select
                    name="vehicle"
                    defaultValue={editingDocument?.vehicle || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Sélectionner un véhicule</option>
                    {data.vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.plate}>
                        {vehicle.plate} - {vehicle.type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Type de document</label>
                  <select
                    name="type"
                    defaultValue={editingDocument?.type || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Sélectionner un type</option>
                    <option value="Assurance">Assurance</option>
                    <option value="Contrôle Technique">Contrôle Technique</option>
                    <option value="Taxe Véhicule">Taxe Véhicule</option>
                    <option value="Vignette">Vignette</option>
                    <option value="Permis de Circulation">Permis de Circulation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Numéro de document</label>
                  <input
                    type="text"
                    name="number"
                    defaultValue={editingDocument?.number || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Date d'expiration</label>
                  <input
                    type="date"
                    name="expiration"
                    defaultValue={editingDocument?.expiration || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg transition-all duration-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300"
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;