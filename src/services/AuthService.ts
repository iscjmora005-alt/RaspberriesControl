import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const AuthService = {
  login: async (username: string, password: string) => {
    try {
     
      const q = query(collection(db, "usuarios"), where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { user: null, error: "Usuario no encontrado." };
      }

      const userDoc = querySnapshot.docs[0].data();

      // Verificamos la contraseña
      if (userDoc.password === password) {
       
        const usuarioCompleto = {
          id: querySnapshot.docs[0].id,
          ...userDoc
        };
        return { user: usuarioCompleto, error: null };
      } else {
        return { user: null, error: "Contraseña incorrecta." };
      }
    } catch (error: any) {
      console.error("Error en AuthService:", error);
      return { user: null, error: "Problema al conectar con el servidor." };
    }
  },

  logout: async () => {
    return { success: true, error: null };
  },
};