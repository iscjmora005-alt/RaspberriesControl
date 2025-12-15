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
  Modal,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES, Material } from "../../../types"; 
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

import { db } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  doc,
  updateDoc, // <-- Para actualizar el stock
  increment // <-- Para sumar stock atómicamente
} from "firebase/firestore";

type InventarioNavProp = StackNavigationProp<RootStackParamList, "Inventario">;
interface Props {
  navigation: InventarioNavProp;
}

const InventarioScreen: React.FC<Props> = ({ navigation }) => {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nombreNuevoMaterial, setNombreNuevoMaterial] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Estados para el Modal de "Agregar Stock"
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [cantidadStock, setCantidadStock] = useState("");

  // --- Cargar Materiales ---
  const fetchMateriales = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "materiales"), orderBy("nombre"));
      const querySnapshot = await getDocs(q);
      const listaMateriales: Material[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().nombre,
        stock: doc.data().stock || 0, // Leemos el stock, si no existe es 0
      }));
      setMateriales(listaMateriales);
    } catch (e) {
      console.error("Error al obtener materiales: ", e);
      Alert.alert("Error", "No se pudieron cargar los materiales.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMateriales();
  }, []);

  // --- Guardar Nuevo Material (Catálogo) ---
  const handleGuardarMaterial = async () => {
    if (nombreNuevoMaterial.trim().length === 0) {
      Alert.alert("Campo vacío", "Ingrese un nombre para el material.");
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, "materiales"), {
        nombre: nombreNuevoMaterial.trim(),
        stock: 0, // Empieza con 0 stock
      });
      setNombreNuevoMaterial("");
      fetchMateriales();
    } catch (e) {
      console.error("Error al guardar material: ", e);
      Alert.alert("Error", "No se pudo crear el material.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Lógica del Modal para Agregar Stock ---
  const openStockModal = (material: Material) => {
    setSelectedMaterial(material);
    setCantidadStock("");
    setModalVisible(true);
  };

  const handleAddStock = async () => {
    if (!selectedMaterial || !cantidadStock) return;
    const cantidadNum = parseInt(cantidadStock);
    
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      Alert.alert("Error", "Ingrese una cantidad válida.");
      return;
    }

    try {
      const materialRef = doc(db, "materiales", selectedMaterial.id);
      // Usamos 'increment' de Firebase para sumar de forma segura
      await updateDoc(materialRef, {
        stock: increment(cantidadNum)
      });
      
      Alert.alert("Stock Actualizado", `Se agregaron ${cantidadNum} unidades a ${selectedMaterial.nombre}.`);
      setModalVisible(false);
      fetchMateriales(); // Recargar la lista para ver el nuevo total
    } catch (e) {
      console.error("Error stock:", e);
      Alert.alert("Error", "No se pudo actualizar el stock.");
    }
  };

  // --- Renderizar Item ---
  const renderItem = ({ item }: { item: Material }) => (
    <View style={styles.card}>
      <View style={styles.cardIconContainer}>
        <FontAwesome5 name="box-open" size={24} color={COLORS.primary} />
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardStock}>
          Disponible: <Text style={{fontWeight: 'bold', color: item.stock < 100 ? COLORS.error : COLORS.text}}>{item.stock}</Text> uds
        </Text>
      </View>

      {/* Botón para agregar stock (+) */}
      <TouchableOpacity style={styles.addStockButton} onPress={() => openStockModal(item)}>
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="white" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventario</Text>
      </View>

      {/* Formulario añadir nuevo tipo */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Crear Nuevo Tipo de Material</Text>
        <View style={styles.addInputRow}>
          <TextInput
            style={styles.inputInline}
            placeholder="Nombre (Ej: Caja 6oz)"
            placeholderTextColor={COLORS.textSecondary}
            value={nombreNuevoMaterial}
            onChangeText={setNombreNuevoMaterial}
          />
          <TouchableOpacity
            style={styles.addButtonInline}
            onPress={handleGuardarMaterial}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="white" /> : <MaterialIcons name="save" size={24} color="white" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista */}
      <Text style={styles.sectionTitleList}>Stock Actual</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={materiales}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay materiales registrados.</Text>}
        />
      )}

      {/* --- MODAL PARA SURTIR STOCK --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Surtir Inventario</Text>
              <Text style={styles.modalSubtitle}>Agregar material a: {selectedMaterial?.nombre}</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Cantidad a agregar (Ej: 500)"
                keyboardType="numeric"
                value={cantidadStock}
                onChangeText={setCantidadStock}
                autoFocus
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnConfirm} onPress={handleAddStock}>
                  <Text style={styles.btnTextConfirm}>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  headerBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#E91E63", padding: 15 },
  headerTitle: { fontSize: FONT_SIZES.large, fontWeight: "bold", color: COLORS.surface, textAlign: "center", flex: 1, marginRight: 40 },
  iconButton: { padding: 5 },
  
  // Formulario Creación
  formContainer: { backgroundColor: COLORS.surface, padding: 20, marginBottom: 10 },
  sectionTitle: { fontSize: FONT_SIZES.medium, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  addInputRow: { flexDirection: "row", alignItems: "center" },
  inputInline: { flex: 1, backgroundColor: "#F4F6F8", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, padding: 10, marginRight: 10 },
  addButtonInline: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  // Lista
  sectionTitleList: { fontSize: FONT_SIZES.large, fontWeight: "700", color: COLORS.text, marginLeft: 20, marginBottom: 10 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  cardIconContainer: { width: 40, alignItems: "center" },
  cardContent: { flex: 1, marginLeft: 10 },
  cardTitle: { fontSize: FONT_SIZES.medium, fontWeight: "600", color: COLORS.text },
  cardStock: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, marginTop: 4 },
  addStockButton: { backgroundColor: "#4CAF50", borderRadius: 20, padding: 8, elevation: 2 },
  emptyText: { textAlign: "center", color: COLORS.textSecondary, marginTop: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContainer: { backgroundColor: "white", borderRadius: 15, padding: 20, alignItems: "center", elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: COLORS.text },
  modalSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 20 },
  modalInput: { width: "100%", borderWidth: 1, borderColor: "#CCC", borderRadius: 8, padding: 12, fontSize: 18, textAlign: "center", marginBottom: 20 },
  modalButtons: { flexDirection: "row", width: "100%", justifyContent: "space-between" },
  btnCancel: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#EEE", marginRight: 10, alignItems: "center" },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: "center" },
  btnTextCancel: { fontWeight: "bold", color: "#555" },
  btnTextConfirm: { fontWeight: "bold", color: "white" },
});

export default InventarioScreen;