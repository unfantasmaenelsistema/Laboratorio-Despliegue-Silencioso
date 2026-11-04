import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { DIAGNOSTIC_CHALLENGES } from '../data/catalog';

export const DiagnosticChallenges: React.FC = () => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const solvedCount = DIAGNOSTIC_CHALLENGES.filter((ch) => {
    const picked = selectedAnswers[ch.id];
    const opt = ch.options.find((o) => o.id === picked);
    return Boolean(opt?.isCorrect);
  }).length;

  return (
    <section
      id="retos"
      aria-labelledby="retos-heading"
      className="py-12 border-t border-slate-200"
    >
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-sky-700 mb-1.5">
              Autoevaluación Práctica · Resolución de Incidentes
            </p>
            <h2
              id="retos-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance"
            >
              Diagnóstico de Scripts Defectuosos en Producción
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Pon a prueba tu criterio identificando por qué fallan estos cuatro fragmentos reales habituales en despliegues corporativos con GPO, SCCM, Intune o Ansible.
            </p>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 tabular-nums shrink-0">
            Casos resueltos correctamente:{' '}
            <strong className="text-slate-900 font-semibold">
              {solvedCount} de {DIAGNOSTIC_CHALLENGES.length}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {DIAGNOSTIC_CHALLENGES.map((challenge) => {
            const pickedId = selectedAnswers[challenge.id];
            const pickedOption = challenge.options.find((o) => o.id === pickedId);

            return (
              <article
                key={challenge.id}
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">
                      <span>{challenge.language}</span>
                      <span aria-hidden="true" className="mx-1.5">·</span>
                      <span>Auditoría de código</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                      {challenge.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                      {challenge.context}
                    </p>
                  </div>

                  <div className="bg-[#0B1120] text-slate-100 rounded-lg p-3.5 overflow-x-auto">
                    <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      <code>{challenge.brokenSnippet.replace(/\r\n/g, '↵\n')}</code>
                    </pre>
                  </div>

                  <div className="space-y-2" role="radiogroup" aria-label={challenge.title}>
                    {challenge.options.map((opt) => {
                      const isChosen = pickedId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [challenge.id]: opt.id,
                            }))
                          }
                          className={`w-full text-left p-3 rounded-lg border text-xs sm:text-sm transition-colors cursor-pointer ${
                            isChosen
                              ? opt.isCorrect
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                                : 'bg-red-50/80 border-red-300 text-red-950 font-medium'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {pickedOption && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      {pickedOption.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <p
                        className={
                          pickedOption.isCorrect ? 'text-emerald-900' : 'text-red-900'
                        }
                      >
                        {pickedOption.explanation}
                      </p>
                    </div>

                    {pickedOption.isCorrect && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Solución recomendada para producción:
                        </span>
                        <div className="bg-slate-900 text-emerald-300 rounded-lg p-3 overflow-x-auto">
                          <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                            <code>{challenge.fixedSnippet}</code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
