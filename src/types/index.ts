
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export interface FormField {
  name: string;
  label: string;
  unit: string;
  reference: string;
}

export interface Study {
  id: string;
  name: string;
  category: string;
  description: string;
  preparation: string;
  price: number; // Este es costo_usd
  costo_bs?: number;
  tasa_bcv?: number;
  deliveryTime: string;
  campos_formulario?: FormField[];
  veces_realizado?: number;
  background_url?: string;
  materials?: { id: number; quantity: number }[];
}

export type SchedulingStudy = Omit<Study, 'background_url'>;

export interface PatientPayload {
    cedula_identidad: string;
    nombres: string;
    apellidos: string;
    email: string;
    telefono: string;
    direccion?: string;
}

export interface ResultadoPaciente {
  id: number;
  fecha_creacion: string;
  resultado_data: { 
    url?: string; 
    nombre_estudio?: string;
    tipo?: 'archivo' | 'manual';
  };
  analisis_ia?: string;
  analisis_editado?: string;
  analisis_estado?: 'pendiente' | 'aprobado' | 'rechazado';
}

export interface InventoryItem {
  id: number;
  nombre: string;
  descripcion: string;
  cantidad_stock: number;          // Cantidad actual de cajas en stock
  unidad_medida: string;
  stock_minimo: number;
  proveedor?: string;
  fecha_ultima_compra?: string;
  costo_ultima_compra_bs?: number;
  costo_ultima_compra_usd?: number;
  notas?: string;
  imagen_url?: string;
  created_at?: string;

  // Nuevos campos para gestión avanzada de stock
  cantidad_ingresar?: number;       // Temporal: cajas nuevas a ingresar
  unidades_por_caja: number;        // Unidades individuales por caja
  unidades_totales: number;         // Cálculo automático de unidades disponibles
  ultima_actualizacion_stock?: string;

  // Sistema de identificación SKU/ID
  sku?: string;                     // Código único generado automáticamente
}

// Helper types para operaciones de stock
export interface StockOperation {
  tipo: 'ingreso' | 'salida' | 'ajuste';
  material_id: number;
  cajas_operadas: number;
  unidades_por_caja?: number;
  observaciones?: string;
  fecha: string;
}

export interface InventoryFormData {
  // Campos básicos
  nombre: string;
  descripcion: string;
  cantidad_stock: number;
  unidad_medida: string;
  stock_minimo: number;
  proveedor?: string;
  fecha_ultima_compra?: string;
  costo_ultima_compra_bs?: number;
  costo_ultima_compra_usd?: number;
  notas?: string;
  imagen_url?: string;

  // Nuevos campos de gestión avanzada
  cantidad_ingresar?: number;       // Nuevo ingreso de cajas
  unidades_por_caja: number;        // Unidades por caja
  unidades_totales?: number;        // Calculado automáticamente
}

export interface Appointment {
  id: number;
  fecha_cita: string;
  ubicacion: string;
  estudios_solicitados: string[];
  status: string;
  pacientes: {
    nombres: string;
    apellidos: string;
    cedula_identidad: string;
    telefono: string;
  } | null;
}

export interface DashboardSummary {
  top_studies_weekly: any[];
  daily_appointment_activity: any[];
  weekly_appointments: WeeklyAppointment[];
  weekly_patients: WeeklyPatient[];
}

export interface WeeklyAppointment extends Appointment {}

export interface Patient {
    id: number;
    nombres: string;
    apellidos: string;
    cedula_identidad: string;
    email: string;
    telefono: string;
    direccion?: string;
}

export interface WeeklyPatient extends Patient {
  fecha_creacion: string;
}

export interface BlogPost {
    id: string;
    title: string;
    summary: string;
    content?: string;
    category: string;
    imageUrl: string;
    author: string;
    date: string;
    slug?: string;
    meta_title?: string;
    meta_description?: string;
    keywords?: string[];
}

export interface Testimonial {
    id: number;
    texto: string;
    author: string;
    city: string;
    is_approved?: boolean;
    rating?: number;
    estudio_realizado?: string;
}

export interface Cita {
    id: number;
    fecha_cita: string;
    estudios_solicitados: string[];
    status: string;
}

export interface ResultadoEliminado {
    id: number;
    nombre_estudio: string;
    fecha_eliminacion: string;
}

export interface PatientDetails extends Patient {
    citas: Cita[];
    resultados_pacientes: ResultadoPaciente[];
    resultados_eliminados: ResultadoEliminado[];
}
