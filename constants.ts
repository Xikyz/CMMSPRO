
import { Asset, Part, MaintenancePlan, WorkOrder, LogNote, SafetyRecord, PurchaseRecord } from './types';

// Helper to get dates
const today = new Date();
const addDays = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Helper for past dates (simulating history)
const addMonths = (months: number) => {
    const date = new Date(today);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
};

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'A-001',
    name: 'Bomba Centrífuga 01',
    brand: 'Grundfos',
    model: 'NB 50-125',
    capacity: '50 m3/h',
    sapCode: '100052',
    serialNumber: 'SN-998877',
    location: 'Sala de Bombas Norte',
    criticality: 'Alta',
    status: 'Operativo',
    photoUrl: 'https://picsum.photos/200/200?random=1',
    linkedParts: [
        { partId: 'P-100', quantity: 2 }, 
        { partId: 'P-101', quantity: 1 }
    ]
  },
  {
    id: 'A-002',
    name: 'Compresor de Aire',
    brand: 'Atlas Copco',
    model: 'GA 37',
    capacity: '37 kW',
    sapCode: '100088',
    serialNumber: 'SN-112233',
    location: 'Taller Central',
    criticality: 'Media',
    status: 'En Mantención',
    photoUrl: 'https://picsum.photos/200/200?random=2',
    linkedParts: [
        { partId: 'P-103', quantity: 3 }
    ]
  },
  {
    id: 'A-003',
    name: 'Cinta Transportadora 04',
    brand: 'Metso',
    model: 'CV-400',
    capacity: '400 TPH',
    sapCode: '100150',
    serialNumber: 'SN-445566',
    location: 'Patio de Carga',
    criticality: 'Alta',
    status: 'Operativo',
    photoUrl: 'https://picsum.photos/200/200?random=3',
    linkedParts: []
  }
];

export const INITIAL_PARTS: Part[] = [
  {
    id: 'P-100',
    name: 'Rodamiento 6204',
    description: 'Rodamiento rígido de bolas',
    currentStock: 2,
    minStock: 5, // Alert: Low Stock
    location: 'Estante A-1',
    cost: 15.50,
    brand: 'SKF',
    model: '6204-2RSH',
    supplier: 'Rodamientos Chile',
    sapCode: '500100',
    status: 'Nuevo'
  },
  {
    id: 'P-101',
    name: 'Sello Mecánico 50mm',
    description: 'Para bomba centrífuga',
    currentStock: 8,
    minStock: 3,
    location: 'Estante B-2',
    cost: 120.00,
    brand: 'John Crane',
    supplier: 'FluidTech',
    sapCode: '500101',
    status: 'Nuevo'
  },
  {
    id: 'P-102',
    name: 'Aceite Hidráulico ISO 68',
    description: 'Tambor 200L',
    currentStock: 1,
    minStock: 2, // Alert: Low Stock
    location: 'Patio de Aceites',
    cost: 450.00,
    brand: 'Shell',
    model: 'Tellus S2',
    capacity: '200 Litros',
    supplier: 'Lubricantes Industriales',
    sapCode: '500102',
    status: 'Nuevo'
  },
  {
    id: 'P-103',
    name: 'Correa V B-52',
    description: 'Correa de transmisión',
    currentStock: 20,
    minStock: 10,
    location: 'Estante C-1',
    cost: 12.00,
    brand: 'Gates',
    model: 'B-52',
    supplier: 'Transmisiones SA',
    sapCode: '500103',
    status: 'Nuevo'
  }
];

export const INITIAL_PLANS: MaintenancePlan[] = [
  {
    id: 'MP-001',
    assetId: 'A-001',
    frequency: 'Trimestral',
    task: 'Cambio de sellos y lubricación',
    nextDueDate: addDays(2) // Alert: Due soon
  },
  {
    id: 'MP-002',
    assetId: 'A-002',
    frequency: 'Mensual',
    task: 'Limpieza de filtros de admisión',
    nextDueDate: addDays(15)
  },
  {
    id: 'MP-003',
    assetId: 'A-003',
    frequency: 'Semestral',
    task: 'Inspección de polines y banda',
    nextDueDate: addDays(-1) // Alert: Overdue
  }
];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-5001',
    assetId: 'A-001',
    type: 'Preventivo',
    date: addDays(-30),
    technician: 'Juan Pérez',
    details: 'Mantenimiento preventivo estándar realizado sin novedades.',
    status: 'Terminado',
    partsUsed: [{ partId: 'P-100', quantity: 2 }]
  },
  {
    id: 'WO-5002',
    assetId: 'A-003',
    type: 'Correctivo',
    date: addDays(0),
    technician: 'Maria González',
    details: 'Ruido excesivo en rodillo de retorno.',
    status: 'En Proceso'
  }
];

export const INITIAL_LOGS: LogNote[] = [
  {
    id: 'L-001',
    description: 'Revisar presupuesto anual de repuestos',
    createdAt: addDays(-10),
    deadline: addDays(1), // Alert: Urgent
    status: 'Pendiente',
    priority: 'Alta'
  },
  {
    id: 'L-002',
    description: 'Coordinar visita técnica de Atlas Copco',
    createdAt: addDays(-2),
    deadline: addDays(10),
    status: 'Pendiente',
    priority: 'Normal'
  },
  {
    id: 'L-003',
    description: 'Renovar EPP de equipo nocturno',
    createdAt: addDays(-15),
    deadline: addDays(-5),
    status: 'Realizado',
    priority: 'Alta'
  }
];

export const INITIAL_SAFETY: SafetyRecord[] = [
  {
    id: 'S-001',
    type: 'Inspección Extintores',
    description: 'Inspección mensual de extintores en zona de carga.',
    scheduledDate: addDays(3),
    status: 'Pendiente',
    priority: 'Alta'
  },
  {
    id: 'S-002',
    type: 'Charla 5 Min',
    description: 'Riesgos de atrapamiento en cintas y bloqueo de energías.',
    scheduledDate: addDays(0),
    status: 'Realizado',
    realizedDate: addDays(0),
    evidenceUrl: 'doc.pdf',
    priority: 'Media'
  }
];

export const INITIAL_PURCHASES: PurchaseRecord[] = [
    {
        id: 'PUR-001',
        description: 'Compra anual de rodamientos SKF',
        type: 'Material',
        date: addMonths(0),
        amount: 1785, // Total
        netCost: 1500, // Neto
        tax: 285, // IVA
        supplier: 'Rodamientos Chile',
        invoiceNumber: 'FAC-9921',
        solpedNumber: 'SOL-1020',
        orderNumber: 'OC-5050',
        receiptNumber: 'REC-001'
    },
    {
        id: 'PUR-002',
        description: 'Servicio de rebobinado Motor A-001',
        type: 'Servicio',
        date: addMonths(-1),
        amount: 1011.5,
        netCost: 850,
        tax: 161.5,
        supplier: 'Motores del Sur',
        invoiceNumber: 'EXT-2023',
        solpedNumber: 'SOL-0990',
        orderNumber: 'OC-4980',
        receiptNumber: 'HES-220',
        relatedAssetId: 'A-001'
    },
    {
        id: 'PUR-003',
        description: 'Lubricantes y Filtros',
        type: 'Material',
        date: addMonths(-2),
        amount: 499.8,
        netCost: 420,
        tax: 79.8,
        supplier: 'Lubricantes Industriales',
        invoiceNumber: 'FAC-1102',
        orderNumber: 'OC-4800',
        receiptNumber: 'REC-998'
    },
    {
        id: 'PUR-004',
        description: 'Consultoría externa vibraciones',
        type: 'Servicio',
        date: addMonths(-2),
        amount: 1428,
        netCost: 1200,
        tax: 228,
        supplier: 'VibraCheck Ltda.',
        invoiceNumber: 'HON-55',
        orderNumber: 'OC-4810',
        receiptNumber: 'HES-300'
    },
    {
        id: 'PUR-005',
        description: 'Repuestos Bomba de Agua',
        type: 'Material',
        date: addMonths(-5),
        amount: 357,
        netCost: 300,
        tax: 57,
        supplier: 'FluidTech',
        solpedNumber: 'SOL-0500',
        orderNumber: 'OC-4200'
    }
];