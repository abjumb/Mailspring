import path from 'path';
import MailspringStore from 'mailspring-store';
import {
  morosDataDirPath,
  readJsonFile,
  watchMorosFile,
  writeJsonFileAtomic,
} from '../moros-data-store';
import { MorosModule, PANELS } from './panel-registry';

const LAYOUT_FILENAME = 'layout.json';

export interface PanelPlacement {
  panelId: string;
  /** Grid columns occupied (the grid is 2 columns wide). */
  span: 1 | 2;
  hidden: boolean;
}

type LayoutFile = { [M in MorosModule]?: PanelPlacement[] };

/**
 * Persists each module's panel arrangement (order, width, visibility) so the
 * views behave like a user-tileable dashboard. Unknown / stale panel ids are
 * dropped and newly-registered panels are appended with their defaults, so
 * upgrades never lose a saved arrangement.
 */
class PanelLayoutStore extends MailspringStore {
  _layouts: LayoutFile;
  _saveTimer: ReturnType<typeof setTimeout> | null = null;
  _selfWriteAtMs = 0;

  constructor() {
    super();
    this._layouts = readJsonFile<LayoutFile>(this._filePath()) || {};
    watchMorosFile(LAYOUT_FILENAME, () => {
      if (Date.now() - this._selfWriteAtMs < 1000) return;
      this._layouts = readJsonFile<LayoutFile>(this._filePath()) || {};
      this.trigger();
    });
  }

  layoutFor(module: MorosModule): PanelPlacement[] {
    const known = PANELS.filter((panel) => panel.module === module);
    const saved = this._layouts[module] || [];
    const placements = saved.filter((placement) =>
      known.some((panel) => panel.id === placement.panelId)
    );
    for (const panel of known) {
      if (!placements.some((placement) => placement.panelId === panel.id)) {
        placements.push({ panelId: panel.id, span: panel.defaultSpan, hidden: false });
      }
    }
    return placements;
  }

  movePanel(module: MorosModule, panelId: string, beforePanelId: string | null) {
    const placements = this.layoutFor(module);
    const fromIndex = placements.findIndex((placement) => placement.panelId === panelId);
    if (fromIndex === -1 || panelId === beforePanelId) return;
    const [moved] = placements.splice(fromIndex, 1);
    const toIndex = beforePanelId
      ? placements.findIndex((placement) => placement.panelId === beforePanelId)
      : placements.length;
    placements.splice(toIndex === -1 ? placements.length : toIndex, 0, moved);
    this._commit(module, placements);
  }

  toggleSpan(module: MorosModule, panelId: string) {
    this._commit(
      module,
      this.layoutFor(module).map((placement) =>
        placement.panelId === panelId
          ? { ...placement, span: placement.span === 2 ? 1 : (2 as const) }
          : placement
      )
    );
  }

  setHidden(module: MorosModule, panelId: string, hidden: boolean) {
    this._commit(
      module,
      this.layoutFor(module).map((placement) =>
        placement.panelId === panelId ? { ...placement, hidden } : placement
      )
    );
  }

  resetLayout(module: MorosModule) {
    delete this._layouts[module];
    this._queueSave();
    this.trigger();
  }

  _commit(module: MorosModule, placements: PanelPlacement[]) {
    this._layouts[module] = placements;
    this._queueSave();
    this.trigger();
  }

  _filePath() {
    return path.join(morosDataDirPath(), LAYOUT_FILENAME);
  }

  _queueSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._selfWriteAtMs = Date.now();
      try {
        writeJsonFileAtomic(this._filePath(), this._layouts);
      } catch (err) {
        AppEnv.reportError(err);
      }
    }, 250);
  }
}

export default new PanelLayoutStore();
