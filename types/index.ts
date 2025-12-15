/**
 * Archivo central para todos los tipos TypeScript de la aplicación
 * Aquí definimos las interfaces y tipos que se usarán en la app "raspberriesControl"
 */

import { Timestamp } from "firebase/firestore";

// ==========================================
// TIPOS BÁSICOS
// ==========================================

export type ID = number;

export interface BaseEntity {
  id: ID;
}

// ==========================================
// TIPOS PARA COMPONENTES UI (GENÉRICOS)
// ==========================================

export interface CardProps {
  titulo: string;
  subtitulo?: string;
  onPress?: () => void;
  icono?: string;
  imagen?: any;
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  titulo?: string;
  children?: React.ReactNode;
}

export interface ListItemProps<T> {
  item: T;
  onPress?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

// ==========================================
// TIPOS PARA FORMULARIOS Y DATOS
// ==========================================

export interface LoginFormData {
  username: string;
  password: string;
}

/**
 * Interfaz para una Parcela (Catálogo)
 */
export interface Parcela {
  id: string;
  nombre: string;
}

/**
 * Interfaz para un Material (Catálogo de Inventario)
 */
export interface Material {
  id: string;
  nombre: string;
  stock: number; // <-- NUEVO CAMPO: Cantidad disponible
}

/**
 * Estructura auxiliar para guardar un material usado en el reporte
 * (NUEVO: Esto permite la lista dinámica)
 */
export interface MaterialUsado {
  id: string;
  nombre: string;
  cantidad: number;
}
export interface Usuario {
  id: string;
  nombre: string;      // Nombre real (ej. Juan Pérez)
  username: string;    // Para iniciar sesión (ej. juanp)
  password: string;    // Contraseña
  rol: UserRole; 
  email: string;
  telefono: string;      // Administrador | Asociado | Registrador
  fechaRegistro: Timestamp;
}

/**
 * Datos del formulario de Reporte Diario de Cosecha
 */
export interface ReporteCosechaData {
  parcela: string;       // ID de la parcela
  material: string;      // <-- NUEVO: ID del material (Ej. HEB, FreshKampo)
  
  // Fruta de Exportación
  exportacion6oz: string;
  exportacion12oz: string;
  
  // Fruta de Proceso
  procesoCharola: string;
  
  materialSobrante: string; // Comentarios extra
}

/**
 * Datos como se guardan y leen de Firestore
 */
export interface ReporteGuardado {
  id: string;
  fotoUrl?: string;
  parcelaId: string;
  parcelaNombre: string;
  
  materialId: string;      // <-- NUEVO
  materialNombre: string;  // <-- NUEVO
  
  exportacion6oz: number;
  exportacion12oz: number;
  
  procesoCharola: number;
  materialSobrante: string;
  
  fechaCreacion: Timestamp;
}
// ... (otros tipos)

/**
 * Interfaz para Eventos del Calendario
 */
export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string; // "YYYY-MM-DD"
  tipo: "Riego" | "Cosecha" | "Entrega" | "Otro";
  // --- NUEVO CAMPO ---
  estado: "pendiente" | "en_curso" | "completada";
}
// ==========================================
// TIPOS PARA ROLES DE USUARIO
// ==========================================

export type UserRole = "Administrador" | "Asociado" | "Registrador" | "Invitado";

// ==========================================
// TIPOS PARA GESTIÓN DE ESTADOS
// ==========================================

export type LoadingState = "idle" | "loading" | "success" | "error";

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

export interface ScreenState<T> {
  data: T[];
  loading: LoadingState;
  error: ErrorState;
}

// ==========================================
// TIPOS UTILITARIOS (GENÉRICOS)
// ==========================================

export type CreateEntity<T extends BaseEntity> = Omit<T, "id">;
export type CRUDOperation = "create" | "read" | "update" | "delete";

// ==========================================
// CONSTANTES DE TIPO
// ==========================================

export const COLORS = {
  primary: "#ec221f",
  secondary: "#03dac6",
  background: "#f5f5f5",
  surface: "#ffffff",
  error: "#b00020",
  text: "#000000",
  textSecondary: "#777777",
};

export const FONT_SIZES = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 22,
  xxlarge: 24,
};