import MailspringStore from 'mailspring-store';
import { KeyManager, localized } from 'mailspring-exports';
import {
  closeTask,
  compareTasks,
  createTask,
  fetchTasks,
  TodoistAPIError,
  TodoistTask,
} from './todoist-api';

const TOKEN_KEY = 'todoist.accessToken';
const MINUTE = 60 * 1000;

function messageForError(err: Error) {
  if (err instanceof TodoistAPIError && err.status === 401) {
    return localized('Todoist rejected the saved token.');
  }
  if (err instanceof TodoistAPIError && err.status === 403) {
    return localized('Todoist denied access for the saved token.');
  }
  return err.message || localized('Todoist could not be reached.');
}

class TodoistStore extends MailspringStore {
  _tasks: TodoistTask[] = [];
  _loading = false;
  _error: string | null = null;
  _hasToken = false;
  _lastSync: Date | null = null;
  _refreshTimer: number | null = null;
  _disposables: Array<{ dispose: () => void }> = [];
  _refreshRun = 0;

  activate() {
    this._disposables = [
      AppEnv.config.onDidChange('todoist.enabled', () => this._restart()),
      AppEnv.config.onDidChange('todoist.refreshIntervalMinutes', () => this._restart()),
    ];
    this._restart();
  }

  deactivate() {
    this._clearRefreshTimer();
    this._disposables.forEach((disposable) => disposable.dispose());
    this._disposables = [];
  }

  tasks() {
    return this._tasks;
  }

  loading() {
    return this._loading;
  }

  error() {
    return this._error;
  }

  hasToken() {
    return this._hasToken;
  }

  lastSync() {
    return this._lastSync;
  }

  enabled() {
    return AppEnv.config.get('todoist.enabled') !== false;
  }

  showWidget() {
    return AppEnv.config.get('todoist.showWidget') !== false;
  }

  async setAccessToken(token: string) {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error(localized('Enter a Todoist API token.'));
    }

    await this.testAccessToken(trimmed);
    await KeyManager.replacePassword(TOKEN_KEY, trimmed);
    this._hasToken = true;
    this._error = null;
    this.trigger(this);
    await this.refresh();
  }

  async clearAccessToken() {
    await KeyManager.deletePassword(TOKEN_KEY);
    this._tasks = [];
    this._hasToken = false;
    this._lastSync = null;
    this._error = null;
    this._clearRefreshTimer();
    this.trigger(this);
  }

  async testAccessToken(token: string) {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error(localized('Enter a Todoist API token.'));
    }
    await fetchTasks(trimmed, 1);
  }

  async testSavedAccessToken() {
    const token = await this._requireToken();
    await fetchTasks(token, 1);
  }

  async refresh() {
    const run = ++this._refreshRun;
    const token = await this._token();

    if (!this.enabled() || !token) {
      this._loading = false;
      this._hasToken = !!token;
      this.trigger(this);
      return;
    }

    this._loading = true;
    this._error = null;
    this.trigger(this);

    try {
      const tasks = await fetchTasks(token);
      if (run !== this._refreshRun) {
        return;
      }
      this._tasks = tasks.sort(compareTasks);
      this._hasToken = true;
      this._lastSync = new Date();
      this._error = null;
    } catch (err) {
      if (run !== this._refreshRun) {
        return;
      }
      this._error = messageForError(err);
    } finally {
      if (run === this._refreshRun) {
        this._loading = false;
        this.trigger(this);
      }
    }
  }

  async addTask(content: string, dueDate?: string | null) {
    const token = await this._requireToken();
    const task = await createTask(token, content.trim(), dueDate);
    this._tasks = [task].concat(this._tasks).sort(compareTasks);
    this._lastSync = new Date();
    this._error = null;
    this.trigger(this);
    this.refresh();
  }

  async completeTask(taskId: string) {
    const token = await this._requireToken();
    this._tasks = this._tasks.filter((task) => task.id !== taskId);
    this.trigger(this);

    try {
      await closeTask(token, taskId);
      this._lastSync = new Date();
      this._error = null;
    } catch (err) {
      this._error = messageForError(err);
      await this.refresh();
    } finally {
      this.trigger(this);
    }
  }

  async _restart() {
    this._clearRefreshTimer();
    await this._loadTokenState();
    if (this.enabled() && this._hasToken) {
      await this.refresh();
      this._scheduleRefresh();
    } else {
      this._loading = false;
      this.trigger(this);
    }
  }

  async _loadTokenState() {
    this._hasToken = !!(await this._token());
  }

  async _token() {
    return KeyManager.getPassword(TOKEN_KEY);
  }

  async _requireToken() {
    const token = await this._token();
    if (!token) {
      throw new Error(localized('Connect Todoist before creating tasks.'));
    }
    return token;
  }

  _scheduleRefresh() {
    if (!this.enabled()) {
      return;
    }
    const minutes = AppEnv.config.get('todoist.refreshIntervalMinutes') || 10;
    this._refreshTimer = window.setTimeout(
      async () => {
        await this.refresh();
        this._scheduleRefresh();
      },
      Math.max(1, minutes) * MINUTE
    );
  }

  _clearRefreshTimer() {
    if (this._refreshTimer !== null) {
      window.clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }
}

export default new TodoistStore();
