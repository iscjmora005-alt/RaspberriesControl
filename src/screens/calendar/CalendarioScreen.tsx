import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES, Evento } from "../../../types";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import NetInfo from '@react-native-community/netinfo';
import { guardarEventosLocal, obtenerEventosLocales } from "../../services/OfflineService";
import { Calendar, LocaleConfig } from "react-native-calendars";

// Configuración de idioma español para el calendario
LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

type CalendarioNavProp = StackNavigationProp<RootStackParamList, "Calendario">;
interface Props {
  navigation: CalendarioNavProp;
}

const CalendarioScreen: React.FC<Props> = ({ navigation }) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para la fecha seleccionada (por defecto HOY)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados del Formulario
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDesc, setNuevaDesc] = useState("");

  // --- Cargar Eventos ---
  const fetchEventos = async () => {
    try {
      const netState = await NetInfo.fetch();

      if (netState.isConnected) {
        // A. CON INTERNET: Bajamos de Firebase (Como siempre)
        console.log("Online: Actualizando calendario...");
        const q = query(collection(db, "eventos"), orderBy("fecha", "asc"));
        const querySnapshot = await getDocs(q);
        
        const eventosData: Evento[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Evento));

        setEventos(eventosData);
        await guardarEventosLocal(eventosData);

      } else {
        // B. SIN INTERNET: Leemos la copia guardada
        console.log("Offline: Cargando calendario guardado...");
        Alert.alert("Modo Offline", "Mostrando calendario guardado en el dispositivo.");
        
        const eventosGuardados = await obtenerEventosLocales();
        setEventos(eventosGuardados);
      }
    } catch (e) {
      console.error("Error al cargar eventos:", e);
      // Si falla la red, intentamos cargar lo local como respaldo de emergencia
      const backup = await obtenerEventosLocales();
      if (backup.length > 0) setEventos(backup);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  // --- Guardar Evento ---
  const handleGuardar = async () => {
    if (!nuevoTitulo) {
      Alert.alert("Error", "El título es obligatorio");
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "eventos"), {
        titulo: nuevoTitulo,
        fecha: selectedDate, 
        descripcion: nuevaDesc,
        tipo: "Otro",
        estado: "pendiente"
      });
      setModalVisible(false);
      setNuevoTitulo("");
      setNuevaDesc("");
      fetchEventos();
      Alert.alert("Éxito", "Actividad agendada para el " + selectedDate);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Cambiar Estado (Ciclo: Pendiente -> En Curso -> Completada) ---
  const handleChangeStatus = async (evento: Evento) => {
    let nuevoEstado: "pendiente" | "en_curso" | "completada" = "pendiente";
    
    if (evento.estado === "pendiente") nuevoEstado = "en_curso";
    else if (evento.estado === "en_curso") nuevoEstado = "completada";
    else nuevoEstado = "pendiente"; // Reiniciar

    try {
      const eventoRef = doc(db, "eventos", evento.id);
      await updateDoc(eventoRef, { estado: nuevoEstado });
      fetchEventos();
    } catch (error) {
      console.error("Error actualizando estado", error);
    }
  };

  // --- Borrar Evento ---
  const handleBorrar = (id: string) => {
    Alert.alert("Eliminar", "¿Borrar esta actividad?", [
      { text: "Cancelar" },
      { text: "Borrar", style: "destructive", onPress: async () => {
          await deleteDoc(doc(db, "eventos", id));
          fetchEventos();
      }}
    ]);
  };

  // --- Preparar Marcadores para el Calendario ---
  // Esto pinta los puntitos de colores en el calendario
  const markedDates = eventos.reduce((acc, evt) => {
    // Definir color del punto según estado
    let dotColor = COLORS.error; // Rojo (pendiente)
    if (evt.estado === 'en_curso') dotColor = '#FFC107'; // Amarillo
    if (evt.estado === 'completada') dotColor = '#4CAF50'; // Verde

    // Si ya existe la fecha, agregamos el punto, si no, creamos el array
    if (acc[evt.fecha]) {
      acc[evt.fecha].dots.push({ color: dotColor });
    } else {
      acc[evt.fecha] = { dots: [{ color: dotColor }] };
    }
    return acc;
  }, {} as any);

  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: COLORS.primary,
  };

  // Filtrar eventos para la lista de abajo
  const eventosDelDia = eventos.filter(e => e.fecha === selectedDate);

  const renderItem = ({ item }: { item: Evento }) => {
    // Colores e iconos según estado
    let statusColor = COLORS.textSecondary;
    let statusIcon = "clock";
    let statusText = "Pendiente";

    if (item.estado === "en_curso") {
      statusColor = "#FF9800"; // Naranja
      statusIcon = "spinner";
      statusText = "En Curso";
    } else if (item.estado === "completada") {
      statusColor = "#4CAF50"; // Verde
      statusIcon = "check-circle";
      statusText = "Completada";
    }

    return (
      <TouchableOpacity 
        style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 5 }]} 
        onPress={() => handleChangeStatus(item)}
        onLongPress={() => handleBorrar(item.id)}
      >
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{item.titulo}</Text>
          <Text style={styles.eventDesc}>{item.descripcion || "Sin descripción"}</Text>
          
          <View style={styles.statusBadge}>
            <FontAwesome5 name={statusIcon} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        
        <View style={{justifyContent:'center'}}>
           <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="white" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendario</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="add" size={28} color="white" style={{ marginRight: 10 }}/>
        </TouchableOpacity>
      </View>

      {/* --- CALENDARIO --- */}
      <View style={styles.calendarContainer}>
        <Calendar
       
       
          // Fecha seleccionada
          current={selectedDate}
          onDayPress={day => setSelectedDate(day.dateString)}
          // Marcadores (Puntitos y selección)
          markingType={'multi-dot'}
          markedDates={markedDates}
          // Estilos
          theme={{
            selectedDayBackgroundColor: COLORS.primary,
            todayTextColor: COLORS.primary,
            arrowColor: COLORS.primary,
            monthTextColor: COLORS.text,
            textDayFontWeight: '600',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: 'bold'
          }}
        />
      </View>

      {/* --- LISTA DE TAREAS DEL DÍA --- */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>
          Actividades del {selectedDate}
        </Text>
        
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : eventosDelDia.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay actividades para este día.</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={styles.linkText}>+ Agregar una</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={eventosDelDia}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Modal para Nuevo Evento */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Nueva Actividad</Text>
            <Text style={styles.modalSubtitle}>Para el día: {selectedDate}</Text>
            
            <Text style={styles.label}>Título</Text>
            <TextInput style={styles.input} placeholder="Ej: Riego Parcela 2" value={nuevoTitulo} onChangeText={setNuevoTitulo} />
            
            <Text style={styles.label}>Descripción</Text>
            <TextInput style={styles.input} placeholder="Detalles..." value={nuevaDesc} onChangeText={setNuevaDesc} multiline />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleGuardar} disabled={isSaving}>
                <Text style={[styles.btnText, {color:'white'}]}>{isSaving ? "..." : "Guardar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#9C27B0", padding: 15 },
  headerTitle: { fontSize: FONT_SIZES.large, fontWeight: "bold", color: "white" },
  iconButton: { padding: 5 },
  
  calendarContainer: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 10,
    overflow: 'hidden'
  },
  
  listContainer: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, marginTop: 10 },
  
  card: { 
    flexDirection: "row", 
    backgroundColor: "white", 
    borderRadius: 10, 
    padding: 15, 
    marginBottom: 10, 
    elevation: 2,
    justifyContent: 'space-between'
  },
  eventContent: { flex: 1, marginRight: 10 },
  eventTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  eventDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 5 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  statusText: { fontSize: 12, fontWeight: 'bold', marginLeft: 5 },

  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16 },
  linkText: { color: COLORS.primary, fontWeight: 'bold', marginTop: 10, fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContainer: { backgroundColor: "white", borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 5, textAlign: "center" },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: "center" },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#DDD", borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  btnCancel: { flex: 1, padding: 15, alignItems: "center", backgroundColor: "#EEE", borderRadius: 8, marginRight: 10 },
  btnSave: { flex: 1, padding: 15, alignItems: "center", backgroundColor: "#9C27B0", borderRadius: 8 },
  btnText: { fontWeight: "bold" }
});

export default CalendarioScreen;