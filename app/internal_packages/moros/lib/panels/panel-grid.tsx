import React from 'react';
import { localized } from 'mailspring-exports';
import PanelLayoutStore, { PanelPlacement } from './panel-layout-store';
import { MorosModule, MorosPanelDefinition, panelById } from './panel-registry';

function openPanelAsWidget(panel: MorosPanelDefinition) {
  AppEnv.newWindow({
    title: panel.title(),
    windowKey: `moros-widget-${panel.id}`,
    windowType: 'moros-widget',
    width: panel.widgetSize.width,
    height: panel.widgetSize.height,
    windowProps: { panelId: panel.id },
  });
}

interface PanelGridProps extends Record<string, unknown> {
  module: MorosModule;
}

interface PanelGridState {
  placements: PanelPlacement[];
  draggingId: string | null;
  dropTargetId: string | null;
}

/**
 * Windows-style tiling for a module's panels: drag a panel header to
 * reorder, toggle half/full width, hide panels and restore them from the
 * customize bar, or pop a panel out into its own floating widget window.
 * The arrangement persists per module via PanelLayoutStore.
 */
export default class PanelGrid extends React.Component<PanelGridProps, PanelGridState> {
  static displayName = 'PanelGrid';

  _unlisten?: () => void;

  state: PanelGridState = {
    placements: PanelLayoutStore.layoutFor(this.props.module),
    draggingId: null,
    dropTargetId: null,
  };

  componentDidMount() {
    this._unlisten = PanelLayoutStore.listen(() =>
      this.setState({ placements: PanelLayoutStore.layoutFor(this.props.module) })
    );
  }

  componentWillUnmount() {
    if (this._unlisten) this._unlisten();
  }

  _onDrop = (beforePanelId: string | null) => {
    if (this.state.draggingId) {
      PanelLayoutStore.movePanel(this.props.module, this.state.draggingId, beforePanelId);
    }
    this.setState({ draggingId: null, dropTargetId: null });
  };

  _renderPanel(placement: PanelPlacement) {
    const panel = panelById(placement.panelId);
    if (!panel) return null;
    const PanelComponent = panel.component;
    const { draggingId, dropTargetId } = this.state;
    const classNames = [
      'moros-panel',
      `moros-panel-span-${placement.span}`,
      draggingId === panel.id ? 'is-dragging' : '',
      dropTargetId === panel.id && draggingId !== panel.id ? 'is-drop-target' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <section
        key={panel.id}
        className={classNames}
        onDragOver={(e) => {
          if (!draggingId || draggingId === panel.id) return;
          e.preventDefault();
          if (dropTargetId !== panel.id) this.setState({ dropTargetId: panel.id });
        }}
        onDrop={(e) => {
          e.preventDefault();
          this._onDrop(panel.id);
        }}
      >
        <header
          className="moros-panel-header"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            // Required by Firefox-lineage engines for a drag to start; the
            // panel id also makes debugging drops easier.
            e.dataTransfer.setData('text/plain', panel.id);
            this.setState({ draggingId: panel.id });
          }}
          onDragEnd={() => this.setState({ draggingId: null, dropTargetId: null })}
        >
          <span className="moros-panel-grip" title={localized('Drag to rearrange')}>
            ⠿
          </span>
          <span className="moros-panel-title">{panel.title()}</span>
          <span className="moros-panel-actions">
            <button
              title={localized('Pop out as desktop widget')}
              onClick={() => openPanelAsWidget(panel)}
            >
              ⧉
            </button>
            <button
              title={placement.span === 2 ? localized('Half width') : localized('Full width')}
              onClick={() => PanelLayoutStore.toggleSpan(this.props.module, panel.id)}
            >
              ⇔
            </button>
            <button
              title={localized('Hide panel')}
              onClick={() => PanelLayoutStore.setHidden(this.props.module, panel.id, true)}
            >
              ✕
            </button>
          </span>
        </header>
        <div className="moros-panel-body">
          <PanelComponent />
        </div>
      </section>
    );
  }

  _renderCustomizeBar(hidden: PanelPlacement[]) {
    return (
      <div className="moros-customize-bar">
        {hidden.map((placement) => {
          const panel = panelById(placement.panelId);
          if (!panel) return null;
          return (
            <button
              key={panel.id}
              className="moros-chip moros-chip-action"
              title={localized('Show panel')}
              onClick={() => PanelLayoutStore.setHidden(this.props.module, panel.id, false)}
            >
              + {panel.title()}
            </button>
          );
        })}
        <button
          className="moros-chip moros-chip-action"
          title={localized('Restore the default arrangement')}
          onClick={() => PanelLayoutStore.resetLayout(this.props.module)}
        >
          {localized('Reset layout')}
        </button>
      </div>
    );
  }

  render() {
    const visible = this.state.placements.filter((placement) => !placement.hidden);
    const hidden = this.state.placements.filter((placement) => placement.hidden);

    return (
      <div
        className="moros-panel-grid"
        onDragOver={(e) => {
          // Allow dropping in the empty area below panels to move to the end.
          if (this.state.draggingId) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          this._onDrop(null);
        }}
      >
        <div className="moros-panel-grid-cells">
          {visible.map((placement) => this._renderPanel(placement))}
        </div>
        {this._renderCustomizeBar(hidden)}
      </div>
    );
  }
}
