import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator
} from "react-native";
import { MaterialIcons, FontAwesome5, Entypo } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { CommonActions, RouteProp, useRoute, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES, UserRole } from "../../../types";

// Firebase
import { db } from "../../firebaseConfig";
import { collection, query, orderBy, limit, getDocs, addDoc, doc, updateDoc, increment } from "firebase/firestore";

// --- OFFLINE IMPORTS ---
import NetInfo from '@react-native-community/netinfo';
import { obtenerReportesLocales, limpiarReportesLocales } from "../../services/OfflineService";
// -----------------------

type HomeScreenRouteProp = RouteProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: StackNavigationProp<RootStackParamList, "Home">;
}

interface MenuOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconLibrary: "FontAwesome5" | "MaterialIcons" | "Entypo";
  color: string;
  route?: keyof RootStackParamList;
  onPress?: () => void;
  roles: UserRole[];
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const route = useRoute<HomeScreenRouteProp>();
  const { user } = route.params; 
  const userRole = user.rol;

  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);

  // --- ESTADOS PARA SINCRONIZACIÓN ---
  const [isConnected, setIsConnected] = useState(true);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Checar conexión y pendientes al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      // Checar internet
      const unsubscribeNet = NetInfo.addEventListener(state => {
        setIsConnected(!!state.isConnected);
      });

      // Checar reportes guardados localmente
      const checkPending = async () => {
        const locales = await obtenerReportesLocales();
        setPendingReports(locales);
      };
      checkPending();

      return () => unsubscribeNet();
    }, [])
  );

  // 2. Función para subir imagen a Cloudinary (Reutilizada)
  const uploadImageToCloudinary = async (uri: string) => {
    const cloudName = "dfh6eyvxt"; 
    const uploadPreset = "cosecha_preset";
    const formData = new FormData();
    formData.append("file", { uri, type: "image/jpeg", name: "sync_upload.jpg" } as any);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST", body: formData
    });
    const data = await response.json();
    return data.secure_url;
  };

  // 3. FUNCIÓN DE SINCRONIZACIÓN (LA MAGIA)
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      let subidos = 0;

      for (const reporte of pendingReports) {
        // A. Subir foto si existe localmente
        let finalFotoUrl = "";
        if (reporte.localImageUri) {
          try {
            finalFotoUrl = await uploadImageToCloudinary(reporte.localImageUri);
          } catch (err) {
            console.error("Error subiendo foto pendiente", err);
          }
        }

        // B. Preparar objeto para Firebase
        const reporteFirebase = {
          ...reporte,
          fotoUrl: finalFotoUrl,
          fechaCreacion: new Date() // Fecha actual de subida
        };
        // Quitamos campos locales basura
        delete reporteFirebase.localImageUri; 

        // C. Guardar en Firestore
        await addDoc(collection(db, "reportesCosecha"), reporteFirebase);

        // D. Descontar Inventario (Si aplica)
        const totalMat = (reporte.exportacion6oz || 0) + (reporte.exportacion12oz || 0);
        if (totalMat > 0 && reporte.materialId) {
             const materialRef = doc(db, "materiales", reporte.materialId);
             await updateDoc(materialRef, { stock: increment(-totalMat) });
        }
        subidos++;
      }

      // E. Limpiar celular
      await limpiarReportesLocales();
      setPendingReports([]);
      Alert.alert("Sincronización Completa", `Se subieron ${subidos} reportes a la nube.`);
      
      // Recargar lista de recientes
      fetchRecents();

    } catch (error) {
      Alert.alert("Error", "Falló la sincronización. Intenta de nuevo.");
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Cargar Últimos Registros
  const fetchRecents = async () => {
        try {
          const q = query(
            collection(db, "reportesCosecha"),
            orderBy("fechaCreacion", "desc"),
            limit(2)
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRecentRecords(data);
        } catch (e) {
          console.error("Error cargando recientes:", e);
        } finally {
          setLoadingRecents(false);
        }
  };
  
  useFocusEffect(
    useCallback(() => {
      if (userRole === "Administrador" || userRole === "Asociado") {
        fetchRecents();
      } else {
        setLoadingRecents(false);
      }
    }, [])
  );

  // ... (Resto de funciones: handleLogout, handleProfile, handleNavigation, renderIcon IGUAL QUE ANTES) ...
  const handleLogout = (): void => {
    setMenuVisible(false);
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
  };

  const handleProfile = (): void => {
    setMenuVisible(false);
    navigation.navigate("Profile", { user });
  };

  const handleNavigation = (option: MenuOption): void => {
    if (option.route) navigation.navigate(option.route as any);
    else if (option.onPress) option.onPress();
  };

  const renderIcon = (option: MenuOption): React.ReactNode => {
    const size = 24; const color = "white";
    switch (option.iconLibrary) {
      case "FontAwesome5": return <FontAwesome5 name={option.icon as any} size={size} color={color} />;
      case "MaterialIcons": return <MaterialIcons name={option.icon as any} size={size} color={color} />;
      case "Entypo": return <Entypo name={option.icon as any} size={size} color={color} />;
      default: return <MaterialIcons name="help-outline" size={size} color={color} />;
    }
  };
  
  // Lista del menú (IGUAL QUE ANTES)
  const menuOptions: MenuOption[] = [
    { id: "registrar_cosecha", title: "Registrar Cosecha", subtitle: "Iniciar nuevo reporte diario", icon: "shopping-basket", iconLibrary: "FontAwesome5", color: "#4CAF50", route: "RegistrarCosecha", roles: ["Asociado", "Registrador"] },
    { id: "rendimiento", title: "Rendimiento", subtitle: "Ver gráficas y reportes", icon: "chart-line", iconLibrary: "FontAwesome5", color: "#FF9800", route: "Rendimiento", roles: ["Administrador", "Registrador"] },
    { id: "inventario", title: "Inventario", subtitle: "Gestionar stock de materiales", icon: "box-open", iconLibrary: "FontAwesome5", color: "#03A9F4", route: "Inventario", roles: ["Administrador"] },
    { id: "gestion_cultivos", title: "Gestión de Cultivos", subtitle: "Administrar parcelas", icon: "seedling", iconLibrary: "FontAwesome5", color: "#8BC34A", route: "GestionCultivos", roles: ["Administrador"] },
    { id: "calendario", title: "Calendario", subtitle: "Eventos y planificación", icon: "calendar-alt", iconLibrary: "FontAwesome5", color: "#9C27B0", route: "Calendario", roles: ["Administrador", "Asociado"] },
    { id: "mantenimiento", title: "Mantenimiento", subtitle: "Gestión de usuarios", icon: "users-cog", iconLibrary: "FontAwesome5", color: "#3F51B5", route: "Mantenimiento", roles: ["Administrador"] },
  ];

  const filteredOptions = menuOptions.filter((option) => option.roles.includes(userRole));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#B0161E" barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Hola, {user.nombre.split(' ')[0]}</Text>
          <Text style={styles.headerSubtitle}>{userRole}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => setMenuVisible(true)}>
           <FontAwesome5 name="user-circle" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* --- AVISO DE SINCRONIZACIÓN --- */}
        {pendingReports.length > 0 && isConnected && (
          <TouchableOpacity style={styles.syncCard} onPress={handleSync} disabled={isSyncing}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialIcons name="cloud-upload" size={30} color="white" style={{marginRight: 10}} />
                <View>
                    <Text style={styles.syncTitle}>Sincronizar Datos</Text>
                    <Text style={styles.syncSubtitle}>{pendingReports.length} reportes pendientes</Text>
                </View>
            </View>
            {isSyncing ? <ActivityIndicator color="white" /> : <MaterialIcons name="arrow-forward" size={24} color="white" />}
          </TouchableOpacity>
        )}

        {/* --- AVISO DE MODO OFFLINE --- */}
        {!isConnected && (
             <View style={styles.offlineBanner}>
                <MaterialIcons name="wifi-off" size={20} color="white" style={{marginRight: 8}} />
                <Text style={{color:'white', fontWeight:'bold'}}>Modo Sin Conexión Activado</Text>
             </View>
        )}

        {/* Menú Principal */}
        <View style={styles.menuContainer}>
          {filteredOptions.map((option) => (
            <TouchableOpacity key={option.id} style={styles.menuCard} onPress={() => handleNavigation(option)} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: option.color }]}>
                {renderIcon(option)}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.menuTitle}>{option.title}</Text>
                <Text style={styles.menuSubtitle}>{option.subtitle}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Últimos Registros */}
        {(userRole === "Administrador" || userRole === "Asociado") && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionHeader}>Últimos Registros</Text>
            {loadingRecents ? (
              <ActivityIndicator color={COLORS.primary} style={{marginTop: 10}} />
            ) : recentRecords.length === 0 ? (
              <Text style={styles.emptyText}>No hay actividad reciente.</Text>
            ) : (
              recentRecords.map((item) => (
                <View key={item.id} style={styles.recentCard}>
                  <View style={styles.recentIconBox}>
                    <FontAwesome5 name="leaf" size={16} color="#555" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.recentTitle}>{item.parcelaNombre || "Parcela Desc."}</Text>
                    <Text style={styles.recentSubtitle}>{(item.exportacion6oz + item.exportacion12oz)} Cajas • {item.materialNombre}</Text>
                  </View>
                  <Text style={styles.recentTime}>
                    {item.fechaCreacion?.toDate ? item.fechaCreacion.toDate().toLocaleDateString("es-MX", {day:'2-digit', month:'short'}) : "Hoy"}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Menú */}
      <Modal animationType="fade" transparent={true} visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Opciones de Cuenta</Text>
            <TouchableOpacity style={styles.modalOption} onPress={handleProfile}>
              <MaterialIcons name="person" size={24} color={COLORS.primary} />
              <Text style={styles.modalOptionText}>Mi Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={handleLogout}>
              <MaterialIcons name="logout" size={24} color={COLORS.error} />
              <Text style={[styles.modalOptionText, {color: COLORS.error}]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#D32F2F", paddingHorizontal: 20, paddingVertical: 20, paddingTop: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  profileButton: { padding: 5 },
  scrollContent: { padding: 20 },
  
  // --- Estilos Sync y Offline ---
  syncCard: { backgroundColor: "#2196F3", borderRadius: 12, padding: 15, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
  syncTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  syncSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  offlineBanner: { backgroundColor: '#607D8B', padding: 10, borderRadius: 8, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  menuContainer: { marginBottom: 25 },
  menuCard: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginRight: 15 },
  textContainer: { flex: 1 },
  menuTitle: { fontSize: 17, fontWeight: "bold", color: "#333" },
  menuSubtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  recentSection: { marginTop: 10 },
  sectionHeader: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 15 },
  recentCard: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: "#D32F2F", elevation: 2 },
  recentIconBox: { width: 35, height: 35, borderRadius: 10, backgroundColor: "#F0F0F0", justifyContent: "center", alignItems: "center", marginRight: 12 },
  recentTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  recentSubtitle: { fontSize: 12, color: "#666" },
  recentTime: { fontSize: 12, color: "#999", fontWeight: "600" },
  emptyText: { fontStyle: "italic", color: "#999" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalContent: { width: "80%", backgroundColor: "white", borderRadius: 15, padding: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  modalOption: { flexDirection: "row", alignItems: "center", paddingVertical: 15, borderBottomWidth: 1, borderColor: "#EEE" },
  modalOptionText: { fontSize: 16, marginLeft: 15, fontWeight: "500", color: "#333" },
});

export default HomeScreen;