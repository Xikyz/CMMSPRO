import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseRecord, PurchaseType, Asset } from '../types';
import { DollarSign, Plus, Search, Filter, Trash2, Edit2, TrendingUp, TrendingDown, FileText, ShoppingBag, Briefcase, Calendar, X, Save, Receipt, Hash, PieChart as PieChartIcon, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface CostsProps {
  purchases: PurchaseRecord[];
  assets: Asset[];
  onAddPurchase: (purchase: PurchaseRecord) => void;
  onUpdatePurchase: (purchase: PurchaseRecord) => void;
  onDeletePurchase: (id: string) => void;
}

const Costs: React.FC<CostsProps> = ({ purchases, assets, onAddPurchase, onUpdatePurchase, onDeletePurchase }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'net' | 'total'>('total'); // Nuevo estado para alternar IVA
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PurchaseType>('Material');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [relatedAssetId, setRelatedAssetId] = useState('');
  
  // New Form Fields
  const [solped, setSolped] = useState('');
  const [oc, setOc] = useState('');
  const [reception, setReception] = useState('');
  const [netCost, setNetCost] = useState('');
  const [tax, setTax] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  // Auto-calculate total whenever Net or Tax changes
  useEffect(() => {
    const net = Number(netCost) || 0;
    const taxes = Number(tax) || 0;
    setTotalAmount(net + taxes);
  }, [netCost, tax]);

  // Handler for Net Cost to auto-calculate IVA (19%)
  const handleNetCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNetCost(val);

    // Calculate 19% automatically
    const netVal = parseFloat(val);
    if (!isNaN(netVal)) {
        const calculatedTax = (netVal * 0.19).toFixed(0); 
        setTax(calculatedTax);
    } else {
        setTax('');
    }
  };

  // --- DATA PROCESSING FOR CHARTS & KPIs ---

  // 1. Filter by Year
  const yearPurchases = purchases.filter(p => new Date(p.date).getFullYear() === selectedYear);

  // 2. Helper to get value based on View Mode (Neto vs Total)
  const getValue = (p: PurchaseRecord) => viewMode === 'net' ? p.netCost : p.amount;

  // 3. Totals Calculation (Dynamic)
  const totalMaterial = yearPurchases.filter(p => p.type === 'Material').reduce((sum, p) => sum + getValue(p), 0);
  const totalService = yearPurchases.filter(p => p.type === 'Servicio').reduce((sum, p) => sum + getValue(p), 0);
  const totalYear = totalMaterial + totalService;
  
  // Calculate Average Monthly Cost (up to current month if current year, else 12)
  const currentMonthIndex = new Date().getFullYear() === selectedYear ? new Date().getMonth() + 1 : 12;
  const averageMonthly = totalYear / (currentMonthIndex || 1);

  // 4. Prepare Data for Monthly Bar Chart
  const monthlyData = useMemo(() => {
    const data = Array(12).fill(0).map((_, i) => ({
      name: new Date(0, i).toLocaleString('es-ES', { month: 'short' }),
      Materiales: 0,
      Servicios: 0,
      Total: 0
    }));

    yearPurchases.forEach(p => {
        const monthIndex = new Date(p.date).getMonth();
        const val = getValue(p);
        
        if (p.type === 'Material') {
            data[monthIndex].Materiales += val;
        } else {
            data[monthIndex].Servicios += val;
        }
        data[monthIndex].Total += val;
    });
    return data;
  }, [yearPurchases, viewMode]); // Re-run when viewMode changes

  // 5. Pie Chart Data
  const pieData = [
      { name: 'Materiales', value: totalMaterial },
      { name: 'Servicios', value: totalService }
  ];
  const PIE_COLORS = ['#3b82f6', '#f59e0b'];

  // --- HANDLERS ---

  const handleOpenCreate = () => {
      setEditingId(null);
      setDescription('');
      setType('Material');
      setDate(new Date().toISOString().split('T')[0]);
      setSupplier('');
      setInvoiceNumber('');
      setRelatedAssetId('');
      setSolped('');
      setOc('');
      setReception('');
      setNetCost('');
      setTax('');
      setIsModalOpen(true);
  };

  const handleOpenEdit = (record: PurchaseRecord) => {
      setEditingId(record.id);
      setDescription(record.description);
      setType(record.type);
      setDate(record.date);
      setSupplier(record.supplier);
      setInvoiceNumber(record.invoiceNumber || '');
      setRelatedAssetId(record.relatedAssetId || '');
      setSolped(record.solpedNumber || '');
      setOc(record.orderNumber || '');
      setReception(record.receiptNumber || '');
      setNetCost(record.netCost.toString());
      setTax(record.tax.toString());
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const record: PurchaseRecord = {
          id: editingId || `PUR-${Date.now()}`,
          description,
          type,
          amount: totalAmount, // Total with Tax
          netCost: Number(netCost),
          tax: Number(tax),
          date,
          supplier,
          invoiceNumber,
          solpedNumber: solped,
          orderNumber: oc,
          receiptNumber: reception,
          relatedAssetId: relatedAssetId || undefined
      };

      if (editingId) {
          onUpdatePurchase(record);
      } else {
          onAddPurchase(record);
      }
      setIsModalOpen(false);
  };

  const filteredPurchases = purchases.filter(p => 
      (p.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.orderNumber?.includes(searchTerm) ||
       p.invoiceNumber?.includes(searchTerm)) &&
       new Date(p.date).getFullYear() === selectedYear
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExportPDF = () => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Reporte de Costos - Año ${selectedYear}`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Total ${viewMode === 'net' ? 'Neto' : 'Bruto'}: $${totalYear.toLocaleString()}`, 14, 26);

      const tableData = filteredPurchases.map(p => [
          p.date,
          p.orderNumber || '-',
          p.description,
          p.supplier,
          `$${p.netCost.toLocaleString()}`,
          `$${p.amount.toLocaleString()}`
      ]);

      autoTable(doc, {
          startY: 35,
          head: [['Fecha', 'OC', 'Descripción', 'Proveedor', 'Neto', 'Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`Costos_${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Control de Costos</h1>
           <p className="text-gray-500 text-sm mt-1">Gestión financiera de mantenimiento y adquisiciones</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* View Mode Switch */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('net')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'net' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Neto (s/IVA)
                </button>
                <button 
                    onClick={() => setViewMode('total')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'total' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Total (c/IVA)
                </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-2 hover:bg-white rounded shadow-sm text-gray-600 transition-all"><TrendingDown className="w-4 h-4"/></button>
                <span className="font-bold text-gray-800 px-2 min-w-[3rem] text-center">{selectedYear}</span>
                <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-2 hover:bg-white rounded shadow-sm text-gray-600 transition-all"><TrendingUp className="w-4 h-4"/></button>
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 flex flex-col justify-between">
              <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Gasto Anual ({viewMode === 'net' ? 'Neto' : 'Total'})</p>
                  <h3 className="text-2xl font-bold text-gray-900">${totalYear.toLocaleString()}</h3>
              </div>
              <div className="flex justify-end mt-2">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                 </div>
              </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 flex flex-col justify-between">
              <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Promedio Mensual</p>
                  <h3 className="text-2xl font-bold text-gray-900">${averageMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                  <p className="text-xs text-gray-400 mt-1">Basado en lo que va del año</p>
              </div>
               <div className="flex justify-end mt-2">
                 <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <Calendar className="w-5 h-5" />
                 </div>
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 flex flex-col justify-between">
              <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Materiales</p>
                  <h3 className="text-2xl font-bold text-gray-900">${totalMaterial.toLocaleString()}</h3>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(totalMaterial/totalYear)*100 || 0}%` }}></div>
                  </div>
              </div>
              <div className="flex justify-end mt-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-orange-100 flex flex-col justify-between">
              <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Servicios</p>
                  <h3 className="text-2xl font-bold text-gray-900">${totalService.toLocaleString()}</h3>
                   <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${(totalService/totalYear)*100 || 0}%` }}></div>
                  </div>
              </div>
              <div className="flex justify-end mt-2">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Briefcase className="w-5 h-5" />
                  </div>
              </div>
          </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-gray-500"/> Evolución Mensual</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Visualizando valores {viewMode === 'net' ? 'Netos' : 'Totales'}
                  </span>
              </div>
              <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                          <Tooltip 
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend />
                          <Bar dataKey="Materiales" stackId="a" fill="#3b82f6" radius={[0,0,4,4]} />
                          <Bar dataKey="Servicios" stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-800 mb-4">Composición del Gasto</h3>
               <div className="h-72 relative">
                   <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="text-center mt-[-40px]">
                           <span className="text-xs text-gray-500">Total {viewMode === 'net' ? 'Neto' : 'Bruto'}</span>
                           <p className="font-bold text-gray-800">${totalYear.toLocaleString()}</p>
                       </div>
                   </div>
               </div>
          </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-bold text-gray-800 text-lg">Registro de Compras</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                 <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar OC, proveedor, factura..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleExportPDF}
                    className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600"
                    title="Exportar PDF"
                >
                    <FileText className="w-5 h-5"/>
                </button>
                <button 
                    onClick={handleOpenCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                >
                    <Plus className="w-4 h-4" /> Registrar Gasto
                </button>
              </div>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                          <th className="px-6 py-3 font-medium">Fecha</th>
                          <th className="px-6 py-3 font-medium">OC / Doc</th>
                          <th className="px-6 py-3 font-medium">Descripción</th>
                          <th className="px-6 py-3 font-medium">Tipo</th>
                          <th className="px-6 py-3 font-medium">Proveedor</th>
                          {/* Highlight active column */}
                          <th className={`px-6 py-3 font-medium text-right ${viewMode === 'net' ? 'bg-blue-50 text-blue-700' : ''}`}>Neto</th>
                          <th className={`px-6 py-3 font-medium text-right ${viewMode === 'total' ? 'bg-blue-50 text-blue-700' : ''}`}>Total</th>
                          <th className="px-6 py-3 font-medium text-center">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredPurchases.length > 0 ? (
                          filteredPurchases.map(p => (
                              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{p.date}</td>
                                  <td className="px-6 py-4">
                                      {p.orderNumber ? (
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{p.orderNumber}</span>
                                      ) : '-'}
                                      {p.solpedNumber && <div className="text-[10px] text-gray-400 mt-1">SOL: {p.solpedNumber}</div>}
                                  </td>
                                  <td className="px-6 py-4 text-gray-800 font-medium">
                                      {p.description}
                                      {p.relatedAssetId && (
                                          <div className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                              <BoxIcon /> {assets.find(a => a.id === p.relatedAssetId)?.name || p.relatedAssetId}
                                          </div>
                                      )}
                                      <div className="flex gap-2 mt-1">
                                          {p.invoiceNumber && <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded">Fac: {p.invoiceNumber}</span>}
                                          {p.receiptNumber && <span className="text-[10px] bg-green-50 text-green-700 px-1 rounded">Rec: {p.receiptNumber}</span>}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${p.type === 'Material' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                          {p.type}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">{p.supplier}</td>
                                  <td className={`px-6 py-4 text-right text-gray-500 ${viewMode === 'net' ? 'bg-blue-50 font-bold text-gray-800' : ''}`}>
                                      ${p.netCost.toLocaleString()}
                                  </td>
                                  <td className={`px-6 py-4 text-right font-bold text-gray-800 ${viewMode === 'total' ? 'bg-blue-50' : ''}`}>
                                      ${p.amount.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          <button onClick={() => handleOpenEdit(p)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit2 className="w-4 h-4"/></button>
                                          <button onClick={() => onDeletePurchase(p.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={8} className="text-center py-8 text-gray-400">No se encontraron registros para el año {selectedYear}.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-blue-600"/>
                          {editingId ? 'Editar Gasto' : 'Registrar Gasto'}
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                      
                      {/* Description & Asset */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del Gasto</label>
                              <input required type="text" className="w-full border rounded-lg p-2" placeholder="Ej. Compra de repuestos anual..." value={description} onChange={e => setDescription(e.target.value)} />
                          </div>
                      </div>

                      {/* Basic Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                              <input required type="text" className="w-full border rounded-lg p-2" placeholder="Nombre empresa" value={supplier} onChange={e => setSupplier(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                              <select className="w-full border rounded-lg p-2" value={type} onChange={e => setType(e.target.value as PurchaseType)}>
                                  <option value="Material">Material</option>
                                  <option value="Servicio">Servicio</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                              <input required type="date" className="w-full border rounded-lg p-2" value={date} onChange={e => setDate(e.target.value)} />
                          </div>
                      </div>

                      <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Activo Relacionado (Opcional)</label>
                            <select className="w-full border rounded-lg p-2" value={relatedAssetId} onChange={e => setRelatedAssetId(e.target.value)}>
                                <option value="">Ninguno</option>
                                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                      </div>
                      
                      <hr className="border-gray-100" />
                      
                      {/* Document Numbers */}
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Documentación</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">N° Solped</label>
                              <input type="text" className="w-full border rounded p-1.5 text-sm" placeholder="SOL-..." value={solped} onChange={e => setSolped(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">N° Orden Compra</label>
                              <input type="text" className="w-full border rounded p-1.5 text-sm font-semibold text-blue-600" placeholder="OC-..." value={oc} onChange={e => setOc(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">N° Recepción / HES</label>
                              <input type="text" className="w-full border rounded p-1.5 text-sm" placeholder="REC-..." value={reception} onChange={e => setReception(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">N° Factura</label>
                              <input type="text" className="w-full border rounded p-1.5 text-sm" placeholder="FAC-..." value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                          </div>
                      </div>

                      {/* Financials */}
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Montos</h3>
                      <div className="grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Costo Neto</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <input 
                                    required 
                                    type="number" 
                                    min="0" 
                                    className="w-full border rounded-lg pl-6 pr-2 py-2" 
                                    value={netCost} 
                                    onChange={handleNetCostChange} 
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto / IVA (19%)</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <input type="number" min="0" className="w-full border rounded-lg pl-6 pr-2 py-2" value={tax} onChange={e => setTax(e.target.value)} />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-blue-800 mb-1">Monto Total</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold">$</span>
                                  <input disabled type="text" className="w-full border-b-2 border-blue-300 bg-transparent pl-6 pr-2 py-2 font-bold text-lg text-blue-700" value={totalAmount.toLocaleString()} />
                              </div>
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2">
                              <Save className="w-4 h-4" /> Guardar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

// Mini icon helper
const BoxIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/><line x1="3.27" y1="6.96" x2="12" y2="2.08"/><line x1="20.73" y1="6.96" x2="12" y2="2.08"/></svg>
);

export default Costs;