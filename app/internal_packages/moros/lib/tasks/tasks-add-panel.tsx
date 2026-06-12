import React from 'react';
import { localized } from 'mailspring-exports';
import TasksStore from './tasks-store';

export default class TasksAddPanel extends React.Component<
  Record<string, unknown>,
  { draftTitle: string }
> {
  static displayName = 'TasksAddPanel';

  state = { draftTitle: '' };

  _onCreate = () => {
    const title = this.state.draftTitle.trim();
    if (!title) return;
    TasksStore.create({ title, status: 'todo', priority: 'none' });
    this.setState({ draftTitle: '' });
  };

  render() {
    return (
      <div className="moros-toolbar-row moros-panel-form">
        <input
          type="text"
          className="moros-input"
          placeholder={localized('Add a task…')}
          value={this.state.draftTitle}
          onChange={(e) => this.setState({ draftTitle: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && this._onCreate()}
        />
        <button className="btn btn-emphasis" onClick={this._onCreate}>
          {localized('New Task')}
        </button>
      </div>
    );
  }
}
