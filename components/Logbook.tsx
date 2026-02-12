import React, { useState } from 'react';
import { LogNote, LogStatus, LogPriority } from '../types';
import { Calendar, AlertCircle, CheckCircle2, Plus, Edit2, Trash2, X, Save, CheckSquare, Clock, ArrowRight, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface LogbookProps {
  logs: LogNote[];
  onAddLog: (log: LogNote) => void;
  onUpdateLog: (log: LogNote) => void;
  onDeleteLog: (id: string) => void;
}

const Logbook: React.FC<LogbookProps> = ({ logs, onAddLog, onUpdateLog, onDeleteLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<LogPriority>('Normal');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<LogStatus>('Pendiente');
  const [createdAt, setCreatedAt] = useState('');

  const handleOpenCreate = () => {
      setEditingId(null);
      setDescription('');
      setPriority('Normal');
      // Set default deadline to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeadline(tomorrow.toISOString().split('T')[0]);
      setStatus('Pendiente');
      // Set creation date to today automatically
      setCreatedAt(new Date().toISOString().split('T')[0]);
      setIsModalOpen(true);
  };

  const handleOpenEdit = (log: LogNote) => {
      setEditingId(log.id);
      setDescription(log.description);
      setPriority(log.priority);
      setDeadline(log.deadline);
      setStatus(log.status);
      setCreatedAt(log.createdAt);
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const logData: LogNote = {
          id: editingId || `L-${Date.now()}`,
          description,
          priority,
          deadline,
          status,
          createdAt: createdAt // Preserves original creation date on edit, or sets today on create
      };

      if (editingId) {
          onUpdateLog(logData);
      } else {
          onAddLog(logData);
      }
      setIsModalOpen(false);
  };

  const toggleStatus = (log: LogNote) => {
      const newStatus = log.status === 'Pendiente' ? 'Realizado' : 'Pendiente';
      onUpdateLog({ ...log, status: newStatus });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("Bitácora del Supervisor", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 26);
    doc.text(`Total Notas: ${logs.length}`, 160, 26);

    // Prepare data
    // Sort by Creation Date descending
    const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const tableData = sortedLogs.map(l => [
        l.createdAt,
        l.priority,
        l.status,
        l.deadline,
        l.description
    ]);

    autoTable(doc, {
        startY: 35,
        head: [['Creado', 'Prioridad', 'Estado', 'Límite', 'Tarea / Nota']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] }, // Orange header (matches UI theme)
        styles: { fontSize: 8 },
        columnStyles: { 
            4: { cellWidth: 80 } // Wider column for description
        },
        didParseCell: function(data) {
             // Highlight Priority
             if (data.section === 'body' && data.column.index === 1) {
                if (data.cell.raw === 'Alta') {
                    data.cell.styles.textColor = [220, 53, 69]; // Red
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    doc.save("Bitacora_Supervisor.pdf");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Bitácora del Supervisor</h1>
           <p className="text-gray-500 text-sm mt-1">Gestión rápida de tareas y pendientes</p>
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
                <Plus className="w-5 h-5" /> Nueva Nota
            </button>
        </div>
      </div>

      <div className="space-y-6">
         {/* Pending Section */}
         <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2">
                <Clock className="w-6 h-6 text-orange-500" /> Pendientes
                <span className="text-sm bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    {logs.filter(l => l.status === 'Pendiente').length}
                </span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {logs.filter(l => l.status === 'Pendiente').length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                        <p>No hay tareas pendientes.</p>
                    </div>
                )}
                {logs.filter(l => l.status === 'Pendiente').map(log => (
                    <div key={log.id} className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-all relative flex flex-col justify-between h-full overflow-hidden`}>
                         {/* Visual indicator on left */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${log.priority === 'Alta' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                        
                        <div className="pl-2">
                            <div className="flex justify-between mb-3">
                                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${log.priority === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {log.priority}
                                </span>
                                <span className="text-xs text-gray-400">{log.createdAt}</span>
                            </div>
                            <p className="text-gray-800 font-medium mb-4 text-sm whitespace-pre-line">{log.description}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto pl-2">
                            <div className="flex items-center gap-1 text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                                <Calendar className="w-3 h-3" />
                                {log.deadline}
                            </div>
                            
                            <div className="flex gap-1">
                                <button onClick={() => toggleStatus(log)} className="p-1.5 text-green-600 hover:bg-green-50 rounded border border-transparent hover:border-green-200 transition-colors" title="Marcar Realizado">
                                    <CheckCircle2 className="w-4 h-4"/>
                                </button>
                                <button onClick={() => handleOpenEdit(log)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors" title="Editar">
                                    <Edit2 className="w-4 h-4"/>
                                </button>
                                <button onClick={() => onDeleteLog(log.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors" title="Eliminar">
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
         </div>

         {/* Done Section */}
         <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
             <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2 border-b border-gray-200 pb-2 pt-6">
                <CheckCircle2 className="w-6 h-6 text-green-600" /> Realizados
                <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {logs.filter(l => l.status === 'Realizado').length}
                </span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {logs.filter(l => l.status === 'Realizado').length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                        <p>No hay tareas completadas.</p>
                    </div>
                )}
                {logs.filter(l => l.status === 'Realizado').map(log => (
                    <div key={log.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-all flex flex-col justify-between h-full relative overflow-hidden">
                         <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                         <div className="pl-2">
                             <p className="text-gray-800 font-medium line-through decoration-gray-400 text-sm mb-4">{log.description}</p>
                         </div>
                         <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-auto pl-2">
                             <div className="flex flex-col">
                                <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Completado</span>
                                <span className="text-[10px] text-gray-400">Creado: {log.createdAt}</span>
                             </div>

                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => toggleStatus(log)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded border border-transparent hover:border-orange-200" title="Volver a Pendiente">
                                    <ArrowRight className="w-4 h-4 transform rotate-180"/>
                                </button>
                                <button onClick={() => onDeleteLog(log.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200" title="Eliminar">
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
         </div>
      </div>

      {/* MODAL EDIT/CREATE */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          {editingId ? <Edit2 className="w-5 h-5 text-blue-600"/> : <Plus className="w-5 h-5 text-blue-600"/>}
                          {editingId ? 'Editar Nota' : 'Nueva Nota'}
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la Tarea</label>
                          <textarea 
                            required 
                            className="w-full border rounded-lg p-3 h-28 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" 
                            placeholder="Ej. Revisar niveles de aceite en sector B..."
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Importancia</label>
                              <select 
                                className="w-full border rounded-lg p-2 bg-white" 
                                value={priority} 
                                onChange={e => setPriority(e.target.value as LogPriority)}
                              >
                                  <option value="Normal">Normal</option>
                                  <option value="Alta">Alta</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Límite</label>
                              <input 
                                required 
                                type="date" 
                                className="w-full border rounded-lg p-2" 
                                value={deadline} 
                                onChange={e => setDeadline(e.target.value)} 
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                              <select 
                                className={`w-full border rounded-lg p-2 font-medium ${status === 'Pendiente' ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-green-600 bg-green-50 border-green-200'}`}
                                value={status}
                                onChange={e => setStatus(e.target.value as LogStatus)}
                              >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="Realizado">Realizado</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Creación</label>
                              <input 
                                type="date" 
                                disabled
                                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 cursor-not-allowed" 
                                value={createdAt} 
                              />
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
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

export default Logbook;