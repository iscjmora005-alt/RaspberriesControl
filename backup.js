const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Aquí ponemos tu URL exacta y tu clave
const supabaseUrl = 'https://pjxhrlvfwhzpppulwhgs.supabase.co';
const supabaseKey = 'TU_ANON_KEY_AQUI'; // ¡Pega tu clave larga aquí!

const supabase = createClient(supabaseUrl, supabaseKey);

async function generarYSubirRespaldo() {
  console.log('⏳ Iniciando proceso de respaldo de Supabase...');
  
  // 1. Extraemos todos los datos de tu tabla
  const { data, error } = await supabase.from('respaldos_cosecha').select('*');
  
  if (error) {
    console.error('❌ Error al extraer datos de la base de datos:', error);
    return;
  }

  // 2. Creamos un archivo local temporal con la fecha de hoy
  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `respaldos_cosecha_${fecha}.json`;
  const contenidoJson = JSON.stringify(data, null, 2);
  
  fs.writeFileSync(nombreArchivo, contenidoJson);
  console.log(`📁 Archivo local temporal creado: ${nombreArchivo}`);

  // 3. Subimos el archivo a tu bucket 'respaldos-diarios'
  console.log('☁️ Subiendo el respaldo a Supabase Storage...');
  const fileBuffer = fs.readFileSync(nombreArchivo);

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('respaldos-diarios')
    .upload(nombreArchivo, fileBuffer, {
      contentType: 'application/json',
      upsert: true // Si ya hay uno con ese nombre hoy, lo actualiza
    });

  if (uploadError) {
    console.error('❌ Error al subir el archivo al bucket:', uploadError);
  } else {
    console.log('✅ ¡Respaldo subido con éxito a la nube en tu bucket!');
  }
}

generarYSubirRespaldo();