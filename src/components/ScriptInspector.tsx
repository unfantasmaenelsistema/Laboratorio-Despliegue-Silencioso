import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileJson,
  GitBranch,
  Upload,
} from 'lucide-react';
import { GlobalPipelineOptions, ScriptFormat } from '../types/deployment';
import {
  PipelineState,
  generateDismAssociationsXml,
  generateIntuneDetectionScript,
  generateScriptForState,
  generateWingetConfigYaml,
} from '../utils/scriptGenerator';

interface ScriptInspectorProps {
  state: PipelineState;
  onFormatChange: (fmt: ScriptFormat) => void;
  onOptionsChange: (opts: GlobalPipelineOptions) => void;
  onImportState: (imported: PipelineState) => void;
}

type InspectorTab = ScriptFormat | 'xml' | 'intune' | 'winget';

export const ScriptInspector: React.FC<ScriptInspectorProps> = ({
  state,
  onFormatChange,
  onOptionsChange,
  onImportState,
}) => {
  const [specialTab, setSpecialTab] = useState<'none' | 'xml' | 'intune' | 'winget'>('none');
  const [copied, setCopied] = useState(false);
  const [showGhGuide, setShowGhGuide] = useState(false);

  const activeTab: InspectorTab =
    specialTab !== 'none' ? specialTab : state.format;

  const rawCode =
    specialTab === 'xml'
      ? generateDismAssociationsXml(state.fileAssocs)
      : specialTab === 'intune'
      ? generateIntuneDetectionScript(state)
      : specialTab === 'winget'
      ? generateWingetConfigYaml(state)
      : generateScriptForState(state);

  const displayLines = rawCode.replace(/\r\n/g, '\n').split('\n');

  const getSlug = (): string =>
    state.options.profileName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'despliegue-silencioso';

  const getFileName = (): string => {
    const slug = getSlug();
    if (specialTab === 'xml') return 'DefaultAppAssociations.xml';
    if (specialTab === 'intune') return `Detect-${slug}.ps1`;
    if (specialTab === 'winget') return `${slug}.winget`;
    if (state.format === ScriptFormat.BATCH) return `${slug}.bat`;
    if (state.format === ScriptFormat.BASH) return `${slug}.sh`;
    return `${slug}.ps1`;
  };

  const handleTabClick = (tab: InspectorTab) => {
    if (tab === 'xml' || tab === 'intune' || tab === 'winget') {
      setSpecialTab(tab);
    } else {
      setSpecialTab('none');
      onFormatChange(tab);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = rawCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = () => {
    const filename = getFileName();
    let payload = rawCode;
    let mime = 'text/plain;charset=utf-8';

    if (specialTab === 'xml') {
      mime = 'application/xml;charset=utf-8';
      payload = rawCode.replace(/\r\n/g, '\n');
    } else if (specialTab === 'winget') {
      mime = 'text/yaml;charset=utf-8';
      payload = rawCode.replace(/\r\n/g, '\n');
    } else if (specialTab === 'intune' || state.format === ScriptFormat.POWERSHELL) {
      // UTF-8 with BOM + CRLF ensures Windows PowerShell 5.1 parses accents cleanly
      payload = '\uFEFF' + rawCode.replace(/\r?\n/g, '\r\n');
    } else if (state.format === ScriptFormat.BASH) {
      // Strictly LF (\n) without BOM so Linux shebang #!/usr/bin/env bash never breaks
      payload = rawCode.replace(/\r\n/g, '\n');
      mime = 'text/x-shellscript;charset=utf-8';
    } else {
      // Batch CMD with CRLF
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

  const handleExportJsonProject = () => {
    const slug = getSlug();
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proyecto-${slug}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJsonProject = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as PipelineState;
      if (parsed && Array.isArray(parsed.selectedPackages) && parsed.options) {
        onImportState(parsed);
      }
    } catch {
      // Ignore invalid JSON file
    }
  };

  const renderHighlightedLine = (line: string) => {
    const trimmed = line.trimStart();
    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('REM ') ||
      trimmed === 'REM' ||
      trimmed.startsWith('<#') ||
      trimmed.startsWith('#>') ||
      trimmed.startsWith(' .')
    ) {
      return <span className="text-slate-400 italic">{line || ' '}</span>;
    }
    if (specialTab === 'xml') {
      return <span className="text-sky-300">{line || ' '}</span>;
    }
    if (specialTab === 'winget') {
      if (trimmed.startsWith('- resource:') || trimmed.startsWith('properties:')) {
        return <span className="text-amber-200">{line || ' '}</span>;
      }
      return <span className="text-sky-200">{line || ' '}</span>;
    }
    if (
      trimmed.startsWith('Write-Host') ||
      trimmed.startsWith('Write-Output') ||
      trimmed.startsWith('echo ') ||
      trimmed.startsWith('Invoke-UnattendedPackage')
    ) {
      return <span className="text-emerald-300">{line || ' '}</span>;
    }
    if (
      trimmed.startsWith('function ') ||
      trimmed.startsWith('if ') ||
      trimmed.startsWith('switch ') ||
      trimmed.startsWith('foreach ') ||
      trimmed.startsWith('for ') ||
      trimmed.startsWith('set ') ||
      trimmed.startsWith('export ')
    ) {
      return <span className="text-amber-200">{line || ' '}</span>;
    }
    return <span className="text-slate-100">{line || ' '}</span>;
  };

  const lineEndingMeta =
    specialTab === 'xml'
      ? 'UTF-8 · XML DISM'
      : specialTab === 'winget'
      ? 'YAML · WinGet Configuration 0.2'
      : specialTab === 'intune'
      ? 'UTF-8 BOM · Regla Intune/SCCM'
      : state.format === ScriptFormat.BASH
      ? 'UTF-8 sin BOM · LF (UNIX)'
      : state.format === ScriptFormat.POWERSHELL
      ? 'UTF-8 BOM · CRLF (Windows)'
      : 'CP65001 · CRLF (CMD)';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header & Shell Segmented Control */}
      <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Artefacto de Despliegue Generado
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              <span>{getFileName()}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{displayLines.length} líneas</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{lineEndingMeta}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar archivo</span>
            </button>
          </div>
        </div>

        {/* Interactive Format Tabs (6 Enterprise Outputs) */}
        <div
          role="tablist"
          aria-label="Formato de artefacto de salida"
          className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === ScriptFormat.POWERSHELL}
            onClick={() => handleTabClick(ScriptFormat.POWERSHELL)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === ScriptFormat.POWERSHELL
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PowerShell (.ps1)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === ScriptFormat.BATCH}
            onClick={() => handleTabClick(ScriptFormat.BATCH)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === ScriptFormat.BATCH
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Batch CMD (.bat)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === ScriptFormat.BASH}
            onClick={() => handleTabClick(ScriptFormat.BASH)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === ScriptFormat.BASH
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shell Linux (.sh)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'intune'}
            onClick={() => handleTabClick('intune')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'intune'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intune Detect (.ps1)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'winget'}
            onClick={() => handleTabClick('winget')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'winget'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            WinGet DSC (.winget)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'xml'}
            onClick={() => handleTabClick('xml')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'xml'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DISM Assoc (.xml)
          </button>
        </div>

        {/* Global Robustness & Enterprise Pre-Flight Toggles */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 text-xs text-slate-700">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.options.requireAdminCheck}
              onChange={(e) =>
                onOptionsChange({
                  ...state.options,
                  requireAdminCheck: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
            />
            <span>Exigir Admin / root</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.options.waitForMsiMutex}
              onChange={(e) =>
                onOptionsChange({
                  ...state.options,
                  waitForMsiMutex: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
            />
            <span>Esperar mutex _MSIExecute</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.options.closeRunningApps}
              onChange={(e) =>
                onOptionsChange({
                  ...state.options,
                  closeRunningApps: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
            />
            <span>Cerrar apps abiertas</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.options.checkDiskSpace}
              onChange={(e) =>
                onOptionsChange({
                  ...state.options,
                  checkDiskSpace: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
            />
            <span>Verificar espacio en disco</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.options.includeDidacticComments}
              onChange={(e) =>
                onOptionsChange({
                  ...state.options,
                  includeDidacticComments: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
            />
            <span>Comentarios didácticos</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.options.dryRunMode}
              onChange={(e) =>
                onOptionsChange({
                  ...state.options,
                  dryRunMode: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
            />
            <span>Modo simulación (Dry-Run)</span>
          </label>
        </div>
      </div>

      {/* Live Code Viewport */}
      <div className="bg-[#0B1120] text-slate-100 overflow-x-auto max-h-[500px] overflow-y-auto">
        <pre className="py-4 px-3 text-[12.5px] leading-6 font-mono tabular-nums">
          {displayLines.map((line, index) => (
            <div
              key={index}
              className="flex hover:bg-slate-800/50 px-2 rounded-xs"
            >
              <span
                aria-hidden="true"
                className="w-8 shrink-0 select-none text-right pr-3 text-slate-500 tabular-nums"
              >
                {index + 1}
              </span>
              <code className="whitespace-pre">{renderHighlightedLine(line)}</code>
            </div>
          ))}
        </pre>
      </div>

      {/* Path Settings, Project JSON Export/Import & GitHub Pages Guide */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="source-dir-input"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Ruta de instaladores (Windows)
            </label>
            <input
              id="source-dir-input"
              type="text"
              value={state.options.sourceDirWin}
              onChange={(e) =>
                onOptionsChange({ ...state.options, sourceDirWin: e.target.value })
              }
              className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
            />
          </div>
          <div>
            <label
              htmlFor="profile-name-input"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Nombre del perfil / proyecto
            </label>
            <input
              id="profile-name-input"
              type="text"
              value={state.options.profileName}
              onChange={(e) =>
                onOptionsChange({ ...state.options, profileName: e.target.value })
              }
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJsonProject}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-sky-700" />
              <span>Exportar proyecto (.json)</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-sky-700" />
              <span>Importar (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJsonProject}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setShowGhGuide((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 cursor-pointer whitespace-nowrap shrink-0"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{showGhGuide ? 'Ocultar guía GitHub Pages' : 'Guía GitHub Pages'}</span>
          </button>
        </div>

        {showGhGuide && (
          <div className="pt-2 text-xs text-slate-600 space-y-2 border-t border-slate-200">
            <p className="font-medium text-slate-800 flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>Workflow de GitHub Actions incluido (.github/workflows/deploy-pages.yml)</span>
            </p>
            <p>
              El repositorio ya incluye el workflow oficial para GitHub Pages y rutas relativas (<code className="text-slate-800">base: './'</code>). Al subir este proyecto a GitHub y activar <strong>Settings → Pages → Source: GitHub Actions</strong>, se desplegará automáticamente en cada <code className="text-slate-800">git push</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
