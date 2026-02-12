import React, { useState } from 'react';
import { Settings, MapPin, Plus, Trash2, Save, X } from 'lucide-react';

interface ConfigurationProps {
  locations: string[];
  onUpdateLocations: (locations: string[]) => void;
}

const Configuration: React.FC<ConfigurationProps> = ({ locations, onUpdateLocations }) => {
  const [newLocation, setNewLocation] = useState('');

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocation.trim() === '') return;
    
    if (locations.includes(newLocation.trim())) {
        alert('Esta ubicación ya existe.');
        return;
    }

    onUpdateLocations([...locations, newLocation.trim()]);
    setNewLocation('');
  };

  const handleDeleteLocation = (locToDelete: string) => {
      if (window.confirm(`¿Estás seguro de eliminar la ubicación "${locToDelete}"? Esto no eliminará los activos asociados, pero dejará de aparecer en la lista de selección.`)) {
          onUpdateLocations(locations.filter(l => l !== locToDelete));
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
           <p className="text-gray-500 text-sm mt-1">Administración de parámetros generales del sistema</p>
        </div>
        <div className="p-3 bg-white rounded-full shadow-sm">
            <Settings className="w-6 h-6 text-gray-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LOCATION MANAGEMENT */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" /> Ubicaciones Técnicas
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{locations.length} Registradas</span>
              </div>
              
              <div className="p-5">
                  <form onSubmit={handleAddLocation} className="flex gap-2 mb-6">
                      <input 
                        type="text" 
                        placeholder="Nueva ubicación (Ej. Sala de Calderas)" 
                        className="flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                      />
                      <button 
                        type="submit"
                        disabled={!newLocation.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                      >
                          <Plus className="w-4 h-4" /> Agregar
                      </button>
                  </form>

                  <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
                      {locations.length > 0 ? (
                          locations.sort().map((loc, index) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all">
                                  <span className="text-gray-700 text-sm font-medium">{loc}</span>
                                  <button 
                                    onClick={() => handleDeleteLocation(loc)}
                                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Eliminar Ubicación"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                              No hay ubicaciones registradas.
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* PLACEHOLDER FOR FUTURE CONFIGS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center opacity-75">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Settings className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-400 mb-2">Más configuraciones pronto</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                  Aquí podrás configurar usuarios, permisos, categorías de activos y alertas personalizadas en futuras actualizaciones.
              </p>
          </div>

      </div>
    </div>
  );
};

export default Configuration;