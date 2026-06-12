import React from 'react';
import { localized } from 'mailspring-exports';
import FinanceStore, {
  MorosTransaction,
  currentMonthPrefix,
  formatCents,
  monthPrefixLabel,
} from './finance-store';

export default class FinanceSummaryPanel extends React.Component<
  Record<string, unknown>,
  { transactions: ReadonlyArray<MorosTransaction> }
> {
  static displayName = 'FinanceSummaryPanel';

  _unlisten?: () => void;

  state = { transactions: FinanceStore.items() };

  componentDidMount() {
    this._unlisten = FinanceStore.listen(() =>
      this.setState({ transactions: FinanceStore.items() })
    );
  }

  componentWillUnmount() {
    if (this._unlisten) this._unlisten();
  }

  render() {
    const month = currentMonthPrefix();
    const { incomeCents, spendingCents } = FinanceStore.monthTotals(month);
    const monthName = monthPrefixLabel(month);
    const cards = [
      { label: localized('Balance'), value: FinanceStore.balanceCents(), className: '' },
      {
        label: `${localized('Income')} — ${monthName}`,
        value: incomeCents,
        className: 'is-income',
      },
      {
        label: `${localized('Spending')} — ${monthName}`,
        value: -spendingCents,
        className: 'is-expense',
      },
    ];
    return (
      <div className="moros-cards moros-cards-panel">
        {cards.map((card) => (
          <div className="moros-card" key={card.label}>
            <div className="moros-card-label">{card.label}</div>
            <div className={`moros-card-value ${card.className}`}>{formatCents(card.value)}</div>
          </div>
        ))}
      </div>
    );
  }
}
