import {
  ComponentRegistry,
  PreferencesUIStore,
  WorkspaceStore,
  localized,
} from 'mailspring-exports';
import TodoistSidebar from './todoist-sidebar';
import TodoistStore from './todoist-store';

export const config = {
  enabled: {
    type: 'boolean',
    default: true,
  },
  showWidget: {
    type: 'boolean',
    default: true,
  },
  refreshIntervalMinutes: {
    type: 'integer',
    default: 10,
    minimum: 1,
    maximum: 120,
  },
};

export function activate() {
  this.preferencesTab = new PreferencesUIStore.TabItem({
    tabId: 'Todoist',
    displayName: localized('Todoist'),
    componentClassFn: () => require('./preferences-todoist').default,
    order: 7,
  });

  PreferencesUIStore.registerPreferencesTab(this.preferencesTab);
  ComponentRegistry.register(TodoistSidebar, {
    location: WorkspaceStore.Location.RootSidebar,
  });
  TodoistStore.activate();
}

export function deactivate() {
  TodoistStore.deactivate();
  ComponentRegistry.unregister(TodoistSidebar);
  PreferencesUIStore.unregisterPreferencesTab(this.preferencesTab.tabId);
}
