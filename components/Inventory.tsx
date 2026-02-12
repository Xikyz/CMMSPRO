import React, { useState, useEffect } from 'react';
import { Part, Asset, PartStatus } from '../types';
import { AlertCircle, Package, Search, Plus, X, Save, Calculator, Edit2, Trash2, Image as ImageIcon, FileText, CirclePlus, ArrowRight } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface InventoryProps {
  parts: Part[];
  assets: Asset[];
  onUpdateAssets: (assets: Asset[]) => void;
  onAddPart: (part: Part) => void;
  onUpdatePart: (part: Part) => void;
  onDeletePart: (id: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ parts, assets, onUpdateAssets, onAddPart, onUpdatePart, onDeletePart }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Main Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Quick Stock Modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedPartForStock, setSelectedPartForStock] = useState<Part | null>(null);
  const [stockToAdd, setStockToAdd] = useState<number | string>('');

  // Form State
  const [newPart, setNewPart] = useState<Partial<Part>>({
      id: '',
      name: '',
      brand: '',
      model: '',
      capacity: '',
      description: '',
      imageUrl: '',
      supplier: '',
      sapCode: '',
      currentStock: 0,
      minStock: 0,
      cost: 0,
      location: '',
      status: 'Nuevo'
  });

  // Calculator State (Asset Linking)
  const [linkedAssets, setLinkedAssets] = useState<{ assetId: string, quantityNeeded: number }[]>([]);

  // Auto-calculate ID based on SAP or generic (ONLY IF NOT EDITING)
  useEffect(() => {
    if (isEditing) return;

    if (newPart.sapCode) {
        setNewPart(prev => ({ ...prev, id: `P-${prev.sapCode}` }));
    } else {
        setNewPart(prev => ({ ...prev, id: `P-${Date.now().toString().slice(-4)}` }));
    }
  }, [newPart.sapCode, isEditing]);

  // Logic: Sum asset requirements to set Min Stock
  useEffect(() => {
    const totalNeeded = linkedAssets.reduce((sum, item) => sum + item.quantityNeeded, 0);
    if (totalNeeded > 0) {
        setNewPart(prev => ({ ...prev, minStock: totalNeeded }));
    }
  }, [linkedAssets]);

  const toggleAssetLink = (assetId: string) => {
      const exists = linkedAssets.find(l => l.assetId === assetId);
      if (exists) {
          setLinkedAssets(linkedAssets.filter(l => l.assetId !== assetId));
      } else {
          setLinkedAssets([...linkedAssets, { assetId, quantityNeeded: 1 }]); // Default 1
      }
  };

  const updateAssetQuantity = (assetId: string, qty: number) => {
      setLinkedAssets(linkedAssets.map(l => l.assetId === assetId ? { ...l, quantityNeeded: Math.max(1, qty) } : l));
  };

  const handleOpenCreate = () => {
    setNewPart({
        id: '', name: '', brand: '', model: '', capacity: '', description: '',
        imageUrl: '', supplier: '', sapCode: '', currentStock: 0, minStock: 0,
        cost: 0, location: '', status: 'Nuevo'
    });
    setLinkedAssets([]);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (part: Part) => {
    setNewPart({ ...part });
    // Identify which assets are currently linked to this part
    const links = assets
        .filter(a => a.linkedParts?.some(lp => lp.partId === part.id))
        .map(a => ({
            assetId: a.id,
            quantityNeeded: a.linkedParts?.find(lp => lp.partId === part.id)?.quantity || 1
        }));
    setLinkedAssets(links);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // --- QUICK STOCK HANDLERS ---
  const handleOpenAddStock = (part: Part) => {
      setSelectedPartForStock(part);
      setStockToAdd('');
      setIsStockModalOpen(true);
  };

  const handleConfirmAddStock = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPartForStock) return;
      
      const qtyToAdd = Number(stockToAdd);
      if (qtyToAdd <= 0) return;

      const updatedPart = {
          ...selectedPartForStock,
          currentStock: selectedPartForStock.currentStock + qtyToAdd
      };

      onUpdatePart(updatedPart);
      setIsStockModalOpen(false);
      setStockToAdd('');
      setSelectedPartForStock(null);
  };
  // -----------------------------

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      const partToSave: Part = {
          id: newPart.id || `P-${Date.now()}`,
          name: newPart.name || 'Sin Nombre',
          description: newPart.description || '',
          currentStock: Number(newPart.currentStock),
          minStock: Number(newPart.minStock),
          location: newPart.location || '',
          cost: Number(newPart.cost),
          brand: newPart.brand,
          model: newPart.model,
          capacity: newPart.capacity,
          imageUrl: newPart.imageUrl || 'https://via.placeholder.com/150',
          supplier: newPart.supplier,
          sapCode: newPart.sapCode,
          status: newPart.status as PartStatus
      };

      // 1. Save or Update Part
      if (isEditing) {
          onUpdatePart(partToSave);
      } else {
          onAddPart(partToSave);
      }

      // 2. Sync Assets (Add or Remove Links)
      // Iterate all assets to check if they should be linked or unlinked
      const updatedAssets = assets.map(asset => {
          const linkedInForm = linkedAssets.find(l => l.assetId === asset.id);
          const currentLinks = asset.linkedParts || [];
          
          if (linkedInForm) {
              // Should be linked: Update quantity or Add link
              const existingLinkIndex = currentLinks.findIndex(l => l.partId === partToSave.id);
              let newLinks = [...currentLinks];
              
              if (existingLinkIndex >= 0) {
                  // Update existing
                  newLinks[existingLinkIndex] = { partId: partToSave.id, quantity: linkedInForm.quantityNeeded };
              } else {
                  // Add new
                  newLinks.push({ partId: partToSave.id, quantity: linkedInForm.quantityNeeded });
              }
              return { ...asset, linkedParts: newLinks };
          } else {
              // Should NOT be linked: Remove if exists
              if (currentLinks.some(l => l.partId === partToSave.id)) {
                   return { ...asset, linkedParts: currentLinks.filter(l => l.partId !== partToSave.id) };
              }
              return asset;
          }
      });
      
      onUpdateAssets(updatedAssets);

      setIsModalOpen(false);
  };

  const filteredParts = parts.filter(part => 
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Reporte de Inventario de Bodega", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 26);
    doc.text(`Total Ítems: ${filteredParts.length}`, 160, 26);

    const tableData = filteredParts.map(p => [
        p.id,
        p.name,
        p.location,
        p.currentStock.toString(),
        p.minStock.toString(),
        `$${p.cost.toFixed(2)}`,
        p.currentStock <= p.minStock ? 'BAJO' : 'OK'
    ]);

    autoTable(doc, {
        startY: 30,
        head: [['Código', 'Nombre', 'Ubicación', 'Stock', 'Mín', 'Costo', 'Estado']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] } // Green
    });

    // Summary calculation
    const totalValue = filteredParts.reduce((acc, p) => acc + (p.cost * p.currentStock), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Valor Total del Inventario: $${totalValue.toLocaleString()}`, 14, finalY);

    doc.save("Reporte_Bodega.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Bodega de Repuestos</h1>
           <p className="text-gray-500 text-sm mt-1">Control de inventario y costos</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Buscar repuesto..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleExportPDF}
                    className="flex-1 sm:flex-none bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                >
                    <FileText className="w-5 h-5" /> Exportar PDF
                </button>
                <button 
                    onClick={handleOpenCreate}
                    className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Nuevo Repuesto
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Código / SAP</th>
                <th className="p-4 font-semibold">Repuesto</th>
                <th className="p-4 font-semibold">Detalle</th>
                <th className="p-4 font-semibold text-center">Stock</th>
                <th className="p-4 font-semibold text-center">Mínimo</th>
                <th className="p-4 font-semibold text-right">Costo Unit.</th>
                <th className="p-4 font-semibold text-center">Estado</th>
                <th className="p-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredParts.map(part => {
                const isLow = part.currentStock <= part.minStock;
                return (
                  <tr key={part.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900">
                        {part.id}
                        {part.sapCode && <div className="text-xs text-gray-400">SAP: {part.sapCode}</div>}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">{part.name}</div>
                      <div className="text-xs text-gray-500">{part.description}</div>
                    </td>
                    <td className="p-4 text-xs text-gray-600">
                        <div>Marca: {part.brand || '-'}</div>
                        <div>Ubic: {part.location}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${isLow ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {part.currentStock}
                      </span>
                    </td>
                    <td className="p-4 text-center text-sm text-gray-600">{part.minStock}</td>
                    <td className="p-4 text-right text-sm text-gray-600">${part.cost.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      {isLow ? (
                        <span className="flex items-center justify-center gap-1 text-xs font-bold text-red-600">
                          <AlertCircle className="w-3 h-3" /> Pedir
                        </span>
                      ) : (
                         <span className="flex items-center justify-center gap-1 text-xs font-bold text-green-600">
                          <Package className="w-3 h-3" /> OK
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <button 
                                onClick={() => handleOpenAddStock(part)}
                                className="p-1.5 text-white bg-green-600 hover:bg-green-700 rounded shadow-sm" 
                                title="Agregar Stock"
                            >
                                <CirclePlus className="w-4 h-4"/>
                            </button>
                            <button 
                                onClick={() => handleOpenEdit(part)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                title="Editar"
                            >
                                <Edit2 className="w-4 h-4"/>
                            </button>
                            <button 
                                onClick={() => onDeletePart(part.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK ADD STOCK MODAL */}
      {isStockModalOpen && selectedPartForStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <CirclePlus className="w-5 h-5 text-green-600" /> Ingreso de Stock
                      </h3>
                      <button onClick={() => setIsStockModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Repuesto:</p>
                      <p className="font-medium text-gray-900">{selectedPartForStock.name}</p>
                      <p className="text-xs text-gray-500">Stock Actual: <span className="font-bold text-gray-800">{selectedPartForStock.currentStock}</span></p>
                  </div>

                  <form onSubmit={handleConfirmAddStock}>
                      <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad a Ingresar</label>
                          <div className="flex items-center gap-2">
                              <input 
                                autoFocus
                                type="number" 
                                min="1" 
                                className="w-full border rounded-lg p-2 text-center font-bold text-lg" 
                                value={stockToAdd} 
                                onChange={e => setStockToAdd(e.target.value)} 
                                placeholder="0"
                              />
                          </div>
                          
                          {Number(stockToAdd) > 0 && (
                              <div className="mt-3 p-2 bg-green-50 rounded border border-green-100 flex items-center justify-center gap-2 text-sm text-green-800">
                                  <span>{selectedPartForStock.currentStock}</span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="font-bold">{selectedPartForStock.currentStock + Number(stockToAdd)}</span>
                                  <span className="text-xs text-green-600">(Nuevo Total)</span>
                              </div>
                          )}
                      </div>

                      <div className="flex gap-2">
                           <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
                           <button type="submit" disabled={Number(stockToAdd) <= 0} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                              Confirmar
                           </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL NUEVO/EDITAR REPUESTO */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                          <Package className="w-6 h-6 text-green-600" />
                          {isEditing ? 'Editar Repuesto' : 'Crear Nuevo Repuesto'}
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  <form onSubmit={handleSave} className="space-y-6">
                      
                      {/* Fila 1: Identificación */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Repuesto *</label>
                              <input required type="text" className="w-full border rounded-lg p-2" 
                                value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Número SAP *</label>
                              <input required type="text" className="w-full border rounded-lg p-2" 
                                value={newPart.sapCode} onChange={e => setNewPart({...newPart, sapCode: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                              <select className="w-full border rounded-lg p-2" value={newPart.status} onChange={e => setNewPart({...newPart, status: e.target.value as PartStatus})}>
                                  <option value="Nuevo">Nuevo</option>
                                  <option value="Usado">Usado</option>
                                  <option value="Reparado">Reparado</option>
                              </select>
                          </div>
                      </div>

                      {/* Fila 2: Especificaciones */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                              <input type="text" className="w-full border rounded-lg p-2" 
                                value={newPart.brand} onChange={e => setNewPart({...newPart, brand: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                              <input type="text" className="w-full border rounded-lg p-2" 
                                value={newPart.model} onChange={e => setNewPart({...newPart, model: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad / Medida</label>
                              <input type="text" className="w-full border rounded-lg p-2" 
                                value={newPart.capacity} onChange={e => setNewPart({...newPart, capacity: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                              <input type="text" className="w-full border rounded-lg p-2" 
                                value={newPart.supplier} onChange={e => setNewPart({...newPart, supplier: e.target.value})} />
                          </div>
                      </div>

                      {/* Fila 3: Detalles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Técnica</label>
                              <textarea className="w-full border rounded-lg p-2 h-20" 
                                value={newPart.description} onChange={e => setNewPart({...newPart, description: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">URL Imagen</label>
                              <div className="flex gap-2">
                                <input type="text" className="w-full border rounded-lg p-2" 
                                    value={newPart.imageUrl} onChange={e => setNewPart({...newPart, imageUrl: e.target.value})} placeholder="http://..." />
                                <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center text-gray-400 overflow-hidden">
                                    {newPart.imageUrl ? <img src={newPart.imageUrl} className="w-full h-full object-cover"/> : <ImageIcon size={24}/>}
                                </div>
                              </div>
                          </div>
                      </div>

                      {/* Fila 4: Inventario Base */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                              <input type="number" className="w-full border rounded-lg p-2" 
                                value={newPart.currentStock} onChange={e => setNewPart({...newPart, currentStock: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario ($)</label>
                              <input type="number" className="w-full border rounded-lg p-2" 
                                value={newPart.cost} onChange={e => setNewPart({...newPart, cost: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación en Bodega</label>
                              <input type="text" className="w-full border rounded-lg p-2" 
                                value={newPart.location} onChange={e => setNewPart({...newPart, location: e.target.value})} />
                          </div>
                      </div>

                      <hr />

                      {/* CALCULADORA DE STOCK MINIMO */}
                      <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                          <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                              <Calculator className="w-5 h-5" /> Calculadora de Stock Mínimo
                          </h3>
                          <p className="text-sm text-blue-600 mb-4">
                              Seleccione los activos que utilizan este repuesto para calcular automáticamente el stock mínimo sugerido y vincularlos.
                          </p>
                          
                          <div className="max-h-40 overflow-y-auto bg-white border rounded-lg mb-4">
                              {assets.map(asset => {
                                  const isLinked = linkedAssets.find(l => l.assetId === asset.id);
                                  return (
                                      <div key={asset.id} className={`flex items-center justify-between p-2 border-b last:border-0 ${isLinked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                          <div className="flex items-center gap-3">
                                              <input 
                                                type="checkbox" 
                                                checked={!!isLinked}
                                                onChange={() => toggleAssetLink(asset.id)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                              />
                                              <span className="text-sm text-gray-700">{asset.name}</span>
                                          </div>
                                          {isLinked && (
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-500">Cant. Necesaria:</span>
                                                  <input 
                                                    type="number" 
                                                    min="1" 
                                                    className="w-16 border rounded p-1 text-sm text-center"
                                                    value={isLinked.quantityNeeded}
                                                    onChange={(e) => updateAssetQuantity(asset.id, Number(e.target.value))}
                                                  />
                                              </div>
                                          )}
                                      </div>
                                  )
                              })}
                          </div>

                          <div className="flex justify-between items-center">
                              <div className="text-sm text-blue-800">
                                  Activos Vinculados: <strong>{linkedAssets.length}</strong>
                              </div>
                              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-blue-200 shadow-sm">
                                  <span className="text-sm font-bold text-gray-700">Stock Mínimo Calculado:</span>
                                  <input 
                                    type="number" 
                                    className="w-20 font-bold text-lg text-blue-600 border-b border-blue-300 focus:outline-none text-center"
                                    value={newPart.minStock}
                                    onChange={e => setNewPart({...newPart, minStock: Number(e.target.value)})}
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm">
                              <Save className="w-5 h-5" />
                              {isEditing ? 'Actualizar Repuesto' : 'Guardar Repuesto'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;