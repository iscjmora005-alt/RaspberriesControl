const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');


const firebaseConfig = {
  apiKey: "AIzaSyCF3jfa5udQL2eMIAA-6ERamOii3sfL5Mo",
  authDomain: "raspberriescontrol.firebaseapp.com",
  projectId: "raspberriescontrol",
  storageBucket: "raspberriescontrol.firebasestorage.app",
  messagingSenderId: "7053191023",
  appId: "1:7053191023:web:7e56de8ec084903221ea9a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


const supabaseUrl = 'https://pjxhrlvfwhzpppulwhgs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqeGhybHZmd2h6cHBwdWx3aGdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU4ODU1NiwiZXhwIjoyMDkzMTY0NTU2fQ.gcEtBO53C2qPmiXAwXfj1GXqYE5fY-DURPWY5vtHJ5Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function ejecutarRespaldoReal() {
  try {
    console.log('🔥 1. Conectando a Firebase para extraer datos reales...');
    
    // Extraemos de tu colección real en Firestore
    const querySnapshot = await getDocs(collection(db, 'reportesCosecha'));
    const datosReales = [];
    
    querySnapshot.forEach((doc) => {
      // Guardamos el ID del documento junto con su información
      datosReales.push({ id: doc.id, ...doc.data() });
    });

    console.log(`📊 ¡Éxito! Se descargaron ${datosReales.length} reportes de cosecha.`);

    // Creamos el archivo local
    console.log('📁 2. Generando archivo JSON...');
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `respaldos_cosecha_REAL_${fecha}.json`;
    
    fs.writeFileSync(nombreArchivo, JSON.stringify(datosReales, null, 2));
    
    // Subimos a Supabase
    console.log('☁️ 3. Subiendo respaldo a Supabase Storage...');
    const fileBuffer = fs.readFileSync(nombreArchivo);

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('respaldos-diarios')
      .upload(nombreArchivo, fileBuffer, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Error al subir a Supabase:', uploadError);
    } else {
      console.log(`✅ ¡Proceso completado! Respaldo real subido exitosamente a la nube.`);
    }

  } catch (error) {
    console.error("❌ Ocurrió un error en el proceso:", error);
  }
}

ejecutarRespaldoReal();