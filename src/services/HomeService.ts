import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'; 
import { db } from '../firebase/firebaseConfig';

export const HomeService = {
  // Función para traernos los últimos 5 reportes de la cosecha
  getUltimosReportes: async () => {
    try {
      const q = query(
        collection(db, 'reportesCosecha'), 
        orderBy('fecha', 'desc'), 
        limit(5)
      );
      
      const querySnapshot = await getDocs(q);
      const reportes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, data: reportes, error: null };
    } catch (error: any) {
      console.error("Error al obtener reportes del Home: ", error);
      return { success: false, data: [], error: error.message };
    }
  }
};