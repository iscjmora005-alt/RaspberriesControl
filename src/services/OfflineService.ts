import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@reportes_pendientes';

// Guardar localmente
export const guardarReporteLocal = async (reporte: any) => {
  try {
    const existentes = await obtenerReportesLocales();
    existentes.push(reporte);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existentes));
    console.log("Guardado offline");
  } catch (e) {
    console.error("Error al guardar local", e);
  }
};

// Leer pendientes
export const obtenerReportesLocales = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    return [];
  }
};

// Limpiar después de subir
export const limpiarReportesLocales = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Error limpiando", e);
  }
};
// ... (código anterior de reportes)

// --- NUEVO: MANEJO DE CATÁLOGOS OFFLINE ---
const CATALOGO_PARCELAS_KEY = '@cat_parcelas';
const CATALOGO_MATERIALES_KEY = '@cat_materiales';

export const guardarCatalogosLocal = async (parcelas: any[], materiales: any[]) => {
  try {
    await AsyncStorage.setItem(CATALOGO_PARCELAS_KEY, JSON.stringify(parcelas));
    await AsyncStorage.setItem(CATALOGO_MATERIALES_KEY, JSON.stringify(materiales));
    console.log("Catálogos actualizados localmente");
  } catch (e) {
    console.error("Error guardando catálogos", e);
  }
};

export const obtenerCatalogosLocales = async () => {
  try {
    const p = await AsyncStorage.getItem(CATALOGO_PARCELAS_KEY);
    const m = await AsyncStorage.getItem(CATALOGO_MATERIALES_KEY);
    return {
      parcelas: p ? JSON.parse(p) : [],
      materiales: m ? JSON.parse(m) : []
    };
  } catch (e) {
    console.error("Error leyendo catálogos", e);
    return { parcelas: [], materiales: [] };
  }
};

// ... (código anterior)

// --- NUEVO: CACHÉ DE CALENDARIO ---
const EVENTOS_KEY = '@eventos_calendario';

// Guardar copia de eventos en el celular
export const guardarEventosLocal = async (eventos: any[]) => {
  try {
    await AsyncStorage.setItem(EVENTOS_KEY, JSON.stringify(eventos));
    console.log("Eventos guardados localmente");
  } catch (e) {
    console.error("Error guardando eventos", e);
  }
};

// Leer eventos guardados
export const obtenerEventosLocales = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(EVENTOS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error leyendo eventos", e);
    return [];
  }
};