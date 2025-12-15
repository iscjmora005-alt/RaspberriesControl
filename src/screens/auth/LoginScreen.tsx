import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { LoginFormData, COLORS, FONT_SIZES, UserRole,Usuario } from "../../../types/index";
import { Feather } from "@expo/vector-icons";

// --- IMPORTACIONES DE FIREBASE ---
import { db } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

const loginImage = require("../../../assets/iconlogin.jpg");

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, "Login">;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const updateFormData = (field: keyof LoginFormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      Alert.alert("Error", "Por favor, ingrese su usuario");
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert("Error", "Por favor, ingrese su contraseña");
      return false;
    }
    return true;
  };

  const handleLogin = async (): Promise<void> => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Buscamos el usuario en la base de datos
      const q = query(
        collection(db, "usuarios"), 
        where("username", "==", formData.username.trim())
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Error", "Usuario no encontrado.");
        setIsLoading(false);
        return;
      }

      // 2. Obtenemos los datos del usuario encontrado
      const userDoc = querySnapshot.docs[0].data();
      
      // 3. Verificamos la contraseña (comparación directa)
      if (userDoc.password === formData.password) {
        
        // 4. ¡LOGIN EXITOSO!
        // Extraemos el rol real de la base de datos
       const usuarioCompleto: Usuario = {
          id: querySnapshot.docs[0].id,
          ...userDoc
        } as Usuario; 
        
        // Navegamos pasando el rol real
       navigation.replace("Home", { user: usuarioCompleto });

      } else {
        Alert.alert("Error", "Contraseña incorrecta.");
      }

    } catch (error) {
      console.error("Error en login:", error);
      Alert.alert("Error", "Ocurrió un problema al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (): void => {
    Alert.alert("Recuperar", "Contacte al Administrador para restablecer su contraseña.");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Franja roja superior con el logo */}
      <View style={styles.topBand}>
        <View style={styles.logoWrapper}>
          <Image source={loginImage} style={styles.logo} />
        </View>
      </View>

      {/* Contenido debajo del logo */}
      <View style={styles.content}>
        <Text style={styles.title}>Bienvenido 🍓</Text>
        <Text style={styles.subtitle}>Raspberries Control</Text>

        <View style={styles.formContainer}>
          {/* Campo Usuario */}
          <View style={styles.inputWrapper}>
            <Feather name="user" size={18} color={COLORS.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Usuario"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.username}
              onChangeText={(text) => updateFormData("username", text)}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Campo Contraseña */}
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color={COLORS.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.password}
              onChangeText={(text) => updateFormData("password", text)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Botón Iniciar sesión */}
          <TouchableOpacity
            style={[styles.loginButton, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBand: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    marginBottom: -50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  logo: { width: 80, height: 80, borderRadius: 40 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    alignItems: "stretch",
  },
  title: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center"
  },
  subtitle: {
    fontSize: FONT_SIZES.large,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 30,
    textAlign: "center"
  },
  formContainer: { width: "100%", maxWidth: 360, alignSelf: "center" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    marginBottom: 15,
    paddingHorizontal: 12,
    height: 50,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: { marginRight: 8, opacity: 0.6 },
  input: { flex: 1, fontSize: FONT_SIZES.medium, color: COLORS.text },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    marginTop: 10
  },
  loginButtonText: { color: COLORS.surface, fontSize: FONT_SIZES.medium, fontWeight: "700" },
  link: { color: COLORS.text, textAlign: "center", marginTop: 16, textDecorationLine: "underline" },
  linksContainer: { marginTop: 30, alignItems: "center" },
});

export default LoginScreen;