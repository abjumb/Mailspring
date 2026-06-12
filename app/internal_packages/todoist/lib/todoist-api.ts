export interface TodoistDue {
  date: string;
  string?: string;
  timezone?: string | null;
  is_recurring?: boolean;
  lang?: string;
}

export interface TodoistDeadline {
  date: string;
  lang?: string;
}

export interface TodoistTask {
  id: string;
  content: string;
  description?: string;
  due?: TodoistDue | null;
  deadline?: TodoistDeadline | null;
  priority?: number;
  child_order?: number;
  day_order?: number;
  project_id?: string;
  section_id?: string | null;
  labels?: string[];
  checked?: boolean;
}

interface TodoistListResponse {
  results: TodoistTask[];
  next_cursor?: string | null;
}

export class TodoistAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'TodoistAPIError';
    this.status = status;
  }
}

const API_ROOT = 'https://api.todoist.com/api/v1';

async function todoistRequest<T>(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  const init: RequestInit = { ...options, headers };
  const response = await fetch(`${API_ROOT}${path}`, init);

  if (!response.ok) {
    let body = '';
    try {
      body = await response.text();
    } catch (err) {
      body = '';
    }
    const detail = body ? `: ${body}` : '';
    throw new TodoistAPIError(
      `Todoist request failed with ${response.status} ${response.statusText}${detail}`,
      response.status
    );
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }
  return JSON.parse(text) as T;
}

function encodeQuery(params: { [key: string]: string | number | null | undefined }) {
  const pairs = Object.keys(params)
    .filter((key) => params[key] !== null && params[key] !== undefined)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

export async function fetchTasks(token: string, limit = 100): Promise<TodoistTask[]> {
  const tasks: TodoistTask[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 10; page++) {
    const query = encodeQuery({ limit, cursor });
    const response = await todoistRequest<TodoistListResponse | TodoistTask[]>(
      token,
      `/tasks${query}`
    );

    if (Array.isArray(response)) {
      tasks.push(...response);
      break;
    }

    tasks.push(...(response.results || []));
    cursor = response.next_cursor || null;
    if (!cursor) {
      break;
    }
  }

  return tasks;
}

export async function createTask(
  token: string,
  content: string,
  dueDate?: string | null
): Promise<TodoistTask> {
  const body: { content: string; due_date?: string } = { content };
  if (dueDate) {
    body.due_date = dueDate;
  }

  return todoistRequest<TodoistTask>(token, '/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function closeTask(token: string, taskId: string): Promise<void> {
  await todoistRequest<null>(token, `/tasks/${encodeURIComponent(taskId)}/close`, {
    method: 'POST',
  });
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function taskDueDateKey(task: TodoistTask): string | null {
  const raw = (task.due && task.due.date) || (task.deadline && task.deadline.date);
  if (!raw) {
    return null;
  }

  if (raw.endsWith('Z')) {
    return localDateKey(new Date(raw));
  }

  return raw.slice(0, 10);
}

export function compareTasks(a: TodoistTask, b: TodoistTask) {
  const aDue = taskDueDateKey(a) || '9999-99-99';
  const bDue = taskDueDateKey(b) || '9999-99-99';
  if (aDue !== bDue) {
    return aDue.localeCompare(bDue);
  }

  const aPriority = a.priority || 1;
  const bPriority = b.priority || 1;
  if (aPriority !== bPriority) {
    return bPriority - aPriority;
  }

  return (a.child_order || a.day_order || 0) - (b.child_order || b.day_order || 0);
}
