import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./src/navigation/StackNavigator";
import "./src/firebase/firebaseConfig";
// Importamos la función para iniciar SQLite
import { inicializarBaseDeDatos } from "./src/services/OfflineService";

const App: React.FC = () => {
  // Inicializamos la tabla al arrancar la app
  useEffect(() => {
    inicializarBaseDeDatos();
  }, []);

  return (
    <NavigationContainer>
      <StackNavigator />
    </NavigationContainer>
  );
};

export default App;