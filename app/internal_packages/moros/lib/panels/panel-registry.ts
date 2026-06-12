import React from 'react';
import { localized } from 'mailspring-exports';

import TasksAddPanel from '../tasks/tasks-add-panel';
import TasksListPanel from '../tasks/tasks-list-panel';
import NetWorthPanel from '../finance/net-worth-panel';
import FinanceSummaryPanel from '../finance/finance-summary-panel';
import FinanceAddPanel from '../finance/finance-add-panel';
import TransactionsPanel from '../finance/transactions-panel';
import VaultAddPanel from '../vault/vault-add-panel';
import VaultListPanel from '../vault/vault-list-panel';

export type MorosModule = 'tasks' | 'finance' | 'vault';

export interface MorosPanelDefinition {
  id: string;
  module: MorosModule;
  title: () => string;
  component: React.ComponentType<Record<string, unknown>>;
  /** Default grid width (the module grid is 2 columns). */
  defaultSpan: 1 | 2;
  /** Initial size when popped out as a desktop widget window. */
  widgetSize: { width: number; height: number };
}

/**
 * Catalog of every tileable panel. The PanelGrid composes a module's view
 * from these, and popped-out widget windows render a single entry by id.
 */
export const PANELS: MorosPanelDefinition[] = [
  {
    id: 'tasks-add',
    module: 'tasks',
    title: () => localized('New Task'),
    component: TasksAddPanel,
    defaultSpan: 2,
    widgetSize: { width: 420, height: 160 },
  },
  {
    id: 'tasks-list',
    module: 'tasks',
    title: () => localized('Tasks'),
    component: TasksListPanel,
    defaultSpan: 2,
    widgetSize: { width: 460, height: 480 },
  },
  {
    id: 'finance-networth',
    module: 'finance',
    title: () => localized('Net Worth'),
    component: NetWorthPanel,
    defaultSpan: 2,
    widgetSize: { width: 480, height: 300 },
  },
  {
    id: 'finance-summary',
    module: 'finance',
    title: () => localized('This Month'),
    component: FinanceSummaryPanel,
    defaultSpan: 2,
    widgetSize: { width: 520, height: 170 },
  },
  {
    id: 'finance-add',
    module: 'finance',
    title: () => localized('Add Transaction'),
    component: FinanceAddPanel,
    defaultSpan: 2,
    widgetSize: { width: 640, height: 160 },
  },
  {
    id: 'finance-transactions',
    module: 'finance',
    title: () => localized('Transactions'),
    component: TransactionsPanel,
    defaultSpan: 2,
    widgetSize: { width: 520, height: 460 },
  },
  {
    id: 'vault-add',
    module: 'vault',
    title: () => localized('Add Entry'),
    component: VaultAddPanel,
    defaultSpan: 2,
    widgetSize: { width: 640, height: 160 },
  },
  {
    id: 'vault-list',
    module: 'vault',
    title: () => localized('Vault Entries'),
    component: VaultListPanel,
    defaultSpan: 2,
    widgetSize: { width: 560, height: 420 },
  },
];

export function panelById(panelId: string): MorosPanelDefinition | undefined {
  return PANELS.find((panel) => panel.id === panelId);
}
