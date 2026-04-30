import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';

export default function PruebaSQLiteScreen() {
  const [reportes, setReportes] = useState<any[]>([]);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    // Configuración inicial: Abrir DB y crear tabla
    const iniciarDB = async () => {
      try {
        const database = await SQLite.openDatabaseAsync('agroOffline.db');
        setDb(database);
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS reportes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parcela TEXT,
            cantidad INTEGER
          );
        `);
      } catch (error) {
        console.error("Error al crear la tabla", error);
      }
    };
    iniciarDB();
  }, []);

  // Función para guardar (Insert)
  const guardarDato = async () => {
    if (!db) return;
    try {
      await db.runAsync('INSERT INTO reportes (parcela, cantidad) VALUES (?, ?)', ['Parcela Norte', 120]);
      Alert.alert("Éxito", "Dato guardado en SQLite de forma local");
      leerDatos(); 
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar");
    }
  };

  // Función para leer (Select)
  const leerDatos = async () => {
    if (!db) return;
    try {
      const todosLosReportes = await db.getAllAsync('SELECT * FROM reportes');
      setReportes(todosLosReportes);
    } catch (error) {
      console.error("Error al leer", error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Button title="Guardar Dato de Prueba" onPress={guardarDato} />
      <Button title="Leer Datos Guardados" onPress={leerDatos} />
      <FlatList
        data={reportes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text>ID: {item.id} | Parcela: {item.parcela} | Cantidad: {item.cantidad}</Text>
        )}
      />
    </View>
  );
}