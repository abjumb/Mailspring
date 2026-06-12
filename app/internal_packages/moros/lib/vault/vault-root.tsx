import React from 'react';
import { localized } from 'mailspring-exports';
import PanelGrid from '../panels/panel-grid';

export default class VaultRoot extends React.Component<Record<string, unknown>> {
  static displayName = 'VaultRoot';

  render() {
    return (
      <div className="moros-root moros-vault">
        <div className="moros-header">
          <h2>{localized('Vault')}</h2>
          <div className="moros-header-note">
            {localized(
              'Secrets are encrypted with your operating system keychain — they are never written to disk in plaintext. Copied secrets are cleared from the clipboard after 30 seconds.'
            )}
          </div>
        </div>
        <div className="moros-scroll-region">
          <PanelGrid module="vault" />
        </div>
      </div>
    );
  }
}
