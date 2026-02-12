
export type Criticality = 'Alta' | 'Media' | 'Baja';
export type WorkOrderType = 'Preventivo' | 'Correctivo' | 'Inspección' | 'Predictivo';
export type WorkOrderStatus = 'Pendiente' | 'En Proceso' | 'Terminado';
export type LogStatus = 'Pendiente' | 'Realizado';
export type LogPriority = 'Alta' | 'Normal';
export type SafetyStatus = 'Vigente' | 'Por Vencer' | 'Vencido';
export type PartStatus = 'Nuevo' | 'Usado' | 'Reparado';
export type SafetyPriority = 'Alta' | 'Media' | 'Baja';
export type PurchaseType = 'Material' | 'Servicio';
export type AssetStatus = 'Operativo' | 'En Mantención' | 'Fuera de Servicio';

export interface Asset {
  id: string;
  name: string;
  brand: string;
  model: string;
  capacity: string;
  sapCode: string;
  serialNumber: string;
  location: string;
  criticality: Criticality;
  status: AssetStatus; // New field
  photoUrl: string;
  linkedParts?: { partId: string; quantity: number }[];
}

export interface Part {
  id: string;
  name: string;
  description: string;
  currentStock: number;
  minStock: number;
  location: string;
  cost: number;
  // New Fields
  brand?: string;
  model?: string;
  capacity?: string;
  supplier?: string;
  sapCode?: string;
  imageUrl?: string;
  status?: PartStatus;
}

export interface MaintenancePlan {
  id: string;
  assetId: string;
  frequency: string;
  task: string;
  nextDueDate: string; // YYYY-MM-DD
}

export interface WorkOrder {
  id: string;
  assetId: string;
  title?: string; // Nuevo titulo
  type: WorkOrderType;
  date: string; // YYYY-MM-DD
  technician: string;
  details: string;
  status: WorkOrderStatus;
  partsUsed?: { partId: string; quantity: number }[];
  
  // Added fields to fix errors
  requestDate?: string;
  endDate?: string;
  location?: string;
  imageUrl?: string;
}

export interface LogNote {
  id: string;
  description: string;
  createdAt: string;
  deadline: string;
  status: LogStatus;
  priority: LogPriority;
}

export interface SafetyRecord {
  id: string;
  type: string; // Acts as Title
  description: string;
  scheduledDate: string; // Deadline
  realizedDate?: string;
  evidenceUrl?: string;
  status: 'Pendiente' | 'Realizado';
  priority: SafetyPriority;
}

export interface PurchaseRecord {
  id: string;
  description: string;
  type: PurchaseType;
  date: string; // YYYY-MM-DD
  amount: number; // Total Amount (Net + Tax)
  netCost: number; // Nuevo: Costo Neto
  tax: number; // Nuevo: Impuesto/IVA
  supplier: string;
  invoiceNumber?: string;
  solpedNumber?: string; // Nuevo: Solicitud de Pedido
  orderNumber?: string; // Nuevo: Orden de Compra (OC)
  receiptNumber?: string; // Nuevo: Recepción / HES / Salida
  relatedAssetId?: string; // Optional link to asset
}