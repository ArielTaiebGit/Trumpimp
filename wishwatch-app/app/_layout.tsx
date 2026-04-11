import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../src/hooks/useTheme";
import { registerForPushNotificationsAsync } from "../src/utils/notifications";
import { api } from "../src/services/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 2,
    },
  },
});

function RootLayoutInner() {
  const { isDark } = useTheme();

  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        try {
          await api.registerPushToken(token);
        } catch {}
      }
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
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}
