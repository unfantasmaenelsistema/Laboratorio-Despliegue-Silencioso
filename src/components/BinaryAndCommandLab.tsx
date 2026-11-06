import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Plus,
  Sparkles,
  Terminal,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  BINARY_INSPECTOR_SAMPLES,
  COMMAND_AUDIT_PRESETS,
  SOFTWARE_CATALOG,
} from '../data/catalog';
import {
  BinarySampleProfile,
  InstallerEngine,
  SelectedPackageConfig,
  SoftwarePackageTemplate,
  UiLevel,
} from '../types/deployment';
import { auditCommandLine } from '../utils/scriptGenerator';

interface BinaryAndCommandLabProps {
  onAddPackageToQueue: (pkg: SelectedPackageConfig) => void;
}

export const BinaryAndCommandLab: React.FC<BinaryAndCommandLabProps> = ({
  onAddPackageToQueue,
}) => {
  const [activeMode, setActiveMode] = useState<'forensic' | 'auditor'>('forensic');
  const [selectedSample, setSelectedSample] = useState<BinarySampleProfile>(
    BINARY_INSPECTOR_SAMPLES[0]
  );
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Command auditor state
  const [commandInput, setCommandInput] = useState<string>(
    COMMAND_AUDIT_PRESETS[0].command
  );

  const auditResult = auditCommandLine(commandInput);

  const handleLocalFileInspect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const sliceHead = file.slice(0, Math.min(file.size, 262144));
    const sliceTail =
      file.size > 262144
        ? file.slice(Math.max(0, file.size - 262144), file.size)
        : new Blob([]);

    const headBuf = await sliceHead.arrayBuffer();
    const tailBuf = await sliceTail.arrayBuffer();
    const headBytes = new Uint8Array(headBuf);

    const first8Hex = Array.from(headBytes.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

    const decoder = new TextDecoder('iso-8859-1');
    const combinedText =
      decoder.decode(headBytes) + '\n' + decoder.decode(new Uint8Array(tailBuf));

    let detectedEngine = InstallerEngine.INNO;
    let signatures: string[] = [];
    let silentCmd = `"${file.name}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`;
    let unpackCmd = `7z.exe x "${file.name}" -o"C:\\Temp\\Extracted"`;
    let explanation = '';

    if (
      first8Hex.startsWith('D0 CF 11 E0') ||
      file.name.toLowerCase().endsWith('.msi')
    ) {
      detectedEngine = InstallerEngine.MSI;
      signatures = [
        'Cabecera OLE2 Compound File (D0 CF 11 E0 A1 B1 1A E1)',
        'Tablas Windows Installer (Property, Feature, CustomAction)',
      ];
      silentCmd = `msiexec.exe /i "${file.name}" /qn /norestart ALLUSERS=1 /L*v "C:\\Logs\\${file.name}.log"`;
      unpackCmd = `msiexec.exe /a "${file.name}" /qb TARGETDIR="C:\\Temp\\Extracted"`;
      explanation =
        'Archivo analizado localmente: base de datos nativa Windows Installer (.msi). Admite propiedades públicas en MAYÚSCULAS y extracción administrativa con /a.';
    } else if (
      combinedText.includes('Nullsoft') ||
      combinedText.includes('NSIS')
    ) {
      detectedEngine = InstallerEngine.NSIS;
      signatures = ['Nullsoft.NSIS.exehead', 'NullsoftInst stub header'];
      silentCmd = `"${file.name}" /S`;
      unpackCmd = `7z.exe x "${file.name}" -o"C:\\Temp\\NSIS_Extracted"`;
      explanation =
        'Binario PE analizado localmente: contiene firmas de Nullsoft Scriptable Install System (NSIS). Requiere /S en MAYÚSCULA estricta.';
    } else if (combinedText.includes('Inno Setup')) {
      detectedEngine = InstallerEngine.INNO;
      signatures = ['Inno Setup Setup Data', 'JR.Inno.Setup Manifest'];
      silentCmd = `"${file.name}" /VERYSILENT /SUPPRESSMSGBOXES /SP- /NORESTART /LOG="C:\\Logs\\${file.name}.log"`;
      unpackCmd = `innounp.exe -x "${file.name}"`;
      explanation =
        'Binario PE analizado localmente: empaquetado con Inno Setup. Usa /VERYSILENT y /SUPPRESSMSGBOXES para evitar bloqueos en Sesión 0.';
    } else if (
      combinedText.includes('WixBurn') ||
      combinedText.includes('.wixburn')
    ) {
      detectedEngine = InstallerEngine.WIX_BURN;
      signatures = ['.wixburn PE section', 'WixBurnManifest XML'];
      silentCmd = `"${file.name}" /quiet /norestart InstallAllUsers=1 /log "C:\\Logs\\${file.name}.log"`;
      unpackCmd = `dark.exe -x "C:\\Temp\\BurnExtracted" "${file.name}"`;
      explanation =
        'Binario PE analizado localmente: contenedor WiX Burn Bootstrapper. Utiliza /quiet /norestart.';
    } else if (combinedText.includes('InstallShield')) {
      detectedEngine = InstallerEngine.INSTALLSHIELD;
      signatures = ['InstallShield Setup Player', 'setup.isn / ISSetup.dll'];
      silentCmd = `"${file.name}" /s /v"/qn /norestart ALLUSERS=1"`;
      unpackCmd = `"${file.name}" /stage_only ISRootStagePath="C:\\Temp\\IS_Stage"`;
      explanation =
        'Binario PE analizado localmente: contenedor InstallShield. Si envuelve un MSI, pasa argumentos a msiexec mediante /v"/qn /norestart".';
    } else {
      detectedEngine = InstallerEngine.INNO;
      signatures = [
        `Cabecera ejecutable: ${first8Hex}`,
        'Ejecutable PE estándar Windows (probando heurística general)',
      ];
      silentCmd = `"${file.name}" /quiet /norestart`;
      explanation =
        'Ejecutable analizado localmente en el navegador. Ejecuta el binario con /? o inspecciona sus propiedades con 7-Zip para confirmar si contiene un MSI embebido.';
    }

    setSelectedSample({
      id: `local-${Date.now()}`,
      fileName: file.name,
      fileSizeDesc: `${sizeMB} MB · Analizado localmente en tu navegador`,
      detectedEngine,
      magicBytesHex: first8Hex,
      signatureStrings: signatures,
      recommendedSilentCmd: silentCmd,
      unpackCommand: unpackCmd,
      forensicExplanation: explanation,
    });
  };

  const handleSendSampleToQueue = () => {
    if (selectedSample.catalogPackageId) {
      const found = SOFTWARE_CATALOG.find(
        (c) => c.id === selectedSample.catalogPackageId
      );
      if (found) {
        onAddPackageToQueue({
          packageId: found.id,
          uiLevel: UiLevel.SILENT,
          suppressReboot: true,
          allUsers: true,
          enableLog: true,
          extraArgs: found.extraPropsWin ?? '',
        });
        setAddedFeedback(true);
        window.setTimeout(() => setAddedFeedback(false), 1800);
        return;
      }
    }

    const customTpl: SoftwarePackageTemplate = {
      id: selectedSample.id,
      name: selectedSample.fileName.replace(/\.(exe|msi)$/i, ''),
      version: 'Analizado',
      vendor: 'Inspección Forense',
      category: 'Detectado',
      engine: selectedSample.detectedEngine,
      winInstallerFile: selectedSample.fileName,
      linuxPackageName: selectedSample.fileName
        .replace(/\.(exe|msi)$/i, '')
        .toLowerCase(),
      silentSwitchWin:
        selectedSample.detectedEngine === InstallerEngine.MSI
          ? '/qn'
          : selectedSample.detectedEngine === InstallerEngine.NSIS
          ? '/S'
          : selectedSample.detectedEngine === InstallerEngine.INNO
          ? '/VERYSILENT /SUPPRESSMSGBOXES /SP-'
          : '/quiet',
      passiveSwitchWin:
        selectedSample.detectedEngine === InstallerEngine.MSI
          ? '/qb!'
          : '/passive',
      noRestartSwitchWin:
        selectedSample.detectedEngine === InstallerEngine.NSIS
          ? ''
          : '/norestart',
      allUsersSwitchWin:
        selectedSample.detectedEngine === InstallerEngine.MSI
          ? 'ALLUSERS=1'
          : '',
      didacticSummary: selectedSample.forensicExplanation,
    };

    onAddPackageToQueue({
      packageId: customTpl.id,
      customTemplate: customTpl,
      uiLevel: UiLevel.SILENT,
      suppressReboot: true,
      allUsers: true,
      enableLog: true,
      extraArgs: '',
    });
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1800);
  };

  return (
    <section
      id="inspector"
      aria-labelledby="inspector-heading"
      className="py-12 border-t border-slate-200"
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-sky-700 mb-1.5">
              Ingeniería Inversa Aplicada · Identificación de Empaquetadores y Linter CLI
            </p>
            <h2
              id="inspector-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance"
            >
              Inspector Forense de Binarios y Auditor de Comandos en Vivo
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Descubre qué motor oculta cualquier archivo <code className="text-slate-800">.exe</code> o <code className="text-slate-800">.msi</code> mediante sus firmas binarias (Magic Bytes y cadenas PE) o audita tus líneas de comandos para detectar trampas antes de lanzarlas en producción.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Modo del laboratorio de inspección"
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 p-1 bg-slate-100 rounded-lg self-stretch sm:self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'forensic'}
              onClick={() => setActiveMode('forensic')}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors text-left sm:whitespace-nowrap shrink-0 cursor-pointer ${
                activeMode === 'forensic'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Identificador de Instaladores (.exe / .msi)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'auditor'}
              onClick={() => setActiveMode('auditor')}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors text-left sm:whitespace-nowrap shrink-0 cursor-pointer ${
                activeMode === 'auditor'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Auditor y Corrector de Comandos
            </button>
          </div>
        </div>

        {activeMode === 'forensic' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Sample selector + local file analyzer */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Muestras Forenses de Laboratorio
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Selecciona un binario para examinar sus cabeceras hexadecimales y firmas PE
                  </p>
                </div>

                <div className="space-y-2">
                  {BINARY_INSPECTOR_SAMPLES.map((sample) => {
                    const isSelected = selectedSample.id === sample.id;
                    return (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => setSelectedSample(sample)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50/70 border-sky-600'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-mono font-semibold text-slate-900 truncate">
                            {sample.fileName}
                          </span>
                          <span className="text-xs font-medium text-sky-700 shrink-0">
                            {sample.detectedEngine.split(' ')[0]}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sample.fileSizeDesc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Local Client-Side Binary Scanner */}
              <div className="pt-4 border-t border-slate-200">
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-sky-600 rounded-xl bg-slate-50/70 hover:bg-sky-50/30 transition-colors cursor-pointer text-center">
                  <Upload className="w-5 h-5 text-sky-700 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-800">
                    Analizar un archivo .exe o .msi de tu equipo (100 % en local)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    El archivo no se sube a ningún servidor; se inspeccionan sus cabeceras en tu navegador
                  </span>
                  <input
                    type="file"
                    accept=".exe,.msi"
                    onChange={handleLocalFileInspect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Right: Forensic Hex & Strings Output */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      <span>Resultado del análisis de firmas</span>
                      <span aria-hidden="true" className="mx-1.5">·</span>
                      <span className="font-semibold text-sky-700">
                        {selectedSample.detectedEngine}
                      </span>
                    </div>
                    <h3 className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                      {selectedSample.fileName}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendSampleToQueue}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {addedFeedback
                        ? 'Añadido al constructor'
                        : 'Añadir a mi cola de despliegue'}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg bg-[#0B1120] text-slate-100 space-y-1.5">
                    <div className="text-[11px] text-slate-400">
                      Magic Bytes (Cabecera Hexadecimal)
                    </div>
                    <div className="text-xs font-mono text-amber-300 break-all">
                      {selectedSample.magicBytesHex}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#0B1120] text-slate-100 space-y-1.5">
                    <div className="text-[11px] text-slate-400">
                      Cadenas de Identificación (Strings PE / Manifiesto)
                    </div>
                    <ul className="text-xs font-mono text-emerald-300 space-y-0.5">
                      {selectedSample.signatureStrings.map((sig, i) => (
                        <li key={i} className="truncate">
                          {sig}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 mb-1">
                      Comando de instalación desatendida recomendado
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 text-sky-200 font-mono text-xs overflow-x-auto whitespace-nowrap">
                      {selectedSample.recommendedSilentCmd}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-800 mb-1">
                      Cómo extraer o inspeccionar su contenido sin instalarlo
                    </div>
                    <div className="p-3 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs overflow-x-auto whitespace-nowrap border border-slate-200">
                      {selectedSample.unpackCommand}
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {selectedSample.forensicExplanation}
                </p>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <FileSearch className="w-3.5 h-3.5 text-sky-700" />
                  <span>Consejo: Usa strings.exe de Sysinternals o 7-Zip para verificar instaladores opacos</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* MODE 2: REAL-TIME COMMAND AUDITOR */
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="cli-auditor-input"
                  className="text-sm font-semibold text-slate-900"
                >
                  Escribe o pega un comando de instalación o configuración para auditarlo
                </label>
                <span className="text-xs text-slate-500">
                  O carga un ejemplo con fallos reales:
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {COMMAND_AUDIT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCommandInput(preset.command)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  id="cli-auditor-input"
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Ej. msiexec /i paquete.msi /qn allusers=1"
                  className="w-full px-4 py-3 text-xs sm:text-sm font-mono bg-[#0B1120] text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-semibold text-slate-700">
                  Diagnóstico Semántico y Sintáctico ({auditResult.findings.length})
                </h3>
                <div className="space-y-2.5">
                  {auditResult.findings.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border space-y-1.5 ${
                        item.severity === 'error'
                          ? 'bg-red-50/70 border-red-200'
                          : item.severity === 'warning'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-emerald-50/70 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        {item.severity === 'error' && (
                          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        {item.severity === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        {item.severity === 'nominal' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span
                          className={
                            item.severity === 'error'
                              ? 'text-red-950'
                              : item.severity === 'warning'
                              ? 'text-amber-950'
                              : 'text-emerald-950'
                          }
                        >
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {item.detail}
                      </p>
                      <p className="text-xs font-medium text-slate-900 pt-1">
                        Recomendación: {item.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-sky-700" />
                    <span>Comando Saneado para Producción</span>
                  </span>
                  {auditResult.correctedCommand !== commandInput.trim() && (
                    <button
                      type="button"
                      onClick={() => setCommandInput(auditResult.correctedCommand)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Aplicar corrección</span>
                    </button>
                  )}
                </div>

                <div className="p-3.5 rounded-lg bg-[#0B1120] text-emerald-300 font-mono text-xs leading-relaxed break-all">
                  {auditResult.correctedCommand || 'Introduce un comando arriba'}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Este validador comprueba sensibilidad a mayúsculas de NSIS (<code className="text-slate-700">/S</code>), reglas de <code className="text-slate-700">/D=</code> sin comillas, propiedades públicas MSI en mayúsculas, truncamiento de <code className="text-slate-700">setx</code> y bloqueos en la Sesión 0.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
