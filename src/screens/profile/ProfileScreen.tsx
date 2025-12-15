import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator // <-- Importante para mostrar carga
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES } from "../../../types";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
// --- 1. Importar ImagePicker ---
import * as ImagePicker from 'expo-image-picker';

type ProfileScreenNavProp = StackNavigationProp<RootStackParamList, "Profile">;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, "Profile">;

interface Props {
  navigation: ProfileScreenNavProp;
  route: ProfileScreenRouteProp;
}

const ProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = route.params;

  // Estado datos del usuario (Incluye avatarUrl)
  const [userData, setUserData] = useState({
    name: user.nombre,       // <-- Dato real
    email: user.email,       // <-- Dato real
    phone: user.telefono,    // <-- Dato real
    location: "Zamora, Michoacán", // (Este puedes dejarlo fijo o agregarlo a la BD después)
    joinDate: "Activo",
    avatarUrl: null as string | null
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState({ ...userData });
  const [isUploading, setIsUploading] = useState(false); // Para mostrar cargando al subir foto

  // --- 2. Función para Subir a Cloudinary (La misma que ya tenías) ---
  const uploadImageToCloudinary = async (uri: string) => {
    const cloudName = "dfh6eyvxt"; 
    const uploadPreset = "cosecha_preset";

    const formData = new FormData();
    formData.append("file", { uri, type: "image/jpeg", name: "profile.jpg" } as any);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST", body: formData
      });
      const data = await response.json();
      if (data.secure_url) return data.secure_url;
      throw new Error("Error al obtener link");
    } catch (error) {
      console.error("Error Cloudinary:", error);
      throw error;
    }
  };

  // --- 3. Función para abrir Galería y subir foto ---
  const handlePickAvatar = async () => {
    // Pedir permiso a la galería
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permiso requerido", "Se necesita acceso a la galería para cambiar la foto.");
      return;
    }

    // Abrir galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Cuadrada para que se vea bien redonda
      quality: 0.5,
    });

    if (!result.canceled) {
      setIsUploading(true);
      try {
        // Subir a la nube
        const uploadedUrl = await uploadImageToCloudinary(result.assets[0].uri);
        // Actualizar la vista previa en el modal
        setEditData({ ...editData, avatarUrl: uploadedUrl });
      } catch (error) {
        Alert.alert("Error", "No se pudo subir la imagen.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleEdit = () => {
    setEditData({ ...userData });
    setModalVisible(true);
  };

  const handleSave = () => {
    setUserData({ ...editData }); // Guardamos los cambios (incluyendo la nueva foto)
    setModalVisible(false);
    Alert.alert("Éxito", "Perfil actualizado correctamente.");
  };

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => {
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.headerBackground}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <TouchableOpacity onPress={handleEdit}>
            <MaterialIcons name="edit" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {/* --- 4. Mostrar Foto Real o Ícono --- */}
            {userData.avatarUrl ? (
              <Image source={{ uri: userData.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <FontAwesome5 name="user-circle" size={80} color={COLORS.textSecondary} />
            )}
          </View>
          <Text style={styles.userName}>{userData.name}</Text>
          <Text style={styles.userRole}>{user.rol}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}><Text style={styles.statNumber}>125</Text><Text style={styles.statLabel}>Reportes</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}><Text style={styles.statNumber}>Active</Text><Text style={styles.statLabel}>Estado</Text></View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          <InfoRow icon="email" label="Correo" value={userData.email} />
          <InfoRow icon="phone" label="Teléfono" value={userData.phone} />
          <InfoRow icon="location-on" label="Ubicación" value={userData.location} />
          <InfoRow icon="calendar-today" label="Miembro desde" value={userData.joinDate} />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="white" style={{marginRight: 10}} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- MODAL DE EDICIÓN --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboard}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              
              {/* --- 5. Botón para cambiar foto en el modal --- */}
              <View style={{alignItems: 'center', marginBottom: 20}}>
                <TouchableOpacity onPress={handlePickAvatar} disabled={isUploading}>
                  {isUploading ? (
                    <View style={[styles.avatarImageModal, {justifyContent:'center', alignItems:'center', backgroundColor:'#EEE'}]}>
                        <ActivityIndicator color={COLORS.primary} />
                    </View>
                  ) : editData.avatarUrl ? (
                    <Image source={{ uri: editData.avatarUrl }} style={styles.avatarImageModal} />
                  ) : (
                    <FontAwesome5 name="user-circle" size={100} color={COLORS.textSecondary} />
                  )}
                  <View style={styles.editIconBadge}>
                    <MaterialIcons name="photo-camera" size={20} color="white" />
                  </View>
                </TouchableOpacity>
                <Text style={{color: COLORS.primary, marginTop: 5, fontWeight: '600'}}>Toca para cambiar foto</Text>
              </View>

              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput style={styles.input} value={editData.name} onChangeText={(text) => setEditData({...editData, name: text})} />

              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput style={styles.input} value={editData.phone} onChangeText={(text) => setEditData({...editData, phone: text})} keyboardType="phone-pad" />

              <Text style={styles.inputLabel}>Ubicación</Text>
              <TextInput style={styles.input} value={editData.location} onChangeText={(text) => setEditData({...editData, location: text})} />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={isUploading}>
                  <Text style={styles.btnTextSave}>{isUploading ? "Subiendo..." : "Guardar Cambios"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

// Componente auxiliar para filas de info
const InfoRow = ({ icon, label, value }: any) => (
  <View style={styles.infoRow}>
    <View style={styles.iconBox}><MaterialIcons name={icon} size={20} color={COLORS.primary} /></View>
    <View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  headerBackground: {
     backgroundColor:
      COLORS.primary,
       height: 100,
        paddingTop: 50,
         paddingHorizontal: 20,
          borderBottomLeftRadius: 30,
           borderBottomRightRadius: 30
           },
  headerNav: {
     flexDirection: "row",
      justifyContent: "space-between",
       alignItems: "center"
       },
  headerTitle: {
     color: "white",
     fontSize: FONT_SIZES.xlarge,
      fontWeight: "bold" },
  scrollContent: { paddingBottom: 40 
  },
  profileCard: { 
    backgroundColor: "white",
     marginHorizontal: 20,
      marginTop: 70,
      borderRadius: 20,
       padding: 20,
        paddingTop: 50,
         alignItems: "center",
          elevation: 5,
           position: 'relative' },
  
  avatarContainer: { position: 'absolute', top: -50, backgroundColor: '#F4F6F8', borderRadius: 60, padding: 5, elevation: 10, zIndex: 10 },
  // Estilo para la imagen real
  avatarImage: { width: 80, height: 80, borderRadius: 40 },

  userName: { fontSize: FONT_SIZES.large, fontWeight: "bold", color: COLORS.text, marginTop: 10 },
  userRole: { fontSize: FONT_SIZES.medium, color: COLORS.primary, fontWeight: "600", marginTop: 2, marginBottom: 20 },
  statsRow: { flexDirection: "row", width: "100%", justifyContent: "space-around", borderTopWidth: 1, borderColor: "#EEE", paddingTop: 15 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  statDivider: { width: 1, height: "100%", backgroundColor: "#EEE" },
  sectionContainer: { marginTop: 20, marginHorizontal: 20, backgroundColor: "white", borderRadius: 15, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text, marginBottom: 15 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  iconBox: { width: 40, height: 40, backgroundColor: "#FFF0F0", borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 15 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  logoutButton: { flexDirection: "row", backgroundColor: COLORS.error, marginHorizontal: 20, marginTop: 25, padding: 15, borderRadius: 12, justifyContent: "center", alignItems: "center", elevation: 2 },
  logoutText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalKeyboard: { width: "100%" },
  modalContainer: { backgroundColor: "white", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center", color: COLORS.text },
  
  // Estilos para la imagen en el modal
  avatarImageModal: { width: 100, height: 100, borderRadius: 50 },
  editIconBadge: { position: 'absolute', right: 0, bottom: 0, backgroundColor: COLORS.primary, padding: 8, borderRadius: 20, elevation: 2 },

  inputLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 5, fontWeight: "600" },
  input: { backgroundColor: "#F4F6F8", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15, color: COLORS.text },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  btnCancel: { flex: 1, backgroundColor: "#EEE", padding: 15, borderRadius: 10, marginRight: 10, alignItems: "center" },
  btnSave: { flex: 1, backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: "center" },
  btnTextCancel: { fontWeight: "bold", color: "#666" },
  btnTextSave: { fontWeight: "bold", color: "white" },
});

export default ProfileScreen;