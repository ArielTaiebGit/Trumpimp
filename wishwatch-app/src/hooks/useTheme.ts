import { useColorScheme } from "react-native";
import { useAppStore } from "../store";
import { COLORS } from "../constants";

export function useTheme() {
  const systemScheme = useColorScheme();
  const { settings } = useAppStore();

  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "system" && systemScheme === "dark");

  return {
    isDark,
    colors: isDark ? COLORS.dark : COLORS.light,
    COLORS,
  };
}
