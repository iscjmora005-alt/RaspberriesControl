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
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES, Usuario, UserRole } from "../../../types";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";

type MantenimientoNavProp = StackNavigationProp<RootStackParamList, "Mantenimiento">;
interface Props {
  navigation: MantenimientoNavProp;
}

const MantenimientoScreen: React.FC<Props> = ({ navigation }) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  // Formulario
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<UserRole>("Asociado");

  // --- Cargar Usuarios ---
  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "usuarios"), orderBy("fechaRegistro", "desc"));
      const querySnapshot = await getDocs(q);
      const lista: Usuario[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }));
      setUsuarios(lista);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo cargar la lista de usuarios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // --- Guardar Nuevo Usuario ---
  const handleGuardar = async () => {
    // Validar todos los campos
    if (!nombre || !username || !password || !email || !telefono) {
      Alert.alert("Campos vacíos", "Por favor completa todos los campos.");
      return;
    }
  const phoneRegex = /^[0-9]{10}$/;
    
    if (!phoneRegex.test(telefono.trim())) {
      Alert.alert(
        "Teléfono Incorrecto", 
        "El número debe tener exactamente 10 dígitos numéricos (sin guiones ni espacios)."
      );
      return; // Detenemos la función aquí
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, "usuarios"), {
        nombre,
        username,
        password, // Nota: En una app real, esto debería encriptarse
        rol,
        email,   
        telefono,
        fechaRegistro: new Date()
      });
      
      Alert.alert("Éxito", `Usuario ${username} creado correctamente.`);
      
      // Limpiar formulario
      setNombre("");
      setUsername("");
      setPassword("");
      setEmail("");    
      setTelefono(""); 
      setRol("Asociado");
      
      fetchUsuarios();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo guardar el usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Borrar Usuario ---
  const handleBorrar = (id: string, nombreUser: string) => {
    Alert.alert("Eliminar Usuario", `¿Estás seguro de eliminar a ${nombreUser}?`, [
      { text: "Cancelar" },
      { 
        text: "Eliminar", 
        style: "destructive", 
        onPress: async () => {
          await deleteDoc(doc(db, "usuarios", id));
          fetchUsuarios();
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: Usuario }) => (
    <View style={styles.card}>
      <View style={styles.avatarBox}>
        <FontAwesome5 name="user" size={20} color="white" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.nombre}</Text>
        <Text style={styles.userDetails}>@{item.username} • {item.rol}</Text>
      </View>
      <TouchableOpacity onPress={() => handleBorrar(item.id, item.nombre)} style={styles.deleteBtn}>
        <MaterialIcons name="delete-outline" size={24} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="white" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Formulario */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Registrar Nuevo Empleado</Text>
            
            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput style={styles.input} placeholder="Ej: Juan Pérez" value={nombre} onChangeText={setNombre} />

            <Text style={styles.label}>Usuario (Login)</Text>
            <TextInput style={styles.input} placeholder="Ej: juanp" value={username} onChangeText={setUsername} autoCapitalize="none" />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput style={styles.input} placeholder="******" value={password} onChangeText={setPassword} secureTextEntry />

            {/* --- NUEVOS INPUTS --- */}
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput style={styles.input} placeholder="ejemplo@correo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Teléfono</Text>
            <TextInput style={styles.input} placeholder="351..." value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
            {/* --------------------- */}

            <Text style={styles.label}>Rol</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={rol}
                onValueChange={(itemValue) => setRol(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Asociado (Encargado)" value="Asociado" />
                <Picker.Item label="Registrador" value="Registrador" />
                <Picker.Item label="Administrador" value="Administrador" />
              </Picker>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleGuardar} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Crear Usuario</Text>}
            </TouchableOpacity>
          </View>

          {/* Lista */}
          <Text style={[styles.sectionTitle, {marginLeft: 20, marginTop: 20}]}>Usuarios Activos</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 20}} />
          ) : (
            <View style={styles.listContainer}>
              {usuarios.map(u => (
                <View key={u.id}>
                  {renderItem({ item: u })}
                </View>
              ))}
              {usuarios.length === 0 && <Text style={styles.emptyText}>No hay usuarios registrados.</Text>}
            </View>
          )}

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
  scrollContent: { paddingBottom: 30 },
  
  // Formulario
  formContainer: { backgroundColor: "white", margin: 20, padding: 20, borderRadius: 15, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text, marginBottom: 15 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 5, fontWeight: "500" },
  input: { backgroundColor: "#F9F9F9", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
  
  pickerContainer: { backgroundColor: "#F9F9F9", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, marginBottom: 20, ...(Platform.OS === 'ios' ? { height: 100, justifyContent: 'center' } : { height: 50 }) },
  picker: { width: "100%", color: COLORS.text, ...(Platform.OS === 'ios' ? { height: 100 } : { height: 50 }) },

  saveButton: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 15, alignItems: "center" },
  saveButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Lista
  listContainer: { paddingHorizontal: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  avatarBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.textSecondary, justifyContent: "center", alignItems: "center", marginRight: 15 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  userDetails: { fontSize: 14, color: COLORS.textSecondary },
  deleteBtn: { padding: 5 },
  emptyText: { textAlign: "center", color: COLORS.textSecondary, marginTop: 10 }
});

export default MantenimientoScreen;