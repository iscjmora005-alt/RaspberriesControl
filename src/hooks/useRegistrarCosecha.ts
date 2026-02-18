import { useState, useEffect } from "react";
import { Alert } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { fetchCatalogos, saveReporte } from "../services/CosechaService";
import { ReporteCosechaData, Parcela, Material } from "../../types";

export const useRegistrarCosecha = () => {
  const [formData, setFormData] = useState<ReporteCosechaData>({
    parcela: "", material: "", exportacion6oz: "", exportacion12oz: "", procesoCharola: "", materialSobrante: "",
  });
  const [tipoBasquete, setTipoBasquete] = useState<"6oz" | "12oz" | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [catalogos, setCatalogos] = useState<{ parcelas: Parcela[], materiales: Material[] }>({ parcelas: [], materiales: [] });
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  useEffect(() => {
    loadCatalogos();
  }, []);

  const loadCatalogos = async () => {
    try {
      const data = await fetchCatalogos();
      setCatalogos({ parcelas: data.parcelas as any, materiales: data.materiales as any });
      if (data.isOffline) Alert.alert("Modo Offline", "Usando catálogos guardados.");
    } catch (error) {
      Alert.alert("Error", "No se cargaron los catálogos");
    } finally {
      setLoadingCatalogos(false);
    }
  };

  const updateForm = (key: keyof ReporteCosechaData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const guardar = async (onSuccess: () => void) => {
    if (!formData.parcela || !formData.material || !tipoBasquete) {
        return Alert.alert("Error", "Complete los campos obligatorios");
    }
    setIsLoading(true);
    try {
        const net = await NetInfo.fetch();
        const cantidad6oz = parseInt(formData.exportacion6oz) || 0;
        const cantidad12oz = parseInt(formData.exportacion12oz) || 0;
        const reporteBase = {
            parcelaId: formData.parcela,
            materialId: formData.material,
            exportacion6oz: tipoBasquete === '6oz' ? cantidad6oz : 0,
            exportacion12oz: tipoBasquete === '12oz' ? cantidad12oz : 0,
            procesoCharola: parseInt(formData.procesoCharola) || 0,
            materialSobrante: formData.materialSobrante,
            fechaCreacion: new Date().toISOString(),
            localImageUri: imageUri
        };
        const result = await saveReporte(reporteBase, net.isConnected || false);
        Alert.alert(result.mode === 'offline' ? "Sin Conexión" : "Éxito", result.mode === 'offline' ? "Guardado localmente." : "Guardado en nube.");
        onSuccess(); 
    } catch (error) {
        Alert.alert("Error", "No se pudo guardar.");
    } finally {
        setIsLoading(false);
    }
  };

  return { formData, updateForm, tipoBasquete, setTipoBasquete, imageUri, pickImage, catalogos, loadingCatalogos, isLoading, guardar };
};