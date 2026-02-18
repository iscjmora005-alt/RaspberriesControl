import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker"; 
import { MaterialIcons } from "@expo/vector-icons";
import { useRegistrarCosecha } from "../../hooks/useRegistrarCosecha"; 
import { COLORS, FONT_SIZES } from "../../../types";

// Componente visual simple
const FormInput = ({ label, value, onChangeText, placeholder, keyboardType = "numeric" }: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} />
  </View>
);

const RegistrarCosechaScreen = ({ navigation }: any) => {
  // ¡SOLO 1 LÍNEA DE LÓGICA!
  const { formData, updateForm, tipoBasquete, setTipoBasquete, imageUri, pickImage, catalogos, loadingCatalogos, isLoading, guardar } = useRegistrarCosecha();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
             <MaterialIcons name="arrow-back-ios" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar Cosecha</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView style={styles.contentContainer}>
          
          <View style={styles.formSection}>
            <Text style={styles.inputLabel}>Seleccione la Parcela</Text>
            {loadingCatalogos ? <ActivityIndicator /> : (
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={formData.parcela} onValueChange={(v) => updateForm("parcela", v)}>
                        <Picker.Item label="-- Seleccione --" value="" />
                        {catalogos.parcelas.map(p => <Picker.Item key={p.id} label={p.nombre} value={p.id} />)}
                    </Picker>
                </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.inputLabel}>Tipo de Empaque</Text>
            {loadingCatalogos ? <ActivityIndicator /> : (
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={formData.material} onValueChange={(v) => updateForm("material", v)}>
                        <Picker.Item label="-- Seleccione --" value="" />
                        {catalogos.materiales.map(m => <Picker.Item key={m.id} label={m.nombre} value={m.id} />)}
                    </Picker>
                </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.subSectionTitle}>Exportación</Text>
            <View style={styles.selectorContainer}>
              <TouchableOpacity style={[styles.selectorButton, tipoBasquete === '6oz' && styles.selectorButtonActive]} onPress={() => setTipoBasquete('6oz')}>
                <Text style={[styles.selectorButtonText, tipoBasquete === '6oz' && styles.selectorButtonTextActive]}>6oz</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.selectorButton, tipoBasquete === '12oz' && styles.selectorButtonActive]} onPress={() => setTipoBasquete('12oz')}>
                <Text style={[styles.selectorButtonText, tipoBasquete === '12oz' && styles.selectorButtonTextActive]}>12oz</Text>
              </TouchableOpacity>
            </View>
            {tipoBasquete === '6oz' && <FormInput label="Cantidad (unidades)" value={formData.exportacion6oz} onChangeText={(t: string) => updateForm("exportacion6oz", t)} placeholder="Ej: 500" />}
            {tipoBasquete === '12oz' && <FormInput label="Cantidad (unidades)" value={formData.exportacion12oz} onChangeText={(t: string) => updateForm("exportacion12oz", t)} placeholder="Ej: 300" />}
            <Text style={styles.subSectionTitle}>Proceso (Merma)</Text>
            <FormInput label="Charolas (unidades)" value={formData.procesoCharola} onChangeText={(t: string) => updateForm("procesoCharola", t)} placeholder="Ej: 20" />
          </View>

          <View style={styles.formSection}>
            {imageUri ? (
               <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
               <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                  <Text style={styles.cameraButtonText}>Tomar Foto</Text>
               </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} onPress={() => guardar(() => navigation.goBack())} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Guardar Reporte</Text>}
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
  selectorContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, marginTop: 5 },
  selectorButton: { flex: 1, padding: 12, alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, marginHorizontal: 5 },
  selectorButtonActive: { backgroundColor: COLORS.primary },
  selectorButtonText: { color: COLORS.primary, fontWeight: "600" },
  selectorButtonTextActive: { color: COLORS.surface },
  cameraButton: { backgroundColor: "#2196F3", borderRadius: 12, padding: 20, alignItems: "center", justifyContent: "center", marginVertical: 10 },
  cameraButtonText: { color: "white", fontWeight: "bold", marginTop: 5 },
  imagePreviewContainer: { alignItems: "center", marginVertical: 10 },
  imagePreview: { width: 200, height: 200, borderRadius: 10, marginBottom: 10 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 15, alignItems: "center", marginTop: 10, marginBottom: 40 },
  saveButtonText: { color: COLORS.surface, fontWeight: "700", fontSize: FONT_SIZES.medium },
  saveButtonDisabled: { backgroundColor: COLORS.textSecondary, opacity: 0.7 }
});

export default RegistrarCosechaScreen;