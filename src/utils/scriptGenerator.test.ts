import { describe, expect, it } from 'vitest';
import {
  BINARY_INSPECTOR_SAMPLES,
  DIAGNOSTIC_CHALLENGES,
  INITIAL_ENV_VARS,
  INITIAL_FILE_ASSOCS,
  INITIAL_PROFILE_RULES,
  SCENARIO_PRESETS,
  SOFTWARE_CATALOG,
} from '../data/catalog';
import {
  EnvScope,
  GlobalPipelineOptions,
  InstallerEngine,
  ScriptFormat,
  SimulationFault,
  UiLevel,
} from '../types/deployment';
import { countSolved, recordAnswer, sanitizeAnswers } from './challenges';
import {
  PipelineState,
  auditCommandLine,
  buildSimulationSteps,
  buildWindowsPackageArgs,
  escapeBatchEcho,
  generateBashScript,
  generateBatchScript,
  generateDismAssociationsXml,
  generatePowerShellScript,
  generateWingetConfigYaml,
  resolvePackageTemplate,
} from './scriptGenerator';

const OPTIONS: GlobalPipelineOptions = {
  profileName: 'Prueba',
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

function pkg(packageId: string) {
  return { packageId, uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '' };
}

/** Estado con todo activado: todos los paquetes, variables, asociaciones y reglas de perfil. */
function fullState(format: ScriptFormat, options: Partial<GlobalPipelineOptions> = {}): PipelineState {
  return {
    format,
    selectedPackages: SOFTWARE_CATALOG.map((t) => pkg(t.id)),
    envVars: INITIAL_ENV_VARS.map((v) => ({ ...v, enabled: true })),
    fileAssocs: INITIAL_FILE_ASSOCS.map((a) => ({ ...a, enabled: true })),
    profileRules: INITIAL_PROFILE_RULES.map((r) => ({ ...r, enabled: true })),
    options: { ...OPTIONS, ...options },
  };
}

describe('catálogo', () => {
  it('los identificadores son únicos y cada muestra binaria apunta a un paquete existente', () => {
    const ids = SOFTWARE_CATALOG.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of BINARY_INSPECTOR_SAMPLES) {
      expect(ids).toContain(s.catalogPackageId);
    }
    for (const p of SCENARIO_PRESETS) {
      for (const sel of p.packages) expect(ids).toContain(sel.packageId);
    }
  });

  it('NSIS: ningún texto exige que /S vaya al final (solo /D= tiene posición fija)', () => {
    const textos = JSON.stringify([SOFTWARE_CATALOG, DIAGNOSTIC_CHALLENGES]);
    expect(textos).not.toMatch(/\/S[^"]{0,40}(último parámetro|al final)/);
    expect(textos).not.toMatch(/precede obligatoriamente/);
  });

  it('Acrobat Reader x64: proceso, instalador y extracción coherentes', () => {
    const acro = SOFTWARE_CATALOG.find((t) => t.id === 'acrobat-is')!;
    expect(acro.processNameWin).toBe('Acrobat');
    expect(acro.detectPathWin).toMatch(/\\Acrobat\.exe$/);
    expect(acro.winInstallerFile).toMatch(/^AcroRdrDCx64/);
    const sample = BINARY_INSPECTOR_SAMPLES.find((s) => s.catalogPackageId === 'acrobat-is')!;
    expect(sample.unpackCommand).toContain('-sfx_o');
    expect(sample.signatureStrings.join(' ')).not.toContain('InstallShield');
  });

  it('Chrome Enterprise MSI usa el identificador WinGet Google.Chrome', () => {
    expect(SOFTWARE_CATALOG.find((t) => t.id === 'chrome-ent-msi')!.wingetId).toBe('Google.Chrome');
  });

  it('cada caso de diagnóstico tiene exactamente una opción correcta', () => {
    expect(DIAGNOSTIC_CHALLENGES).toHaveLength(6);
    for (const ch of DIAGNOSTIC_CHALLENGES) {
      expect(ch.options.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });

  it('caso 05: la solución reintenta ante 1618 y trata 3010 como éxito', () => {
    const fixed = DIAGNOSTIC_CHALLENGES.find((c) => c.id === 'chal-msi-mutex-1618')!.fixedSnippet;
    expect(fixed).toContain('-ne 1618');
    expect(fixed).toMatch(/-notin 0, ?3010/);
    expect(fixed).not.toContain('OpenExisting');
  });

  it('caso 01: la solución conserva REG_EXPAND_SZ y compara rutas completas', () => {
    const fixed = DIAGNOSTIC_CHALLENGES.find((c) => c.id === 'chal-setx-path')!.fixedSnippet;
    expect(fixed).toContain('DoNotExpandEnvironmentNames');
    expect(fixed).toContain("'ExpandString'");
    expect(fixed).toContain('-notcontains');
    expect(fixed).not.toContain('-notlike');
  });
});

describe('casos de diagnóstico: la primera respuesta queda fijada', () => {
  const ch = DIAGNOSTIC_CHALLENGES[0];
  const wrong = ch.options.find((o) => !o.isCorrect)!;
  const right = ch.options.find((o) => o.isCorrect)!;

  it('no se puede cambiar una respuesta fallida por la correcta', () => {
    let answers = recordAnswer({}, ch.id, wrong.id);
    answers = recordAnswer(answers, ch.id, right.id);
    expect(answers[ch.id]).toBe(wrong.id);
    expect(countSolved(answers)).toBe(0);
  });

  it('cuenta los aciertos a la primera', () => {
    const answers = recordAnswer({}, ch.id, right.id);
    expect(countSolved(answers)).toBe(1);
  });

  it('descarta respuestas guardadas que no existen', () => {
    expect(sanitizeAnswers({ [ch.id]: 'opt-z', inventado: 'opt-a' })).toEqual({});
    expect(sanitizeAnswers('basura')).toEqual({});
    expect(sanitizeAnswers({ [ch.id]: right.id })).toEqual({ [ch.id]: right.id });
  });
});

describe('argumentos por motor', () => {
  it('NSIS con /D=: la ruta va al final y sin comillas', () => {
    for (const extraArgs of ['/D=C:\\Program Files\\VideoLAN\\VLC', '/NCRC /D="C:\\Program Files\\VideoLAN\\VLC"']) {
      const sel = { ...pkg('vlc-nsis'), extraArgs };
      const { args } = buildWindowsPackageArgs(sel, resolvePackageTemplate(sel), 'C:\\Logs');
      expect(args).toMatch(/\/S /);
      expect(args.endsWith('/D=C:\\Program Files\\VideoLAN\\VLC')).toBe(true);
      expect(args).not.toMatch(/\/D="/);
    }
  });

  it('Adobe: /msi precede siempre al log y a las propiedades MSI', () => {
    for (const suppressReboot of [true, false]) {
      const sel = { ...pkg('acrobat-is'), suppressReboot };
      const { args } = buildWindowsPackageArgs(sel, resolvePackageTemplate(sel), 'C:\\Logs');
      const msi = args.indexOf('/msi');
      expect(msi).toBeGreaterThan(0);
      expect(args.indexOf('/L*v')).toBeGreaterThan(msi);
      expect(args.indexOf('EULA_ACCEPT=YES')).toBeGreaterThan(msi);
      expect(args.includes('/norestart')).toBe(suppressReboot);
    }
  });

  it('MSI: /qn, /norestart y propiedades públicas en mayúsculas', () => {
    const sel = pkg('libreoffice-msi');
    const { executable, args } = buildWindowsPackageArgs(sel, resolvePackageTemplate(sel), 'C:\\Logs');
    expect(executable).toBe('msiexec.exe');
    expect(args).toMatch(/\/i "/);
    expect(args).toContain('/qn');
    expect(args).toContain('/norestart');
    for (const prop of args.match(/\b[A-Za-z_]+=/g) ?? []) {
      expect(prop).toBe(prop.toUpperCase());
    }
  });
});

describe('PowerShell', () => {
  const ps = generatePowerShellScript(fullState(ScriptFormat.POWERSHELL));

  it('reintenta ante 1618 en lugar de tratar la mera existencia del mutex como ocupado', () => {
    expect(ps).toContain('if ($proc.ExitCode -ne 1618) { break }');
    expect(ps).not.toContain('Wait-MsiMutex');
    expect(ps).not.toContain('OpenExisting');
  });

  it('3010 y 1641 son éxito con reinicio pendiente', () => {
    expect(ps).toMatch(/3010 \{[^}]*RebootNeeded = \$true/);
    expect(ps).toMatch(/1641 \{[^}]*RebootNeeded = \$true/);
    expect(ps).toContain('exit 3010');
  });

  it('escribe el XML de DISM antes de importarlo', () => {
    const write = ps.indexOf('Set-Content -Path $AssocXmlPath');
    const importa = ps.indexOf('/Import-DefaultAppAssociations');
    expect(write).toBeGreaterThan(0);
    expect(importa).toBeGreaterThan(write);
    expect(ps).toContain(generateDismAssociationsXml(INITIAL_FILE_ASSOCS.map((a) => ({ ...a, enabled: true }))));
    // El cierre del here-string tiene que estar en la columna 0
    expect(ps).toMatch(/\n'@\n/);
  });

  it('PATH: se lee sin expandir, se compara ruta a ruta y se guarda como REG_EXPAND_SZ', () => {
    expect(ps).toContain("'DoNotExpandEnvironmentNames'");
    expect(ps).toContain("'ExpandString'");
    expect(ps).not.toMatch(/SetEnvironmentVariable\("Path"/i);
    expect(ps).not.toMatch(/^s*setx/im);
  });

  it('la colmena Default se descarga siempre (finally + GC)', () => {
    expect(ps).toMatch(/finally \{\s*\[gc\]::Collect\(\)[\s\S]*reg\.exe unload/);
  });

  it('aplica DisableWindowsConsumerFeatures como describe la regla', () => {
    expect(ps).toContain('DisableWindowsConsumerFeatures');
  });
});

describe('Batch', () => {
  const bat = generateBatchScript(fullState(ScriptFormat.BATCH));

  it('usa CRLF y comprueba la elevación con net session', () => {
    expect(bat).toContain('\r\n');
    expect(bat.split('\r\n').join('')).not.toContain('\n');
    expect(bat).toContain('net session >nul 2>&1');
  });

  it('reintenta ante 1618 con una etiqueta por paquete y trata 1641 como 3010', () => {
    expect(bat).toContain('if "!RC!"=="1618" if !TRY! LSS 20 (');
    expect(bat).toContain('goto :paquete_1');
    expect(bat).toContain('if "!RC!"=="1641" set "RC=3010"');
    const labels = bat.match(/^:paquete_\d+$/gm) ?? [];
    expect(new Set(labels).size).toBe(SOFTWARE_CATALOG.length);
  });

  it('escribe el XML de DISM con echo escapado antes de importarlo', () => {
    expect(bat).toContain('echo ^<DefaultAssociations^>');
    expect(bat).toContain(') > "%LOGDIR%\\DefaultAppAssociations.xml"');
    expect(bat.indexOf('DefaultAppAssociations.xml"\r\ndism.exe')).toBeGreaterThan(0);
  });

  it('el PATH no se toca con setx', () => {
    expect(bat).not.toMatch(/^setx/im);
    expect(bat).toContain('DoNotExpandEnvironmentNames');
  });

  it('escapeBatchEcho neutraliza los metacaracteres de CMD', () => {
    expect(escapeBatchEcho('<a b="1">(x) & 50% !y|z</a>')).toBe('^<a b="1"^>^(x^) ^& 50%% ^^!y^|z^</a^>');
    // Entre comillas el ^ sería literal: solo se tratan % y !
    expect(escapeBatchEcho('<n v="(a) & b!" />')).toBe('^<n v="(a) & b^!" /^>');
  });

  it('un nombre con paréntesis no cierra el bloque if del control de errores', () => {
    expect(bat).toContain('Fallo en Acrobat Reader DC ^(MUI^) con codigo');
  });
});

describe('Bash', () => {
  const sh = generateBashScript(fullState(ScriptFormat.BASH));

  it('apt totalmente desatendido: DEBIAN_FRONTEND, NEEDRESTART_MODE, -y y confdef/confold', () => {
    expect(sh).toContain('export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a');
    expect(sh).toContain('apt-get install -y -q');
    expect(sh).toContain('--force-confdef');
    expect(sh).toContain('--force-confold');
  });

  it('solo LF y sin paquetes repetidos', () => {
    expect(sh).not.toContain('\r');
    const line = sh.split('\n').find((l) => /^ {4}[a-z0-9]/.test(l) && l.includes('git'))!;
    const pkgs = line.trim().split(/\s+/);
    expect(new Set(pkgs).size).toBe(pkgs.length);
  });

  it('avisa de los paquetes que necesitan repositorio extra', () => {
    expect(sh).toContain("'code' no está en los repositorios");
    expect(sh).toContain('PPA mozillateam');
  });

  it('dconf: perfil de sistema y dconf update', () => {
    expect(sh).toContain('system-db:local');
    expect(sh).toContain('dconf update');
  });

  it('el PATH se añade de forma idempotente', () => {
    expect(sh).toMatch(/case ":\$PATH:" in \*":[^"]+:"\*\) ;;/);
  });
});

describe('WinGet DSC', () => {
  const yaml = generateWingetConfigYaml(fullState(ScriptFormat.POWERSHELL));

  it('PSDscResources/Environment solo con destino Machine', () => {
    const targets = yaml.match(/Target: .*/g) ?? [];
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(t).toBe("Target: ['Machine']");
    const userVars = INITIAL_ENV_VARS.filter((v) => v.scope === EnvScope.USER && !v.isPathAppend);
    for (const v of userVars) expect(yaml).toContain(`# ${v.name}: PSDscResources/Environment solo admite`);
  });

  it('las rutas de Windows van entre comillas simples (en comillas dobles \\P sería un escape inválido)', () => {
    expect(yaml).not.toMatch(/Value: "/);
    expect(yaml).toMatch(/Value: 'C:\\/);
  });
});

describe('auditor de comandos', () => {
  it('no marca como error un /S correcto en mayúscula', () => {
    const r = auditCommandLine('"vlc-3.0.21-win64.exe" /L=1034 /S');
    expect(r.findings.some((f) => f.title.includes('/s en minúscula'))).toBe(false);
  });

  it('corrige /s en minúscula', () => {
    const r = auditCommandLine('"vlc-3.0.21-win64.exe" /s /L=1034');
    expect(r.findings.some((f) => f.severity === 'error')).toBe(true);
    expect(r.correctedCommand).toContain(' /S ');
  });

  it('/D= entre comillas se mueve al final y sin comillas', () => {
    const r = auditCommandLine('start "" /wait "vlc-3.0.21-win64.exe" /s /D="C:\\Program Files\\VideoLAN\\VLC" /L=1034');
    expect(r.correctedCommand.endsWith('/D=C:\\Program Files\\VideoLAN\\VLC')).toBe(true);
  });

  it('/VERYSILENT sin /SUPPRESSMSGBOXES no se convierte en /VERYVERYSILENT', () => {
    const r = auditCommandLine('"setup.exe" /VERYSILENT');
    expect(r.correctedCommand).not.toContain('VERYVERY');
    expect(r.correctedCommand).toContain('/VERYSILENT /SUPPRESSMSGBOXES /SP-');
    expect(r.correctedCommand.match(/\/NORESTART/gi)).toHaveLength(1);
  });

  it('/SILENT pasa a /VERYSILENT con /SUPPRESSMSGBOXES', () => {
    const r = auditCommandLine('Start-Process -FilePath "VSCodeSetup-x64.exe" -ArgumentList "/SILENT"');
    expect(r.correctedCommand).toContain('/VERYSILENT /SUPPRESSMSGBOXES /SP-');
    expect(r.correctedCommand).toContain('-Wait -PassThru');
  });

  it('msiexec: ruta con espacios entre comillas, propiedades en mayúsculas y /norestart', () => {
    const r = auditCommandLine('msiexec.exe /i C:\\Deploy\\Paquetes Corporativos\\LibreOffice.msi /qn allusers=1 createdesktoplink=0');
    expect(r.correctedCommand).toContain('"C:\\Deploy\\Paquetes Corporativos\\LibreOffice.msi"');
    expect(r.correctedCommand).toContain('ALLUSERS=1');
    expect(r.correctedCommand).toContain('CREATEDESKTOPLINK=0');
    expect(r.correctedCommand).toContain('/norestart');
  });

  it('setx PATH: la corrección no expande ni duplica rutas', () => {
    const r = auditCommandLine('setx /M PATH "%PATH%;C:\\CorpTools\\bin"');
    expect(r.findings[0].severity).toBe('error');
    expect(r.correctedCommand).toContain('DoNotExpandEnvironmentNames');
    expect(r.correctedCommand).toContain('-notcontains');
  });

  it('apt interactivo se reescribe como apt-get desatendido', () => {
    const r = auditCommandLine('sudo apt install vim git curl');
    expect(r.correctedCommand).toMatch(/^DEBIAN_FRONTEND=noninteractive apt-get install -y -q .*vim git curl$/);
  });

  it('un comando correcto no genera errores', () => {
    const r = auditCommandLine('msiexec.exe /i "C:\\Deploy\\7z.msi" /qn /norestart ALLUSERS=1');
    expect(r.findings.map((f) => f.severity)).toEqual(['nominal']);
  });
});

describe('simulador', () => {
  const base: PipelineState = {
    format: ScriptFormat.POWERSHELL,
    selectedPackages: [pkg('7zip-msi'), pkg('vlc-nsis')].filter((p) =>
      SOFTWARE_CATALOG.some((t) => t.id === p.packageId)
    ),
    envVars: [],
    fileAssocs: [],
    profileRules: [],
    options: OPTIONS,
  };
  const msiPkg = SOFTWARE_CATALOG.find((t) => t.engine === InstallerEngine.MSI)!;
  const withMsiFirst: PipelineState = { ...base, selectedPackages: [pkg(msiPkg.id), pkg('vlc-nsis')] };

  it('sin elevación se detiene en el pre-vuelo con código 5', () => {
    const steps = buildSimulationSteps(withMsiFirst, SimulationFault.NO_ADMIN);
    expect(steps).toHaveLength(1);
    expect(steps[0].exitCode).toBe(5);
  });

  it('1618 se mitiga con el reintento activado y falla sin él', () => {
    const ok = buildSimulationSteps(withMsiFirst, SimulationFault.MSI_MUTEX_1618);
    expect(ok.find((s) => s.id.startsWith('sim-pkg-'))!.exitCode).toBe(0);
    const ko = buildSimulationSteps(
      { ...withMsiFirst, options: { ...OPTIONS, waitForMsiMutex: false } },
      SimulationFault.MSI_MUTEX_1618
    );
    expect(ko.find((s) => s.id.startsWith('sim-pkg-'))!.exitCode).toBe(1618);
  });

  it('3010 es un aviso, no un error', () => {
    const steps = buildSimulationSteps(withMsiFirst, SimulationFault.REBOOT_REQUIRED_3010);
    const last = steps.filter((s) => s.id.startsWith('sim-pkg-')).pop()!;
    expect(last.exitCode).toBe(3010);
    expect(last.statusOnRun).toBe('warning');
  });
});
