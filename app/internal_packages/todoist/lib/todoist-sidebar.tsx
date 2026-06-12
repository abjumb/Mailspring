import React from 'react';
import { Actions, localized } from 'mailspring-exports';
import TodoistStore from './todoist-store';
import { localDateKey, taskDueDateKey, TodoistTask } from './todoist-api';

interface CalendarDay {
  date: Date;
  key: string;
  inMonth: boolean;
}

interface TodoistSidebarState {
  tasks: TodoistTask[];
  loading: boolean;
  error: string | null;
  hasToken: boolean;
  enabled: boolean;
  showWidget: boolean;
  lastSync: Date | null;
  month: Date;
  selectedDate: string;
  newTask: string;
  adding: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function dayLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map((part) => parseInt(part, 10));
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function buildCalendarDays(month: Date): CalendarDay[] {
  const first = startOfMonth(month);
  const gridStart = addDays(first, -first.getDay());
  const days: CalendarDay[] = [];

  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    days.push({
      date,
      key: localDateKey(date),
      inMonth: date.getMonth() === first.getMonth(),
    });
  }
  return days;
}

function tasksByDate(tasks: TodoistTask[]) {
  const grouped: { [date: string]: TodoistTask[] } = {};
  for (const task of tasks) {
    const key = taskDueDateKey(task);
    if (!key) {
      continue;
    }
    grouped[key] = grouped[key] || [];
    grouped[key].push(task);
  }
  return grouped;
}

export default class TodoistSidebar extends React.Component<
  Record<string, unknown>,
  TodoistSidebarState
> {
  static displayName = 'TodoistSidebar';

  static containerRequired = false;

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

    this._unlisteners = [
      TodoistStore.listen(() => this.setState(this._stateFromStores())),
      () => enabledDisposable.dispose(),
      () => widgetDisposable.dispose(),
    ];
  }

  componentWillUnmount() {
    this._unlisteners.forEach((unlisten) => unlisten());
  }

  _stateFromStores = () => {
    const today = localDateKey(new Date());
    return {
      tasks: TodoistStore.tasks(),
      loading: TodoistStore.loading(),
      error: TodoistStore.error(),
      hasToken: TodoistStore.hasToken(),
      enabled: TodoistStore.enabled(),
      showWidget: TodoistStore.showWidget(),
      lastSync: TodoistStore.lastSync(),
      month: this.state ? this.state.month : startOfMonth(new Date()),
      selectedDate: this.state ? this.state.selectedDate : today,
      newTask: this.state ? this.state.newTask : '',
      adding: this.state ? this.state.adding : false,
    };
  };

  _openTodoistPreferences = () => {
    Actions.openPreferences();
    Actions.switchPreferencesTab('Todoist');
  };

  _changeMonth = (amount: number) => {
    this.setState({ month: addMonths(this.state.month, amount) });
  };

  _selectToday = () => {
    const today = new Date();
    this.setState({
      month: startOfMonth(today),
      selectedDate: localDateKey(today),
    });
  };

  _addTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = this.state.newTask.trim();
    if (!content) {
      return;
    }

    this.setState({ adding: true });
    try {
      await TodoistStore.addTask(content, this.state.selectedDate);
      this.setState({ newTask: '' });
    } catch (err) {
      AppEnv.showErrorDialog(err.message || localized('Unable to create Todoist task.'));
    } finally {
      this.setState({ adding: false });
    }
  };

  _completeTask = async (task: TodoistTask) => {
    try {
      await TodoistStore.completeTask(task.id);
    } catch (err) {
      AppEnv.showErrorDialog(err.message || localized('Unable to complete Todoist task.'));
    }
  };

  _renderCalendar() {
    const today = localDateKey(new Date());
    const grouped = tasksByDate(this.state.tasks);

    return (
      <div className="todoist-mini-calendar">
        <div className="todoist-calendar-header">
          <button
            className="btn btn-icon todoist-icon-button"
            title={localized('Previous month')}
            onClick={() => this._changeMonth(-1)}
          >
            &lt;
          </button>
          <button className="todoist-calendar-title" onClick={this._selectToday}>
            {monthLabel(this.state.month)}
          </button>
          <button
            className="btn btn-icon todoist-icon-button"
            title={localized('Next month')}
            onClick={() => this._changeMonth(1)}
          >
            &gt;
          </button>
        </div>
        <div className="todoist-calendar-grid todoist-calendar-weekdays">
          {WEEKDAYS.map((day) => (
            <div key={day}>{localized(day)}</div>
          ))}
        </div>
        <div className="todoist-calendar-grid">
          {buildCalendarDays(this.state.month).map((day) => {
            const tasks = grouped[day.key] || [];
            let className = 'todoist-calendar-day';
            if (!day.inMonth) className += ' outside-month';
            if (day.key === today) className += ' today';
            if (day.key === this.state.selectedDate) className += ' selected';
            if (tasks.length) className += ' has-tasks';

            return (
              <button
                key={day.key}
                className={className}
                title={`${dayLabel(day.key)}${tasks.length ? `, ${tasks.length}` : ''}`}
                onClick={() => this.setState({ selectedDate: day.key })}
              >
                <span>{day.date.getDate()}</span>
                {tasks.length ? <em>{tasks.length}</em> : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  _renderTasksForSelectedDate() {
    const tasks = this.state.tasks.filter(
      (task) => taskDueDateKey(task) === this.state.selectedDate
    );

    return (
      <div className="todoist-selected-day">
        <div className="todoist-selected-day-title">
          <span>{dayLabel(this.state.selectedDate)}</span>
          <button
            className="btn btn-small"
            disabled={this.state.loading}
            onClick={() => TodoistStore.refresh()}
          >
            {localized('Refresh')}
          </button>
        </div>
        {tasks.length ? (
          <ul className="todoist-task-list">
            {tasks.map((task) => (
              <li key={task.id}>
                <label>
                  <input type="checkbox" onChange={() => this._completeTask(task)} />
                  <span>{task.content}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <div className="todoist-empty">{localized('No Todoist tasks due.')}</div>
        )}
      </div>
    );
  }

  _renderConnected() {
    return (
      <>
        {this._renderCalendar()}
        <form className="todoist-quick-add" onSubmit={this._addTask}>
          <input
            type="text"
            value={this.state.newTask}
            placeholder={localized('Add task')}
            onChange={(event) => this.setState({ newTask: event.target.value })}
          />
          <button
            className="btn btn-emphasis"
            disabled={this.state.adding || !this.state.newTask.trim()}
            title={localized('Add Todoist task')}
          >
            +
          </button>
        </form>
        {this._renderTasksForSelectedDate()}
        {this.state.error ? <div className="todoist-error">{this.state.error}</div> : null}
      </>
    );
  }

  render() {
    if (!this.state.enabled || !this.state.showWidget) {
      return null;
    }

    return (
      <div className="todoist-sidebar-widget">
        <div className="todoist-widget-header">
          <strong>{localized('Todoist')}</strong>
          {this.state.loading ? <span>{localized('Syncing')}</span> : null}
        </div>
        {this.state.hasToken ? (
          this._renderConnected()
        ) : (
          <div className="todoist-connect">
            <p>{localized('Connect Todoist to show tasks on your mini calendar.')}</p>
            <button className="btn btn-emphasis" onClick={this._openTodoistPreferences}>
              {localized('Connect Todoist')}
            </button>
          </div>
        )}
      </div>
    );
  }
}
