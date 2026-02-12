import React, { useState } from 'react';
import { WorkOrder, Asset, Part, WorkOrderStatus } from '../types';
import { Plus, Wrench, CheckCircle, Clock, Trash2, Edit2, X, AlertCircle, History, FileText, Upload, Image as ImageIcon, MapPin, Save } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface WorkOrdersProps {
  workOrders: WorkOrder[];
  assets: Asset[];
  parts: Part[];
  locations: string[]; // Receives configurable locations
  onCreateOrder: (order: WorkOrder) => void;
  onUpdateOrder: (order: WorkOrder) => void;
  onDeleteOrder: (id: string) => void;
}

const WorkOrders: React.FC<WorkOrdersProps> = ({ workOrders, assets, parts, locations, onCreateOrder, onUpdateOrder, onDeleteOrder }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [title, setTitle] = useState(''); // New title state
  const [type, setType] = useState('Preventivo');
  const [details, setDetails] = useState('');
  const [technician, setTechnician] = useState('');
  const [status, setStatus] = useState<WorkOrderStatus>('Pendiente');
  
  // Dates
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Scheduled
  const [endDate, setEndDate] = useState('');

  // Location & Image
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Parts in Form
  const [selectedPart, setSelectedPart] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedParts, setAddedParts] = useState<{partId: string, quantity: number}[]>([]);

  // Split Active vs History
  const activeOrders = workOrders.filter(wo => wo.status !== 'Terminado').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const completedOrders = workOrders.filter(wo => wo.status === 'Terminado').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const assetId = e.target.value;
      setSelectedAsset(assetId);
      // Auto-fill location based on asset if available
      const asset = assets.find(a => a.id === assetId);
      if (asset && asset.location) {
          setLocation(asset.location);
      }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setSelectedAsset('');
    setTitle('');
    setType('Preventivo');
    setDetails('');
    setTechnician('');
    setStatus('Pendiente');
    setRequestDate(new Date().toISOString().split('T')[0]);
    setDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setLocation('');
    setImageUrl('');
    setAddedParts([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wo: WorkOrder) => {
    setEditingId(wo.id);
    setSelectedAsset(wo.assetId);
    setTitle(wo.title || '');
    setType(wo.type);
    setDetails(wo.details);
    setTechnician(wo.technician);
    setStatus(wo.status);
    setRequestDate(wo.requestDate || wo.date);
    setDate(wo.date);
    setEndDate(wo.endDate || '');
    setLocation(wo.location || '');
    setImageUrl(wo.imageUrl || '');
    setAddedParts(wo.partsUsed || []);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPart = () => {
    if (!selectedPart) return;
    const part = parts.find(p => p.id === selectedPart);
    if (part) {
        const exists = addedParts.find(p => p.partId === selectedPart);
        if (exists) {
            setAddedParts(addedParts.map(p => p.partId === selectedPart ? { ...p, quantity: p.quantity + Number(quantity) } : p));
        } else {
            setAddedParts([...addedParts, { partId: selectedPart, quantity: Number(quantity) }]);
        }
        setSelectedPart('');
        setQuantity(1);
    }
  };

  const handleRemovePart = (partId: string) => {
      setAddedParts(addedParts.filter(p => p.partId !== partId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const commonData = {
        assetId: selectedAsset,
        title,
        type: type as any,
        requestDate,
        date,
        endDate,
        location,
        imageUrl,
        technician,
        details,
        status,
        partsUsed: addedParts
    };

    if (editingId) {
        onUpdateOrder({ id: editingId, ...commonData });
    } else {
        onCreateOrder({ id: `WO-${Math.floor(Math.random() * 10000)}`, ...commonData });
    }
    
    setIsModalOpen(false);
  };

  const toggleStatus = (wo: WorkOrder) => {
      const newStatus = wo.status === 'Terminado' ? 'Pendiente' : 'Terminado';
      // Auto-set end date if finishing
      const newEndDate = newStatus === 'Terminado' ? new Date().toISOString().split('T')[0] : '';
      onUpdateOrder({ ...wo, status: newStatus, endDate: newEndDate });
  };

  const handleDownloadPDF = (wo: WorkOrder) => {
    const doc = new jsPDF();
    const asset = assets.find(a => a.id === wo.assetId);
    
    doc.setFontSize(20);
    doc.setTextColor(33, 33, 33);
    doc.text(`Orden de Trabajo`, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`#${wo.id}`, 14, 28);
    doc.setTextColor(0);
    doc.text(`Estado: ${wo.status}`, 160, 22);

    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35);

    // Info Grid
    doc.setFontSize(10);
    doc.text(`F. Solicitud: ${wo.requestDate || '-'}`, 14, 45);
    doc.text(`F. Programada: ${wo.date}`, 14, 52);
    doc.text(`F. Término: ${wo.endDate || '-'}`, 14, 59);
    
    doc.text(`Tipo: ${wo.type}`, 70, 45);
    doc.text(`Técnico: ${wo.technician}`, 70, 52);
    doc.text(`Ubicación: ${wo.location || asset?.location || 'N/A'}`, 70, 59);

    doc.setFont("helvetica", "bold");
    doc.text("Información del Activo:", 130, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${asset?.name || 'N/A'}`, 130, 52);
    doc.text(`Marca/Modelo: ${asset?.brand || ''} ${asset?.model || ''}`, 130, 59);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Descripción del Trabajo", 14, 75);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Add title if exists
    let contentY = 82;
    if (wo.title) {
        doc.setFont("helvetica", "bold");
        doc.text(wo.title, 14, contentY);
        doc.setFont("helvetica", "normal");
        contentY += 6;
    }

    const splitDetails = doc.splitTextToSize(wo.details, 180);
    doc.text(splitDetails, 14, contentY);

    let finalY = contentY + (splitDetails.length * 5);

    if (wo.partsUsed && wo.partsUsed.length > 0) {
        finalY += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Repuestos y Materiales", 14, finalY);
        
        const partsData = wo.partsUsed.map(pu => {
            const part = parts.find(p => p.id === pu.partId);
            return [pu.partId, part?.name || 'Desconocido', pu.quantity.toString()];
        });

        autoTable(doc, {
            startY: finalY + 5,
            head: [['ID', 'Repuesto', 'Cantidad']],
            body: partsData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
    } else {
        finalY += 15;
    }

    if (finalY > doc.internal.pageSize.height - 50) {
        doc.addPage();
        finalY = 20;
    } else {
        finalY = Math.max(finalY, doc.internal.pageSize.height - 60);
    }

    doc.setDrawColor(150);
    doc.line(14, finalY + 30, 80, finalY + 30);
    doc.setFontSize(8);
    doc.text("Firma Técnico", 14, finalY + 35);

    doc.line(110, finalY + 30, 176, finalY + 30);
    doc.text("Firma Supervisor / Jefe Área", 110, finalY + 35);

    doc.save(`OT_${wo.id}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'Terminado': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1 w-fit border border-green-200"><CheckCircle className="w-3 h-3"/> Terminado</span>;
        case 'En Proceso': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1 w-fit border border-blue-200"><Wrench className="w-3 h-3"/> En Proceso</span>;
        default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-1 w-fit border border-yellow-200"><Clock className="w-3 h-3"/> Pendiente</span>;
    }
  };

  const renderOrderCard = (wo: WorkOrder) => {
    const asset = assets.find(a => a.id === wo.assetId);
    return (
        <div key={wo.id} className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group ${wo.status === 'Terminado' ? 'opacity-90 bg-gray-50' : ''}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
                <div className="w-full">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">#{wo.id}</span>
                            {getStatusBadge(wo.status)}
                        </div>
                        {wo.imageUrl && <span title="Imagen adjunta"><ImageIcon className="w-4 h-4 text-blue-500" /></span>}
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg">{asset?.name || 'Activo Desconocido'}</h3>
                    {wo.location && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {wo.location}</p>}
                </div>
                
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDownloadPDF(wo)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full border border-gray-200 hover:border-gray-300 transition-all"><FileText className="w-4 h-4" /></button>
                    <button onClick={() => toggleStatus(wo)} className="p-2 text-green-600 hover:bg-green-50 rounded-full border border-gray-200 hover:border-green-200 transition-all"><CheckCircle className="w-5 h-5" /></button>
                    <button onClick={() => handleOpenEdit(wo)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full border border-gray-200 hover:border-blue-200 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteOrder(wo.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full border border-gray-200 hover:border-red-200 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3 border-b border-gray-50 pb-3">
                <span className="flex items-center gap-1"><Wrench className="w-3 h-3"/> {wo.type}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {wo.date}</span>
                <span>Técnico: <strong className="text-gray-800">{wo.technician}</strong></span>
            </div>
            
            {wo.title && <p className="text-sm font-bold text-gray-800 mb-1">{wo.title}</p>}
            <p className="text-gray-700 text-sm mb-2 line-clamp-3">{wo.details}</p>
            
            {wo.partsUsed && wo.partsUsed.length > 0 && (
                <div className="mt-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Repuestos</p>
                    <div className="flex flex-wrap gap-2">
                        {wo.partsUsed.map((pu, idx) => (
                            <span key={idx} className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
                                <span className="font-bold text-blue-600">{pu.quantity}x</span> {parts.find(p => p.id === pu.partId)?.name || pu.partId}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Órdenes de Trabajo</h1>
           <p className="text-gray-500 text-sm mt-1">Gestión y control de mantenimiento</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> Nueva OT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         <div className="col-span-1 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                <AlertCircle className="w-5 h-5 text-blue-600"/> En Curso / Pendientes
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeOrders.length > 0 ? activeOrders.map(renderOrderCard) : (
                    <p className="text-gray-400 italic p-4">No hay órdenes activas.</p>
                )}
            </div>
         </div>
         <div className="col-span-1 lg:col-span-2 opacity-80 mt-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                <History className="w-5 h-5 text-green-600"/> Historial
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {completedOrders.length > 0 ? completedOrders.map(renderOrderCard) : (
                    <p className="text-gray-400 italic p-4">No hay historial.</p>
                )}
            </div>
         </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{editingId ? 'Editar Orden' : 'Crear Orden'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Asset and Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Activo *</label>
                        <select required className="w-full border rounded-lg p-2" value={selectedAsset} onChange={handleAssetChange}>
                            <option value="">Seleccionar Activo...</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación Técnica</label>
                        <select className="w-full border rounded-lg p-2" value={location} onChange={e => setLocation(e.target.value)}>
                            <option value="">-- Seleccionar --</option>
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                    </div>
                </div>

                {/* Row 2: Type and Technician */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Mantenimiento</label>
                        <select className="w-full border rounded-lg p-2" value={type} onChange={e => setType(e.target.value)}>
                            <option value="Preventivo">Preventivo</option>
                            <option value="Correctivo">Correctivo</option>
                            <option value="Inspección">Inspección</option>
                            <option value="Predictivo">Predictivo</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Responsable</label>
                        <input required type="text" className="w-full border rounded-lg p-2" value={technician} onChange={e => setTechnician(e.target.value)} />
                    </div>
                </div>

                {/* Row 3: Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-3 rounded-lg">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Solicitud</label>
                        <input type="date" className="w-full border rounded-lg p-2 text-sm" value={requestDate} onChange={e => setRequestDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Programada</label>
                        <input required type="date" className="w-full border rounded-lg p-2 text-sm" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Término</label>
                        <input type="date" className="w-full border rounded-lg p-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <div className="flex gap-2">
                        {(['Pendiente', 'En Proceso', 'Terminado'] as WorkOrderStatus[]).map(s => (
                            <button 
                                key={s} type="button" onClick={() => setStatus(s)}
                                className={`px-3 py-1.5 text-sm rounded-lg border ${status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título / Resumen</label>
                        <input type="text" className="w-full border rounded-lg p-2" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Cambio de Rodamientos Motor A"/>

                        <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Detalle del Trabajo</label>
                        <textarea required className="w-full border rounded-lg p-2 h-24" value={details} onChange={e => setDetails(e.target.value)}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (Opcional)</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 relative h-full max-h-48">
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                            {imageUrl ? (
                                <img src={imageUrl} alt="Preview" className="h-full object-contain rounded" />
                            ) : (
                                <>
                                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                    <span className="text-xs text-gray-500">Subir imagen</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Consumo de Repuestos</h4>
                    <div className="flex gap-2 mb-2">
                        <select className="flex-1 border rounded-lg p-1.5 text-sm" value={selectedPart} onChange={e => setSelectedPart(e.target.value)}>
                            <option value="">Seleccionar repuesto...</option>
                            {parts.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>)}
                        </select>
                        <input type="number" min="1" className="w-20 border rounded-lg p-1.5 text-sm" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} />
                        <button type="button" onClick={handleAddPart} className="bg-white border border-gray-300 text-gray-700 px-3 rounded-lg text-sm hover:bg-gray-50">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <ul className="space-y-1">
                        {addedParts.map((item, idx) => (
                            <li key={idx} className="text-xs text-gray-600 flex justify-between items-center bg-white p-1.5 px-3 rounded border">
                                <span>{parts.find(p => p.id === item.partId)?.name}</span> 
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">x{item.quantity}</span>
                                    <button type="button" onClick={() => handleRemovePart(item.partId)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2">
                        <Save className="w-4 h-4"/> {editingId ? 'Actualizar Orden' : 'Guardar Orden'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;