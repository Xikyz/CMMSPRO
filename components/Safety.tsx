import React, { useState } from 'react';
import { SafetyRecord, SafetyPriority } from '../types';
import { ShieldCheck, CalendarCheck, FileText, Plus, Edit2, Trash2, X, Save, AlertTriangle, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface SafetyProps {
  records: SafetyRecord[];
  onAddRecord: (record: SafetyRecord) => void;
  onUpdateRecord: (record: SafetyRecord) => void;
  onDeleteRecord: (id: string) => void;
}

const Safety: React.FC<SafetyProps> = ({ records, onAddRecord, onUpdateRecord, onDeleteRecord }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SafetyPriority>('Media');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState<'Pendiente' | 'Realizado'>('Pendiente');

  const pendingRecords = records.filter(r => r.status === 'Pendiente');
  const completedRecords = records.filter(r => r.status === 'Realizado');

  const handleOpenCreate = () => {
      setEditingId(null);
      setTitle('');
      setDescription('');
      setPriority('Media');
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      setStatus('Pendiente');
      setIsModalOpen(true);
  };

  const handleOpenEdit = (record: SafetyRecord) => {
      setEditingId(record.id);
      setTitle(record.type); // Using 'type' field as title
      setDescription(record.description);
      setPriority(record.priority);
      setScheduledDate(record.scheduledDate);
      setStatus(record.status);
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const recordData: SafetyRecord = {
          id: editingId || `S-${Date.now()}`,
          type: title,
          description,
          priority,
          scheduledDate,
          status,
          // If status is Realizado and we don't have a date, set today
          realizedDate: status === 'Realizado' ? new Date().toISOString().split('T')[0] : undefined 
      };

      if (editingId) {
          onUpdateRecord(recordData);
      } else {
          onAddRecord(recordData);
      }
      setIsModalOpen(false);
  };

  const toggleStatus = (record: SafetyRecord) => {
      const newStatus: 'Pendiente' | 'Realizado' = record.status === 'Pendiente' ? 'Realizado' : 'Pendiente';
      const updatedRecord = { 
          ...record, 
          status: newStatus,
          realizedDate: newStatus === 'Realizado' ? new Date().toISOString().split('T')[0] : undefined
      };
      onUpdateRecord(updatedRecord);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 80, 180); // Blue title
    doc.text("Reporte de Gestión HSEQ", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 26);
    doc.text(`Total Registros: ${records.length}`, 160, 26);

    // Prepare data
    // We want to sort by Pending first, then by date
    const sortedRecords = [...records].sort((a, b) => {
        if (a.status === b.status) {
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        }
        return a.status === 'Pendiente' ? -1 : 1;
    });

    const tableData = sortedRecords.map(r => [
        r.type,
        r.priority,
        r.scheduledDate,
        r.status,
        r.description
    ]);

    autoTable(doc, {
        startY: 35,
        head: [['Actividad / Título', 'Prioridad', 'Vencimiento', 'Estado', 'Descripción']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }, // Blue header
        styles: { fontSize: 8 },
        columnStyles: { 
            4: { cellWidth: 70 } // Wider column for description
        },
        didParseCell: function(data) {
            // Colorize Status column cells
            if (data.section === 'body' && data.column.index === 3) {
                if (data.cell.raw === 'Pendiente') {
                    data.cell.styles.textColor = [220, 53, 69]; // Red
                } else {
                    data.cell.styles.textColor = [25, 135, 84]; // Green
                }
            }
        }
    });

    doc.save("Reporte_HSEQ.pdf");
  };

  const getPriorityColor = (p: SafetyPriority) => {
      switch(p) {
          case 'Alta': return 'bg-red-100 text-red-700 border-red-200';
          case 'Media': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'Baja': return 'bg-green-100 text-green-700 border-green-200';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  const renderCard = (record: SafetyRecord) => (
    <div key={record.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all ${record.status === 'Realizado' ? 'opacity-80 bg-gray-50' : ''}`}>
        <div className="p-5">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                     <ShieldCheck className={`w-5 h-5 ${record.priority === 'Alta' ? 'text-red-500' : 'text-blue-500'}`}/>
                     <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getPriorityColor(record.priority)}`}>
                         {record.priority}
                     </span>
                </div>
                <div className="flex gap-1">
                     <button onClick={() => handleOpenEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                         <Edit2 className="w-4 h-4"/>
                     </button>
                     <button onClick={() => onDeleteRecord(record.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar">
                         <Trash2 className="w-4 h-4"/>
                     </button>
                </div>
            </div>
            
            <h3 className="font-bold text-lg text-gray-800 mb-2">{record.type}</h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{record.description}</p>
            
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                     <CalendarCheck className="w-4 h-4 text-orange-500"/>
                     <span>Vencimiento: <strong className="text-gray-700">{record.scheduledDate}</strong></span>
                </div>
                {record.status === 'Realizado' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="w-4 h-4"/>
                        <span>Realizado: {record.realizedDate}</span>
                    </div>
                )}
            </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-between items-center">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${record.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                {record.status === 'Pendiente' ? <AlertCircle className="w-3 h-3"/> : <CheckCircle2 className="w-3 h-3"/>}
                {record.status}
            </span>
            <button 
                onClick={() => toggleStatus(record)}
                className={`text-xs font-medium underline ${record.status === 'Pendiente' ? 'text-green-600 hover:text-green-800' : 'text-orange-500 hover:text-orange-700'}`}
            >
                {record.status === 'Pendiente' ? 'Marcar Realizado' : 'Reabrir'}
            </button>
        </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Gestión HSEQ</h1>
           <p className="text-gray-500 text-sm mt-1">Control de Seguridad, Medio Ambiente y Calidad</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExportPDF}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
            >
                <FileText className="w-5 h-5" /> Exportar PDF
            </button>
            <button 
                onClick={handleOpenCreate}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all"
            >
                <Plus className="w-5 h-5" /> Registrar Evento
            </button>
        </div>
      </div>

      {/* SECCION PENDIENTES */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
           <AlertTriangle className="w-5 h-5 text-orange-500"/> Pendientes
           <span className="text-sm font-normal bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{pendingRecords.length}</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRecords.length > 0 ? (
                pendingRecords.map(renderCard)
            ) : (
                <div className="col-span-full py-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <p>No hay actividades pendientes.</p>
                </div>
            )}
        </div>
      </div>

      {/* SECCION REALIZADOS */}
      <div className="opacity-90">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 mt-8">
           <History className="w-5 h-5 text-green-600"/> Historial / Realizados
           <span className="text-sm font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{completedRecords.length}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedRecords.length > 0 ? (
                completedRecords.map(renderCard)
            ) : (
                <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p>No hay historial de actividades realizadas.</p>
                </div>
            )}
        </div>
      </div>

      {/* FLOATING MODAL FORM */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
              <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <ShieldCheck className="w-6 h-6 text-blue-600"/>
                          {editingId ? 'Editar Registro HSEQ' : 'Nuevo Registro HSEQ'}
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                      
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Título / Tipo de Actividad</label>
                          <input 
                            required 
                            type="text" 
                            className="w-full border rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            placeholder="Ej. Charla de Seguridad, Inspección, EPP..."
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Detallada</label>
                          <textarea 
                            required 
                            className="w-full border rounded-lg p-3 h-28 resize-none bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            placeholder="Describa la actividad, observaciones o requisitos..."
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                              <select 
                                className="w-full border rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                value={priority} 
                                onChange={e => setPriority(e.target.value as SafetyPriority)}
                              >
                                  <option value="Alta" className="text-gray-900 bg-white">Alta</option>
                                  <option value="Media" className="text-gray-900 bg-white">Media</option>
                                  <option value="Baja" className="text-gray-900 bg-white">Baja</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Término</label>
                              <input 
                                required 
                                type="date" 
                                className="w-full border rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                value={scheduledDate} 
                                onChange={e => setScheduledDate(e.target.value)} 
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Estado Actual</label>
                          <div className="flex items-center gap-4 mt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="status" 
                                    value="Pendiente" 
                                    checked={status === 'Pendiente'} 
                                    onChange={() => setStatus('Pendiente')}
                                    className="text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Pendiente</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="status" 
                                    value="Realizado" 
                                    checked={status === 'Realizado'} 
                                    onChange={() => setStatus('Realizado')}
                                    className="text-green-600 focus:ring-green-500"
                                  />
                                  <span className="text-sm text-gray-700">Realizado</span>
                              </label>
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                              <Save className="w-4 h-4" />
                              {editingId ? 'Actualizar' : 'Guardar'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Safety;