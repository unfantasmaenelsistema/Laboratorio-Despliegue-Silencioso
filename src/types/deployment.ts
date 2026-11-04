export enum ScriptFormat {
  POWERSHELL = 'ps1',
  BATCH = 'bat',
  BASH = 'sh',
}

export enum InstallerEngine {
  MSI = 'MSI (Windows Installer)',
  NSIS = 'NSIS (Nullsoft)',
  INNO = 'Inno Setup',
  INSTALLSHIELD = 'InstallShield / Bootstrapper',
  WIX_BURN = 'WiX Burn Bundle',
  LINUX_PKG = 'APT / DEB & DNF',
}

export enum UiLevel {
  SILENT = 'silent',
  PASSIVE = 'passive',
}

export interface SoftwarePackageTemplate {
  id: string;
  name: string;
  version: string;
  vendor: string;
  category: string;
  engine: InstallerEngine;
  winInstallerFile: string;
  linuxPackageName: string;
  wingetId?: string;
  processNameWin?: string;
  detectPathWin?: string;
  silentSwitchWin: string;
  passiveSwitchWin: string;
  noRestartSwitchWin: string;
  allUsersSwitchWin: string;
  extraPropsWin?: string;
  caseSensitiveWarning?: string;
  didacticSummary: string;
}

export interface SelectedPackageConfig {
  packageId: string;
  customTemplate?: SoftwarePackageTemplate;
  uiLevel: UiLevel;
  suppressReboot: boolean;
  allUsers: boolean;
  enableLog: boolean;
  extraArgs: string;
}

export enum EnvScope {
  MACHINE = 'Machine',
  USER = 'User',
}

export interface EnvVarRule {
  id: string;
  name: string;
  value: string;
  winValue: string;
  linuxValue: string;
  scope: EnvScope;
  isPathAppend: boolean;
  description: string;
  enabled: boolean;
}

export interface FileAssociationRule {
  id: string;
  extension: string;
  label: string;
  progId: string;
  appName: string;
  winExecutablePath: string;
  linuxDesktopEntry: string;
  mimeType: string;
  enabled: boolean;
}

export interface CorporateProfileRule {
  id: string;
  title: string;
  category: string;
  winMechanism: string;
  linuxMechanism: string;
  didacticWhy: string;
  enabled: boolean;
}

export interface GlobalPipelineOptions {
  profileName: string;
  organizationName: string;
  sourceDirWin: string;
  logDirWin: string;
  logDirLinux: string;
  requireAdminCheck: boolean;
  stopOnError: boolean;
  includeDidacticComments: boolean;
  dryRunMode: boolean;
  generateDismXml: boolean;
  waitForMsiMutex: boolean;
  closeRunningApps: boolean;
  checkDiskSpace: boolean;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  targetAudience: string;
  summary: string;
  recommendedFormat: ScriptFormat;
  packages: SelectedPackageConfig[];
  enabledEnvIds: string[];
  enabledAssocIds: string[];
  enabledProfileIds: string[];
}

export interface AnatomyToken {
  id: string;
  token: string;
  role: string;
  explanation: string;
  pitfall?: string;
}

export interface EngineAnatomyExample {
  id: string;
  engineName: string;
  detectionHint: string;
  platform: string;
  tokens: AnatomyToken[];
}

export interface ExitCodeEntry {
  code: number;
  symbolicName: string;
  severity: 'nominal' | 'warning' | 'error';
  meaning: string;
  automationAction: string;
}

export enum SimulationFault {
  NONE = 'none',
  NO_ADMIN = 'no_admin',
  MSI_MUTEX_1618 = 'msi_1618',
  REBOOT_REQUIRED_3010 = 'reboot_3010',
  NSIS_LOWERCASE_HANG = 'nsis_hang',
}

export interface DiagnosticChallenge {
  id: string;
  title: string;
  context: string;
  brokenSnippet: string;
  language: string;
  options: {
    id: string;
    label: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  fixedSnippet: string;
}

export interface BinarySampleProfile {
  id: string;
  fileName: string;
  fileSizeDesc: string;
  detectedEngine: InstallerEngine;
  magicBytesHex: string;
  signatureStrings: string[];
  recommendedSilentCmd: string;
  unpackCommand: string;
  forensicExplanation: string;
  catalogPackageId?: string;
}

export interface CommandAuditPreset {
  id: string;
  label: string;
  command: string;
}

export interface CommandAuditFinding {
  severity: 'error' | 'warning' | 'nominal';
  title: string;
  detail: string;
  suggestion: string;
}
