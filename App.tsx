import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Assets from './components/Assets';
import Inventory from './components/Inventory';
import WorkOrders from './components/WorkOrders';
import Logbook from './components/Logbook';
import Safety from './components/Safety';
import Costs from './components/Costs';
import Configuration from './components/Configuration';
import { INITIAL_ASSETS, INITIAL_PARTS, INITIAL_PLANS, INITIAL_LOGS, INITIAL_SAFETY, INITIAL_WORK_ORDERS, INITIAL_PURCHASES } from './constants';
import { WorkOrder, MaintenancePlan, Part, LogNote, SafetyRecord, Asset, PurchaseRecord } from './types';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  
  // --- ESTADO CON PERSISTENCIA (LOCALSTORAGE) ---
  
  // Helper para cargar datos o usar los iniciales si está vacío
  const loadState = <T,>(key: string, initialValue: T): T => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error al cargar datos guardados:", e);
        return initialValue;
      }
    }
    return initialValue;
  };

  // Inicialización de estados leyendo la memoria local
  const [assets, setAssets] = useState<Asset[]>(() => loadState('cmms_assets', INITIAL_ASSETS));
  const [parts, setParts] = useState<Part[]>(() => loadState('cmms_parts', INITIAL_PARTS));
  const [plans, setPlans] = useState<MaintenancePlan[]>(() => loadState('cmms_plans', INITIAL_PLANS));
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => loadState('cmms_work_orders', INITIAL_WORK_ORDERS));
  const [logs, setLogs] = useState<LogNote[]>(() => loadState('cmms_logs', INITIAL_LOGS));
  const [safety, setSafety] = useState<SafetyRecord[]>(() => loadState('cmms_safety', INITIAL_SAFETY));
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => loadState('cmms_purchases', INITIAL_PURCHASES));
  
  // NEW: Locations State
  // Extract initial unique locations from assets if local storage is empty, or use a default list
  const [locations, setLocations] = useState<string[]>(() => loadState('cmms_locations', 
    Array.from(new Set(INITIAL_ASSETS.map(a => a.location))).filter(l => l)
  ));

  // --- EFECTOS PARA GUARDAR DATOS AUTOMÁTICAMENTE ---
  
  useEffect(() => { localStorage.setItem('cmms_assets', JSON.stringify(assets)); }, [assets]);
  useEffect(() => { localStorage.setItem('cmms_parts', JSON.stringify(parts)); }, [parts]);
  useEffect(() => { localStorage.setItem('cmms_plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { localStorage.setItem('cmms_work_orders', JSON.stringify(workOrders)); }, [workOrders]);
  useEffect(() => { localStorage.setItem('cmms_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('cmms_safety', JSON.stringify(safety)); }, [safety]);
  useEffect(() => { localStorage.setItem('cmms_purchases', JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem('cmms_locations', JSON.stringify(locations)); }, [locations]);


  // --- LÓGICA DE NEGOCIO ---

  // Logic: Create Work Order & Deduct Inventory
  const handleCreateWorkOrder = (newOrder: WorkOrder) => {
    // 1. Add Order
    setWorkOrders([newOrder, ...workOrders]);

    // 2. Deduct Stock
    if (newOrder.partsUsed && newOrder.partsUsed.length > 0) {
        const updatedParts = parts.map(part => {
            const usage = newOrder.partsUsed?.find(u => u.partId === part.id);
            if (usage) {
                return { ...part, currentStock: Math.max(0, part.currentStock - usage.quantity) };
            }
            return part;
        });
        setParts(updatedParts);
    }
  };

  // Logic: Update Work Order (Edit or Status Change)
  const handleUpdateWorkOrder = (updatedOrder: WorkOrder) => {
      setWorkOrders(prev => prev.map(wo => wo.id === updatedOrder.id ? updatedOrder : wo));
  };

  // Logic: Delete Work Order
  const handleDeleteWorkOrder = (id: string) => {
      if (window.confirm('¿Estás seguro de eliminar esta Orden de Trabajo?')) {
          setWorkOrders(prev => prev.filter(wo => wo.id !== id));
      }
  };

  // Logic: Add Plan & Link to Maintenance (Create Pending WO)
  const handleAddPlan = (newPlan: MaintenancePlan) => {
    // 1. Add to Plans List
    setPlans([...plans, newPlan]);

    // 2. Automatically generate a Work Order for this plan (Linked to Maintenance)
    const isInspection = newPlan.task.toLowerCase().includes('inspección') || newPlan.task.toLowerCase().includes('inspeccion');
    
    const newWorkOrder: WorkOrder = {
        id: `WO-${Date.now()}`,
        assetId: newPlan.assetId,
        type: isInspection ? 'Inspección' : 'Preventivo',
        date: newPlan.nextDueDate,
        technician: 'Por Asignar',
        details: `Mantenimiento Programado: ${newPlan.task} (${newPlan.frequency})`,
        status: 'Pendiente',
        partsUsed: []
    };

    setWorkOrders(prev => [newWorkOrder, ...prev]);
  };

  // Logic: Update Plan
  const handleUpdatePlan = (updatedPlan: MaintenancePlan) => {
      setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
  };

  // Logic: Add new Part
  const handleAddPart = (newPart: Part) => {
    setParts([...parts, newPart]);
  };

  // Logic: Update Part
  const handleUpdatePart = (updatedPart: Part) => {
    setParts(prev => prev.map(p => p.id === updatedPart.id ? updatedPart : p));
  };

  // Logic: Delete Part
  const handleDeletePart = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este repuesto?')) {
        setParts(prev => prev.filter(p => p.id !== id));
    }
  };

  // -- Logbook Handlers --
  const handleAddLog = (newLog: LogNote) => {
      setLogs([newLog, ...logs]);
  };

  const handleUpdateLog = (updatedLog: LogNote) => {
      setLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  };

  const handleDeleteLog = (id: string) => {
      if (window.confirm('¿Estás seguro de eliminar esta nota?')) {
          setLogs(prev => prev.filter(log => log.id !== id));
      }
  };

  // -- Safety Handlers --
  const handleAddSafety = (newRecord: SafetyRecord) => {
      setSafety([newRecord, ...safety]);
  };

  const handleUpdateSafety = (updatedRecord: SafetyRecord) => {
      setSafety(prev => prev.map(s => s.id === updatedRecord.id ? updatedRecord : s));
  };

  const handleDeleteSafety = (id: string) => {
      if (window.confirm('¿Estás seguro de eliminar este registro de seguridad?')) {
          setSafety(prev => prev.filter(s => s.id !== id));
      }
  };

  // -- Purchases / Costs Handlers --
  const handleAddPurchase = (newPurchase: PurchaseRecord) => {
      setPurchases([newPurchase, ...purchases]);
  };

  const handleUpdatePurchase = (updatedPurchase: PurchaseRecord) => {
      setPurchases(prev => prev.map(p => p.id === updatedPurchase.id ? updatedPurchase : p));
  };

  const handleDeletePurchase = (id: string) => {
      if(window.confirm('¿Desea eliminar este registro de costo?')) {
          setPurchases(prev => prev.filter(p => p.id !== id));
      }
  };

  // Calculate unique locations from assets to ensure any legacy location is included
  const assetLocations = Array.from(new Set(assets.map(a => a.location))).filter(l => l && l !== '');
  // Merge state locations with asset locations to avoid missing dropdown options
  const availableLocations = Array.from(new Set([...locations, ...assetLocations])).sort();


  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard 
          parts={parts} 
          plans={plans} 
          logs={logs} 
          safety={safety} 
          assets={assets} 
          onAddLog={handleAddLog} 
        />;
      case 'assets':
        return <Assets 
          assets={assets} 
          onUpdateAssets={setAssets} 
          availableParts={parts}
          plans={plans}
          locations={availableLocations}
          onAddPlan={handleAddPlan}
          onUpdatePlan={handleUpdatePlan}
          workOrders={workOrders}
          onCreateWorkOrder={handleCreateWorkOrder}
          onUpdateWorkOrder={handleUpdateWorkOrder}
        />;
      case 'inventory':
        return <Inventory 
            parts={parts} 
            assets={assets}
            onUpdateAssets={setAssets}
            onAddPart={handleAddPart}
            onUpdatePart={handleUpdatePart}
            onDeletePart={handleDeletePart}
        />;
      case 'workorders':
        return <WorkOrders 
            workOrders={workOrders} 
            assets={assets} 
            parts={parts} 
            locations={availableLocations}
            onCreateOrder={handleCreateWorkOrder}
            onUpdateOrder={handleUpdateWorkOrder}
            onDeleteOrder={handleDeleteWorkOrder}
        />;
      case 'costs':
          return <Costs
            purchases={purchases}
            assets={assets}
            onAddPurchase={handleAddPurchase}
            onUpdatePurchase={handleUpdatePurchase}
            onDeletePurchase={handleDeletePurchase}
          />;
      case 'logbook':
        return <Logbook 
            logs={logs} 
            onAddLog={handleAddLog}
            onUpdateLog={handleUpdateLog}
            onDeleteLog={handleDeleteLog}
        />;
      case 'safety':
        return <Safety 
            records={safety}
            onAddRecord={handleAddSafety}
            onUpdateRecord={handleUpdateSafety}
            onDeleteRecord={handleDeleteSafety}
        />;
      case 'configuration':
        return <Configuration 
            locations={locations}
            onUpdateLocations={setLocations}
        />;
      default:
        return <Dashboard 
          parts={parts} 
          plans={plans} 
          logs={logs} 
          safety={safety} 
          assets={assets} 
          onAddLog={handleAddLog} 
        />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;