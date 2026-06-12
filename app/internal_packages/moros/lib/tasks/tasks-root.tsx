import React from 'react';
import { localized } from 'mailspring-exports';
import PanelGrid from '../panels/panel-grid';

export default class TasksRoot extends React.Component<Record<string, unknown>> {
  static displayName = 'TasksRoot';

  render() {
    return (
      <div className="moros-root moros-tasks">
        <div className="moros-header">
          <h2>{localized('Tasks')}</h2>
        </div>
        <div className="moros-scroll-region">
          <PanelGrid module="tasks" />
        </div>
      </div>
    );
  }
}
