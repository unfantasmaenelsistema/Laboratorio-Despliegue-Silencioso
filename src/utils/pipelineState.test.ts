import { describe, expect, it } from 'vitest';
import { INITIAL_ENV_VARS } from '../data/catalog';
import { ScriptFormat, UiLevel } from '../types/deployment';
import { DEFAULT_OPTIONS, normalizePipelineState } from './pipelineState';
import { generateScriptForState } from './scriptGenerator';

describe('validación de proyectos importados o guardados', () => {
  it('rechaza lo que no es un proyecto del laboratorio', () => {
    for (const raw of [null, 42, 'texto', [], {}, { selectedPackages: [] }, { options: {} }]) {
      expect(normalizePipelineState(raw)).toBeNull();
    }
  });

  it('un proyecto sin variables, asociaciones ni reglas no rompe los generadores', () => {
    const st = normalizePipelineState({ selectedPackages: [{ packageId: '7zip-msi' }], options: {} })!;
    expect(st.envVars).toHaveLength(INITIAL_ENV_VARS.length);
    expect(st.envVars.every((v) => !v.enabled)).toBe(true);
    expect(st.selectedPackages[0]).toMatchObject({ uiLevel: UiLevel.SILENT, extraArgs: '' });
    for (const format of Object.values(ScriptFormat)) {
      expect(() => generateScriptForState({ ...st, format })).not.toThrow();
    }
  });

  it('descarta paquetes, reglas y opciones con tipos incorrectos', () => {
    const st = normalizePipelineState({
      format: 'exe',
      selectedPackages: [{ packageId: 7 }, 'x', { packageId: 'git-inno', uiLevel: 'raro', customTemplate: { id: 1 } }],
      envVars: [{ id: 'a' }, { ...INITIAL_ENV_VARS[0], scope: 'Galaxia' }, INITIAL_ENV_VARS[1]],
      options: { requireAdminCheck: 'sí', profileName: 'Aula 3', inventado: true },
    })!;
    expect(st.format).toBe(ScriptFormat.POWERSHELL);
    expect(st.selectedPackages).toHaveLength(1);
    expect(st.selectedPackages[0].customTemplate).toBeUndefined();
    expect(st.selectedPackages[0].uiLevel).toBe(UiLevel.SILENT);
    expect(st.envVars).toEqual([INITIAL_ENV_VARS[1]]);
    expect(st.options.requireAdminCheck).toBe(DEFAULT_OPTIONS.requireAdminCheck);
    expect(st.options.profileName).toBe('Aula 3');
    expect('inventado' in st.options).toBe(false);
  });

  it('un proyecto exportado vuelve idéntico', () => {
    const original = normalizePipelineState({
      format: ScriptFormat.BASH,
      selectedPackages: [{ packageId: 'git-inno', uiLevel: UiLevel.PASSIVE, suppressReboot: false, allUsers: false, enableLog: false, extraArgs: '/NOICONS' }],
      envVars: INITIAL_ENV_VARS,
      fileAssocs: [],
      profileRules: [],
      options: DEFAULT_OPTIONS,
    })!;
    expect(normalizePipelineState(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });
});
