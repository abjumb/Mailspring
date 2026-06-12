import React from 'react';
import { clipboard } from 'electron';
import { localized } from 'mailspring-exports';
import VaultStore, { VaultEntry, VaultEntryKind } from './vault-store';

const CLIPBOARD_CLEAR_MS = 30000;

interface VaultRootState {
  entries: ReadonlyArray<VaultEntry>;
  searchQuery: string;
  draftName: string;
  draftUsername: string;
  draftSecret: string;
  draftUrl: string;
  draftKind: VaultEntryKind;
  revealedId: string | null;
  revealedSecret: string | null;
  copiedId: string | null;
}

export default class VaultRoot extends React.Component<Record<string, unknown>, VaultRootState> {
  static displayName = 'VaultRoot';

  _unlisten?: () => void;
  _copiedTimer: ReturnType<typeof setTimeout> | null = null;
  _clipboardClearTimer: ReturnType<typeof setTimeout> | null = null;
  // Held (outside state) only to verify the clipboard still contains our
  // secret before auto-clearing — never rendered.
  _copiedSecret: string | null = null;

  state: VaultRootState = {
    entries: VaultStore.items(),
    searchQuery: '',
    draftName: '',
    draftUsername: '',
    draftSecret: '',
    draftUrl: '',
    draftKind: 'password',
    revealedId: null,
    revealedSecret: null,
    copiedId: null,
  };

  componentDidMount() {
    this._unlisten = VaultStore.listen(() => this.setState({ entries: VaultStore.items() }));
  }

  componentWillUnmount() {
    if (this._unlisten) this._unlisten();
    if (this._copiedTimer) clearTimeout(this._copiedTimer);
    if (this._clipboardClearTimer) clearTimeout(this._clipboardClearTimer);
    this._copiedSecret = null;
  }

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

  _onCopy = async (entry: VaultEntry) => {
    const secret = await VaultStore.getSecret(entry.id);
    if (secret === undefined) return;
    clipboard.writeText(secret);
    if (this._copiedTimer) clearTimeout(this._copiedTimer);
    this.setState({ copiedId: entry.id });
    this._copiedTimer = setTimeout(() => this.setState({ copiedId: null }), 1500);

    // Auto-clear after 30s, but only if the clipboard still holds this
    // secret — don't stomp something the user copied in the meantime.
    this._copiedSecret = secret;
    if (this._clipboardClearTimer) clearTimeout(this._clipboardClearTimer);
    this._clipboardClearTimer = setTimeout(() => {
      if (this._copiedSecret !== null && clipboard.readText() === this._copiedSecret) {
        clipboard.clear();
      }
      this._copiedSecret = null;
    }, CLIPBOARD_CLEAR_MS);
  };

  _onToggleReveal = async (entry: VaultEntry) => {
    if (this.state.revealedId === entry.id) {
      this.setState({ revealedId: null, revealedSecret: null });
      return;
    }
    const secret = await VaultStore.getSecret(entry.id);
    this.setState({ revealedId: entry.id, revealedSecret: secret === undefined ? null : secret });
  };

  _onRemove = async (entry: VaultEntry) => {
    if (this.state.revealedId === entry.id) {
      this.setState({ revealedId: null, revealedSecret: null });
    }
    await VaultStore.removeWithSecret(entry.id);
  };

  _renderEntry(entry: VaultEntry) {
    const revealed = this.state.revealedId === entry.id;
    return (
      <div className="moros-row" key={entry.id}>
        <span className={`moros-chip kind-${entry.kind}`}>
          {entry.kind === 'password' ? localized('Password') : localized('API Key')}
        </span>
        <span className="moros-row-title">{entry.name}</span>
        <span className="moros-row-detail">{entry.username}</span>
        <span className="moros-row-detail">{entry.url}</span>
        <span className="moros-secret">
          {revealed && this.state.revealedSecret !== null ? this.state.revealedSecret : '••••••••'}
        </span>
        <button className="btn" onClick={() => this._onToggleReveal(entry)}>
          {revealed ? localized('Hide') : localized('Reveal')}
        </button>
        <button className="btn" onClick={() => this._onCopy(entry)}>
          {this.state.copiedId === entry.id ? localized('Copied!') : localized('Copy')}
        </button>
        <button
          className="moros-row-delete"
          title={localized('Delete')}
          onClick={() => this._onRemove(entry)}
        >
          &times;
        </button>
      </div>
    );
  }

  _filteredEntries(): VaultEntry[] {
    const query = this.state.searchQuery.trim().toLowerCase();
    const entries = [...this.state.entries];
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.name, entry.username, entry.url].some((field) => field.toLowerCase().includes(query))
    );
  }

  render() {
    const visible = this._filteredEntries();
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
        <div className="moros-toolbar-row">
          <input
            type="text"
            className="moros-input"
            placeholder={localized('Search vault…')}
            value={this.state.searchQuery}
            onChange={(e) => this.setState({ searchQuery: e.target.value })}
          />
        </div>
        <div className="moros-toolbar-row">
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
        <div className="moros-scroll-region">
          {visible.length > 0 ? (
            visible.map((entry) => this._renderEntry(entry))
          ) : (
            <div className="moros-empty">
              {this.state.entries.length > 0
                ? localized('No entries match your search.')
                : localized('No entries yet — store an API key or password above.')}
            </div>
          )}
        </div>
      </div>
    );
  }
}
