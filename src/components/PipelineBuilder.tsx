import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
} from 'lucide-react';
import { SOFTWARE_CATALOG } from '../data/catalog';
import {
  CorporateProfileRule,
  EnvScope,
  EnvVarRule,
  FileAssociationRule,
  GlobalPipelineOptions,
  InstallerEngine,
  ScriptFormat,
  SelectedPackageConfig,
  SoftwarePackageTemplate,
  UiLevel,
} from '../types/deployment';
import {
  PipelineState,
  buildWindowsPackageArgs,
  resolvePackageTemplate,
} from '../utils/scriptGenerator';

interface PipelineBuilderProps {
  state: PipelineState;
  onUpdatePackages: (pkgs: SelectedPackageConfig[]) => void;
  onUpdateEnvVars: (vars: EnvVarRule[]) => void;
  onUpdateFileAssocs: (assocs: FileAssociationRule[]) => void;
  onUpdateProfileRules: (rules: CorporateProfileRule[]) => void;
  onUpdateOptions: (opts: GlobalPipelineOptions) => void;
}

type BuilderStage = 'packages' | 'env' | 'assoc' | 'profile';

export const PipelineBuilder: React.FC<PipelineBuilderProps> = ({
  state,
  onUpdatePackages,
  onUpdateEnvVars,
  onUpdateFileAssocs,
  onUpdateProfileRules,
  onUpdateOptions,
}) => {
  const [activeStage, setActiveStage] = useState<BuilderStage>('packages');

  // Custom package form state
  const [showCustomPkgForm, setShowCustomPkgForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customFile, setCustomFile] = useState('');
  const [customLinuxPkg, setCustomLinuxPkg] = useState('');
  const [customEngine, setCustomEngine] = useState<InstallerEngine>(InstallerEngine.MSI);

  // Custom env var form state
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvWinVal, setNewEnvWinVal] = useState('');
  const [newEnvLinuxVal, setNewEnvLinuxVal] = useState('');
  const [newEnvScope, setNewEnvScope] = useState<EnvScope>(EnvScope.MACHINE);
  const [newEnvIsPath, setNewEnvIsPath] = useState(false);

  // Custom file association form state
  const [newExt, setNewExt] = useState('');
  const [newProgId, setNewProgId] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [newExePath, setNewExePath] = useState('');
  const [newMime, setNewMime] = useState('application/octet-stream');

  const isSelectedPackage = (id: string) =>
    state.selectedPackages.some((p) => p.packageId === id);

  const toggleCatalogPackage = (tpl: SoftwarePackageTemplate) => {
    if (isSelectedPackage(tpl.id)) {
      onUpdatePackages(state.selectedPackages.filter((p) => p.packageId !== tpl.id));
    } else {
      onUpdatePackages([
        ...state.selectedPackages,
        {
          packageId: tpl.id,
          uiLevel: UiLevel.SILENT,
          suppressReboot: true,
          allUsers: true,
          enableLog: true,
          extraArgs: tpl.extraPropsWin ?? '',
        },
      ]);
    }
  };

  const updateSelectedPackage = (
    index: number,
    patch: Partial<SelectedPackageConfig>
  ) => {
    const next = [...state.selectedPackages];
    next[index] = { ...next[index], ...patch };
    onUpdatePackages(next);
  };

  const movePackage = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= state.selectedPackages.length) return;
    const next = [...state.selectedPackages];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    onUpdatePackages(next);
  };

  const handleAddCustomPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customFile.trim()) return;

    const id = `custom-${Date.now()}`;
    const defaultsByEngine: Record<
      InstallerEngine,
      { silent: string; passive: string; noreboot: string; allusers: string }
    > = {
      [InstallerEngine.MSI]: {
        silent: '/qn',
        passive: '/qb!',
        noreboot: '/norestart',
        allusers: 'ALLUSERS=1',
      },
      [InstallerEngine.NSIS]: {
        silent: '/S',
        passive: '/S',
        noreboot: '',
        allusers: '',
      },
      [InstallerEngine.INNO]: {
        silent: '/VERYSILENT /SUPPRESSMSGBOXES /SP-',
        passive: '/SILENT /SUPPRESSMSGBOXES',
        noreboot: '/NORESTART',
        allusers: '',
      },
      [InstallerEngine.INSTALLSHIELD]: {
        silent: '/s /v"/qn /norestart"',
        passive: '/s /v"/qb!"',
        noreboot: '',
        allusers: '',
      },
      [InstallerEngine.WIX_BURN]: {
        silent: '/quiet',
        passive: '/passive',
        noreboot: '/norestart',
        allusers: 'InstallAllUsers=1',
      },
      [InstallerEngine.LINUX_PKG]: {
        silent: '-y -q',
        passive: '-y',
        noreboot: '',
        allusers: '',
      },
    };

    const sw = defaultsByEngine[customEngine];
    const tpl: SoftwarePackageTemplate = {
      id,
      name: customName.trim(),
      version: 'Personalizado',
      vendor: 'Interno / Corporativo',
      category: 'Paquete a medida',
      engine: customEngine,
      winInstallerFile: customFile.trim(),
      linuxPackageName:
        customLinuxPkg.trim() ||
        customName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-'),
      silentSwitchWin: sw.silent,
      passiveSwitchWin: sw.passive,
      noRestartSwitchWin: sw.noreboot,
      allUsersSwitchWin: sw.allusers,
      didacticSummary:
        'Paquete incorporado manualmente con plantillas automáticas según el motor de instalación elegido.',
    };

    onUpdatePackages([
      ...state.selectedPackages,
      {
        packageId: id,
        customTemplate: tpl,
        uiLevel: UiLevel.SILENT,
        suppressReboot: true,
        allUsers: true,
        enableLog: true,
        extraArgs: '',
      },
    ]);

    setCustomName('');
    setCustomFile('');
    setCustomLinuxPkg('');
    setShowCustomPkgForm(false);
  };

  const handleAddEnvVar = (e: React.FormEvent) => {
    e.preventDefault();
    const varName = newEnvIsPath ? 'PATH' : newEnvName.trim();
    if (!varName || !newEnvWinVal.trim()) return;

    const rule: EnvVarRule = {
      id: `env-custom-${Date.now()}`,
      name: varName,
      value: newEnvWinVal.trim(),
      winValue: newEnvWinVal.trim(),
      linuxValue: newEnvLinuxVal.trim() || newEnvWinVal.trim(),
      scope: newEnvScope,
      isPathAppend: newEnvIsPath,
      description: newEnvIsPath
        ? 'Ruta adicional incorporada de manera idempotente al PATH sin sobrescribir entradas existentes.'
        : 'Variable personalizada persistida para todos los procesos nuevos.',
      enabled: true,
    };

    onUpdateEnvVars([...state.envVars, rule]);
    setNewEnvName('');
    setNewEnvWinVal('');
    setNewEnvLinuxVal('');
  };

  const handleAddAssociation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExt.trim() || !newProgId.trim() || !newExePath.trim()) return;
    const normalizedExt = newExt.trim().startsWith('.')
      ? newExt.trim().toLowerCase()
      : `.${newExt.trim().toLowerCase()}`;

    const assoc: FileAssociationRule = {
      id: `assoc-custom-${Date.now()}`,
      extension: normalizedExt,
      label: `Extensión ${normalizedExt}`,
      progId: newProgId.trim(),
      appName: newAppName.trim() || newProgId.trim(),
      winExecutablePath: newExePath.trim(),
      linuxDesktopEntry: `${newProgId.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '-')}.desktop`,
      mimeType: newMime.trim() || 'application/octet-stream',
      enabled: true,
    };

    onUpdateFileAssocs([...state.fileAssocs, assoc]);
    setNewExt('');
    setNewProgId('');
    setNewAppName('');
    setNewExePath('');
  };

  const activeEnvCount = state.envVars.filter((v) => v.enabled).length;
  const activeAssocCount = state.fileAssocs.filter((a) => a.enabled).length;
  const activeProfileCount = state.profileRules.filter((r) => r.enabled).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Stage Navigation Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            Constructor Modular de Despliegue
          </h2>
          <p className="text-xs text-slate-500 tabular-nums">
            <span>{state.selectedPackages.length} paquetes</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{activeEnvCount} variables</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{activeAssocCount} extensiones</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{activeProfileCount} políticas de perfil</span>
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Fases del constructor de despliegue"
          className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeStage === 'packages'}
            onClick={() => setActiveStage('packages')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStage === 'packages'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            01. Paquetes ({state.selectedPackages.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeStage === 'env'}
            onClick={() => setActiveStage('env')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStage === 'env'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            02. Entorno ({activeEnvCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeStage === 'assoc'}
            onClick={() => setActiveStage('assoc')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStage === 'assoc'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            03. Archivos ({activeAssocCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeStage === 'profile'}
            onClick={() => setActiveStage('profile')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStage === 'profile'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            04. Perfil Base ({activeProfileCount})
          </button>
        </div>
      </div>

      {/* STAGE 01: PACKAGES */}
      {activeStage === 'packages' && (
        <div className="divide-y divide-slate-200">
          {/* Catalog Picker */}
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Catálogo de Instaladores Reales por Motor
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Activa paquetes para observar cómo cambian sus switches silenciosos entre MSI, NSIS, Inno Setup, Burn e InstallShield
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomPkgForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showCustomPkgForm ? 'Cerrar formulario' : 'Añadir instalador propio'}</span>
              </button>
            </div>

            {showCustomPkgForm && (
              <form
                onSubmit={handleAddCustomPackage}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
              >
                <div className="text-xs font-semibold text-slate-800">
                  Definir instalador personalizado
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Nombre de la aplicación
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Agente GLPI Inventario"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Motor de empaquetado
                    </label>
                    <select
                      value={customEngine}
                      onChange={(e) => setCustomEngine(e.target.value as InstallerEngine)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      <option value={InstallerEngine.MSI}>MSI (Windows Installer)</option>
                      <option value={InstallerEngine.INNO}>Inno Setup (.exe)</option>
                      <option value={InstallerEngine.NSIS}>NSIS Nullsoft (.exe)</option>
                      <option value={InstallerEngine.INSTALLSHIELD}>InstallShield (.exe)</option>
                      <option value={InstallerEngine.WIX_BURN}>WiX Burn Bundle (.exe)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Archivo instalador Windows
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. GLPI-Agent-1.11-x64.msi"
                      value={customFile}
                      onChange={(e) => setCustomFile(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Equivalente APT Linux (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. glpi-agent"
                      value={customLinuxPkg}
                      onChange={(e) => setCustomLinuxPkg(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomPkgForm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
                  >
                    Incorporar a la cola
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SOFTWARE_CATALOG.map((item) => {
                const active = isSelectedPackage(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCatalogPackage(item)}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-50/70 border-sky-600/70'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {item.name}
                      </span>
                      <span className="text-xs font-medium text-sky-700 shrink-0">
                        {active ? 'Seleccionado' : 'Añadir'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      <span>{item.engine}</span>
                      <span aria-hidden="true" className="mx-1.5">·</span>
                      <span className="font-mono">{item.silentSwitchWin.split(' ')[0]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Queue & Switch Customizer */}
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Cola de Instalación y Ajuste Fino de Switches
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                El orden importa: instala primero runtimes y utilidades base antes de aplicaciones que dependan de ellos
              </p>
            </div>

            {state.selectedPackages.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-200 px-4 space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  La cola de software está vacía
                </p>
                <p className="text-xs text-slate-500">
                  Selecciona al menos un instalador del catálogo superior para generar los comandos desatendidos.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {state.selectedPackages.map((pkg, idx) => {
                  const tpl = resolvePackageTemplate(pkg);
                  const preview = buildWindowsPackageArgs(
                    pkg,
                    tpl,
                    state.options.logDirWin
                  );

                  return (
                    <div key={`${pkg.packageId}-${idx}`} className="p-4 bg-white space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-slate-500 tabular-nums">
                            <span>Orden #{idx + 1}</span>
                            <span aria-hidden="true" className="mx-1.5">·</span>
                            <span>{tpl.engine}</span>
                            <span aria-hidden="true" className="mx-1.5">·</span>
                            <span className="font-mono">{tpl.winInstallerFile}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 mt-0.5">
                            {tpl.name} ({tpl.version})
                          </h4>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => movePackage(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Subir en la cola"
                            className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => movePackage(idx, 1)}
                            disabled={idx === state.selectedPackages.length - 1}
                            aria-label="Bajar en la cola"
                            className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePackages(
                                state.selectedPackages.filter((_, i) => i !== idx)
                              )
                            }
                            aria-label="Quitar paquete"
                            className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Didactic Summary */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {tpl.didacticSummary}
                      </p>

                      {state.format !== ScriptFormat.BASH && (
                        <>
                          {/* Controls row */}
                          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSelectedPackage(idx, { uiLevel: UiLevel.SILENT })
                                }
                                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                                  pkg.uiLevel === UiLevel.SILENT
                                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Invisible ({tpl.silentSwitchWin.split(' ')[0]})
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSelectedPackage(idx, { uiLevel: UiLevel.PASSIVE })
                                }
                                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                                  pkg.uiLevel === UiLevel.PASSIVE
                                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Barra pasiva ({tpl.passiveSwitchWin.split(' ')[0]})
                              </button>
                            </div>

                            {tpl.noRestartSwitchWin && (
                              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={pkg.suppressReboot}
                                  onChange={(e) =>
                                    updateSelectedPackage(idx, {
                                      suppressReboot: e.target.checked,
                                    })
                                  }
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-sky-700"
                                />
                                <span>Suprimir reinicio</span>
                              </label>
                            )}

                            {tpl.allUsersSwitchWin && (
                              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={pkg.allUsers}
                                  onChange={(e) =>
                                    updateSelectedPackage(idx, {
                                      allUsers: e.target.checked,
                                    })
                                  }
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-sky-700"
                                />
                                <span>Nivel Máquina (Todos)</span>
                              </label>
                            )}

                            {tpl.engine !== InstallerEngine.NSIS && (
                              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={pkg.enableLog}
                                  onChange={(e) =>
                                    updateSelectedPackage(idx, {
                                      enableLog: e.target.checked,
                                    })
                                  }
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-sky-700"
                                />
                                <span>Log individual</span>
                              </label>
                            )}
                          </div>

                          {/* Extra args input */}
                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Propiedades públicas MSI o argumentos adicionales
                            </label>
                            <input
                              type="text"
                              value={pkg.extraArgs}
                              onChange={(e) =>
                                updateSelectedPackage(idx, { extraArgs: e.target.value })
                              }
                              placeholder="Ej. INSTALLDIR=&quot;C:\Apps&quot; DESKTOP_SHORTCUT=0"
                              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600"
                            />
                          </div>

                          {/* Command Preview Line */}
                          <div className="px-3 py-2 bg-slate-900 text-sky-200 rounded-md font-mono text-[11.5px] overflow-x-auto whitespace-nowrap">
                            {preview.executable} {preview.args}
                          </div>
                        </>
                      )}

                      {state.format === ScriptFormat.BASH && (
                        <div className="px-3 py-2 bg-slate-900 text-emerald-300 rounded-md font-mono text-[11.5px] overflow-x-auto whitespace-nowrap">
                          DEBIAN_FRONTEND=noninteractive apt-get install -y -q {tpl.linuxPackageName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 02: ENVIRONMENT VARIABLES */}
      {activeStage === 'env' && (
        <div className="p-5 space-y-6">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-xs font-semibold text-slate-900">
              Principio clave: Ámbito Máquina vs Usuario y peligro de truncamiento en PATH
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Las variables de <strong>Máquina</strong> residen en <code className="text-slate-800">HKLM\...\Session Manager\Environment</code> (Windows) o <code className="text-slate-800">/etc/profile.d/*.sh</code> (Linux) y aplican a todas las cuentas. Nunca utilices <code className="text-slate-800">setx /M PATH &quot;%PATH%;...&quot;</code> en scripts corporativos: mezcla el PATH de usuario con el de sistema y trunca cadenas mayores de 1024 caracteres.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {state.envVars.map((env) => (
              <div key={env.id} className="p-4 flex items-start justify-between gap-4 bg-white">
                <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={env.enabled}
                    onChange={(e) =>
                      onUpdateEnvVars(
                        state.envVars.map((item) =>
                          item.id === env.id
                            ? { ...item, enabled: e.target.checked }
                            : item
                        )
                      )
                    }
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-sky-700 shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-mono font-semibold text-slate-900">
                        {env.isPathAppend ? 'PATH +=' : env.name}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span className="text-slate-500">
                        Ámbito: {env.scope === EnvScope.MACHINE ? 'Sistema global (HKLM / /etc)' : 'Usuario activo'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-sky-800 break-all">
                      {state.format === ScriptFormat.BASH ? env.linuxValue : env.winValue}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {env.description}
                    </p>
                  </div>
                </label>

                {env.id.startsWith('env-custom-') && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateEnvVars(state.envVars.filter((i) => i.id !== env.id))
                    }
                    aria-label="Eliminar variable"
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Custom Env Var Form */}
          <form
            onSubmit={handleAddEnvVar}
            className="pt-4 border-t border-slate-200 space-y-3"
          >
            <h3 className="text-xs font-semibold text-slate-800">
              Añadir nueva variable corporativa o directorio a PATH
            </h3>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEnvIsPath}
                  onChange={(e) => setNewEnvIsPath(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-sky-700"
                />
                <span>Anexar ruta de forma segura a PATH</span>
              </label>

              <select
                value={newEnvScope}
                onChange={(e) => setNewEnvScope(e.target.value as EnvScope)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-800"
              >
                <option value={EnvScope.MACHINE}>Ámbito: Máquina global</option>
                <option value={EnvScope.USER}>Ámbito: Usuario</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {!newEnvIsPath && (
                <input
                  type="text"
                  required
                  placeholder="NOMBRE_VARIABLE"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value.toUpperCase())}
                  className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                />
              )}
              <input
                type="text"
                required
                placeholder={
                  newEnvIsPath
                    ? 'Ruta Windows (ej. C:\\SDK\\bin)'
                    : 'Valor en Windows'
                }
                value={newEnvWinVal}
                onChange={(e) => setNewEnvWinVal(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder={
                  newEnvIsPath
                    ? 'Ruta Linux (ej. /opt/sdk/bin)'
                    : 'Valor en Linux (opcional)'
                }
                value={newEnvLinuxVal}
                onChange={(e) => setNewEnvLinuxVal(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar regla de entorno</span>
            </button>
          </form>
        </div>
      )}

      {/* STAGE 03: FILE ASSOCIATIONS */}
      {activeStage === 'assoc' && (
        <div className="p-5 space-y-6">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-900">
              Cómo funcionan las asociaciones de archivo en entornos corporativos modernos
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              En Windows existen dos eslabones: <code className="text-slate-800">assoc .ext=ProgID</code> enlaza la extensión con un identificador lógico, y <code className="text-slate-800">ftype ProgID=&quot;ruta.exe&quot; &quot;%1&quot;</code> define cómo abrirlo. Además, Windows 10/11 protege la elección con un hash (<code className="text-slate-800">UserChoice</code>), por lo que para nuevos perfiles se exporta un XML aplicado con <code className="text-slate-800">dism /Online /Import-DefaultAppAssociations</code>. En Linux se declara el par MIME en <code className="text-slate-800">/etc/xdg/mimeapps.list</code>.
            </p>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={state.options.generateDismXml}
                onChange={(e) =>
                  onUpdateOptions({
                    ...state.options,
                    generateDismXml: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-slate-300 text-sky-700"
              />
              <span>Incluir comando DISM /Import-DefaultAppAssociations (puedes descargar el XML desde la pestaña derecha)</span>
            </label>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {state.fileAssocs.map((assoc) => (
              <div
                key={assoc.id}
                className="p-4 flex items-start justify-between gap-4 bg-white"
              >
                <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={assoc.enabled}
                    onChange={(e) =>
                      onUpdateFileAssocs(
                        state.fileAssocs.map((item) =>
                          item.id === assoc.id
                            ? { ...item, enabled: e.target.checked }
                            : item
                        )
                      )
                    }
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-sky-700 shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs">
                      <span className="font-mono font-semibold text-slate-900">
                        {assoc.extension}
                      </span>
                      <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
                      <span className="font-medium text-slate-800">{assoc.appName}</span>
                      <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
                      <span className="font-mono text-slate-500">
                        {state.format === ScriptFormat.BASH ? assoc.mimeType : assoc.progId}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-500 truncate">
                      {state.format === ScriptFormat.BASH
                        ? `${assoc.mimeType} -> ${assoc.linuxDesktopEntry}`
                        : `${assoc.winExecutablePath} "%1"`}
                    </div>
                  </div>
                </label>

                {assoc.id.startsWith('assoc-custom-') && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFileAssocs(
                        state.fileAssocs.filter((a) => a.id !== assoc.id)
                      )
                    }
                    aria-label="Eliminar asociación"
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddAssociation}
            className="pt-4 border-t border-slate-200 space-y-3"
          >
            <h3 className="text-xs font-semibold text-slate-800">
              Vincular nueva extensión corporativa
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Extensión (ej. .yaml)"
                value={newExt}
                onChange={(e) => setNewExt(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="ProgID (ej. VSCode.yaml)"
                value={newProgId}
                onChange={(e) => setNewProgId(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Nombre descriptivo (ej. Visual Studio Code)"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="MIME Linux (ej. application/x-yaml)"
                value={newMime}
                onChange={(e) => setNewMime(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Ruta ejecutable Windows (ej. C:\Program Files\Notepad++\notepad++.exe)"
                value={newExePath}
                onChange={(e) => setNewExePath(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar asociación</span>
            </button>
          </form>
        </div>
      )}

      {/* STAGE 04: CORPORATE DEFAULT USER PROFILE */}
      {activeStage === 'profile' && (
        <div className="p-5 space-y-6">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-xs font-semibold text-slate-900">
              Arquitectura del Perfil Predeterminado (C:\Users\Default vs /etc/skel)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cuando un empleado de Active Directory o LDAP inicia sesión por primera vez en un equipo nuevo, el sistema operativo clona el directorio molde (<code className="text-slate-800">C:\Users\Default</code> junto a su colmena <code className="text-slate-800">NTUSER.DAT</code> en Windows, o <code className="text-slate-800">/etc/skel</code> en Linux). Personalizar este molde durante el despliegue garantiza escritorios homogéneos, seguros y sin pantallas de bienvenida molestas.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {state.profileRules.map((rule) => (
              <label
                key={rule.id}
                className="p-4 flex items-start gap-3 bg-white hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) =>
                    onUpdateProfileRules(
                      state.profileRules.map((r) =>
                        r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                      )
                    )
                  }
                  className="w-4 h-4 mt-1 rounded border-slate-300 text-sky-700 shrink-0"
                />
                <div className="space-y-1.5 min-w-0">
                  <div className="text-xs text-slate-500">
                    <span>{rule.category}</span>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    <span>Plantilla multiusuario</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {rule.title}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rule.didacticWhy}
                  </p>
                  <div className="pt-1 text-[11.5px] font-mono text-slate-700 bg-slate-50 px-3 py-2 rounded border border-slate-200/80">
                    {state.format === ScriptFormat.BASH
                      ? `Linux: ${rule.linuxMechanism}`
                      : `Windows: ${rule.winMechanism}`}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
