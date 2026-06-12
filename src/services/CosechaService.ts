import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, increment } from "firebase/firestore";
//  importaciones para traer las de SQLite
import { guardarReporteLocal, obtenerCatalogosLocales, guardarCatalogosLocal, obtenerReportesPendientes, marcarReporteSincronizado } from "./OfflineService";
import NetInfo from '@react-native-community/netinfo';

// Subir imagen a Cloudinary
export const uploadImageToCloudinary = async (uri: string) => {
  const cloudName = "dfh6eyvxt"; 
  const uploadPreset = "cosecha_preset";
  const formData = new FormData();
  formData.append("file", { uri: uri, type: "image/jpeg", name: "upload.jpg" } as any);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST", body: formData
  });
  const data = await response.json();
  if (data.secure_url) return data.secure_url;
  throw new Error("Error al subir imagen");
};

// Obtener catálogos (Online/Offline)
export const fetchCatalogos = async () => {
  const netState = await NetInfo.fetch();
  if (netState.isConnected) {
    const snapParcelas = await getDocs(query(collection(db, "parcelas"), orderBy("nombre")));
    const snapMateriales = await getDocs(query(collection(db, "materiales"), orderBy("nombre")));
    
    const parcelas = snapParcelas.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
    const materiales = snapMateriales.docs.map(d => ({ id: d.id, nombre: d.data().nombre, stock: d.data().stock || 0 }));
    
    await guardarCatalogosLocal(parcelas, materiales);
    return { parcelas, materiales, isOffline: false };
  } else {
    const datos = await obtenerCatalogosLocales();
    return { ...datos, isOffline: true };
  }
};

// Guardar reporte
export const saveReporte = async (reporteBase: any, isConnected: boolean) => {
  if (isConnected) {
    let finalFotoUrl = "";
    if (reporteBase.localImageUri) {
      finalFotoUrl = await uploadImageToCloudinary(reporteBase.localImageUri);
    }
    
    const reporteOnline = { ...reporteBase, fotoUrl: finalFotoUrl, fechaCreacion: new Date() };
    delete reporteOnline.localImageUri; 

    await addDoc(collection(db, "reportesCosecha"), reporteOnline);

    const totalMat = (reporteBase.exportacion6oz || 0) + (reporteBase.exportacion12oz || 0);
    if (totalMat > 0) {
       const matRef = doc(db, "materiales", reporteBase.materialId);
       await updateDoc(matRef, { stock: increment(-totalMat) });
    }
    return { success: true, mode: 'online' };
  } else {
    await guardarReporteLocal(reporteBase);
    return { success: true, mode: 'offline' };
  }
};

// --- NUEVA FUNCIÓN: Sincronizar reportes de SQLite hacia Firebase ---
export const sincronizarReportesOffline = async () => {
  const netState = await NetInfo.fetch();
  
  if (!netState.isConnected) {
    console.log("🔴 No hay internet para sincronizar.");
    return { success: false, message: "Sin conexión a internet" };
  }

  // Traemos los reportes de SQLite
  const pendientes = obtenerReportesPendientes() as any[];
  if (pendientes.length === 0) {
    return { success: true, message: "Todo está al día." };
  }

  console.log(`⏳ Encontrados ${pendientes.length} reportes para sincronizar...`);

  let subidos = 0;
  for (const reporte of pendientes) {
    try {
      let finalFotoUrl = "";
      if (reporte.localImageUri) {
        finalFotoUrl = await uploadImageToCloudinary(reporte.localImageUri);
      }

      // Preparamos el objeto limpio para Firebase
      const reporteOnline = {
        parcelaId: reporte.parcelaId,
        materialId: reporte.materialId,
        exportacion6oz: reporte.exportacion6oz,
        exportacion12oz: reporte.exportacion12oz,
        procesoCharola: reporte.procesoCharola,
        materialSobrante: reporte.materialSobrante,
        fotoUrl: finalFotoUrl,
        // Convertimos el texto de SQLite de regreso a Fecha de Firebase
        fechaCreacion: new Date(reporte.fechaCreacion) 
      };

      // Guardamos en Firestore
      await addDoc(collection(db, "reportesCosecha"), reporteOnline);

      // Descontamos del inventario
      const totalMat = (reporte.exportacion6oz || 0) + (reporte.exportacion12oz || 0);
      if (totalMat > 0) {
         const matRef = doc(db, "materiales", reporte.materialId);
         await updateDoc(matRef, { stock: increment(-totalMat) });
      }

      // Marcamos como "Ya subido" en SQLite
      marcarReporteSincronizado(reporte.id);
      subidos++;
      
    } catch (error) {
      console.log(`❌ Error sincronizando reporte ${reporte.id}:`, error);
    }
  }

  return { success: true, message: `✅ Se sincronizaron ${subidos} reportes correctamente.` };
};