import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Users, Route, Fuel, FileText, Wrench, BarChart3, Download, Upload, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Tours from './components/Tours';
import FuelManagement from './components/FuelManagement';
import Documents from './components/Documents';
import Maintenance from './components/Maintenance';
import Summary from './components/Summary';
import Login from './pages/Login';
import { FleetData, AuthUser, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry } from './types';
import { useSession } from './components/SessionContextProvider';
import { supabase } from './integrations/supabase/client';

function App() {
  const { session, isLoading } = useSession();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [fleetData, setFleetData] = useState<FleetData>({
    vehicles: [],
    drivers: [],
    tours: [],
    fuel: [],
    documents: [],
    maintenance: [],
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchData = useCallback(async (userId: string) => {
    setDataLoading(true);
    try {
      const [
        { data: vehiclesData, error: vehiclesError },
        { data: driversData, error: driversError },
        { data: toursData, error: toursError },
        { data: fuelData, error: fuelError },
        { data: documentsData, error: documentsError },
        { data: maintenanceData, error: maintenanceError },
      ] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', userId),
        supabase.from('drivers').select('*').eq('user_id', userId),
        supabase.from('tours').select('*').eq('user_id', userId),
        supabase.from('fuel_entries').select('*').eq('user_id', userId),
        supabase.from('documents').select('*').eq('user_id', userId),
        supabase.from('maintenance_entries').select('*').eq('user_id', userId),
      ]);

      if (vehiclesError) throw vehiclesError;
      if (driversError) throw driversError;
      if (toursError) throw toursError;
      if (fuelError) throw fuelError;
      if (documentsError) throw documentsError;
      if (maintenanceError) throw maintenanceError;

      setFleetData({
        vehicles: vehiclesData as Vehicle[],
        drivers: driversData as Driver[],
        tours: toursData as Tour[],
        fuel: fuelData as FuelEntry[],
        documents: documentsData as Document[],
        maintenance: maintenanceData as MaintenanceEntry[],
      });
    } catch (error) {
      console.error('Error fetching fleet data:', error);
      alert('Erreur lors du chargement des données de flotte.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata.first_name || session.user.email?.split('@')[0] || 'User',
      });
      fetchData(session.user.id);
    } else {
      setCurrentUser(null);
      setFleetData({
        vehicles: [],
        drivers: [],
        tours: [],
        fuel: [],
        documents: [],
        maintenance: [],
      });
      setDataLoading(false);
    }
  }, [session, fetchData]);

  const handleUpdateData = async (tableName: string, newData: any, action: 'insert' | 'update' | 'delete') => {
    if (!currentUser?.id) return;

    try {
      let response;
      if (action === 'insert') {
        response = await supabase.from(tableName).insert({ ...newData, user_id: currentUser.id }).select();
      } else if (action === 'update') {
        response = await supabase.from(tableName).update(newData).eq('id', newData.id).eq('user_id', currentUser.id).select();
      } else if (action === 'delete') {
        response = await supabase.from(tableName).delete().eq('id', newData.id).eq('user_id', currentUser.id);
      }

      if (response?.error) throw response.error;
      
      // Re-fetch data to ensure UI is consistent with DB
      fetchData(currentUser.id);
    } catch (error) {
      console.error(`Error ${action}ing data in ${tableName}:`, error);
      alert(`Erreur lors de la ${action === 'insert' ? 'création' : action === 'update' ? 'mise à jour' : 'suppression'} des données.`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setFleetData({
      vehicles: [],
      drivers: [],
      tours: [],
      fuel: [],
      documents: [],
      maintenance: [],
    });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(fleetData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fleet_data_${currentUser?.id}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData: FleetData = JSON.parse(e.target?.result as string);
        if (importedData.vehicles && importedData.drivers) {
          // Clear existing data for the user
          await Promise.all([
            supabase.from('vehicles').delete().eq('user_id', currentUser?.id),
            supabase.from('drivers').delete().eq('user_id', currentUser?.id),
            supabase.from('tours').delete().eq('user_id', currentUser?.id),
            supabase.from('fuel_entries').delete().eq('user_id', currentUser?.id),
            supabase.from('documents').delete().eq('user_id', currentUser?.id),
            supabase.from('maintenance_entries').delete().eq('user_id', currentUser?.id),
          ]);

          // Insert imported data
          await Promise.all([
            importedData.vehicles.length > 0 && supabase.from('vehicles').insert(importedData.vehicles.map(v => ({ ...v, user_id: currentUser?.id }))),
            importedData.drivers.length > 0 && supabase.from('drivers').insert(importedData.drivers.map(d => ({ ...d, user_id: currentUser?.id }))),
            importedData.tours.length > 0 && supabase.from('tours').insert(importedData.tours.map(t => ({ ...t, user_id: currentUser?.id }))),
            importedData.fuel.length > 0 && supabase.from('fuel_entries').insert(importedData.fuel.map(f => ({ ...f, user_id: currentUser?.id }))),
            importedData.documents.length > 0 && supabase.from('documents').insert(importedData.documents.map(doc => ({ ...doc, user_id: currentUser?.id }))),
            importedData.maintenance.length > 0 && supabase.from('maintenance_entries').insert(importedData.maintenance.map(m => ({ ...m, user_id: currentUser?.id }))),
          ]);
          
          alert('Données importées avec succès !');
          fetchData(currentUser!.id); // Refresh data after import
        } else {
          alert('Format de fichier invalide !');
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Erreur lors de l\'import du fichier !');
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'vehicles', name: 'Véhicules', icon: Truck },
    { id: 'drivers', name: 'Conducteurs', icon: Users },
    { id: 'tours', name: 'Tournées', icon: Route },
    { id: 'fuel', name: 'Carburant', icon: Fuel },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench },
    { id: 'summary', name: 'Résumé', icon: BarChart3 }
  ];

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard data={fleetData} />;
      case 'vehicles':
        return <Vehicles data={fleetData} onUpdate={(newData) => handleUpdateData('vehicles', newData, 'update')} onDelete={(id) => handleUpdateData('vehicles', { id }, 'delete')} onAdd={(newData) => handleUpdateData('vehicles', newData, 'insert')} />;
      case 'drivers':
        return <Drivers data={fleetData} onUpdate={(newData) => handleUpdateData('drivers', newData, 'update')} onDelete={(id) => handleUpdateData('drivers', { id }, 'delete')} onAdd={(newData) => handleUpdateData('drivers', newData, 'insert')} />;
      case 'tours':
        return <Tours data={fleetData} onUpdate={(newData) => handleUpdateData('tours', newData, 'update')} onDelete={(id) => handleUpdateData('tours', { id }, 'delete')} onAdd={(newData) => handleUpdateData('tours', newData, 'insert')} />;
      case 'fuel':
        return <FuelManagement data={fleetData} onUpdate={(newData) => handleUpdateData('fuel_entries', newData, 'update')} onDelete={(id) => handleUpdateData('fuel_entries', { id }, 'delete')} onAdd={(newData) => handleUpdateData('fuel_entries', newData, 'insert')} />;
      case 'documents':
        return <Documents data={fleetData} onUpdate={(newData) => handleUpdateData('documents', newData, 'update')} onDelete={(id) => handleUpdateData('documents', { id }, 'delete')} onAdd={(newData) => handleUpdateData('documents', newData, 'insert')} />;
      case 'maintenance':
        return <Maintenance data={fleetData} onUpdate={(newData) => handleUpdateData('maintenance_entries', newData, 'update')} onAdd={(newData) => handleUpdateData('maintenance_entries', newData, 'insert')} />;
      case 'summary':
        return <Summary data={fleetData} />;
      default:
        return <Dashboard data={fleetData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Fleet Manager Pro</h1>
                <p className="text-purple-100 text-sm">Système de Gestion de Flotte Avancé</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Bienvenue, {currentUser?.name}</span>
              <button
                onClick={exportData}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Exporter</span>
              </button>
              <label className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Importer</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-6">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-6 py-4 rounded-lg whitespace-nowrap transition-all duration-300 flex items-center space-x-2 ${
                    currentTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;