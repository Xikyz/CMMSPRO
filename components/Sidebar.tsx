import React from 'react';
import { LayoutDashboard, Box, Wrench, ShieldCheck, ClipboardList, Package, DollarSign, Settings } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Panel', icon: <LayoutDashboard size={20} /> },
    { id: 'assets', label: 'Activos', icon: <Box size={20} /> },
    { id: 'inventory', label: 'Bodega', icon: <Package size={20} /> },
    { id: 'workorders', label: 'Mantenimiento', icon: <Wrench size={20} /> },
    { id: 'costs', label: 'Costos y Compras', icon: <DollarSign size={20} /> },
    { id: 'logbook', label: 'Bitácora', icon: <ClipboardList size={20} /> },
    { id: 'safety', label: 'Seguridad', icon: <ShieldCheck size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-full flex flex-col shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-blue-400">CMMS<span className="text-white">Pro</span></h1>
        <p className="text-xs text-slate-400 mt-1">Gestión Integral</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              currentView === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      
      {/* Configuration Link at the bottom of nav */}
      <div className="p-4">
        <button
            onClick={() => onChangeView('configuration')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              currentView === 'configuration'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings size={20} />
            <span>Configuración</span>
        </button>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">JD</div>
            <div>
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-slate-400">Jefe Mantenimiento</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;