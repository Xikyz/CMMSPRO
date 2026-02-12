import React, { useState, useEffect } from 'react';
import { Asset, Criticality, Part, MaintenancePlan, WorkOrder, WorkOrderType, WorkOrderStatus, AssetStatus } from '../types';
import { Search, MapPin, Activity, Plus, Edit2, Trash2, X, Save, Settings, ArrowUpDown, Calendar, Box, ClipboardList, FileText, Upload, Image as ImageIcon, Check, Ban, AlertCircle, Power, Wrench, Filter } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface AssetsProps {
  assets: Asset[];
  onUpdateAssets: (assets: Asset[]) => void;
  availableParts: Part[];
  plans: MaintenancePlan[];
  locations: string[]; // Recibe ubicaciones
  onAddPlan: (plan: MaintenancePlan) => void;
  onUpdatePlan: (plan: MaintenancePlan) => void;
  workOrders: WorkOrder[];
  onCreateWorkOrder: (order: WorkOrder) => void;
  onUpdateWorkOrder: (order: WorkOrder) => void;
}

const Assets: React.FC<AssetsProps> = ({ assets, onUpdateAssets, availableParts, plans, locations, onAddPlan, onUpdatePlan, workOrders, onCreateWorkOrder, onUpdateWorkOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'location'>('name');
  
  // Edit/Create Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({});
  const [partToLink, setPartToLink] = useState('');
  const [partToLinkQty, setPartToLinkQty] = useState(1);

  // View Details Modal State
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [detailEditForm, setDetailEditForm] = useState<Asset | null>(null);

  // Inline Add/Edit States
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<string | null>(null);

  // Inline Form Data
  const [newPlan, setNewPlan] = useState<Partial<MaintenancePlan>>({ frequency: 'Mensual', task: '', nextDueDate: '' });
  const [newActivity, setNewActivity] = useState<Partial<WorkOrder> & { status: WorkOrderStatus }>({ 
      title: '',
      type: 'Correctivo', 
      technician: '', 
      date: new Date().toISOString().split('T')[0], 
      details: '',
      status: 'Terminado'
  });
  
  const [quickPartId, setQuickPartId] = useState('');
  const [quickPartQty, setQuickPartQty] = useState(1);

  useEffect(() => {
      if (viewingAsset) {
          setDetailEditForm({ ...viewingAsset });
          setIsDetailEditing(false); 
          setShowAddPlan(false);
          setShowAddActivity(false);
          setEditingPlanId(null);
          setEditingWorkOrderId(null);
          setShowAddPart(false); // Reset add part visibility
      }
  }, [viewingAsset]);

  const filteredAssets = assets
    .filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            asset.sapCode.includes(searchTerm);
      const matchesLocation = locationFilter ? asset.location === locationFilter : true;
      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return a.location.localeCompare(b.location);
    });

  const handleOpenCreate = () => {
    setCurrentAsset({
        id: `A-${Date.now()}`,
        name: '',
        brand: '',
        model: '',
        capacity: '',
        sapCode: '',
        serialNumber: '',
        location: '',
        criticality: 'Media',
        status: 'Operativo',
        photoUrl: '',
        linkedParts: []
    });
    setPartToLink('');
    setPartToLinkQty(1);
    setIsEditing(false);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setCurrentAsset({ ...asset, linkedParts: asset.linkedParts || [] });
    setPartToLink('');
    setPartToLinkQty(1);
    setIsEditing(true);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este activo?')) {
        onUpdateAssets(assets.filter(a => a.id !== id));
        if (viewingAsset?.id === id) setViewingAsset(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAsset.name) return;

    const assetToSave = {
        ...currentAsset,
        photoUrl: currentAsset.photoUrl || `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`
    } as Asset;

    if (isEditing) {
        onUpdateAssets(assets.map(a => a.id === assetToSave.id ? assetToSave : a));
    } else {
        onUpdateAssets([...assets, assetToSave]);
    }
    setIsEditModalOpen(false);
  };

  const handleSaveDetailChanges = () => {
      if (!detailEditForm) return;
      onUpdateAssets(assets.map(a => a.id === detailEditForm.id ? detailEditForm : a));
      setViewingAsset(detailEditForm);
      setIsDetailEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isDetailMode: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isDetailMode && detailEditForm) {
            setDetailEditForm({ ...detailEditForm, photoUrl: reader.result as string });
        } else {
            setCurrentAsset({ ...currentAsset, photoUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLinkPart = () => {
      if (!partToLink) return;
      const currentLinks = currentAsset.linkedParts || [];
      const exists = currentLinks.find(p => p.partId === partToLink);
      
      if (!exists) {
          setCurrentAsset({ 
            ...currentAsset, 
            linkedParts: [...currentLinks, { partId: partToLink, quantity: Number(partToLinkQty) }] 
          });
      }
      setPartToLink('');
      setPartToLinkQty(1);
  };

  const handleUnlinkPart = (partId: string) => {
      const currentLinks = currentAsset.linkedParts || [];
      setCurrentAsset({ ...currentAsset, linkedParts: currentLinks.filter(p => p.partId !== partId) });
  };

  const handleQuickAddPart = () => {
      if (!viewingAsset || !quickPartId) return;
      const currentLinks = viewingAsset.linkedParts || [];
      const exists = currentLinks.find(p => p.partId === quickPartId);

      if (!exists) {
          const updatedAsset = { 
            ...viewingAsset, 
            linkedParts: [...currentLinks, { partId: quickPartId, quantity: Number(quickPartQty) }] 
          };
          onUpdateAssets(assets.map(a => a.id === viewingAsset.id ? updatedAsset : a));
          setViewingAsset(updatedAsset);
      } else {
          alert('El repuesto ya está vinculado a este activo.');
      }
      setQuickPartId('');
      setQuickPartQty(1);
      setShowAddPart(false);
  };

  const handleQuickRemovePart = (partId: string) => {
      if (!viewingAsset) return;
      const currentLinks = viewingAsset.linkedParts || [];
      const updatedAsset = {
          ...viewingAsset,
          linkedParts: currentLinks.filter(p => p.partId !== partId)
      };
      onUpdateAssets(assets.map(a => a.id === viewingAsset.id ? updatedAsset : a));
      setViewingAsset(updatedAsset);
  };

  const handlePlanSubmit = () => {
      if (!viewingAsset || !newPlan.task || !newPlan.nextDueDate) return;

      if (editingPlanId) {
          onUpdatePlan({
              id: editingPlanId,
              assetId: viewingAsset.id,
              frequency: newPlan.frequency || 'Mensual',
              task: newPlan.task,
              nextDueDate: newPlan.nextDueDate
          } as MaintenancePlan);
          setEditingPlanId(null);
      } else {
          onAddPlan({
              id: `MP-${Date.now()}`,
              assetId: viewingAsset.id,
              frequency: newPlan.frequency || 'Mensual',
              task: newPlan.task,
              nextDueDate: newPlan.nextDueDate
          } as MaintenancePlan);
      }
      setNewPlan({ frequency: 'Mensual', task: '', nextDueDate: '' });
      setShowAddPlan(false);
  };

  const handleEditPlanClick = (plan: MaintenancePlan) => {
      setNewPlan({ frequency: plan.frequency, task: plan.task, nextDueDate: plan.nextDueDate });
      setEditingPlanId(plan.id);
      setShowAddPlan(true);
  };

  const handleActivitySubmit = () => {
      if (!viewingAsset || !newActivity.details || !newActivity.technician) return;
      
      const commonData = {
          assetId: viewingAsset.id,
          title: newActivity.title || '',
          type: newActivity.type as WorkOrderType,
          requestDate: newActivity.date || new Date().toISOString().split('T')[0], // Default request to created
          date: newActivity.date || new Date().toISOString().split('T')[0],
          endDate: newActivity.status === 'Terminado' ? new Date().toISOString().split('T')[0] : '',
          location: viewingAsset.location,
          technician: newActivity.technician,
          details: newActivity.details,
          status: newActivity.status,
      };

      if (editingWorkOrderId) {
          const existingWO = workOrders.find(w => w.id === editingWorkOrderId);
          onUpdateWorkOrder({
              id: editingWorkOrderId,
              ...commonData,
              partsUsed: existingWO?.partsUsed || [] 
          });
          setEditingWorkOrderId(null);
      } else {
          onCreateWorkOrder({
              id: `WO-${Math.floor(Math.random() * 10000)}`,
              ...commonData,
              partsUsed: []
          });
      }

      setNewActivity({ title: '', type: 'Correctivo', technician: '', date: new Date().toISOString().split('T')[0], details: '', status: 'Terminado' });
      setShowAddActivity(false);
  };

  const handleEditActivityClick = (wo: WorkOrder) => {
      setNewActivity({
          title: wo.title,
          type: wo.type,
          technician: wo.technician,
          date: wo.date,
          details: wo.details,
          status: wo.status
      });
      setEditingWorkOrderId(wo.id);
      setShowAddActivity(true);
  };

  const getCriticalityColor = (crit: string) => {
    switch (crit) {
      case 'Alta': return 'bg-red-100 text-red-700';
      case 'Media': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const getStatusColor = (status: AssetStatus) => {
      switch(status) {
          case 'Operativo': return 'bg-green-100 text-green-700 border-green-200';
          case 'En Mantención': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'Fuera de Servicio': return 'bg-red-100 text-red-700 border-red-200';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  const getStatusIcon = (status: AssetStatus) => {
      switch(status) {
          case 'Operativo': return <Power className="w-4 h-4" />;
          case 'En Mantención': return <Wrench className="w-4 h-4" />;
          case 'Fuera de Servicio': return <Ban className="w-4 h-4" />;
          default: return <Activity className="w-4 h-4" />;
      }
  };

  const handleDownloadPDF = () => {
    if (!viewingAsset) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Ficha Técnica de Activo", 14, 20);
    doc.setFontSize(14);
    doc.text("Información General", 14, 40);
    const infoData = [
        ["Nombre", viewingAsset.name, "Código SAP", viewingAsset.sapCode],
        ["Estado", viewingAsset.status, "Ubicación", viewingAsset.location],
        ["Marca", viewingAsset.brand, "Serie", viewingAsset.serialNumber],
        ["Modelo", viewingAsset.model, "Criticidad", viewingAsset.criticality],
        ["Capacidad", viewingAsset.capacity, "", ""]
    ];
    autoTable(doc, { startY: 45, body: infoData });
    doc.save(`${viewingAsset.name}_Ficha.pdf`);
  };

  const assetPlans = viewingAsset ? plans.filter(p => p.assetId === viewingAsset.id) : [];
  const overduePlans = assetPlans.filter(p => new Date(p.nextDueDate) < new Date()).length;
  const assetOrders = viewingAsset ? workOrders.filter(wo => wo.assetId === viewingAsset.id) : [];
  const pendingOrders = assetOrders.filter(wo => wo.status !== 'Terminado').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Activos</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
            
            {/* Location Filter Dropdown */}
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 min-w-[180px]">
                <Filter className="w-4 h-4 text-gray-500" />
                <select 
                    className="bg-transparent border-none text-sm text-gray-700 cursor-pointer focus:outline-none w-full"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                >
                    <option value="">Todas las ubicaciones</option>
                    {locations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
                </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <select className="bg-transparent border-none text-sm text-gray-700 cursor-pointer focus:outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'location')}>
                    <option value="name">Nombre</option>
                    <option value="location">Ubicación</option>
                </select>
            </div>

            <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors whitespace-nowrap">
                <Plus className="w-5 h-5" /> Nuevo Activo
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.length > 0 ? (
            filteredAssets.map(asset => (
            <div key={asset.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 group">
                <div className="h-40 bg-gray-200 relative">
                <img src={asset.photoUrl} alt={asset.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${getCriticalityColor(asset.criticality)}`}>{asset.criticality}</span>
                </div>
                <div className="absolute top-2 left-2 flex gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold shadow-sm flex items-center gap-1 ${getStatusColor(asset.status || 'Operativo')}`}>
                    {getStatusIcon(asset.status || 'Operativo')} {asset.status || 'Operativo'}
                    </span>
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 pointer-events-none">
                    <button onClick={(e) => {e.stopPropagation(); handleOpenEdit(asset);}} className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50 transition-colors pointer-events-auto" title="Editar"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={(e) => {e.stopPropagation(); handleDelete(asset.id);}} className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors pointer-events-auto" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                </div>
                </div>
                <div className="p-5 space-y-3">
                <h3 onClick={() => setViewingAsset(asset)} className="font-bold text-lg text-gray-900 truncate hover:text-blue-600 hover:underline cursor-pointer">{asset.name}</h3>
                <div className="flex items-center text-sm text-gray-500 gap-2"><MapPin className="w-4 h-4" /> {asset.location}</div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-3 pt-3 border-t">
                    <div><p className="text-gray-400 text-xs">SAP</p><p className="font-medium text-gray-700 truncate">{asset.sapCode}</p></div>
                    <div><p className="text-gray-400 text-xs">Modelo</p><p className="font-medium text-gray-700 truncate">{asset.model}</p></div>
                </div>
                <button onClick={() => setViewingAsset(asset)} className="w-full mt-2 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4" /> Ver Detalles
                </button>
                </div>
            </div>
            ))
        ) : (
            <div className="col-span-full py-10 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                <p>No se encontraron activos con los filtros seleccionados.</p>
            </div>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewingAsset && detailEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="relative h-56 bg-gray-800">
                  <img src={isDetailEditing ? detailEditForm.photoUrl : viewingAsset.photoUrl} className="w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end p-6">
                      <div className="w-full">
                          <div className="flex justify-between items-end gap-4">
                              <div className="w-full">
                                  {isDetailEditing ? (
                                      <div className="grid gap-3 w-full max-w-2xl animate-fade-in">
                                          <input className="text-2xl font-bold bg-white/20 border border-white/30 text-white rounded px-2 py-1 w-full" value={detailEditForm.name} onChange={e => setDetailEditForm({...detailEditForm, name: e.target.value})} placeholder="Nombre del Activo"/>
                                          <div className="flex gap-2">
                                             <select className="bg-white/90 border-none text-gray-900 text-xs px-2 py-1 rounded w-1/2" value={detailEditForm.location} onChange={e => setDetailEditForm({...detailEditForm, location: e.target.value})}>
                                                <option value="">Seleccionar Ubicación...</option>
                                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                             </select>
                                              <input className="bg-white/20 border border-white/30 text-white text-sm rounded px-2 py-1 w-1/4" value={detailEditForm.sapCode} onChange={e => setDetailEditForm({...detailEditForm, sapCode: e.target.value})} placeholder="SAP"/>
                                          </div>
                                      </div>
                                  ) : (
                                      <div>
                                          <h2 className="text-3xl font-bold text-white">{viewingAsset.name}</h2>
                                          <p className="text-gray-300 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" /> {viewingAsset.location}</p>
                                      </div>
                                  )}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                {!isDetailEditing ? (
                                    <>
                                        <button onClick={() => setIsDetailEditing(true)} className="text-white hover:bg-white/20 bg-white/10 p-2 rounded-lg"><Edit2 className="w-5 h-5" /></button>
                                        <button onClick={handleDownloadPDF} className="text-white hover:text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium"><FileText className="w-5 h-5" /> PDF</button>
                                        <button onClick={() => setViewingAsset(null)} className="text-white hover:text-gray-300 bg-white/10 p-2 rounded-full"><X className="w-6 h-6" /></button>
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                         <button onClick={handleSaveDetailChanges} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"><Save className="w-5 h-5" /> Guardar</button>
                                    </div>
                                )}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* ... Same Detail Sections as before, just updated Location input in Main Edit Modal below ... */}
                  <div className="space-y-6 lg:col-span-1">
                      {/* Specs */}
                      <div className={`p-5 rounded-xl border transition-colors ${isDetailEditing ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Box className="w-5 h-5 text-blue-600" /> Ficha Técnica</h3>
                          <dl className="space-y-3 text-sm">
                              {/* ... fields ... */}
                              <div className="flex flex-col sm:flex-row justify-between border-b pb-2">
                                  <dt className="text-gray-500 py-1">Marca</dt>
                                  <dd className="font-medium text-gray-800 w-full sm:w-1/2">
                                      {isDetailEditing ? <input className="w-full border rounded px-2 py-1 bg-white" value={detailEditForm.brand} onChange={e => setDetailEditForm({...detailEditForm, brand: e.target.value})}/> : viewingAsset.brand}
                                  </dd>
                              </div>
                              <div className="flex flex-col sm:flex-row justify-between border-b pb-2">
                                  <dt className="text-gray-500 py-1">Modelo</dt>
                                  <dd className="font-medium text-gray-800 w-full sm:w-1/2">
                                       {isDetailEditing ? <input className="w-full border rounded px-2 py-1 bg-white" value={detailEditForm.model} onChange={e => setDetailEditForm({...detailEditForm, model: e.target.value})}/> : viewingAsset.model}
                                  </dd>
                              </div>
                          </dl>
                      </div>
                      
                      {/* Linked Parts & Right Column Code Omitted for brevity as they remain largely unchanged except context */}
                      <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings className="w-5 h-5 text-purple-600" /> Repuestos</h3>
                              <button onClick={() => setShowAddPart(!showAddPart)} className="bg-white border border-purple-200 text-purple-600 p-1.5 rounded-lg hover:bg-purple-50 text-xs flex items-center gap-1 font-medium">
                                  <Plus className="w-3 h-3" /> Agregar
                              </button>
                          </div>
                          
                          {showAddPart && (
                              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2">
                                  <div className="flex flex-col gap-2">
                                      <select 
                                          className="w-full text-sm border rounded p-2 bg-white"
                                          value={quickPartId}
                                          onChange={e => setQuickPartId(e.target.value)}
                                      >
                                          <option value="">Seleccionar Repuesto...</option>
                                          {availableParts.map(p => (
                                              <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>
                                          ))}
                                      </select>
                                      <div className="flex gap-2">
                                          <input 
                                              type="number" 
                                              min="1" 
                                              className="w-20 text-sm border rounded p-2"
                                              placeholder="Cant."
                                              value={quickPartQty}
                                              onChange={e => setQuickPartQty(Number(e.target.value))}
                                          />
                                          <button 
                                              onClick={handleQuickAddPart}
                                              disabled={!quickPartId}
                                              className="flex-1 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 disabled:opacity-50"
                                          >
                                              Vincular
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          )}

                          {/* ... Parts List Logic ... */}
                          {viewingAsset.linkedParts && viewingAsset.linkedParts.length > 0 ? (
                              <ul className="space-y-2 max-h-40 overflow-y-auto">
                                  {viewingAsset.linkedParts.map(link => {
                                      const part = availableParts.find(p => p.id === link.partId);
                                      return (
                                          <li key={link.partId} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 group">
                                              <div>
                                                  <div className="font-semibold text-gray-700">{part?.name || 'Desconocido'}</div>
                                                  <div className="text-xs text-gray-400">ID: {link.partId}</div>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                  <span className="text-xs px-2 py-1 rounded font-bold bg-green-100 text-green-600">x{link.quantity}</span>
                                                  <button 
                                                      onClick={() => handleQuickRemovePart(link.partId)}
                                                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      title="Desvincular"
                                                  >
                                                      <X className="w-4 h-4" />
                                                  </button>
                                              </div>
                                          </li>
                                      )
                                  })}
                              </ul>
                          ) : <p className="text-sm text-gray-400 italic">No hay repuestos vinculados.</p>}
                      </div>
                  </div>

                  <div className="space-y-6 lg:col-span-2">
                      {/* Maintenance & History - Simplified display */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> Planes</h3>
                              <button onClick={() => { setShowAddPlan(!showAddPlan); }} className="bg-white border border-blue-200 text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 text-xs flex items-center gap-1 font-medium"><Plus className="w-3 h-3" /> Agregar</button>
                          </div>
                          {showAddPlan && (
                              <div className="p-4 bg-blue-50 border-b border-blue-100">
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                      <input type="text" placeholder="Tarea" className="col-span-2 text-sm p-2 border rounded" value={newPlan.task} onChange={e => setNewPlan({...newPlan, task: e.target.value})}/>
                                      <select className="text-sm p-2 border rounded" value={newPlan.frequency} onChange={e => setNewPlan({...newPlan, frequency: e.target.value})}><option value="Mensual">Mensual</option><option value="Anual">Anual</option></select>
                                      <input type="date" className="text-sm p-2 border rounded" value={newPlan.nextDueDate} onChange={e => setNewPlan({...newPlan, nextDueDate: e.target.value})}/>
                                  </div>
                                  <div className="flex justify-end gap-2 mt-2">
                                      <button onClick={handlePlanSubmit} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Guardar</button>
                                  </div>
                              </div>
                          )}
                          <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                              {assetPlans.map(plan => (
                                  <div key={plan.id} className="p-4 hover:bg-gray-50"><p className="font-medium">{plan.task}</p></div>
                              ))}
                          </div>
                      </div>

                       {/* Activity History */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                  <ClipboardList className="w-5 h-5 text-orange-600" /> Órdenes y Historial
                              </h3>
                              <div className="flex items-center gap-2">
                                {pendingOrders > 0 && (
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3"/> {pendingOrders} Pendientes
                                    </span>
                                )}
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                    {assetOrders.length} Total
                                </span>
                                <button onClick={() => { setShowAddActivity(!showAddActivity); setEditingWorkOrderId(null); setNewActivity({ title: '', type: 'Correctivo', technician: '', date: new Date().toISOString().split('T')[0], details: '', status: 'Terminado' }); }} className="bg-white border border-orange-200 text-orange-600 p-1.5 rounded-lg hover:bg-orange-50 text-xs flex items-center gap-1 font-medium">
                                    <Plus className="w-3 h-3" /> Agregar OT
                                </button>
                              </div>
                          </div>

                           {/* Inline Add/Edit Activity Form */}
                           {showAddActivity && (
                              <div className="p-4 bg-orange-50 border-b border-orange-100 animate-fade-in">
                                  <h4 className="text-xs font-bold text-orange-800 mb-2 uppercase">
                                      {editingWorkOrderId ? 'Editar Orden' : 'Registrar Orden de Trabajo'}
                                  </h4>
                                  {!editingWorkOrderId && <p className="text-[10px] text-orange-600 mb-2">Esto creará una orden en la base de datos principal.</p>}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                      <select 
                                        className="text-sm p-2 border rounded"
                                        value={newActivity.type}
                                        onChange={e => setNewActivity({...newActivity, type: e.target.value as any})}
                                      >
                                          <option value="Preventivo">Preventivo</option>
                                          <option value="Correctivo">Correctivo</option>
                                          <option value="Inspección">Inspección</option>
                                          <option value="Predictivo">Predictivo</option>
                                      </select>
                                      <select 
                                        className="text-sm p-2 border rounded font-medium"
                                        value={newActivity.status}
                                        onChange={e => setNewActivity({...newActivity, status: e.target.value as WorkOrderStatus})}
                                      >
                                          <option value="Pendiente">Pendiente (Agendar)</option>
                                          <option value="En Proceso">En Proceso</option>
                                          <option value="Terminado">Terminado (Historial)</option>
                                      </select>
                                      <input 
                                        type="text" 
                                        placeholder="Técnico" 
                                        className="text-sm p-2 border rounded"
                                        value={newActivity.technician}
                                        onChange={e => setNewActivity({...newActivity, technician: e.target.value})}
                                      />
                                  </div>
                                  <input 
                                    type="text" 
                                    placeholder="Título de la tarea (Resumen)" 
                                    className="w-full text-sm p-2 border rounded mb-2 font-medium"
                                    value={newActivity.title}
                                    onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                                  />
                                  <textarea 
                                    placeholder="Detalles del trabajo..." 
                                    className="w-full text-sm p-2 border rounded mb-2 h-16"
                                    value={newActivity.details}
                                    onChange={e => setNewActivity({...newActivity, details: e.target.value})}
                                  />
                                  <div className="flex justify-end gap-2">
                                      <button onClick={() => { setShowAddActivity(false); setEditingWorkOrderId(null); }} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                                      <button onClick={handleActivitySubmit} className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700 flex items-center gap-1">
                                          <Save className="w-3 h-3" /> {editingWorkOrderId ? 'Actualizar' : 'Guardar'}
                                      </button>
                                  </div>
                              </div>
                          )}

                          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                              {assetOrders.length > 0 ? (
                                  assetOrders.map(wo => (
                                      <div key={wo.id} className="p-4 hover:bg-gray-50 group">
                                          <div className="flex justify-between mb-1">
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs font-mono text-gray-400">#{wo.id}</span>
                                                  <span className={`text-xs px-2 py-0.5 rounded border ${wo.type === 'Correctivo' ? 'bg-red-50 border-red-100 text-red-600' : wo.type === 'Predictivo' ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                      {wo.type}
                                                  </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-500">{wo.date}</span>
                                                  <button 
                                                    onClick={() => handleEditActivityClick(wo)}
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Editar Orden"
                                                  >
                                                      <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                              </div>
                                          </div>
                                          {wo.title && <p className="text-sm font-bold text-gray-800 mb-0.5">{wo.title}</p>}
                                          <p className="text-sm text-gray-700 mb-1">{wo.details}</p>
                                          <div className="flex justify-between items-center text-xs text-gray-500">
                                              <span>Técnico: {wo.technician}</span>
                                              <span className={`font-medium px-2 py-0.5 rounded ${
                                                  wo.status === 'Terminado' ? 'text-green-700 bg-green-50' : 
                                                  wo.status === 'Pendiente' ? 'text-yellow-700 bg-yellow-50' : 'text-blue-700 bg-blue-50'
                                              }`}>
                                                  {wo.status}
                                              </span>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="p-8 text-center text-gray-400 text-sm">No hay historial de actividades registrado.</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* MAIN CREATE/EDIT MODAL */}
      {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">{isEditing ? 'Editar Activo' : 'Nuevo Activo'}</h2>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                  </div>
                  
                  <form onSubmit={handleSave} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-4">
                              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input required type="text" className="w-full border rounded-lg p-2" value={currentAsset.name} onChange={e => setCurrentAsset({...currentAsset, name: e.target.value})} /></div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Marca</label><input type="text" className="w-full border rounded-lg p-2" value={currentAsset.brand} onChange={e => setCurrentAsset({...currentAsset, brand: e.target.value})} /></div>
                                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label><input type="text" className="w-full border rounded-lg p-2" value={currentAsset.model} onChange={e => setCurrentAsset({...currentAsset, model: e.target.value})} /></div>
                              </div>
                              <div><label className="block text-sm font-medium text-gray-700 mb-1">SAP</label><input type="text" className="w-full border rounded-lg p-2" value={currentAsset.sapCode} onChange={e => setCurrentAsset({...currentAsset, sapCode: e.target.value})} /></div>
                          </div>

                          <div className="space-y-4">
                              {/* LOCATION DROPDOWN */}
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación Técnica</label>
                                  <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <select 
                                        required 
                                        className="w-full border rounded-lg pl-10 pr-2 py-2 appearance-none bg-white" 
                                        value={currentAsset.location} 
                                        onChange={e => setCurrentAsset({...currentAsset, location: e.target.value})}
                                    >
                                        <option value="">Seleccionar Ubicación...</option>
                                        {locations.map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Capacidad</label><input type="text" className="w-full border rounded-lg p-2" value={currentAsset.capacity} onChange={e => setCurrentAsset({...currentAsset, capacity: e.target.value})} /></div>
                                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Criticidad</label><select className="w-full border rounded-lg p-2" value={currentAsset.criticality} onChange={e => setCurrentAsset({...currentAsset, criticality: e.target.value as Criticality})}><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></div>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagen URL</label>
                                  <input type="text" className="w-full border rounded-lg p-2" placeholder="http://..." value={currentAsset.photoUrl} onChange={e => setCurrentAsset({...currentAsset, photoUrl: e.target.value})} />
                              </div>
                          </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Guardar Activo</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Assets;