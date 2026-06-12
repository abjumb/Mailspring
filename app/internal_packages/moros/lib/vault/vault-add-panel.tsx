import React from 'react';
import { localized } from 'mailspring-exports';
import VaultStore, { VaultEntryKind } from './vault-store';

interface VaultAddPanelState {
  draftName: string;
  draftUsername: string;
  draftSecret: string;
  draftUrl: string;
  draftKind: VaultEntryKind;
}

export default class VaultAddPanel extends React.Component<
  Record<string, unknown>,
  VaultAddPanelState
> {
  static displayName = 'VaultAddPanel';

  state: VaultAddPanelState = {
    draftName: '',
    draftUsername: '',
    draftSecret: '',
    draftUrl: '',
    draftKind: 'password',
  };

  _onCreate = async () => {
    const name = this.state.draftName.trim();
    const secret = this.state.draftSecret;
    if (!name || !secret) return;
    await VaultStore.createWithSecret(
      {
        name,
        kind: this.state.draftKind,
        username: this.state.draftUsername.trim(),
        url: this.state.draftUrl.trim(),
      },
      secret
    );
    this.setState({ draftName: '', draftUsername: '', draftSecret: '', draftUrl: '' });
  };

  render() {
    return (
      <div className="moros-toolbar-row moros-panel-form">
        <select
          className="moros-select"
          value={this.state.draftKind}
          onChange={(e) => this.setState({ draftKind: e.target.value as VaultEntryKind })}
        >
          <option value="password">{localized('Password')}</option>
          <option value="api-key">{localized('API Key')}</option>
        </select>
        <input
          type="text"
          className="moros-input"
          placeholder={localized('Name (e.g. GitHub)')}
          value={this.state.draftName}
          onChange={(e) => this.setState({ draftName: e.target.value })}
        />
        <input
          type="text"
          className="moros-input"
          placeholder={localized('Username / key ID')}
          value={this.state.draftUsername}
          onChange={(e) => this.setState({ draftUsername: e.target.value })}
        />
        <input
          type="password"
          className="moros-input"
          placeholder={localized('Secret')}
          value={this.state.draftSecret}
          onChange={(e) => this.setState({ draftSecret: e.target.value })}
        />
        <input
          type="text"
          className="moros-input"
          placeholder={localized('URL (optional)')}
          value={this.state.draftUrl}
          onChange={(e) => this.setState({ draftUrl: e.target.value })}
        />
        <button className="btn btn-emphasis" onClick={this._onCreate}>
          {localized('Add')}
        </button>
      </div>
    );
  }
}
