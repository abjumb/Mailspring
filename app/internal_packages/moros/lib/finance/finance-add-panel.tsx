import React from 'react';
import { localized } from 'mailspring-exports';
import FinanceStore, {
  CATEGORIES,
  TransactionKind,
  parseAmountToCents,
  todayISO,
} from './finance-store';

interface FinanceAddPanelState {
  draftDescription: string;
  draftAmount: string;
  draftKind: TransactionKind;
  draftCategory: string;
  draftDate: string;
}

export default class FinanceAddPanel extends React.Component<
  Record<string, unknown>,
  FinanceAddPanelState
> {
  static displayName = 'FinanceAddPanel';

  state: FinanceAddPanelState = {
    draftDescription: '',
    draftAmount: '',
    draftKind: 'expense',
    draftCategory: CATEGORIES[0],
    draftDate: todayISO(),
  };

  _onCreate = () => {
    const description = this.state.draftDescription.trim();
    const amountCents = parseAmountToCents(this.state.draftAmount);
    if (!description || !amountCents) return;
    FinanceStore.create({
      description,
      amountCents,
      kind: this.state.draftKind,
      category: this.state.draftCategory,
      date: this.state.draftDate || todayISO(),
    });
    this.setState({ draftDescription: '', draftAmount: '' });
  };

  render() {
    return (
      <div className="moros-toolbar-row moros-panel-form">
        <input
          type="text"
          className="moros-input"
          placeholder={localized('Description')}
          value={this.state.draftDescription}
          onChange={(e) => this.setState({ draftDescription: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && this._onCreate()}
        />
        <input
          type="text"
          className="moros-input moros-input-amount"
          placeholder="0.00"
          value={this.state.draftAmount}
          onChange={(e) => this.setState({ draftAmount: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && this._onCreate()}
        />
        <select
          className="moros-select"
          value={this.state.draftKind}
          onChange={(e) => this.setState({ draftKind: e.target.value as TransactionKind })}
        >
          <option value="expense">{localized('Expense')}</option>
          <option value="income">{localized('Income')}</option>
        </select>
        <select
          className="moros-select"
          value={this.state.draftCategory}
          onChange={(e) => this.setState({ draftCategory: e.target.value })}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="moros-input moros-input-date"
          value={this.state.draftDate}
          onChange={(e) => this.setState({ draftDate: e.target.value })}
        />
        <button className="btn btn-emphasis" onClick={this._onCreate}>
          {localized('Add')}
        </button>
      </div>
    );
  }
}
