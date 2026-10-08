import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { C } from '@/constants/theme';
import { useBets } from '@/context/BetsContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
function icon(on: IconName, off: IconName) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? on : off} color={color as string} size={size} />;
  }
  return TabIcon;
}

/** Browser version of the tab bar (iOS uses the native one in _layout.tsx). */
export default function WebTabLayout() {
  const { waitingOnYou } = useBets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Bets', tabBarIcon: icon('layers', 'layers-outline') }} />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: icon('file-tray', 'file-tray-outline'),
          tabBarBadge: waitingOnYou.length || undefined,
          tabBarBadgeStyle: { backgroundColor: C.green },
        }}
      />
      <Tabs.Screen name="create" options={{ title: 'Post', tabBarIcon: icon('add-circle', 'add-circle-outline') }} />
      <Tabs.Screen name="ledger" options={{ title: 'Ledger', tabBarIcon: icon('book', 'book-outline') }} />
      <Tabs.Screen name="ranks" options={{ title: 'Ranks', tabBarIcon: icon('trophy', 'trophy-outline') }} />
    </Tabs>
  );
}
