import React from 'react';
import { Asset, Part, MaintenancePlan, LogNote, SafetyRecord } from '../types';
import { AlertTriangle, Box, Calendar, CheckSquare, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  parts: Part[];
  plans: MaintenancePlan[];
  logs: LogNote[];
  safety: SafetyRecord[];
  assets: Asset[];
  onAddLog: (log: LogNote) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ parts, plans, logs, safety, assets, onAddLog }) => {
  // Logic 1: Low Stock
  const lowStockParts = parts.filter(p => p.currentStock <= p.minStock);

  // Logic 2: Maintenance Due (Overdue or within 7 days)
  const today = new Date();
  const maintenanceAlerts = plans.filter(p => {
    const dueDate = new Date(p.nextDueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  // Logic 3: Urgent Logs (Pending & Deadline <= 3 days)
  const urgentLogs = logs.filter(l => {
    if (l.status !== 'Pendiente') return false;
    const deadline = new Date(l.deadline);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  // Logic 4: Pending Safety
  const pendingSafety = safety.filter(s => s.status === 'Pendiente');

  // Chart Data Preparation
  const stockValueData = parts.map(p => ({
    name: p.name.substring(0, 10) + '...',
    valor: p.currentStock * p.cost
  })).sort((a, b) => b.valor - a.valor).slice(0, 5);

  const criticalityData = [
    { name: 'Alta', value: assets.filter(a => a.criticality === 'Alta').length },
    { name: 'Media', value: assets.filter(a => a.criticality === 'Media').length },
    { name: 'Baja', value: assets.filter(a => a.criticality === 'Baja').length },
  ];

  const COLORS = ['#ef4444', '#f59e0b', '#22c55e'];

  const handleOrderPart = (part: Part) => {
    // Create a new LogNote automatically
    const newLog: LogNote = {
      id: `L-${Date.now()}`,
      description: `SOLICITUD COMPRA: ${part.name} (SKU: ${part.id}). Stock actual: ${part.currentStock}, Mínimo: ${part.minStock}.`,
      priority: 'Alta',
      status: 'Pendiente',
      createdAt: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow as deadline
    };

    onAddLog(newLog);
    alert(`Solicitud de compra para "${part.name}" agregada a la Bitácora.`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Panel de Control</h1>
      
      {/* Top Cards - The "Traffic Light" System */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Bodega Alert */}
        <div className={`p-4 rounded-xl shadow-sm border-l-4 ${lowStockParts.length > 0 ? 'bg-red-50 border-red-500' : 'bg-white border-green-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Alertas de Bodega</p>
              <h2 className="text-2xl font-bold text-gray-800">{lowStockParts.length}</h2>
              <p className="text-xs text-gray-500">Items bajo stock mínimo</p>
            </div>
            <Box className={`w-8 h-8 ${lowStockParts.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
        </div>

        {/* Maintenance Alert */}
        <div className={`p-4 rounded-xl shadow-sm border-l-4 ${maintenanceAlerts.length > 0 ? 'bg-yellow-50 border-yellow-500' : 'bg-white border-green-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Mantenimientos</p>
              <h2 className="text-2xl font-bold text-gray-800">{maintenanceAlerts.length}</h2>
              <p className="text-xs text-gray-500">Próximos 7 días o vencidos</p>
            </div>
            <Calendar className={`w-8 h-8 ${maintenanceAlerts.length > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
          </div>
        </div>

        {/* Logbook Alert */}
        <div className={`p-4 rounded-xl shadow-sm border-l-4 ${urgentLogs.length > 0 ? 'bg-orange-50 border-orange-500' : 'bg-white border-blue-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Bitácora Urgente</p>
              <h2 className="text-2xl font-bold text-gray-800">{urgentLogs.length}</h2>
              <p className="text-xs text-gray-500">Notas por vencer</p>
            </div>
            <ClipboardList className={`w-8 h-8 ${urgentLogs.length > 0 ? 'text-orange-500' : 'text-blue-500'}`} />
          </div>
        </div>

        {/* Safety Alert */}
        <div className={`p-4 rounded-xl shadow-sm border-l-4 ${pendingSafety.length > 0 ? 'bg-blue-50 border-blue-500' : 'bg-white border-green-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Seguridad</p>
              <h2 className="text-2xl font-bold text-gray-800">{pendingSafety.length}</h2>
              <p className="text-xs text-gray-500">Actividades pendientes</p>
            </div>
            <CheckSquare className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Detailed Lists & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Critical Alerts List */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Atención Inmediata
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-64">
            {lowStockParts.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg text-sm">
                <div>
                  <span className="font-semibold text-gray-700">{p.name}</span>
                  <div className="text-red-600">Stock: {p.currentStock} / Min: {p.minStock}</div>
                </div>
                <button 
                  onClick={() => handleOrderPart(p)}
                  className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded text-xs hover:bg-red-100 transition-colors"
                >
                  Pedir
                </button>
              </div>
            ))}
            {maintenanceAlerts.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg text-sm">
                <div>
                  <span className="font-semibold text-gray-700">{assets.find(a => a.id === m.assetId)?.name}</span>
                  <div className="text-yellow-700">{m.task}</div>
                  <div className="text-xs text-gray-500">Vence: {m.nextDueDate}</div>
                </div>
              </div>
            ))}
            {lowStockParts.length === 0 && maintenanceAlerts.length === 0 && (
              <p className="text-gray-400 text-center py-4">Todo en orden. ¡Buen trabajo!</p>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col">
           <h3 className="text-lg font-semibold text-gray-800 mb-4">Criticidad de Activos</h3>
           <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={criticalityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {criticalityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Stock Value Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Valor Inventario</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockValueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Bar dataKey="valor" fill="#3b82f6" name="Valor Total ($)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;