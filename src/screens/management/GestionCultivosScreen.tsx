import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES, Parcela } from "../../../types";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

// Importar funciones de Firebase
import { db } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  doc,
  deleteDoc, // <-- Para borrar
} from "firebase/firestore";

// Tipos para la navegación
type GestionCultivosNavProp = StackNavigationProp<
  RootStackParamList,
  "GestionCultivos"
>;
interface Props {
  navigation: GestionCultivosNavProp;
}

/**
 * Pantalla para que el Admin gestione el catálogo de Parcelas
 */
const GestionCultivosScreen: React.FC<Props> = ({ navigation }) => {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nombreNuevaParcela, setNombreNuevaParcela] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // --- Cargar Parcelas ---
  const fetchParcelas = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "parcelas"), orderBy("nombre"));
      const querySnapshot = await getDocs(q);
      const listaParcelas: Parcela[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().nombre,
      }));
      setParcelas(listaParcelas);
    } catch (e) {
      console.error("Error al obtener parcelas: ", e);
      Alert.alert("Error", "No se pudieron cargar las parcelas.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar las parcelas cuando la pantalla se monta
  useEffect(() => {
    fetchParcelas();
  }, []);

  // --- Guardar Nueva Parcela ---
  const handleGuardarParcela = async () => {
    if (nombreNuevaParcela.trim().length === 0) {
      Alert.alert("Campo vacío", "Por favor, ingrese un nombre para la parcela.");
      return;
    }
    setIsSaving(true);
    try {
      const docRef = await addDoc(collection(db, "parcelas"), {
        nombre: nombreNuevaParcela.trim(),
      });
      console.log("Parcela guardada con ID: ", docRef.id);
      setNombreNuevaParcela(""); // Limpiar input
      fetchParcelas(); // Recargar la lista
    } catch (e) {
      console.error("Error al guardar parcela: ", e);
      Alert.alert("Error", "No se pudo guardar la nueva parcela.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Renderizar Item ---
  const renderItem = ({ item }: { item: Parcela }) => (
    <View style={styles.card}>
      <FontAwesome5 name="seedling" size={18} color={COLORS.primary} />
      <Text style={styles.cardText}>{item.nombre}</Text>
      {/* (Opcional: añadir botón de borrar) */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra de cabecera */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={24} color="white" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Cultivos</Text>
      </View>

      {/* --- Formulario para Añadir --- */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Añadir Nueva Parcela</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre de la Parcela (Ej: La Loma)"
          placeholderTextColor={COLORS.textSecondary}
          value={nombreNuevaParcela}
          onChangeText={setNombreNuevaParcela}
          editable={!isSaving}
        />
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleGuardarParcela}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Guardando..." : "Guardar Parcela"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- Lista de Parcelas Existentes --- */}
      <Text style={styles.sectionTitle}>Parcelas Existentes</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={parcelas}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay parcelas registradas.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  // Cabecera
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E91E63", 
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.surface,
    textAlign: "center",
    flex: 1,
    marginRight: 40,
  },
  iconButton: {
    padding: 5,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  // Formulario
  formContainer: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  input: {
    backgroundColor: "#F4F6F8",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.medium,
    fontWeight: "700",
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.7,
  },
  // Lista
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    fontWeight: "600",
    marginLeft: 15,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    marginTop: 20,
  },
});

export default GestionCultivosScreen;