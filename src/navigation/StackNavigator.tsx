import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// === PASO 1: IMPORTAMOS EL TIPO UserRole ===
// (Usamos ../types, que es la ruta correcta desde esta carpeta)
import { UserRole,Usuario } from "../../types"; // <-- Esta es la CORRECTA

// Importación de pantallas
import LoginScreen from "../screens/auth/LoginScreen";
import HomeScreen from "../screens/home/HomeScreen";
import RegistrarCosechaScreen from "../screens/report/RegistrarCosechaScreen";
import RendimientoScreen from "../screens/report/RendimientoScreen";
import GestionCultivosScreen from "../screens/management/GestionCultivosScreen";
import InventarioScreen from "../screens/management/InventarioScreen";
import CalendarioScreen from "../screens/calendar/CalendarioScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import MantenimientoScreen from "../screens/management/MantenimientoScreen";

/**
 * Definición de los tipos para los parámetros de navegación
 * Esto ayuda a TypeScript a entender qué parámetros espera cada pantalla
 */
export type RootStackParamList = {
  Login: undefined;
  Home: { user: Usuario };
  RegistrarCosecha: undefined;
  Rendimiento: undefined;
  GestionCultivos: undefined;
  Inventario: undefined;
  Calendario: undefined;
  Mantenimiento: undefined;
  Profile: { user: Usuario };
  
  // --- El resto de tipos de "Sistema Escolar" ---
  AlumnoList: undefined;
  AlumnoDetails: {
    nombre: string;
    id?: number;
  };
  ProfesorList: undefined;
  ProfesorDetails: {
    nombre: string;
    id?: number;
  };
  MateriaList: undefined;
  MateriaDetails: {
    nombre: string;
    id?: number;
  };
  GrupoList: undefined;
  GrupoDetails: {
    nombre: string;
    id?: number;
  };
  
};

/**
 * Creamos el Stack Navigator con tipado
 */
const Stack = createStackNavigator<RootStackParamList>();

/**
 * Componente principal de navegación
 * Gestiona todas las rutas de la aplicación
 */
const StackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        // Tus estilos de header (los dejé como estaban)
        headerStyle: {
          backgroundColor: "#6200ea", 
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
        },
      }}
    >
      {/* Pantalla de Login */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: "Iniciar Sesión",
          headerShown: false, // Ocultamos el header en login
        }}
      />
      {/* Pantalla de Registrar Cosecha */}
  <Stack.Screen
    name="RegistrarCosecha"
    component={RegistrarCosechaScreen}
    options={{
      headerShown: false, // Usamos nuestra propia cabecera
    }}
  />
  {/* Pantalla de Rendimiento */}
  <Stack.Screen
    name="Rendimiento"
    component={RendimientoScreen}
    options={{
      headerShown: false, // Usamos nuestra propia cabecera
    }}
  />
      {/* Pantalla Principal */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          // Cambié este título para que coincida con tu app
          title: "Raspberries Control", 
          headerLeft: () => null, // Evitamos el botón de regreso
        }}
      />
      
      {/* (Aquí irían tus otras pantallas comentadas) */}
      {/* Pantalla de Gestión de Cultivos */}
  <Stack.Screen
    name="GestionCultivos"
    component={GestionCultivosScreen}
    options={{
      headerShown: false, // Usamos nuestra propia cabecera
    }}
  />
  {/* Pantalla de Inventario */}
  <Stack.Screen
    name="Inventario"
    component={InventarioScreen}
    options={{
      headerShown: false, // Usamos nuestra propia cabecera
    }}
  />
  <Stack.Screen
   name="Calendario" 
   component={CalendarioScreen} 
   options={{
     headerShown: false }} />
     
   <Stack.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen
     name="Mantenimiento"
     component={MantenimientoScreen}
      options={{ headerShown: false }} 
      />
   </Stack.Navigator>
   
    
  );
  
 
};
export default StackNavigator;