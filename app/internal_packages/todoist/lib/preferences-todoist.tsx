import React from 'react';
import { localized } from 'mailspring-exports';
import TodoistStore from './todoist-store';

interface PreferencesTodoistState {
  enabled: boolean;
  showWidget: boolean;
  refreshIntervalMinutes: number;
  hasToken: boolean;
  token: string;
  saving: boolean;
  status: string | null;
  error: string | null;
}

export default class PreferencesTodoist extends React.Component<
  Record<string, unknown>,
  PreferencesTodoistState
> {
  static displayName = 'PreferencesTodoist';

  _unlisteners: Array<() => void> = [];

  constructor(props) {
    super(props);
    this.state = this._stateFromStores();
  }

  componentDidMount() {
    const enabledDisposable = AppEnv.config.onDidChange('todoist.enabled', () =>
      this.setState(this._stateFromStores())
    );
    const widgetDisposable = AppEnv.config.onDidChange('todoist.showWidget', () =>
      this.setState(this._stateFromStores())
    );
    const refreshDisposable = AppEnv.config.onDidChange('todoist.refreshIntervalMinutes', () =>
      this.setState(this._stateFromStores())
    );

    this._unlisteners = [
      TodoistStore.listen(() => this.setState(this._stateFromStores())),
      () => enabledDisposable.dispose(),
      () => widgetDisposable.dispose(),
      () => refreshDisposable.dispose(),
    ];
  }

  componentWillUnmount() {
    this._unlisteners.forEach((unlisten) => unlisten());
  }

  _stateFromStores = () => ({
    enabled: TodoistStore.enabled(),
    showWidget: TodoistStore.showWidget(),
    refreshIntervalMinutes: AppEnv.config.get('todoist.refreshIntervalMinutes') || 10,
    hasToken: TodoistStore.hasToken(),
    token: this.state ? this.state.token : '',
    saving: this.state ? this.state.saving : false,
    status: this.state ? this.state.status : null,
    error: TodoistStore.error(),
  });

  _setConfig = (key: string, value: boolean | number) => {
    AppEnv.config.set(`todoist.${key}`, value);
  };

  _saveToken = async () => {
    this.setState({ saving: true, status: null, error: null });
    try {
      await TodoistStore.setAccessToken(this.state.token);
      this.setState({
        token: '',
        status: localized('Todoist token saved.'),
        error: null,
      });
    } catch (err) {
      this.setState({ error: err.message || localized('Unable to save Todoist token.') });
    } finally {
      this.setState({ saving: false });
    }
  };

  _testToken = async () => {
    this.setState({ saving: true, status: null, error: null });
    try {
      if (this.state.token.trim()) {
        await TodoistStore.testAccessToken(this.state.token);
      } else {
        await TodoistStore.testSavedAccessToken();
        await TodoistStore.refresh();
      }
      this.setState({ status: localized('Todoist connection verified.'), error: null });
    } catch (err) {
      this.setState({ error: err.message || localized('Unable to verify Todoist.') });
    } finally {
      this.setState({ saving: false });
    }
  };

  _disconnect = async () => {
    await TodoistStore.clearAccessToken();
    this.setState({
      token: '',
      status: localized('Todoist disconnected.'),
      error: null,
    });
  };

  render() {
    const { enabled, showWidget, refreshIntervalMinutes, hasToken, saving, status, error } =
      this.state;

    return (
      <div className="todoist-preferences">
        <section>
          <h6>{localized('Todoist Integration')}</h6>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => this._setConfig('enabled', event.target.checked)}
            />{' '}
            {localized('Enable Todoist sync')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={showWidget}
              onChange={(event) => this._setConfig('showWidget', event.target.checked)}
            />{' '}
            {localized('Show mini calendar in the sidebar')}
          </label>
        </section>

        <section>
          <label htmlFor="todoist-token">{localized('Todoist API token')}</label>
          <div className="todoist-token-row">
            <input
              id="todoist-token"
              type="password"
              value={this.state.token}
              placeholder={hasToken ? localized('Token saved') : localized('Paste Todoist token')}
              onChange={(event) => this.setState({ token: event.target.value })}
            />
            <button
              className="btn"
              disabled={saving || !this.state.token.trim()}
              onClick={this._saveToken}
            >
              {localized('Save')}
            </button>
            <button
              className="btn"
              disabled={saving || (!hasToken && !this.state.token.trim())}
              onClick={this._testToken}
            >
              {localized('Test')}
            </button>
          </div>
          {hasToken ? (
            <button className="btn btn-danger" disabled={saving} onClick={this._disconnect}>
              {localized('Disconnect Todoist')}
            </button>
          ) : null}
          <p>
            {localized(
              'Tokens are stored with the same secure key storage Mailspring uses for account passwords.'
            )}
          </p>
        </section>

        <section>
          <label htmlFor="todoist-refresh-interval">
            {localized('Refresh every')} {refreshIntervalMinutes} {localized('minutes')}
          </label>
          <input
            id="todoist-refresh-interval"
            type="range"
            min="1"
            max="120"
            step="1"
            value={refreshIntervalMinutes}
            onChange={(event) =>
              this._setConfig('refreshIntervalMinutes', parseInt(event.target.value, 10))
            }
          />
        </section>

        {status ? <div className="todoist-preferences-status">{status}</div> : null}
        {error ? <div className="todoist-preferences-error">{error}</div> : null}
      </div>
    );
  }
}
