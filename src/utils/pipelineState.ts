import { INITIAL_ENV_VARS, INITIAL_FILE_ASSOCS, INITIAL_PROFILE_RULES } from '../data/catalog';
import {
  CorporateProfileRule,
  EnvScope,
  EnvVarRule,
  FileAssociationRule,
  GlobalPipelineOptions,
  InstallerEngine,
  ScriptFormat,
  SelectedPackageConfig,
  UiLevel,
} from '../types/deployment';
import type { PipelineState } from './scriptGenerator';

export const DEFAULT_OPTIONS: GlobalPipelineOptions = {
  profileName: 'Estacion Corporativa Base',
  organizationName: 'Un Fantasma en el Sistema',
  sourceDirWin: 'C:\\Deploy\\Installers',
  logDirWin: 'C:\\ProgramData\\CorpDeploy\\Logs',
  logDirLinux: '/var/log/corp-deploy',
  requireAdminCheck: true,
  stopOnError: true,
  includeDidacticComments: true,
  dryRunMode: false,
  generateDismXml: true,
  waitForMsiMutex: true,
  closeRunningApps: true,
  checkDiskSpace: true,
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const inEnum = <T extends Record<string, string>>(e: T, v: unknown): v is T[keyof T] =>
  Object.values(e).includes(v as string);

function normalizeOptions(raw: unknown): GlobalPipelineOptions {
  const out = { ...DEFAULT_OPTIONS };
  if (!isObj(raw)) return out;
  for (const key of Object.keys(DEFAULT_OPTIONS) as (keyof GlobalPipelineOptions)[]) {
    if (typeof raw[key] === typeof DEFAULT_OPTIONS[key]) {
      (out as Record<string, unknown>)[key] = raw[key];
    }
  }
  return out;
}

function normalizePackage(raw: unknown): SelectedPackageConfig | null {
  if (!isObj(raw) || !isStr(raw.packageId) || !raw.packageId) return null;
  const pkg: SelectedPackageConfig = {
    packageId: raw.packageId,
    uiLevel: inEnum(UiLevel, raw.uiLevel) ? raw.uiLevel : UiLevel.SILENT,
    suppressReboot: typeof raw.suppressReboot === 'boolean' ? raw.suppressReboot : true,
    allUsers: typeof raw.allUsers === 'boolean' ? raw.allUsers : true,
    enableLog: typeof raw.enableLog === 'boolean' ? raw.enableLog : true,
    extraArgs: isStr(raw.extraArgs) ? raw.extraArgs : '',
  };
  const tpl = raw.customTemplate;
  if (
    isObj(tpl) &&
    ['id', 'name', 'version', 'winInstallerFile', 'linuxPackageName', 'silentSwitchWin', 'passiveSwitchWin'].every((k) =>
      isStr(tpl[k])
    ) &&
    inEnum(InstallerEngine, tpl.engine)
  ) {
    pkg.customTemplate = {
      vendor: '',
      category: 'General',
      noRestartSwitchWin: '',
      allUsersSwitchWin: '',
      didacticSummary: '',
      ...(tpl as object),
    } as SelectedPackageConfig['customTemplate'];
  }
  return pkg;
}

/** Usa las reglas del proyecto si son válidas; si faltan, las del catálogo desactivadas. */
function normalizeRules<T extends { id: string; enabled: boolean }>(
  raw: unknown,
  base: T[],
  required: string[],
  extra: (r: Obj) => boolean = () => true
): T[] {
  if (!Array.isArray(raw)) return base.map((r) => ({ ...r, enabled: false }));
  return raw.filter(
    (r): r is T => isObj(r) && required.every((k) => isStr(r[k])) && typeof r.enabled === 'boolean' && extra(r)
  );
}

/**
 * Valida un proyecto procedente de localStorage o de un .json importado.
 * Devuelve null si no es un proyecto del laboratorio; si lo es, rellena lo que falte.
 */
export function normalizePipelineState(raw: unknown): PipelineState | null {
  if (!isObj(raw) || !Array.isArray(raw.selectedPackages) || !isObj(raw.options)) return null;
  return {
    format: inEnum(ScriptFormat, raw.format) ? raw.format : ScriptFormat.POWERSHELL,
    selectedPackages: raw.selectedPackages.map(normalizePackage).filter((p): p is SelectedPackageConfig => p !== null),
    envVars: normalizeRules<EnvVarRule>(
      raw.envVars,
      INITIAL_ENV_VARS,
      ['id', 'name', 'winValue', 'linuxValue'],
      (r) => inEnum(EnvScope, r.scope) && typeof r.isPathAppend === 'boolean'
    ),
    fileAssocs: normalizeRules<FileAssociationRule>(raw.fileAssocs, INITIAL_FILE_ASSOCS, [
      'id',
      'extension',
      'progId',
      'appName',
      'winExecutablePath',
      'linuxDesktopEntry',
      'mimeType',
    ]),
    profileRules: normalizeRules<CorporateProfileRule>(raw.profileRules, INITIAL_PROFILE_RULES, ['id', 'title']),
    options: normalizeOptions(raw.options),
  };
}
