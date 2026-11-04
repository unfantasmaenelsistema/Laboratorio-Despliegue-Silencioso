import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  XCircle,
} from 'lucide-react';
import { ScriptFormat, SimulationFault } from '../types/deployment';
import { PipelineState, buildSimulationSteps } from '../utils/scriptGenerator';

interface ExecutionSimulatorProps {
  state: PipelineState;
}

export const ExecutionSimulator: React.FC<ExecutionSimulatorProps> = ({ state }) => {
  const [fault, setFault] = useState<SimulationFault>(SimulationFault.NONE);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const steps = buildSimulationSteps(state, fault);

  // Reset progress if pipeline structure or fault mode changes
  useEffect(() => {
    setIsPlaying(false);
    setCompletedCount(0);
  }, [
    fault,
    state.format,
    state.selectedPackages.length,
    state.options.requireAdminCheck,
    state.options.stopOnError,
  ]);

  useEffect(() => {
    if (!isPlaying) return;
    if (completedCount >= steps.length) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setCompletedCount((prev) => Math.min(prev + 1, steps.length));
    }, 950);
    return () => window.clearTimeout(timer);
  }, [isPlaying, completedCount, steps.length]);

  const handlePlayToggle = () => {
    if (completedCount >= steps.length) {
      setCompletedCount(1);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCompletedCount((prev) => (prev < steps.length ? prev + 1 : prev));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCompletedCount(0);
  };

  const executedSteps = steps.slice(0, completedCount);
  const activeStep =
    completedCount > 0 ? steps[Math.min(completedCount - 1, steps.length - 1)] : null;

  const finalReturnCode =
    executedSteps.length === 0
      ? null
      : executedSteps.find((s) => s.statusOnRun === 'error')?.exitCode ??
        (executedSteps.some((s) => s.exitCode === 3010) ? 3010 : 0);

  return (
    <section
      id="simulador"
      aria-labelledby="simulador-heading"
      className="py-12 border-t border-slate-200"
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-sky-700 mb-1.5">
              Banco de Pruebas en Seco · Sesión 0 / Ejecución Remota
            </p>
            <h2
              id="simulador-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance"
            >
              Simulador Paso a Paso e Inyección de Fallos Reales
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Ejecuta virtualmente la secuencia que acabas de configurar arriba e inyecta incidentes habituales de despliegue (bloqueo de mutex <code className="text-slate-800">1618</code>, falta de elevación, reinicio diferido <code className="text-slate-800">3010</code> o bloqueo NSIS) para observar cómo responde el script.
            </p>
          </div>

          {/* Playback Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePlayToggle}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar simulación</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    {completedCount > 0 && completedCount < steps.length
                      ? 'Continuar simulación'
                      : 'Iniciar simulación'}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleStepForward}
              disabled={completedCount >= steps.length}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Avanzar 1 paso</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>

        {/* Fault Selector Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <label
              htmlFor="fault-selector"
              className="block text-xs font-semibold text-slate-800"
            >
              Condición del entorno simulado (Inyección de incidentes)
            </label>
            <p className="text-xs text-slate-500">
              Prueba qué ocurre cuando falla un requisito previo en una estación desatendida
            </p>
          </div>

          <select
            id="fault-selector"
            value={fault}
            onChange={(e) => setFault(e.target.value as SimulationFault)}
            className="px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value={SimulationFault.NONE}>
              Ejecución nominal (Sin incidentes externos)
            </option>
            <option value={SimulationFault.REBOOT_REQUIRED_3010}>
              Simular archivos en uso: Reinicio diferido (Código 3010)
            </option>
            <option value={SimulationFault.NO_ADMIN}>
              Simular ejecución sin privilegios elevados (Error 5 / UID != 0)
            </option>
            {state.format !== ScriptFormat.BASH && (
              <>
                <option value={SimulationFault.MSI_MUTEX_1618}>
                  Simular colisión con otro MSI en curso (Mutex _MSIExecute · Error 1618)
                </option>
                <option value={SimulationFault.NSIS_LOWERCASE_HANG}>
                  Simular trampa de switch /s en minúscula en instalador NSIS (Timeout)
                </option>
              </>
            )}
          </select>
        </div>

        {/* Two-Column Interactive Simulation Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Step Pipeline Queue */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">
                Cola de Fases del Despliegue
              </span>
              <span className="text-slate-500 tabular-nums">
                {completedCount} / {steps.length} completados
              </span>
            </div>

            <div className="divide-y divide-slate-100 flex-1">
              {steps.map((step, index) => {
                const isDone = index < completedCount;
                const isCurrent = index === completedCount - 1;

                return (
                  <div
                    key={step.id}
                    className={`p-4 transition-colors ${
                      isCurrent ? 'bg-sky-50/60' : isDone ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          <span>Paso {index + 1}</span>
                          <span aria-hidden="true" className="mx-1.5">·</span>
                          <span>{step.phase}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {step.title}
                        </div>
                        <div className="text-xs font-mono text-slate-500 truncate">
                          {step.targetArtifact}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {!isDone ? (
                          <span className="text-xs text-slate-400">En espera</span>
                        ) : step.statusOnRun === 'nominal' ? (
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 tabular-nums">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Código {step.exitCode}</span>
                          </div>
                        ) : step.statusOnRun === 'warning' ? (
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 tabular-nums">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Código {step.exitCode}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-red-700 tabular-nums">
                            <XCircle className="w-4 h-4 shrink-0" />
                            <span>Código {step.exitCode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Terminal Output & Didactic Telemetry */}
          <div className="lg:col-span-7 bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-slate-200">
                  {state.format === ScriptFormat.BASH
                    ? 'root@nodo-corporativo:~# ./despliegue.sh'
                    : state.format === ScriptFormat.BATCH
                    ? 'C:\\Windows\\System32> despliegue.bat (NT AUTHORITY\\SYSTEM)'
                    : 'PS C:\\Windows\\System32> .\\despliegue.ps1 (Elevado)'}
                </span>
                {finalReturnCode !== null && (
                  <span className="font-mono tabular-nums text-slate-300">
                    Salida global: {finalReturnCode}
                  </span>
                )}
              </div>

              <div className="p-5 font-mono text-xs sm:text-[13px] leading-relaxed space-y-3 min-h-[270px] max-h-[380px] overflow-y-auto">
                {executedSteps.length === 0 ? (
                  <div className="text-slate-400 space-y-2 py-8">
                    <p>
                      Sesión lista. Pulsa «Iniciar simulación» o «Avanzar 1 paso» para ejecutar la cola desatendida sobre un entorno controlado.
                    </p>
                    <p className="text-slate-500">
                      Se auditarán {steps.length} fases: privilegios, instaladores, variables de entorno, asociaciones y perfil corporativo.
                    </p>
                  </div>
                ) : (
                  executedSteps.map((st) => (
                    <div key={st.id} className="space-y-1 border-b border-slate-800/80 pb-3 last:border-none">
                      <div className="text-sky-300">$ {st.commandPreview}</div>
                      {st.logOutput.map((line, lIdx) => {
                        const isErr = line.includes('[ERROR') || line.includes('[TIMEOUT') || line.includes('[BLOQUEO]') || line.includes('[CONGELADO]');
                        const isWarn = line.includes('[AVISO');
                        return (
                          <div
                            key={lIdx}
                            className={
                              isErr
                                ? 'text-red-300'
                                : isWarn
                                ? 'text-amber-300'
                                : 'text-slate-300'
                            }
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Step Didactic Annotation */}
            <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800">
              {activeStep ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-sky-400">
                    Análisis didáctico del paso actual ({activeStep.phase})
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {activeStep.didacticNote}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Cada fase mostrará aquí qué claves del registro (<code className="text-slate-300">HKLM</code>, <code className="text-slate-300">NTUSER.DAT</code>) o rutas de sistema (<code className="text-slate-300">/etc/skel</code>, <code className="text-slate-300">/etc/profile.d</code>) están siendo transformadas.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
