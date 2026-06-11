import { openDatabaseSync } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// 1. MANEJO DE REPORTES CON SQLITE (OFFLINE-FIRST)
// ==========================================
const db = openDatabaseSync('raspberries.db');

export const inicializarBaseDeDatos = () => {
  try {
     //db.execSync(`DROP TABLE IF EXISTS reportesCosecha;`);
    db.execSync(
      `CREATE TABLE IF NOT EXISTS reportesCosecha (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parcelaId TEXT,
        parcelaNombre TEXT,
        materialId TEXT,
        materialNombre TEXT,
        exportacion6oz INTEGER,
        exportacion12oz INTEGER,
        procesoCharola INTEGER,
        materialSobrante TEXT,
        fechaCreacion TEXT,
        localImageUri TEXT,
        sincronizado INTEGER
      );`
    );
    console.log('✅ Tabla reportesCosecha lista en SQLite.');
  } catch (error) {
    console.log('❌ Error creando la tabla:', error);
  }
};

export const guardarReporteLocal = (reporte: any) => {
  return new Promise((resolve, reject) => {
    try {
      const result = db.runSync(
        `INSERT INTO reportesCosecha 
        (parcelaId, materialId, exportacion6oz, exportacion12oz, procesoCharola, materialSobrante, fechaCreacion, localImageUri, sincronizado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          reporte.parcelaId,
          reporte.parcelaNombre,
          reporte.materialId,
          reporte.materialNombre,
          reporte.exportacion6oz,
          reporte.exportacion12oz,
          reporte.procesoCharola,
          reporte.materialSobrante,
          reporte.fechaCreacion,
          reporte.localImageUri || ""
        ]
      );
      console.log('💾 Guardado en SQLite (Offline), ID:', result.lastInsertRowId);
      resolve(result);
    } catch (error) {
      console.log('❌ Error SQLite:', error);
      reject(error);
    }
  });
};

export const obtenerReportesPendientes = () => {
  try {
    return db.getAllSync('SELECT * FROM reportesCosecha WHERE sincronizado = 0');
  } catch (error) {
    console.log('❌ Error leyendo pendientes:', error);
    return [];
  }
};

export const marcarReporteSincronizado = (id: number) => {
  try {
    db.runSync('UPDATE reportesCosecha SET sincronizado = 1 WHERE id = ?', [id]);
    console.log(`✅ Reporte ${id} marcado como sincronizado.`);
  } catch (error) {
    console.log('❌ Error actualizando estatus:', error);
  }
};

// ==========================================
// 2. MANEJO DE CATÁLOGOS CON ASYNCSTORAGE
// ==========================================
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

// ==========================================
// 3. CACHÉ DE CALENDARIO CON ASYNCSTORAGE
// ==========================================
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