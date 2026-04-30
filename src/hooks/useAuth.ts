import { useState } from 'react';
import { Alert } from 'react-native';
import { AuthService } from '../services/AuthService';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const loginUser = async (username: string, password: string) => {
    setIsLoading(true);
    
   
    const { user, error } = await AuthService.login(username, password);
    
    //  Alert original
    if (error) {
      Alert.alert("Error", error);
    }
    
    setIsLoading(false);
    return user;
  };

  return { loginUser, isLoading };
};