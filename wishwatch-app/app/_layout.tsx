import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { useTheme } from "../src/hooks/useTheme";
import { api } from "../src/services/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function RootLayoutInner() {
  const { isDark } = useTheme();

  useEffect(() => {
    // Push notifications only on native — dynamic import keeps expo-notifications
    // out of the web bundle entirely (static import crashes on web at load time)
    if (Platform.OS === "web") return;
    import("../src/utils/notifications").then(({ registerForPushNotificationsAsync }) => {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          try {
            await api.registerPushToken(token);
          } catch {}
        }
      });
    });
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="add-item" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutInner />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

