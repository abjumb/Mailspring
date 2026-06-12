import React from 'react';
import { localized } from 'mailspring-exports';
import PanelGrid from '../panels/panel-grid';

export default class FinanceRoot extends React.Component<Record<string, unknown>> {
  static displayName = 'FinanceRoot';

  render() {
    return (
      <div className="moros-root moros-finance">
        <div className="moros-header">
          <h2>{localized('Finance')}</h2>
        </div>
        <div className="moros-scroll-region">
          <PanelGrid module="finance" />
        </div>
      </div>
    );
  }
}
