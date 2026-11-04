import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { ENGINE_ANATOMY_EXAMPLES, EXIT_CODES_REFERENCE } from '../data/catalog';

export const SwitchAnatomySection: React.FC = () => {
  const [selectedEngineId, setSelectedEngineId] = useState<string>(
    ENGINE_ANATOMY_EXAMPLES[0].id
  );
  const [selectedTokenId, setSelectedTokenId] = useState<string>(
    ENGINE_ANATOMY_EXAMPLES[0].tokens[2].id
  );

  const currentEngine =
    ENGINE_ANATOMY_EXAMPLES.find((e) => e.id === selectedEngineId) ??
    ENGINE_ANATOMY_EXAMPLES[0];

  const activeToken =
    currentEngine.tokens.find((t) => t.id === selectedTokenId) ??
    currentEngine.tokens[0];

  const handleEngineSwitch = (engineId: string) => {
    setSelectedEngineId(engineId);
    const nextEngine = ENGINE_ANATOMY_EXAMPLES.find((e) => e.id === engineId);
    if (nextEngine && nextEngine.tokens.length > 0) {
      setSelectedTokenId(nextEngine.tokens[0].id);
    }
  };

  return (
    <section
      id="switches"
      aria-labelledby="switches-heading"
      className="py-12 border-t border-slate-200"
    >
      <div className="space-y-8">
        {/* Section Heading */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-sky-700 mb-1.5">
              Mecánica Didáctica · Disección de Línea de Comandos
            </p>
            <h2
              id="switches-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance"
            >
              Anatomía Interactiva de Motores y Switches Silenciosos
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              No todos los ejecutables <code className="text-slate-800">.exe</code> aceptan los mismos argumentos. Identificar el empaquetador subyacente determina qué modificador suprime la interfaz, evita reinicios bruscos y genera trazas de error.
            </p>
          </div>

          {/* Interactive Engine Selector */}
          <div
            role="tablist"
            aria-label="Seleccionar motor de empaquetado"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
          >
            {ENGINE_ANATOMY_EXAMPLES.map((eng) => {
              const isSelected = eng.id === currentEngine.id;
              return (
                <button
                  key={eng.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleEngineSwitch(eng.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {eng.engineName.split(' (')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Command Dissector */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-800">{currentEngine.engineName}</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>Plataforma: {currentEngine.platform}</span>
            </div>
            <span>Haz clic sobre cualquier bloque del comando para inspeccionar su función</span>
          </div>

          {/* Clickable Token Strip */}
          <div className="p-5 sm:p-6 bg-[#0B1120] border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              {currentEngine.tokens.map((tok) => {
                const isActive = tok.id === activeToken.id;
                return (
                  <button
                    key={tok.id}
                    type="button"
                    onClick={() => setSelectedTokenId(tok.id)}
                    className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-200 ring-2 ring-sky-400 font-semibold'
                        : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800 hover:text-white ring-1 ring-slate-700'
                    }`}
                  >
                    {tok.token}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Cómo reconocer este instalador: {currentEngine.detectionHint}
            </p>
          </div>

          {/* Token Explanation Panel */}
          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-2">
              <div className="text-xs text-slate-500">
                <span>Parámetro seleccionado</span>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="font-medium text-sky-700">{activeToken.role}</span>
              </div>
              <div className="text-lg font-mono font-semibold text-slate-900">
                {activeToken.token}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {activeToken.explanation}
              </p>
            </div>

            <div className="lg:col-span-5">
              {activeToken.pitfall ? (
                <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Error frecuente en producción</span>
                  </div>
                  <p className="text-xs text-amber-950/90 leading-relaxed">
                    {activeToken.pitfall}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <Info className="w-4 h-4 text-sky-700 shrink-0" />
                    <span>Espectro de visibilidad MSI de referencia</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-mono">
                    /qf (Completa) → /qr (Reducida) → /qb! (Básica sin cancelar) → /qn (Invisible)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Standard Exit Codes Reference Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Tabla de Códigos de Retorno Estándar (%ERRORLEVEL% / $LASTEXITCODE)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cómo debe reaccionar un script corporativo ante cada código devuelto por el motor de instalación
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-5 w-28">Código</th>
                  <th className="py-3 px-4 w-56">Estado Semántico</th>
                  <th className="py-3 px-4">Significado Técnico</th>
                  <th className="py-3 px-5">Acción Correcta en el Script</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {EXIT_CODES_REFERENCE.map((entry) => (
                  <tr key={entry.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-5 font-mono font-semibold text-slate-900 tabular-nums">
                      {entry.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {entry.severity === 'nominal' && (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-medium text-emerald-800">
                              Éxito nominal
                            </span>
                          </>
                        )}
                        {entry.severity === 'warning' && (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="font-medium text-amber-800">
                              Reinicio requerido
                            </span>
                          </>
                        )}
                        {entry.severity === 'error' && (
                          <>
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span className="font-medium text-red-800">
                              Fallo bloqueante
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {entry.symbolicName}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 leading-relaxed">
                      {entry.meaning}
                    </td>
                    <td className="py-3 px-5 text-slate-600 leading-relaxed">
                      {entry.automationAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
