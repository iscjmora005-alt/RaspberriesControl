import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator
} from "react-native";
import { Picker } from "@react-native-picker/picker"; 
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES, ReporteCosechaData, Parcela, Material } from "../../../types";
import { MaterialIcons } from "@expo/vector-icons";
import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, increment } from "firebase/firestore";
import * as ImagePicker from 'expo-image-picker';

// --- NUEVAS IMPORTACIONES PARA OFFLINE ---
import NetInfo from '@react-native-community/netinfo';
import { guardarReporteLocal,obtenerCatalogosLocales, // <-- Importar esto
  guardarCatalogosLocal } from "../../services/OfflineService";
// -----------------------------------------

// --- Componente Input (Igual que antes) ---
interface FormInputProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
}
const FormInput: React.FC<FormInputProps> = ({ label, value, placeholder, onChangeText, keyboardType = "numeric" }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textSecondary}
      keyboardType={keyboardType}
      returnKeyType="done"
    />
  </View>
);

type RegistrarCosechaNavProp = StackNavigationProp<RootStackParamList, "RegistrarCosecha">;
interface Props {
  navigation: RegistrarCosechaNavProp;
}
type TipoBasquete = "6oz" | "12oz";

const RegistrarCosechaScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState<ReporteCosechaData>({
    parcela: "", material: "", exportacion6oz: "", exportacion12oz: "", procesoCharola: "", materialSobrante: "",
  });
  
  const [tipoBasquete, setTipoBasquete] = useState<TipoBasquete | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]); 
  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(true);

  // Cargar catálogos
  // Cargar catálogos (INTELIGENTE)
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const netState = await NetInfo.fetch();
        
        if (netState.isConnected) {
          // A. CON INTERNET: Bajamos de Firebase y actualizamos la copia local
          console.log("Online: Descargando catálogos...");
          
          const qParcelas = query(collection(db, "parcelas"), orderBy("nombre"));
          const snapParcelas = await getDocs(qParcelas);
          const listaParcelas = snapParcelas.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));

          const qMateriales = query(collection(db, "materiales"), orderBy("nombre"));
          const snapMateriales = await getDocs(qMateriales);
          const listaMateriales = snapMateriales.docs.map(d => ({ 
            id: d.id, 
            nombre: d.data().nombre,
            stock: d.data().stock || 0 
          }));

          setParcelas(listaParcelas as any);
          setMateriales(listaMateriales as any);

          // ¡GUARDAMOS LA COPIA LOCAL!
          await guardarCatalogosLocal(listaParcelas, listaMateriales);

        } else {
          // B. SIN INTERNET: Usamos la copia guardada
          console.log("Offline: Usando catálogos guardados...");
          Alert.alert("Modo Offline", "Usando listas de parcelas y materiales guardadas en el dispositivo.");
          
          const datosLocales = await obtenerCatalogosLocales();
          setParcelas(datosLocales.parcelas);
          setMateriales(datosLocales.materiales);
        }

      } catch (e) {
        console.error("Error cargando catálogos: ", e);
        Alert.alert("Error", "No se pudieron cargar las listas.");
      } finally {
        setIsLoadingCatalogos(false);
      }
    };
    fetchCatalogos();
  }, []);
  const updateForm = (key: keyof ReporteCosechaData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permiso requerido", "Necesitas dar permiso a la cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImageToCloudinary = async (uri: string) => {
    const cloudName = "dfh6eyvxt"; 
    const uploadPreset = "cosecha_preset";
    const formData = new FormData();
    formData.append("file", { uri: uri, type: "image/jpeg", name: "upload.jpg" } as any);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST", body: formData
      });
      const data = await response.json();
      if (data.secure_url) return data.secure_url;
      else throw new Error("No se recibió el link de Cloudinary");
    } catch (error) {
      console.error("Error subiendo a Cloudinary:", error);
      throw error;
    }
  };

  // --- FUNCIÓN PRINCIPAL DE GUARDADO (Modificada para Offline) ---
  const handleGuardar = async () => {
    // Validaciones
    if (!formData.parcela) return Alert.alert("Falta Parcela", "Seleccione una parcela.");
    if (!formData.material) return Alert.alert("Falta Material", "Seleccione el material.");
    if (!tipoBasquete) return Alert.alert("Falta Tipo", "Elija el tipo de basquete.");
    
    const cantidad6oz = parseInt(formData.exportacion6oz) || 0;
    const cantidad12oz = parseInt(formData.exportacion12oz) || 0;
    const cantidadProceso = parseInt(formData.procesoCharola) || 0;

    if ((tipoBasquete === '6oz' && cantidad6oz <= 0) || (tipoBasquete === '12oz' && cantidad12oz <= 0)) {
      return Alert.alert("Falta Cantidad", "Ingrese la cantidad cosechada.");
    }

    setIsSaving(true);
    
    try {
      // 1. VERIFICAR CONEXIÓN A INTERNET
      const state = await NetInfo.fetch();
      const isConnected = state.isConnected;

      // Objeto Base del Reporte (sin foto URL final todavía)
      const reporteBase = {
        parcelaId: formData.parcela,
        parcelaNombre: parcelas.find(p => p.id === formData.parcela)?.nombre || "Desconocida",
        materialId: formData.material,
        materialNombre: materiales.find(m => m.id === formData.material)?.nombre || "Desconocido",
        exportacion6oz: tipoBasquete === '6oz' ? cantidad6oz : 0,
        exportacion12oz: tipoBasquete === '12oz' ? cantidad12oz : 0,
        procesoCharola: cantidadProceso,
        materialSobrante: formData.materialSobrante,
        fechaCreacion: new Date().toISOString(), // Usamos string para que se guarde bien en JSON local
        localImageUri: imageUri // Guardamos la ruta local de la foto por si estamos offline
      };

      if (isConnected) {
        // --- MODO ONLINE (Como siempre) ---
        let finalFotoUrl = "";
        if (imageUri) {
          finalFotoUrl = await uploadImageToCloudinary(imageUri);
        }

        const reporteOnline = {
            ...reporteBase,
            fotoUrl: finalFotoUrl,
            fechaCreacion: new Date() // Convertimos a objeto Date para Firestore
        };
        // Borramos la ruta local antes de subir porque ya no la ocupamos en la nube
        delete (reporteOnline as any).localImageUri; 

        await addDoc(collection(db, "reportesCosecha"), reporteOnline);

        // Descontar Inventario
        const totalMaterialGastado = (tipoBasquete === '6oz' ? cantidad6oz : 0) + (tipoBasquete === '12oz' ? cantidad12oz : 0);
        if (totalMaterialGastado > 0) {
          const materialRef = doc(db, "materiales", formData.material);
          await updateDoc(materialRef, { stock: increment(-totalMaterialGastado) });
        }

        Alert.alert("Éxito", "Reporte guardado en la nube.");

      } else {
        // --- MODO OFFLINE (Nuevo) ---
        // Guardamos en el celular para subirlo luego
        await guardarReporteLocal(reporteBase);
        
        Alert.alert(
            "Sin Conexión", 
            "El reporte se guardó en el dispositivo. Recuerda sincronizar cuando tengas internet."
        );
      }

      navigation.goBack();

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo procesar el reporte.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // ... (El JSX visual NO cambia nada, déjalo igual que antes)
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="white" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Cosecha</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView style={styles.contentContainer}>
          
          {/* PARCELA */}
          <Text style={styles.sectionTitle}>📍 Ubicación</Text>
          <View style={styles.formSection}>
            <Text style={styles.inputLabel}>Seleccione la Parcela</Text>
            {isLoadingCatalogos ? <Text>Cargando...</Text> : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.parcela}
                  onValueChange={(val) => updateForm("parcela", val)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Seleccione --" value="" />
                  {parcelas.map(p => <Picker.Item key={p.id} label={p.nombre} value={p.id} />)}
                </Picker>
              </View>
            )}
          </View>

          {/* MATERIAL */}
          <Text style={styles.sectionTitle}>📦 Material</Text>
          <View style={styles.formSection}>
            <Text style={styles.inputLabel}>Tipo de Empaque</Text>
            {isLoadingCatalogos ? <Text>Cargando...</Text> : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.material}
                  onValueChange={(val) => updateForm("material", val)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Seleccione --" value="" />
                  {materiales.map(m => <Picker.Item key={m.id} label={m.nombre} value={m.id} />)}
                </Picker>
              </View>
            )}
          </View>

          {/* PRODUCCIÓN */}
          <Text style={styles.sectionTitle}>🍓 Producción</Text>
          <View style={styles.formSection}>
            <Text style={styles.subSectionTitle}>Exportación</Text>
            <View style={styles.selectorContainer}>
              <TouchableOpacity 
                style={[styles.selectorButton, tipoBasquete === '6oz' && styles.selectorButtonActive]}
                onPress={() => setTipoBasquete('6oz')}
              >
                <Text style={[styles.selectorButtonText, tipoBasquete === '6oz' && styles.selectorButtonTextActive]}>6oz</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.selectorButton, tipoBasquete === '12oz' && styles.selectorButtonActive]}
                onPress={() => setTipoBasquete('12oz')}
              >
                <Text style={[styles.selectorButtonText, tipoBasquete === '12oz' && styles.selectorButtonTextActive]}>12oz</Text>
              </TouchableOpacity>
            </View>

            {tipoBasquete === '6oz' && (
              <FormInput label="Cantidad (unidades)" value={formData.exportacion6oz} onChangeText={(t) => updateForm("exportacion6oz", t)} placeholder="Ej: 500" />
            )}
            {tipoBasquete === '12oz' && (
              <FormInput label="Cantidad (unidades)" value={formData.exportacion12oz} onChangeText={(t) => updateForm("exportacion12oz", t)} placeholder="Ej: 300" />
            )}

            <Text style={styles.subSectionTitle}>Proceso (Merma)</Text>
            <FormInput label="Charolas (unidades)" value={formData.procesoCharola} onChangeText={(t) => updateForm("procesoCharola", t)} placeholder="Ej: 20" />
          </View>

          {/* EVIDENCIA */}
          <Text style={styles.sectionTitle}>📸 Evidencia</Text>
          <View style={styles.formSection}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.retakeButton} onPress={pickImage}>
                  <Text style={styles.retakeText}>Tomar otra</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                <MaterialIcons name="camera-alt" size={32} color="white" />
                <Text style={styles.cameraButtonText}>Tomar Foto</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* NOTAS */}
          <Text style={styles.sectionTitle}>📝 Notas</Text>
          <View style={styles.formSection}>
            <FormInput
              label="Comentarios"
              value={formData.materialSobrante}
              onChangeText={(t) => updateForm("materialSobrante", t)}
              placeholder="..."
              keyboardType="default"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
            onPress={handleGuardar} 
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Guardar Reporte</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  headerBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#E91E63", padding: 15 },
  headerTitle: { fontSize: FONT_SIZES.large, fontWeight: "bold", color: COLORS.surface, textAlign: "center", flex: 1, marginRight: 40 },
  iconButton: { padding: 5 },
  contentContainer: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: FONT_SIZES.large, fontWeight: "700", color: COLORS.text, marginTop: 10, marginBottom: 10 },
  formSection: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 15, marginBottom: 20, elevation: 2 },
  subSectionTitle: { fontSize: FONT_SIZES.medium, fontWeight: "600", color: COLORS.primary, marginTop: 10, marginBottom: 5, borderBottomWidth: 1, borderColor: "#E0E0E0", paddingBottom: 5 },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, marginBottom: 5, fontWeight: "500" },
  input: { backgroundColor: "#F4F6F8", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, padding: 10, fontSize: FONT_SIZES.medium, color: COLORS.text },
  pickerContainer: { backgroundColor: "#F4F6F8", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, marginBottom: 5, ...(Platform.OS === 'ios' ? { height: 150, justifyContent: 'center' } : { height: 50 }) },
  picker: { width: "100%", color: COLORS.text, ...(Platform.OS === 'ios' ? { height: 150 } : { height: 50 }) },
  selectorContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, marginTop: 5 },
  selectorButton: { flex: 1, padding: 12, alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, marginHorizontal: 5 },
  selectorButtonActive: { backgroundColor: COLORS.primary },
  selectorButtonText: { color: COLORS.primary, fontWeight: "600" },
  selectorButtonTextActive: { color: COLORS.surface },
  cameraButton: { backgroundColor: "#2196F3", borderRadius: 12, padding: 20, alignItems: "center", justifyContent: "center", marginVertical: 10 },
  cameraButtonText: { color: "white", fontWeight: "bold", marginTop: 5 },
  imagePreviewContainer: { alignItems: "center", marginVertical: 10 },
  imagePreview: { width: 200, height: 200, borderRadius: 10, marginBottom: 10 },
  retakeButton: { padding: 10 },
  retakeText: { color: "#2196F3", fontWeight: "bold" },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 15, alignItems: "center", marginTop: 10, marginBottom: 40 },
  saveButtonText: { color: COLORS.surface, fontWeight: "700", fontSize: FONT_SIZES.medium },
  saveButtonDisabled: { backgroundColor: COLORS.textSecondary, opacity: 0.7 }
});

export default RegistrarCosechaScreen;