export type UserRole = "Administrador" | "Asociado" | "Registrador";

export interface LoginFormData {
  username: string;
  password: string;
}

export const COLORS = {
  primary: "#E91E63",
  secondary: "#9C27B0",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  text: "#212121",
  textSecondary: "#757575",
  error: "#F44336",
  success: "#4CAF50",
  warning: "#FF9800",
  info: "#2196F3",
};

export const FONT_SIZES = {
  small: 12,
  medium: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 28,
};
