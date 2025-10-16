import React, { useState, useEffect } from 'react';
import { User, Truck, Users, Route, Fuel, FileText, Wrench, BarChart3, Plus, Download, Upload, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Tours from './components/Tours';
import FuelManagement from './components/FuelManagement';
import Documents from './components/Documents';
import Maintenance from './components/Maintenance';
import Summary from './components/Summary';
import AuthModal from './components/AuthModal';
import { FleetData, AuthUser } from './types';

const initialData: FleetData = {
  vehicles: [
    {
      id: '1',
      plate: 'TUN-123-01',
      type: 'Camionnette',
      status: 'Disponible',
      mileage: 45000,
      lastServiceDate: '2024-11-15',
      lastServiceMileage: 40000
    },
    {
      id: '2', 
      plate: 'TUN-456-02',
      type: 'Camion',
      status: 'En mission',
      mileage: 62000,
      lastServiceDate: '2024-10-20',
      lastServiceMileage: 60000
    }
  ],
  drivers: [
    {
      id: 1,
      name: 'Ahmed Ben Ali',
      license: 'B123456',
      expiration: '2025-06-15',
      status: 'Disponible',
      phone: '+216 98 123 456'
    },
    {
      id: 2,
      name: 'Mohamed Trabelsi',
      license: 'B789012',
      expiration: '2025-03-20',
      status: 'En mission', 
      phone: '+216 97 654 321'
    }
  ],
  tours: [
    {
      id: 1,
      date: '2024-12-15',
      vehicle: 'TUN-123-01',
      driver: 'Ahmed Ben Ali',
      status: 'Terminé',
      fuelStart: 80,
      kmStart: 44800,
      fuelEnd: 65,
      kmEnd: 45000,
      distance: 200
    }
  ],
  fuel: [
    {
      id: 1,
      date: '2024-12-14',
      vehicle: 'TUN-123-01',
      liters: 35.5,
      pricePerLiter: 3.75,
      mileage: 44500
    }
  ],
  documents: [
    {
      id: 1,
      vehicle: 'TUN-123-01',
      type: 'Assurance',
      number: 'ASS-2024-001',
      expiration: '2025-01-15'
    }
  ],
  maintenance: [
    {
      id: 1,
      vehicleId: '1',
      type: 'Vidange',
      date: '2024-11-15',
      mileage: 40000,
      cost: 125.50
    }
  ]
};

function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [fleetData, setFleetData] = useState<FleetData>(initialData);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const savedUser = localStorage.getItem('fleetManagerUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
      loadSavedData();
    }
  }, []);

  const loadSavedData = () => {
    const savedData = localStorage.getItem('fleetDataPro');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFleetData({ ...initialData, ...parsed });
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    }
  };

  const saveData = (newData: FleetData) => {
    setFleetData(newData);
    localStorage.setItem('fleetDataPro', JSON.stringify(newData));
  };

  const handleLogin = (email: string, password: string) => {
    // Authentification simplifiée - en production, utilisez un système d'auth réel
    if (email && password.length >= 6) {
      const user: AuthUser = {
        id: '1',
        email: email,
        name: email.split('@')[0]
      };
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('fleetManagerUser', JSON.stringify(user));
      loadSavedData();
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('fleetManagerUser');
    localStorage.removeItem('fleetDataPro');
    setFleetData(initialData);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(fleetData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fleet_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (importedData.vehicles && importedData.drivers) {
          setFleetData(importedData);
          localStorage.setItem('fleetDataPro', JSON.stringify(importedData));
          alert('Données importées avec succès !');
        } else {
          alert('Format de fichier invalide !');
        }
      } catch (error) {
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

  if (!isAuthenticated) {
    return <AuthModal onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard data={fleetData} />;
      case 'vehicles':
        return <Vehicles data={fleetData} onUpdate={saveData} />;
      case 'drivers':
        return <Drivers data={fleetData} onUpdate={saveData} />;
      case 'tours':
        return <Tours data={fleetData} onUpdate={saveData} />;
      case 'fuel':
        return <FuelManagement data={fleetData} onUpdate={saveData} />;
      case 'documents':
        return <Documents data={fleetData} onUpdate={saveData} />;
      case 'maintenance':
        return <Maintenance data={fleetData} onUpdate={saveData} />;
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