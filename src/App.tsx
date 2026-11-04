import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, RotateCcw } from 'lucide-react';
import { BinaryAndCommandLab } from './components/BinaryAndCommandLab';
import { BrandMark } from './components/BrandMark';
import { DiagnosticChallenges } from './components/DiagnosticChallenges';
import { ExecutionSimulator } from './components/ExecutionSimulator';
import { PipelineBuilder } from './components/PipelineBuilder';
import { ScriptInspector } from './components/ScriptInspector';
import { SwitchAnatomySection } from './components/SwitchAnatomySection';
import { SystemArchitectureMap } from './components/SystemArchitectureMap';
import {
  INITIAL_ENV_VARS,
  INITIAL_FILE_ASSOCS,
  INITIAL_PROFILE_RULES,
  SCENARIO_PRESETS,
} from './data/catalog';
import {
  CorporateProfileRule,
  EnvVarRule,
  FileAssociationRule,
  GlobalPipelineOptions,
  ScenarioPreset,
  ScriptFormat,
  SelectedPackageConfig,
} from './types/deployment';
import {
  PipelineState,
  generateScriptForState,
} from './utils/scriptGenerator';

const STORAGE_KEY = 'ufees_silent_deploy_lab_v2';

const DEFAULT_OPTIONS: GlobalPipelineOptions = {
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

function createInitialState(): PipelineState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PipelineState;
      if (parsed && Array.isArray(parsed.selectedPackages) && parsed.options) {
        return {
          ...parsed,
          options: {
            ...DEFAULT_OPTIONS,
            ...parsed.options,
          },
        };
      }
    }
  } catch {
    // Ignore storage read errors in restricted sandboxes
  }

  const defaultPreset = SCENARIO_PRESETS[0];
  return {
    format: defaultPreset.recommendedFormat,
    selectedPackages: defaultPreset.packages,
    envVars: INITIAL_ENV_VARS.map((v) => ({
      ...v,
      enabled: defaultPreset.enabledEnvIds.includes(v.id),
    })),
    fileAssocs: INITIAL_FILE_ASSOCS.map((a) => ({
      ...a,
      enabled: defaultPreset.enabledAssocIds.includes(a.id),
    })),
    profileRules: INITIAL_PROFILE_RULES.map((r) => ({
      ...r,
      enabled: defaultPreset.enabledProfileIds.includes(r.id),
    })),
    options: DEFAULT_OPTIONS,
  };
}

export default function App() {
  const [pipeline, setPipeline] = useState<PipelineState>(createInitialState);
  const [activePresetId, setActivePresetId] = useState<string>(SCENARIO_PRESETS[0].id);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pipeline));
    } catch {
      // Ignore storage write errors
    }
  }, [pipeline]);

  const applyScenarioPreset = (preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    setPipeline((prev) => ({
      format: preset.recommendedFormat,
      selectedPackages: preset.packages.map((p) => ({ ...p })),
      envVars: INITIAL_ENV_VARS.map((v) => ({
        ...v,
        enabled: preset.enabledEnvIds.includes(v.id),
      })),
      fileAssocs: INITIAL_FILE_ASSOCS.map((a) => ({
        ...a,
        enabled: preset.enabledAssocIds.includes(a.id),
      })),
      profileRules: INITIAL_PROFILE_RULES.map((r) => ({
        ...r,
        enabled: preset.enabledProfileIds.includes(r.id),
      })),
      options: {
        ...prev.options,
        profileName: preset.title,
      },
    }));
  };

  const handleQuickDownload = () => {
    const rawCode = generateScriptForState(pipeline);
    const slug =
      pipeline.options.profileName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'despliegue-silencioso';

    const filename = `${slug}.${pipeline.format}`;
    let payload = rawCode;
    let mime = 'text/plain;charset=utf-8';

    if (pipeline.format === ScriptFormat.BASH) {
      payload = rawCode.replace(/\r\n/g, '\n');
      mime = 'text/x-shellscript;charset=utf-8';
    } else if (pipeline.format === ScriptFormat.POWERSHELL) {
      payload = '\uFEFF' + rawCode.replace(/\r?\n/g, '\r\n');
    } else {
      payload = rawCode.replace(/\r?\n/g, '\r\n');
    }

    const blob = new Blob([payload], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFactoryReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    applyScenarioPreset(SCENARIO_PRESETS[0]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand mark (1-line wordmark + author logo) */}
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <BrandMark size="sm" />
            <span>Laboratorio de Despliegue</span>
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Navegación principal"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#constructor"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Constructor
            </a>
            <a
              href="#inspector"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Inspector Binario
            </a>
            <a
              href="#switches"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Switches
            </a>
            <a
              href="#simulador"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Simulador
            </a>
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Un Fantasma en el Sistema</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Zone 3: 1 primary CTA action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleQuickDownload}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .{pipeline.format}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6">
        {/* Hero & Corporate Scenario Presets */}
        <section className="py-8 sm:py-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Administración de Sistemas y Despliegue Masivo</span>
                <span aria-hidden="true">·</span>
                <span>PowerShell, Batch CMD, Bash, Intune y WinGet DSC</span>
                <span aria-hidden="true">·</span>
                <a
                  href="https://www.unfantasmaenelsistema.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sky-700 hover:underline"
                >
                  unfantasmaenelsistema.com
                </a>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold text-slate-900 tracking-tight leading-[1.15] text-balance max-w-3xl">
                Laboratorio de Despliegue Silencioso y Automatización de Software
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                Construye, audita y simula scripts reales de instalación desatendida. Analiza cabeceras de ejecutables, domina los switches{' '}
                <code className="text-slate-800 font-medium">/qn</code>,{' '}
                <code className="text-slate-800 font-medium">/S</code> y{' '}
                <code className="text-slate-800 font-medium">/VERYSILENT</code>, gestiona variables de entorno sin corromper el{' '}
                <code className="text-slate-800 font-medium">PATH</code>, vincula asociaciones corporativas con{' '}
                <code className="text-slate-800 font-medium">DISM</code> y sella el perfil predeterminado para nuevos usuarios.
              </p>
            </div>

            {/* Author Identity Panel */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
              <BrandMark size="lg" />
              <div className="min-w-0 space-y-1">
                <div className="text-xs text-slate-500">Proyecto educativo creado por</div>
                <div className="text-base font-bold text-slate-900 truncate">
                  Un Fantasma en el Sistema
                </div>
                <a
                  href="https://www.unfantasmaenelsistema.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline whitespace-nowrap"
                >
                  <span>Visitar blog y recursos técnicos</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Curated Enterprise Scenario Presets */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-700">
                Escenarios Corporativos Preconfigurados (Carga con un clic)
              </div>
              <button
                type="button"
                onClick={handleFactoryReset}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer laboratorio</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {SCENARIO_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyScenarioPreset(preset)}
                    className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-white border-sky-600 ring-1 ring-sky-600'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-500">
                        <span>{preset.targetAudience}</span>
                        <span aria-hidden="true" className="mx-1">·</span>
                        <span className="font-mono uppercase">.{preset.recommendedFormat}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {preset.title}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {preset.summary}
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-sky-700">
                      {isSelected ? 'Escenario activo en el constructor' : 'Cargar este escenario →'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Main Two-Zone Interactive Sandbox */}
        <section
          id="constructor"
          aria-label="Constructor visual e inspector de código"
          className="pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Zone (7 cols ~58%): Modular Configuration Deck */}
          <div className="lg:col-span-7">
            <PipelineBuilder
              state={pipeline}
              onUpdatePackages={(pkgs: SelectedPackageConfig[]) => {
                setActivePresetId('custom');
                setPipeline((prev) => ({ ...prev, selectedPackages: pkgs }));
              }}
              onUpdateEnvVars={(vars: EnvVarRule[]) => {
                setActivePresetId('custom');
                setPipeline((prev) => ({ ...prev, envVars: vars }));
              }}
              onUpdateFileAssocs={(assocs: FileAssociationRule[]) => {
                setActivePresetId('custom');
                setPipeline((prev) => ({ ...prev, fileAssocs: assocs }));
              }}
              onUpdateProfileRules={(rules: CorporateProfileRule[]) => {
                setActivePresetId('custom');
                setPipeline((prev) => ({ ...prev, profileRules: rules }));
              }}
              onUpdateOptions={(opts: GlobalPipelineOptions) => {
                setPipeline((prev) => ({ ...prev, options: opts }));
              }}
            />
          </div>

          {/* Right Zone (5 cols ~42%, sticky on desktop): Live Script Output */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <ScriptInspector
              state={pipeline}
              onFormatChange={(fmt: ScriptFormat) =>
                setPipeline((prev) => ({ ...prev, format: fmt }))
              }
              onOptionsChange={(opts: GlobalPipelineOptions) =>
                setPipeline((prev) => ({ ...prev, options: opts }))
              }
              onImportState={(imported: PipelineState) => {
                setActivePresetId('custom');
                setPipeline({
                  ...imported,
                  options: {
                    ...DEFAULT_OPTIONS,
                    ...imported.options,
                  },
                });
              }}
            />
          </div>
        </section>

        {/* Forensic Binary Inspector (.exe / .msi) & Real-Time Command Auditor */}
        <BinaryAndCommandLab
          onAddPackageToQueue={(newPkg: SelectedPackageConfig) => {
            setActivePresetId('custom');
            setPipeline((prev) => ({
              ...prev,
              selectedPackages: [...prev.selectedPackages, newPkg],
            }));
          }}
        />

        {/* Didactic Switch Dissector & Exit Codes */}
        <SwitchAnatomySection />

        {/* Interactive Registry, Session 0 & Default User Profile Map */}
        <SystemArchitectureMap state={pipeline} />

        {/* Interactive Dry-Run & Fault Simulator */}
        <ExecutionSimulator state={pipeline} />

        {/* Real-World Troubleshooting Challenges */}
        <DiagnosticChallenges />
      </main>

      {/* Clean Author & Educational Footer */}
      <footer className="mt-8 bg-white border-t border-slate-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <BrandMark size="md" />
            <div>
              <div className="text-sm font-bold text-slate-900">
                Un Fantasma en el Sistema
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Laboratorio interactivo de automatización y administración de sistemas · Preparado para despliegue estático en GitHub Pages
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
            <a
              href="#constructor"
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Constructor Visual
            </a>
            <a
              href="#inspector"
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Inspector Binario
            </a>
            <a
              href="#switches"
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Guía de Switches
            </a>
            <a
              href="#arquitectura"
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Mapa Registro y Perfiles
            </a>
            <a
              href="#simulador"
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Simulador
            </a>
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:text-sky-900 transition-colors whitespace-nowrap"
            >
              <span>https://www.unfantasmaenelsistema.com/</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
