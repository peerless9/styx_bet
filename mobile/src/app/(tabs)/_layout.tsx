import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { C } from '@/constants/theme';
import { useBets } from '@/context/BetsContext';

/** Real iOS tab bar (UITabBar) with SF Symbols. */
export default function TabLayout() {
  const { waitingOnYou } = useBets();
  return (
    <NativeTabs tintColor={C.ink}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Bets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} md="layers" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.fill' }} md="inbox" />
        {waitingOnYou.length > 0 ? <NativeTabs.Trigger.Badge>{String(waitingOnYou.length)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Label>Post</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="ledger">
        <NativeTabs.Trigger.Label>Ledger</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md="menu_book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="ranks">
        <NativeTabs.Trigger.Label>Ranks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} md="trophy" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
