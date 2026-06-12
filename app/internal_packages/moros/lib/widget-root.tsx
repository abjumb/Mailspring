import React from 'react';
import { localized } from 'mailspring-exports';
import { panelById } from './panels/panel-registry';

const remote = require('@electron/remote');

interface WidgetRootState {
  panelId: string | null;
  pinned: boolean;
}

/**
 * Root of a `moros-widget` window: renders a single panel from the registry
 * as a small floating desktop widget. Widgets default to always-on-top
 * (toggleable via the pin), and their data live-updates from the main window
 * through the stores' file watchers.
 */
export default class WidgetRoot extends React.Component<Record<string, unknown>, WidgetRootState> {
  static displayName = 'WidgetRoot';
  static containerRequired = false;

  _propsDisposable?: { dispose: () => void };

  state: WidgetRootState = {
    panelId: (AppEnv.getWindowProps().panelId as string) || null,
    pinned: true,
  };

  componentDidMount() {
    // Hot windows receive their props after boot; re-read them when they land.
    this._propsDisposable = AppEnv.onWindowPropsReceived(() => {
      this.setState({ panelId: (AppEnv.getWindowProps().panelId as string) || null });
    });
    this._applyPin(this.state.pinned);
  }

  componentWillUnmount() {
    if (this._propsDisposable) this._propsDisposable.dispose();
  }

  _applyPin(pinned: boolean) {
    try {
      remote.getCurrentWindow().setAlwaysOnTop(pinned);
    } catch (err) {
      // Pinning is cosmetic — never let a windowing quirk break the widget.
    }
  }

  _togglePin = () => {
    const pinned = !this.state.pinned;
    this.setState({ pinned });
    this._applyPin(pinned);
  };

  render() {
    const panel = this.state.panelId ? panelById(this.state.panelId) : null;
    if (!panel) {
      return <div className="moros-widget-root moros-empty">{localized('Panel not found.')}</div>;
    }
    const PanelComponent = panel.component;
    return (
      <div className="moros-widget-root">
        <header className="moros-panel-header">
          <span className="moros-panel-title">{panel.title()}</span>
          <span className="moros-panel-actions">
            <button
              className={this.state.pinned ? 'is-active' : ''}
              title={this.state.pinned ? localized('Unpin from top') : localized('Keep on top')}
              onClick={this._togglePin}
            >
              📌
            </button>
          </span>
        </header>
        <div className="moros-panel-body">
          <PanelComponent />
        </div>
      </div>
    );
  }
}
