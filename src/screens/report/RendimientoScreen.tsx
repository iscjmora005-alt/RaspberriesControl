import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES, ReporteGuardado } from "../../../types";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

// Firebase
import { db } from "../../firebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// Gráficas
import { PieChart, BarChart } from "react-native-chart-kit";

// --- IMPORTAR LIBRERÍAS DE PDF ---
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type RendimientoNavProp = StackNavigationProp<RootStackParamList, "Rendimiento">;
interface Props {
  navigation: RendimientoNavProp;
}

const screenWidth = Dimensions.get("window").width;

const RendimientoScreen: React.FC<Props> = ({ navigation }) => {
  const [reportes, setReportes] = useState<ReporteGuardado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // Estado para el botón PDF

  const [totalesTipo, setTotalesTipo] = useState({
    export6oz: 0,
    export12oz: 0,
    proceso: 0
  });

  const [datosParcelas, setDatosParcelas] = useState<{labels: string[], data: number[]}>({
    labels: [],
    data: []
  });

  const fetchReportes = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true); 
    setError(null);
    try {
      const q = query(collection(db, "reportesCosecha"), orderBy("fechaCreacion", "desc"));
      const querySnapshot = await getDocs(q);
      
      let sum6oz = 0;
      let sum12oz = 0;
      let sumProceso = 0;
      const mapParcelas: Record<string, number> = {};

      const listaReportes: ReporteGuardado[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        
        const cant6oz = data.exportacion6oz || 0;
        const cant12oz = data.exportacion12oz || 0;
        const cantProceso = data.procesoCharola || 0;

        sum6oz += cant6oz;
        sum12oz += cant12oz;
        sumProceso += cantProceso;

        const nombreParcela = data.parcelaNombre || "Desc.";
        const totalCajas = cant6oz + cant12oz;

        if (mapParcelas[nombreParcela]) {
          mapParcelas[nombreParcela] += totalCajas;
        } else {
          mapParcelas[nombreParcela] = totalCajas;
        }

        return {
          id: doc.id,
          ...(data as any),
        };
      });

      setReportes(listaReportes);
      setTotalesTipo({ export6oz: sum6oz, export12oz: sum12oz, proceso: sumProceso });

      const labels = Object.keys(mapParcelas);
      const dataValues = Object.values(mapParcelas);
      setDatosParcelas({ labels, data: dataValues });

    } catch (e) {
      console.error("Error: ", e);
      setError("No se pudieron cargar los reportes.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReportes(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReportes();
    }, [])
  );

  // --- FUNCIÓN PARA GENERAR PDF ---
  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // 1. Construir filas de la tabla HTML
      const filasHTML = reportes.map(r => {
        const fecha = r.fechaCreacion?.toDate 
          ? r.fechaCreacion.toDate().toLocaleDateString("es-MX") 
          : "N/A";
        
        // Si hay foto, la ponemos pequeña
        const fotoHTML = r.fotoUrl 
          ? `<img src="${r.fotoUrl}" style="width: 50px; height: 50px; border-radius: 5px;" />` 
          : 'Sin foto';

        return `
          <tr>
            <td>${fecha}</td>
            <td>${r.parcelaNombre}</td>
            <td>${r.materialNombre}</td>
            <td style="text-align: center">${r.exportacion6oz}</td>
            <td style="text-align: center">${r.exportacion12oz}</td>
            <td style="text-align: center">${r.procesoCharola}</td>
            <td style="text-align: center">${fotoHTML}</td>
          </tr>
        `;
      }).join('');

      // 2. Construir el documento HTML completo
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              h1 { color: #E91E63; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; color: #333; }
              .resumen { margin-bottom: 20px; border: 1px solid #E91E63; padding: 10px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h1>Reporte de Cosecha</h1>
            <p>Generado el: ${new Date().toLocaleDateString("es-MX")}</p>
            
            <div class="resumen">
              <h3>Resumen Total</h3>
              <p><strong>Exportación 6oz:</strong> ${totalesTipo.export6oz}</p>
              <p><strong>Exportación 12oz:</strong> ${totalesTipo.export12oz}</p>
              <p><strong>Proceso (Merma):</strong> ${totalesTipo.proceso}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Parcela</th>
                  <th>Material</th>
                  <th>6oz</th>
                  <th>12oz</th>
                  <th>Proc.</th>
                  <th>Evidencia</th>
                </tr>
              </thead>
              <tbody>
                ${filasHTML}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // 3. Generar el archivo PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // 4. Compartir el archivo
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      Alert.alert("Error", "No se pudo generar el PDF.");
      console.error(error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const pieData = [
    { name: "6oz", population: totalesTipo.export6oz, color: "#FF9800", legendFontColor: "#7F7F7F", legendFontSize: 12 },
    { name: "12oz", population: totalesTipo.export12oz, color: "#2196F3", legendFontColor: "#7F7F7F", legendFontSize: 12 },
    { name: "Proceso", population: totalesTipo.proceso, color: "#E91E63", legendFontColor: "#7F7F7F", legendFontSize: 12 },
  ];

  const barChartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  const onScroll = (event: any) => {
    const slide = Math.ceil(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
    if (slide !== activeSlide) setActiveSlide(slide);
  };

  const renderHeader = () => (
    <View>
      <View style={styles.chartContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View style={{ width: screenWidth - 40, alignItems: 'center' }}>
            <Text style={styles.chartTitle}>Producción por Tipo</Text>
            {(totalesTipo.export6oz + totalesTipo.export12oz + totalesTipo.proceso) > 0 ? (
              <PieChart
                data={pieData}
                width={screenWidth - 40}
                height={220}
                chartConfig={barChartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
              />
            ) : (
              <Text style={styles.noDataText}>No hay datos para mostrar.</Text>
            )}
          </View>

          <View style={{ width: screenWidth - 40, alignItems: 'center' }}>
            <Text style={styles.chartTitle}>Rendimiento por Parcela (Cajas)</Text>
            {datosParcelas.data.length > 0 ? (
              <BarChart
                data={{
                  labels: datosParcelas.labels,
                  datasets: [{ data: datosParcelas.data }]
                }}
                width={screenWidth - 60}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={barChartConfig}
                verticalLabelRotation={30}
                fromZero
                showValuesOnTopOfBars
              />
            ) : (
              <Text style={styles.noDataText}>Registra cosechas para ver comparativa.</Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.pagination}>
          <View style={[styles.dot, activeSlide === 0 ? styles.dotActive : styles.dotInactive]} />
          <View style={[styles.dot, activeSlide === 1 ? styles.dotActive : styles.dotInactive]} />
        </View>
      </View>

      {/* --- BOTÓN DE PDF (Debajo de las gráficas) --- */}
      <TouchableOpacity 
        style={styles.pdfButton} 
        onPress={handleGeneratePDF}
        disabled={isGeneratingPdf}
      >
        {isGeneratingPdf ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <MaterialIcons name="picture-as-pdf" size={24} color="white" style={{marginRight: 8}} />
            <Text style={styles.pdfButtonText}>Descargar Reporte PDF</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: ReporteGuardado }) => (
    <View style={styles.card}>
      <Text style={styles.cardDate}>
        {item.fechaCreacion?.toDate 
          ? item.fechaCreacion.toDate().toLocaleDateString("es-MX", { weekday: 'short', day: 'numeric', month: 'short' })
          : "Fecha desc."}
      </Text>

      <View style={[styles.cardRow, styles.parcelaRow]}> 
        <MaterialIcons name="place" size={16} color={COLORS.primary} />
        <Text style={styles.parcelaText}>{item.parcelaNombre || "Sin Parcela"}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Material:</Text>
        <Text style={styles.cardValue}>{item.materialNombre || "No especificado"}</Text>
      </View>

      {item.fotoUrl ? (
        <View style={styles.imageContainer}>
          <Text style={styles.cardLabel}>Evidencia:</Text>
          <Image source={{ uri: item.fotoUrl }} style={styles.evidenceImage} resizeMode="cover" />
        </View>
      ) : null}

      {item.exportacion6oz > 0 && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Exportación (6oz):</Text>
          <Text style={styles.cardValue}>{item.exportacion6oz}</Text>
        </View>
      )}
      
      {item.exportacion12oz > 0 && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Exportación (12oz):</Text>
          <Text style={styles.cardValue}>{item.exportacion12oz}</Text>
        </View>
      )}

      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Proceso:</Text>
        <Text style={styles.cardValue}>{item.procesoCharola}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="white" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rendimiento Diario</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{marginTop: 10}}>Cargando reportes...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={reportes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <MaterialIcons name="assignment" size={50} color="#CCC" />
              <Text style={{color: "#777", marginTop: 10}}>No hay reportes registrados.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]} 
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  headerBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#E91E63", padding: 15 },
  headerTitle: { fontSize: FONT_SIZES.large, fontWeight: "bold", color: COLORS.surface, textAlign: "center", flex: 1, marginRight: 40 },
  iconButton: { padding: 5 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, marginTop: 50 },
  errorText: { color: COLORS.error, fontSize: FONT_SIZES.medium },
  listContainer: { padding: 20 },
  chartContainer: { backgroundColor: "white", borderRadius: 15, paddingVertical: 15, marginBottom: 15, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, alignItems: 'center', overflow: 'hidden' },
  chartTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text, marginBottom: 10 },
  noDataText: { textAlign: 'center', margin: 20, color: '#888', fontStyle: 'italic' },
  pagination: { flexDirection: 'row', marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { backgroundColor: COLORS.primary },
  dotInactive: { backgroundColor: '#DDD' },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  cardDate: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, textTransform: 'capitalize', marginBottom: 5 },
  parcelaRow: { flexDirection: "row", alignItems: 'center', marginBottom: 5 },
  parcelaText: { fontSize: FONT_SIZES.large, color: COLORS.text, fontWeight: "700", marginLeft: 5 },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardLabel: { fontSize: FONT_SIZES.medium, color: COLORS.textSecondary, fontWeight: "500" },
  cardValue: { fontSize: FONT_SIZES.medium, color: COLORS.text, fontWeight: "700" },
  imageContainer: { marginVertical: 10 },
  evidenceImage: { width: "100%", height: 200, borderRadius: 8, marginTop: 5, backgroundColor: '#EEE' },
  notesContainer: { marginTop: 10, backgroundColor: "#F9F9F9", padding: 10, borderRadius: 8 },
  notesLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "bold", marginBottom: 2 },
  notesText: { fontSize: FONT_SIZES.small, color: COLORS.text, fontStyle: 'italic' },
  
  // Estilo del botón PDF
  pdfButton: {
    flexDirection: "row",
    backgroundColor: "#D32F2F", // Rojo PDF
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 3,
  },
  pdfButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16
  }
});

export default RendimientoScreen;