import { SOFTWARE_CATALOG } from '../data/catalog';
import {
  CommandAuditFinding,
  CorporateProfileRule,
  EnvScope,
  EnvVarRule,
  FileAssociationRule,
  GlobalPipelineOptions,
  InstallerEngine,
  ScriptFormat,
  SelectedPackageConfig,
  SimulationFault,
  SoftwarePackageTemplate,
  UiLevel,
} from '../types/deployment';

export interface PipelineState {
  format: ScriptFormat;
  selectedPackages: SelectedPackageConfig[];
  envVars: EnvVarRule[];
  fileAssocs: FileAssociationRule[];
  profileRules: CorporateProfileRule[];
  options: GlobalPipelineOptions;
}

export interface SimulationStep {
  id: string;
  phase: string;
  title: string;
  commandPreview: string;
  targetArtifact: string;
  statusOnRun: 'nominal' | 'warning' | 'error';
  exitCode: number;
  logOutput: string[];
  didacticNote: string;
}

export function resolvePackageTemplate(pkg: SelectedPackageConfig): SoftwarePackageTemplate {
  if (pkg.customTemplate) {
    return pkg.customTemplate;
  }
  const found = SOFTWARE_CATALOG.find((item) => item.id === pkg.packageId);
  return (
    found ?? {
      id: pkg.packageId,
      name: pkg.packageId,
      version: '1.0',
      vendor: 'Personalizado',
      category: 'General',
      engine: InstallerEngine.MSI,
      winInstallerFile: `${pkg.packageId}.msi`,
      linuxPackageName: pkg.packageId,
      silentSwitchWin: '/qn',
      passiveSwitchWin: '/qb!',
      noRestartSwitchWin: '/norestart',
      allUsersSwitchWin: 'ALLUSERS=1',
      didacticSummary: 'Paquete personalizado definido en el laboratorio.',
    }
  );
}

export function buildWindowsPackageArgs(
  pkg: SelectedPackageConfig,
  tpl: SoftwarePackageTemplate,
  logDir: string
): { executable: string; args: string } {
  const uiArg = pkg.uiLevel === UiLevel.SILENT ? tpl.silentSwitchWin : tpl.passiveSwitchWin;
  const rebootArg = pkg.suppressReboot ? tpl.noRestartSwitchWin : '';
  const usersArg = pkg.allUsers ? tpl.allUsersSwitchWin : '';
  const extra = pkg.extraArgs.trim() || (tpl.extraPropsWin ?? '');
  const safeSlug = tpl.id.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (tpl.engine === InstallerEngine.MSI) {
    const logPart = pkg.enableLog ? `/L*v "${logDir}\\${safeSlug}.log"` : '';
    const args = [`/i "%SRC%\\${tpl.winInstallerFile}"`, uiArg, rebootArg, logPart, usersArg, extra]
      .filter(Boolean)
      .join(' ');
    return { executable: 'msiexec.exe', args };
  }

  if (tpl.engine === InstallerEngine.INNO) {
    const logPart = pkg.enableLog ? `/LOG="${logDir}\\${safeSlug}.log"` : '';
    const args = [uiArg, rebootArg, logPart, usersArg, extra].filter(Boolean).join(' ');
    return { executable: `"%SRC%\\${tpl.winInstallerFile}"`, args };
  }

  if (tpl.engine === InstallerEngine.INSTALLSHIELD) {
    const logPart = pkg.enableLog ? `/L*v "${logDir}\\${safeSlug}.log"` : '';
    // Bootstrapper de Adobe: todo lo que va tras /msi se pasa a msiexec, así que /msi tiene que
    // preceder al log y a las propiedades aunque no se suprima el reinicio
    const usesMsiPassThrough = /(^|\s)\/msi(\s|$)/i.test(tpl.noRestartSwitchWin);
    if (usesMsiPassThrough) {
      const msiTail = [pkg.suppressReboot ? '/norestart' : '', logPart, usersArg, extra].filter(Boolean);
      const args = [uiArg, ...(msiTail.length ? ['/msi', ...msiTail] : [])].join(' ');
      return { executable: `"%SRC%\\${tpl.winInstallerFile}"`, args };
    }
    const args = [uiArg, rebootArg, logPart, usersArg, extra].filter(Boolean).join(' ');
    return { executable: `"%SRC%\\${tpl.winInstallerFile}"`, args };
  }

  if (tpl.engine === InstallerEngine.WIX_BURN) {
    const logPart = pkg.enableLog ? `/log "${logDir}\\${safeSlug}.log"` : '';
    const args = [uiArg, rebootArg, logPart, usersArg, extra].filter(Boolean).join(' ');
    return { executable: `"%SRC%\\${tpl.winInstallerFile}"`, args };
  }

  // NSIS: /S puede ir en cualquier posición; solo /D=Ruta tiene que ser el último parámetro,
  // sin comillas (NSIS toma todo lo que sigue a /D= como ruta, con espacios incluidos)
  const dirMatch = extra.match(/(?:^|\s)\/D=(.+)$/);
  const extraSinDir = dirMatch ? extra.slice(0, dirMatch.index).trim() : extra;
  const dirArg = dirMatch ? `/D=${dirMatch[1].trim().replace(/^"|"$/g, '')}` : '';
  const args = [rebootArg, usersArg, extraSinDir, uiArg, dirArg].filter(Boolean).join(' ');
  return { executable: `"%SRC%\\${tpl.winInstallerFile}"`, args };
}

export function generateDismAssociationsXml(assocs: FileAssociationRule[]): string {
  const active = assocs.filter((a) => a.enabled);
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<DefaultAssociations>',
  ];
  for (const item of active) {
    lines.push(
      `  <Association Identifier="${item.extension}" ProgId="${item.progId}" ApplicationName="${item.appName}" />`
    );
  }
  lines.push('</DefaultAssociations>');
  return lines.join('\n');
}

/**
 * Escapa una línea para `echo` dentro de un bloque ( ... ) de Batch con EnableDelayedExpansion.
 * Entre comillas CMD no interpreta metacaracteres y el ^ es literal, así que solo se escapa fuera
 * de ellas; % se duplica siempre y ! necesita un ^ (dentro de comillas) o dos (fuera).
 */
export function escapeBatchEcho(text: string): string {
  let out = '';
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      out += ch;
    } else if (ch === '%') {
      out += '%%';
    } else if (ch === '!') {
      out += inQuotes ? '^!' : '^^!';
    } else if (!inQuotes && '^&<>|()'.includes(ch)) {
      out += `^${ch}`;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Comando PowerShell que añade una ruta a una variable tipo PATH sin expandir %SystemRoot% ni duplicarla. */
export function buildPathAppendPowerShell(name: string, entry: string, machine: boolean): string[] {
  const key = machine
    ? "[Microsoft.Win32.Registry]::LocalMachine.OpenSubKey('SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment', $true)"
    : "[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)";
  return [
    `$EnvKey = ${key}`,
    `$current = $EnvKey.GetValue('${name}', '', 'DoNotExpandEnvironmentNames')`,
    `if (($current -split ';') -notcontains '${entry}') {`,
    `    $EnvKey.SetValue('${name}', $current.TrimEnd(';') + ';${entry}', 'ExpandString')`,
    '}',
    '$EnvKey.Close()',
  ];
}

/** Paquetes de apt que necesitan un repositorio adicional según la distribución. */
export const APT_EXTRA_REPO_NOTES: Record<string, string> = {
  code: "'code' no está en los repositorios de Debian/Ubuntu: añade antes el repositorio de Microsoft (packages.microsoft.com) o usa snap.",
  'firefox-esr': "'firefox-esr' existe en Debian; en Ubuntu requiere el PPA mozillateam.",
};

export function generateIntuneDetectionScript(state: PipelineState): string {
  const { selectedPackages, envVars, options } = state;
  const activeEnvs = envVars.filter((e) => e.enabled && !e.isPathAppend);
  const lines: string[] = [
    '<#',
    ' .SYNOPSIS',
    `   Regla de Detección (Intune Win32 / MECM) — ${options.profileName}`,
    ' .DESCRIPTION',
    '   Devuelve código 0 y mensaje en STDOUT únicamente si todos los paquetes y variables corporativas están presentes.',
    '#>',
    '$ErrorActionPreference = "SilentlyContinue"',
    '$MissingItems = @()',
    '',
  ];

  for (const pkg of selectedPackages) {
    const tpl = resolvePackageTemplate(pkg);
    if (tpl.detectPathWin) {
      lines.push(`# Verificando binario instalado de ${tpl.name}`);
      lines.push(`if (-not (Test-Path -LiteralPath "${tpl.detectPathWin}")) {`);
      lines.push(`    $MissingItems += "Binario ausente: ${tpl.name} (${tpl.detectPathWin})"`);
      lines.push('}');
    } else {
      lines.push(`# Verificando registro Uninstall para ${tpl.name}`);
      lines.push(
        `$foundReg = Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*", "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" | Where-Object { $_.DisplayName -like "*${tpl.name.split(' ')[0]}*" }`
      );
      lines.push('if (-not $foundReg) {');
      lines.push(`    $MissingItems += "Registro Uninstall ausente: ${tpl.name}"`);
      lines.push('}');
    }
  }

  for (const env of activeEnvs) {
    const scope = env.scope === EnvScope.MACHINE ? 'Machine' : 'User';
    lines.push(`$val_${env.name} = [Environment]::GetEnvironmentVariable("${env.name}", "${scope}")`);
    lines.push(`if ($val_${env.name} -ne "${env.winValue}") {`);
    lines.push(`    $MissingItems += "Variable ${env.name} no coincide"`);
    lines.push('}');
  }

  lines.push('');
  lines.push('if ($MissingItems.Count -eq 0) {');
  lines.push(`    Write-Output "DETECTADO OK: Perfil '${options.profileName}' verificado correctamente."`);
  lines.push('    exit 0');
  lines.push('} else {');
  lines.push('    # En Intune Win32, salir con código != 0 o sin salida STDOUT dispara la instalación');
  lines.push('    exit 1');
  lines.push('}');

  return lines.join('\n');
}

export function generateWingetConfigYaml(state: PipelineState): string {
  const { selectedPackages, envVars, options } = state;
  const activeEnvs = envVars.filter((e) => e.enabled && !e.isPathAppend);

  const lines: string[] = [
    '# yaml-language-server: $schema=https://aka.ms/configuration-dsc-schema/0.2',
    `# Configuración Declarativa WinGet DSC — ${options.profileName}`,
    `# Ejecutar con: winget configure -f configuration.winget --accept-configuration-agreements`,
    'properties:',
    '  configurationVersion: 0.2.0',
    '  assertions:',
    '    - resource: Microsoft.Windows.Developer/OsVersion',
    '      directives:',
    '        description: Verificar versión mínima Windows 10/11 corporativo',
    '        allowPrerelease: false',
    '      settings:',
    '        MinVersion: "10.0.19045"',
    '  resources:',
  ];

  for (const pkg of selectedPackages) {
    const tpl = resolvePackageTemplate(pkg);
    const wingetId = tpl.wingetId || `Corp.${tpl.id}`;
    lines.push('    - resource: Microsoft.WinGet.DSC/WinGetPackage');
    lines.push(`      id: pkg-${tpl.id}`);
    lines.push('      directives:');
    lines.push(`        description: Instalar ${tpl.name} (${tpl.version})`);
    lines.push('        securityContext: elevated');
    lines.push('      settings:');
    lines.push(`        id: "${wingetId}"`);
    lines.push('        source: winget');
    lines.push('        Ensure: Present');
  }

  const yamlQuote = (v: string) => `'${v.replace(/'/g, "''")}'`;
  for (const env of activeEnvs) {
    if (env.scope !== EnvScope.MACHINE) {
      lines.push(`    # ${env.name}: PSDscResources/Environment solo admite los destinos Process y Machine;`);
      lines.push('    #   las variables de usuario se aplican desde el script de inicio de sesión.');
      continue;
    }
    lines.push('    - resource: PSDscResources/Environment');
    lines.push(`      id: env-${env.name.toLowerCase()}`);
    lines.push('      directives:');
    lines.push(`        description: Configurar variable ${env.name}`);
    lines.push('        securityContext: elevated');
    lines.push('      settings:');
    lines.push(`        Name: ${yamlQuote(env.name)}`);
    lines.push(`        Value: ${yamlQuote(env.winValue)}`);
    lines.push('        Ensure: Present');
    lines.push("        Target: ['Machine']");
  }

  return lines.join('\n');
}

export function generatePowerShellScript(state: PipelineState): string {
  const { selectedPackages, envVars, fileAssocs, profileRules, options } = state;
  const activeEnvs = envVars.filter((e) => e.enabled);
  const activeAssocs = fileAssocs.filter((a) => a.enabled);
  const activeProfiles = profileRules.filter((p) => p.enabled);
  const c = options.includeDidacticComments;

  const lines: string[] = [];

  if (options.requireAdminCheck) {
    lines.push('#Requires -RunAsAdministrator');
  }
  lines.push('<#');
  lines.push(` .SYNOPSIS`);
  lines.push(`   Script de Despliegue Desatendido — ${options.profileName}`);
  lines.push(` .ORGANIZATION`);
  lines.push(`   ${options.organizationName} · Generado en Laboratorio de Despliegue Silencioso`);
  lines.push('#>');
  lines.push('');
  lines.push('$ErrorActionPreference = ' + (options.stopOnError ? '"Stop"' : '"Continue"'));
  lines.push(`$InstallerDir = "${options.sourceDirWin}"`);
  lines.push(`$LogDir       = "${options.logDirWin}"`);
  lines.push(`$DryRun       = $${options.dryRunMode ? 'true' : 'false'}`);
  lines.push('$RebootNeeded = $false');
  lines.push('');
  lines.push('if (-not (Test-Path -Path $LogDir)) {');
  lines.push('    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null');
  lines.push('}');
  lines.push('Start-Transcript -Path (Join-Path $LogDir "deploy-session.log") -Append | Out-Null');
  lines.push('');

  if (options.checkDiskSpace) {
    if (c) {
      lines.push('# Verificación preventiva de espacio libre mínimo (2 GB) en unidad del sistema');
    }
    lines.push('$FreeSpaceGB = [math]::Round((Get-PSDrive -Name C).Free / 1GB, 2)');
    lines.push('if ($FreeSpaceGB -lt 2) {');
    lines.push('    Write-Error "Espacio insuficiente en C: ($FreeSpaceGB GB libres). Se requieren al menos 2 GB."');
    lines.push('    exit 112');
    lines.push('}');
    lines.push('');
  }

  if (options.closeRunningApps) {
    const procNames = selectedPackages
      .map((p) => resolvePackageTemplate(p).processNameWin)
      .filter((name): name is string => Boolean(name));
    if (procNames.length > 0) {
      if (c) {
        lines.push('# Cierre preventivo de aplicaciones en uso para evitar archivos bloqueados o reinicios forzados');
      }
      lines.push(`$TargetProcesses = @(${procNames.map((n) => `"${n}"`).join(', ')})`);
      lines.push('foreach ($procName in $TargetProcesses) {');
      lines.push('    if (-not $DryRun) {');
      lines.push('        Get-Process -Name $procName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue');
      lines.push('    }');
      lines.push('}');
      lines.push('');
    }
  }

  if (c) {
    lines.push('# Función auxiliar que valida códigos de retorno MSI/EXE estándar (0 = éxito, 3010/1641 = reinicio diferido)');
  }
  lines.push('function Invoke-UnattendedPackage {');
  lines.push('    param(');
  lines.push('        [string]$DisplayName,');
  lines.push('        [string]$FilePath,');
  lines.push('        [string]$Arguments');
  lines.push('    )');
  lines.push('    Write-Host "[PAQUETE] Instalando $DisplayName..." -ForegroundColor Cyan');
  lines.push('    if ($DryRun) {');
  lines.push('        Write-Host "  [DRY-RUN] Comando: $FilePath $Arguments" -ForegroundColor DarkGray');
  lines.push('        return');
  lines.push('    }');
  if (options.waitForMsiMutex) {
    if (c) {
      lines.push('    # 1618 = otra instalación MSI tiene ocupado Windows Installer (mutex Global\\_MSIExecute):');
      lines.push('    # se reintenta hasta 20 veces cada 30 s. Vale también para .exe que envuelven un MSI.');
    }
    lines.push('    $Attempt = 0');
    lines.push('    do {');
    lines.push('        $proc = Start-Process -FilePath $FilePath -ArgumentList $Arguments -Wait -PassThru -NoNewWindow');
    lines.push('        if ($proc.ExitCode -ne 1618) { break }');
    lines.push('        $Attempt++');
    lines.push('        Write-Host "  [ESPERA] Windows Installer ocupado (1618). Reintento $Attempt/20 en 30 s..." -ForegroundColor Yellow');
    lines.push('        Start-Sleep -Seconds 30');
    lines.push('    } while ($Attempt -lt 20)');
  } else {
    lines.push('    $proc = Start-Process -FilePath $FilePath -ArgumentList $Arguments -Wait -PassThru -NoNewWindow');
  }
  lines.push('    switch ($proc.ExitCode) {');
  lines.push('        0    { Write-Host "  [OK] Completado (Código 0)." -ForegroundColor Green }');
  lines.push('        3010 { Write-Host "  [AVISO] Completado con reinicio pendiente (Código 3010)." -ForegroundColor Yellow; $script:RebootNeeded = $true }');
  lines.push('        1641 { Write-Host "  [AVISO] Reinicio solicitado por instalador (Código 1641)." -ForegroundColor Yellow; $script:RebootNeeded = $true }');
  lines.push('        default {');
  lines.push('            Write-Error "Fallo en $DisplayName (Código de salida: $($proc.ExitCode)). Revise $LogDir."');
  lines.push('        }');
  lines.push('    }');
  lines.push('}');
  lines.push('');

  // Section 1: Packages
  lines.push('# --- FASE 1: INSTALACIÓN DESATENDIDA DE SOFTWARE ---');
  if (selectedPackages.length === 0) {
    lines.push('Write-Host "Sin paquetes seleccionados en esta secuencia."');
  } else {
    for (const pkg of selectedPackages) {
      const tpl = resolvePackageTemplate(pkg);
      const { executable, args } = buildWindowsPackageArgs(pkg, tpl, '$LogDir');
      const psExe =
        executable === 'msiexec.exe'
          ? '"msiexec.exe"'
          : `(Join-Path $InstallerDir "${tpl.winInstallerFile}")`;
      const psArgs = args.replace(/%SRC%\\[^\s"]+/g, '$($InstallerDir)\\' + tpl.winInstallerFile);
      const escapedArgs = psArgs.replace(/"/g, '`"');

      if (c && tpl.caseSensitiveWarning) {
        lines.push(`# Nota crítica (${tpl.name}): ${tpl.caseSensitiveWarning}`);
      }
      lines.push(
        `Invoke-UnattendedPackage -DisplayName "${tpl.name} ${tpl.version}" -FilePath ${psExe} -Arguments "${escapedArgs}"`
      );
    }
  }
  lines.push('');

  // Section 2: Environment variables
  if (activeEnvs.length > 0) {
    lines.push('# --- FASE 2: GESTIÓN PERSISTENTE DE VARIABLES DE ENTORNO ---');
    if (c) {
      lines.push('# Nada de setx.exe (trunca a 1024 caracteres). PATH se lee del registro SIN expandir y se guarda como REG_EXPAND_SZ');
      lines.push('# para no perder referencias como %SystemRoot%. Los cambios se ven en los procesos que se abran después.');
    }
    for (const env of activeEnvs) {
      const target = env.scope === EnvScope.MACHINE ? 'Machine' : 'User';
      if (env.isPathAppend) {
        lines.push('if (-not $DryRun) {');
        for (const l of buildPathAppendPowerShell(env.name, env.winValue, env.scope === EnvScope.MACHINE)) {
          lines.push(`    ${l}`);
        }
        lines.push('}');
        lines.push(`Write-Host "[ENTORNO] ${env.winValue} presente en ${env.name} (${target})" -ForegroundColor Green`);
      } else {
        lines.push('if (-not $DryRun) {');
        lines.push(`    [Environment]::SetEnvironmentVariable("${env.name}", "${env.winValue}", "${target}")`);
        lines.push('}');
        lines.push(`Write-Host "[ENTORNO] Variable definida: ${env.name}=${env.winValue} (${target})" -ForegroundColor Green`);
      }
    }
    lines.push('');
  }

  // Section 3: File associations
  if (activeAssocs.length > 0) {
    lines.push('# --- FASE 3: ASOCIACIÓN CORPORATIVA DE TIPOS DE ARCHIVO ---');
    if (c) {
      lines.push('# Registra ProgID en HKLM\\SOFTWARE\\Classes y aplica plantilla DefaultAppAssociations vía DISM para nuevos usuarios');
    }
    for (const assoc of activeAssocs) {
      lines.push('if (-not $DryRun) {');
      lines.push(`    cmd.exe /c "assoc ${assoc.extension}=${assoc.progId}" | Out-Null`);
      lines.push(`    cmd.exe /c "ftype ${assoc.progId}=\`"${assoc.winExecutablePath}\`" \`"%1\`"" | Out-Null`);
      lines.push('}');
      lines.push(`Write-Host "[ASOCIACIÓN] ${assoc.extension} vinculado a ${assoc.progId} (${assoc.appName})" -ForegroundColor Green`);
    }
    if (options.generateDismXml) {
      if (c) {
        lines.push('# El XML se escribe aquí mismo y DISM lo importa: afecta a los usuarios que inicien sesión por primera vez');
      }
      lines.push('$AssocXmlPath = Join-Path $LogDir "DefaultAppAssociations.xml"');
      lines.push("$AssocXml = @'");
      lines.push(generateDismAssociationsXml(activeAssocs));
      lines.push("'@");
      lines.push('Set-Content -Path $AssocXmlPath -Value $AssocXml -Encoding UTF8');
      lines.push('if (-not $DryRun) {');
      lines.push('    dism.exe /Online /Import-DefaultAppAssociations:"$AssocXmlPath" | Out-Null');
      lines.push('    Write-Host "[DISM] Asociaciones predeterminadas importadas en la imagen del sistema." -ForegroundColor Green');
      lines.push('}');
    }
    lines.push('');
  }

  // Section 4: Corporate Default Profile
  if (activeProfiles.length > 0) {
    lines.push('# --- FASE 4: CONFIGURACIÓN DEL PERFIL PREDETERMINADO CORPORATIVO (DEFAULT USER) ---');
    if (c) {
      lines.push('# Montamos C:\\Users\\Default\\NTUSER.DAT para que cualquier empleado que inicie sesión en el futuro herede las preferencias');
    }
    lines.push('$DefaultHiveFile = "C:\\Users\\Default\\NTUSER.DAT"');
    lines.push('if ((Test-Path $DefaultHiveFile) -and (-not $DryRun)) {');
    lines.push('    reg.exe load "HKU\\DefaultCorpProfile" $DefaultHiveFile | Out-Null');
    lines.push('    try {');

    for (const rule of activeProfiles) {
      if (rule.id === 'prof-show-extensions') {
        lines.push('        reg.exe add "HKU\\DefaultCorpProfile\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideFileExt /t REG_DWORD /d 0 /f | Out-Null');
      }
      if (rule.id === 'prof-disable-firstrun') {
        lines.push('        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge" -Force | Out-Null');
        lines.push('        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge" -Name "HideFirstRunExperience" -Type DWord -Value 1');
        lines.push('        reg.exe add "HKU\\DefaultCorpProfile\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-310093Enabled /t REG_DWORD /d 0 /f | Out-Null');
        lines.push('        # DisableWindowsConsumerFeatures solo tiene efecto en Windows Enterprise y Education');
        lines.push('        reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures /t REG_DWORD /d 1 /f | Out-Null');
      }
      if (rule.id === 'prof-skel-editor-settings') {
        lines.push('        $CodeDefaultDir = "C:\\Users\\Default\\AppData\\Roaming\\Code\\User"');
        lines.push('        New-Item -ItemType Directory -Path $CodeDefaultDir -Force | Out-Null');
        lines.push('        \'{"telemetry.telemetryLevel":"off","files.eol":"\\n","editor.renderWhitespace":"boundary"}\' | Set-Content -Path (Join-Path $CodeDefaultDir "settings.json") -Encoding UTF8');
      }
      if (rule.id === 'prof-clean-public-desktop') {
        lines.push('        Get-ChildItem -Path "C:\\Users\\Public\\Desktop\\*.lnk" -ErrorAction SilentlyContinue | Remove-Item -Force');
        lines.push('        "[InternetShortcut]`r`nURL=https://www.unfantasmaenelsistema.com/" | Set-Content -Path "C:\\Users\\Public\\Desktop\\Soporte-Documentacion-TI.url" -Encoding ASCII');
      }
      if (rule.id === 'prof-ps-execution-policy') {
        lines.push('        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force');
        lines.push('        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" -Force | Out-Null');
        lines.push('        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" -Name "EnableScriptBlockLogging" -Type DWord -Value 1');
      }
    }

    lines.push('    } finally {');
    lines.push('        [gc]::Collect()');
    lines.push('        Start-Sleep -Milliseconds 500');
    lines.push('        reg.exe unload "HKU\\DefaultCorpProfile" | Out-Null');
    lines.push('    }');
    lines.push('}');
    lines.push('Write-Host "[PERFIL] Molde C:\\Users\\Default actualizado para futuros inicios de sesión." -ForegroundColor Green');
    lines.push('');
  }

  lines.push('Stop-Transcript | Out-Null');
  lines.push('if ($RebootNeeded) {');
  lines.push('    Write-Host "Despliegue finalizado. Se recomienda reiniciar la estación (Código 3010)." -ForegroundColor Yellow');
  lines.push('    exit 3010');
  lines.push('}');
  lines.push('Write-Host "Despliegue completado con éxito (Código 0)." -ForegroundColor Green');
  lines.push('exit 0');

  return lines.join('\n');
}

export function generateBatchScript(state: PipelineState): string {
  const { selectedPackages, envVars, fileAssocs, profileRules, options } = state;
  const activeEnvs = envVars.filter((e) => e.enabled);
  const activeAssocs = fileAssocs.filter((a) => a.enabled);
  const activeProfiles = profileRules.filter((p) => p.enabled);
  const c = options.includeDidacticComments;

  const lines: string[] = [
    '@echo off',
    'setlocal EnableExtensions EnableDelayedExpansion',
    'chcp 65001 >nul',
    `REM ============================================================================`,
    `REM Script de Despliegue Desatendido — ${options.profileName}`,
    `REM Organización: ${options.organizationName}`,
    `REM ============================================================================`,
    '',
    `set "SRC=${options.sourceDirWin}"`,
    `set "LOGDIR=${options.logDirWin}"`,
    `set "DRYRUN=${options.dryRunMode ? '1' : '0'}"`,
    'set "REBOOT_REQUIRED=0"',
    '',
    'if not exist "%LOGDIR%" mkdir "%LOGDIR%"',
    '',
  ];

  if (options.requireAdminCheck) {
    if (c) {
      lines.push('REM Comprobación real de elevación UAC mediante consulta a net session');
    }
    lines.push('net session >nul 2>&1');
    lines.push('if %ERRORLEVEL% NEQ 0 (');
    lines.push('    echo [ERROR] Este script requiere privilegios de Administrador elevado.');
    lines.push('    exit /b 5');
    lines.push(')');
    lines.push('');
  }

  if (options.closeRunningApps) {
    const procNames = selectedPackages
      .map((p) => resolvePackageTemplate(p).processNameWin)
      .filter((name): name is string => Boolean(name));
    if (procNames.length > 0) {
      if (c) {
        lines.push('REM Cerrando procesos abiertos que puedan bloquear la sustitución de binarios');
      }
      for (const proc of procNames) {
        lines.push(`taskkill /F /IM "${proc}.exe" >nul 2>&1`);
      }
      lines.push('');
    }
  }

  lines.push('echo [INICIO] Secuencia de despliegue desatendido iniciada...');
  lines.push('');

  // Phase 1: Packages
  lines.push('REM --- FASE 1: INSTALACIÓN DESATENDIDA DE PAQUETES ---');
  if (selectedPackages.length === 0) {
    lines.push('echo [INFO] No hay paquetes configurados en esta secuencia.');
  } else {
    selectedPackages.forEach((pkg, idx) => {
      const tpl = resolvePackageTemplate(pkg);
      const { executable, args } = buildWindowsPackageArgs(pkg, tpl, '%LOGDIR%');
      if (c && tpl.caseSensitiveWarning) {
        lines.push(`REM Aviso técnico: ${tpl.caseSensitiveWarning}`);
      }
      lines.push(`echo [PAQUETE] Desplegando ${tpl.name} (${tpl.version})...`);
      if (options.dryRunMode) {
        lines.push(`echo   [DRY-RUN] start "" /wait ${executable} ${args}`);
      } else {
        const label = `paquete_${idx + 1}`;
        if (options.waitForMsiMutex) {
          lines.push('set "TRY=0"');
          lines.push(`:${label}`);
        }
        lines.push(`start "" /wait ${executable} ${args}`);
        lines.push('set "RC=!ERRORLEVEL!"');
        if (options.waitForMsiMutex) {
          if (c) {
            lines.push('REM 1618 = Windows Installer ocupado por otra instalación: reintento cada 30 s (máximo 20)');
          }
          lines.push('if "!RC!"=="1618" if !TRY! LSS 20 (');
          lines.push('    set /a TRY+=1');
          lines.push('    echo   [ESPERA] Windows Installer ocupado [1618]. Reintento !TRY!/20 en 30 s...');
          lines.push('    timeout /t 30 /nobreak >nul');
          lines.push(`    goto :${label}`);
          lines.push(')');
        }
        lines.push('if "!RC!"=="1641" set "RC=3010"');
        lines.push('if "!RC!"=="3010" (');
        lines.push('    echo   [AVISO] Reinicio pendiente registrado para finalizar cambios [3010].');
        lines.push('    set "REBOOT_REQUIRED=1"');
        lines.push(') else if "!RC!" NEQ "0" (');
        lines.push(`    echo   [ERROR] Fallo en ${escapeBatchEcho(tpl.name)} con codigo de retorno !RC!.`);
        if (options.stopOnError) {
          lines.push('    exit /b !RC!');
        }
        lines.push(')');
      }
      lines.push('');
    });
  }

  // Phase 2: Env Vars
  if (activeEnvs.length > 0) {
    lines.push('REM --- FASE 2: VARIABLES DE ENTORNO DEL SISTEMA ---');
    if (c) {
      lines.push('REM Nada de setx (trunca a 1024 caracteres): PowerShell lee PATH del registro sin expandir y lo guarda como REG_EXPAND_SZ');
    }
    for (const env of activeEnvs) {
      const target = env.scope === EnvScope.MACHINE ? 'Machine' : 'User';
      if (env.isPathAppend) {
        if (options.dryRunMode) {
          lines.push(`echo [DRY-RUN] Anexar "${env.winValue}" a ${env.name} (${target})`);
        } else {
          lines.push(
            `powershell.exe -NoProfile -Command "${buildPathAppendPowerShell(env.name, env.winValue, env.scope === EnvScope.MACHINE).join('; ').replace('{;', '{').replace('; }', ' }')}"`
          );
          lines.push(`echo [ENTORNO] Ruta agregada a ${env.name}: ${env.winValue}`);
        }
      } else {
        const regRoot =
          env.scope === EnvScope.MACHINE
            ? 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'
            : 'HKCU\\Environment';
        if (options.dryRunMode) {
          lines.push(`echo [DRY-RUN] reg add "${regRoot}" /v "${env.name}" /t REG_SZ /d "${env.winValue}" /f`);
        } else {
          lines.push(`reg.exe add "${regRoot}" /v "${env.name}" /t REG_SZ /d "${env.winValue}" /f >nul`);
          lines.push(`echo [ENTORNO] ${env.name}=${env.winValue}`);
        }
      }
    }
    lines.push('');
  }

  // Phase 3: File associations
  if (activeAssocs.length > 0) {
    lines.push('REM --- FASE 3: ASOCIACIÓN DE TIPOS DE ARCHIVO ---');
    if (c) {
      lines.push('REM Paso 1: assoc vincula extensión con ProgID. Paso 2: ftype define el binario receptor "%1".');
    }
    for (const assoc of activeAssocs) {
      if (options.dryRunMode) {
        lines.push(`echo [DRY-RUN] assoc ${assoc.extension}=${assoc.progId} ^& ftype ${assoc.progId}="${assoc.winExecutablePath}" "%%1"`);
      } else {
        lines.push(`assoc ${assoc.extension}=${assoc.progId} >nul`);
        lines.push(`ftype ${assoc.progId}="${assoc.winExecutablePath}" "%%1" >nul`);
        lines.push(`echo [ASOCIACION] ${assoc.extension} -^> ${assoc.appName}`);
      }
    }
    if (options.generateDismXml && !options.dryRunMode) {
      if (c) {
        lines.push('REM Se escribe el XML de asociaciones y DISM lo importa para los usuarios que inicien sesión por primera vez');
      }
      lines.push('(');
      for (const xmlLine of generateDismAssociationsXml(activeAssocs).split('\n')) {
        lines.push(`echo ${escapeBatchEcho(xmlLine)}`);
      }
      lines.push(') > "%LOGDIR%\\DefaultAppAssociations.xml"');
      lines.push('dism.exe /Online /Import-DefaultAppAssociations:"%LOGDIR%\\DefaultAppAssociations.xml" >nul');
    }
    lines.push('');
  }

  // Phase 4: Default Profile
  if (activeProfiles.length > 0) {
    lines.push('REM --- FASE 4: PERFIL PREDETERMINADO CORPORATIVO (NTUSER.DAT) ---');
    if (options.dryRunMode) {
      lines.push('echo [DRY-RUN] reg load HKU\\DefaultCorp "C:\\Users\\Default\\NTUSER.DAT" y escritura de politicas');
    } else {
      lines.push('reg.exe load "HKU\\DefaultCorp" "C:\\Users\\Default\\NTUSER.DAT" >nul 2>&1');
      for (const rule of activeProfiles) {
        if (rule.id === 'prof-show-extensions') {
          lines.push(
            'reg.exe add "HKU\\DefaultCorp\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideFileExt /t REG_DWORD /d 0 /f >nul'
          );
        }
        if (rule.id === 'prof-disable-firstrun') {
          lines.push(
            'reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HideFirstRunExperience /t REG_DWORD /d 1 /f >nul'
          );
          lines.push(
            'reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures /t REG_DWORD /d 1 /f >nul'
          );
        }
        if (rule.id === 'prof-skel-editor-settings') {
          lines.push('if not exist "C:\\Users\\Default\\AppData\\Roaming\\Code\\User" mkdir "C:\\Users\\Default\\AppData\\Roaming\\Code\\User"');
          lines.push(
            '> "C:\\Users\\Default\\AppData\\Roaming\\Code\\User\\settings.json" echo {"telemetry.telemetryLevel":"off"}'
          );
        }
        if (rule.id === 'prof-clean-public-desktop') {
          lines.push('del /q "C:\\Users\\Public\\Desktop\\*.lnk" 2>nul');
        }
        if (rule.id === 'prof-ps-execution-policy') {
          lines.push(
            'reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" /v EnableScriptBlockLogging /t REG_DWORD /d 1 /f >nul'
          );
        }
      }
      lines.push('reg.exe unload "HKU\\DefaultCorp" >nul 2>&1');
      lines.push('echo [PERFIL] Plantilla C:\\Users\\Default sellada correctamente.');
    }
    lines.push('');
  }

  lines.push('if "%REBOOT_REQUIRED%"=="1" (');
  lines.push('    echo [FIN] Despliegue correcto. Reinicio diferido necesario [Codigo 3010].');
  lines.push('    exit /b 3010');
  lines.push(')');
  lines.push('echo [FIN] Despliegue finalizado sin errores [Codigo 0].');
  lines.push('exit /b 0');

  return lines.join('\r\n');
}

export function generateBashScript(state: PipelineState): string {
  const { selectedPackages, envVars, fileAssocs, profileRules, options } = state;
  const activeEnvs = envVars.filter((e) => e.enabled);
  const activeAssocs = fileAssocs.filter((a) => a.enabled);
  const activeProfiles = profileRules.filter((p) => p.enabled);
  const c = options.includeDidacticComments;

  const lines: string[] = [
    '#!/usr/bin/env bash',
    `# ==============================================================================`,
    `# Script de Aprovisionamiento Desatendido — ${options.profileName}`,
    `# Organización: ${options.organizationName} (Finales de línea estrictos LF)`,
    `# ==============================================================================`,
    options.stopOnError ? 'set -euo pipefail' : 'set -uo pipefail',
    '',
    `LOG_FILE="${options.logDirLinux}/unattended-deploy.log"`,
    `DRY_RUN=${options.dryRunMode ? 'true' : 'false'}`,
    '',
  ];

  if (options.requireAdminCheck) {
    lines.push('if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then');
    lines.push('  echo "[ERROR] Ejecute este aprovisionamiento con privilegios root (sudo)." >&2');
    lines.push('  exit 1');
    lines.push('fi');
    lines.push('');
  }

  lines.push('mkdir -p "$(dirname "$LOG_FILE")"');
  lines.push('exec > >(tee -a "$LOG_FILE") 2>&1');
  lines.push('');

  if (options.checkDiskSpace) {
    lines.push('FREE_MB=$(df -BM / | awk \'NR==2 {gsub("M","",$4); print $4}\')');
    lines.push('if [[ "${FREE_MB:-0}" -lt 2048 ]]; then');
    lines.push('  echo "[ERROR] Espacio libre insuficiente en / (${FREE_MB} MB < 2048 MB)." >&2');
    lines.push('  exit 28');
    lines.push('fi');
    lines.push('');
  }

  // Phase 1: Packages
  lines.push('# --- FASE 1: INSTALACIÓN NO INTERACTIVA DE PAQUETES ---');
  if (selectedPackages.length === 0) {
    lines.push('echo "[INFO] Sin paquetes seleccionados."');
  } else {
    const pkgNames = Array.from(
      new Set(selectedPackages.flatMap((p) => resolvePackageTemplate(p).linuxPackageName.split(/\s+/).filter(Boolean)))
    );
    const pkgList = pkgNames.join(' ');
    if (c) {
      lines.push('# DEBIAN_FRONTEND=noninteractive evita diálogos debconf; force-confdef/confold protege configuraciones previas');
      lines.push('# NEEDRESTART_MODE=a evita que needrestart (Ubuntu 22.04+) se quede esperando una respuesta');
    }
    for (const name of pkgNames) {
      if (APT_EXTRA_REPO_NOTES[name]) {
        lines.push(`# Aviso: ${APT_EXTRA_REPO_NOTES[name]}`);
      }
    }
    lines.push('if [[ "$DRY_RUN" == "true" ]]; then');
    lines.push(`  echo "[DRY-RUN] apt-get update && apt-get install -y -q ${pkgList}"`);
    lines.push('else');
    lines.push('  export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a');
    lines.push('  apt-get update -q');
    lines.push('  apt-get install -y -q \\');
    lines.push('    -o Dpkg::Options::="--force-confdef" \\');
    lines.push('    -o Dpkg::Options::="--force-confold" \\');
    lines.push(`    ${pkgList}`);
    lines.push('fi');
  }
  lines.push('');

  // Phase 2: Environment variables
  if (activeEnvs.length > 0) {
    lines.push('# --- FASE 2: VARIABLES DE ENTORNO GLOBALES (/etc/profile.d/) ---');
    if (c) {
      lines.push('# Modularizar en /etc/profile.d/99-corp-env.sh evita editar manualmente /etc/environment o /etc/bash.bashrc');
    }
    lines.push('ENV_PROFILE="/etc/profile.d/99-corp-env.sh"');
    lines.push('if [[ "$DRY_RUN" == "false" ]]; then');
    lines.push('  cat << \'EOF\' > "$ENV_PROFILE"');
    lines.push('# Variables gestionadas automáticamente por TI Corporativo');
    for (const env of activeEnvs) {
      if (env.isPathAppend) {
        lines.push(`case ":$PATH:" in *":${env.linuxValue}:"*) ;; *) export PATH="$PATH:${env.linuxValue}" ;; esac`);
      } else {
        lines.push(`export ${env.name}="${env.linuxValue}"`);
      }
    }
    lines.push('EOF');
    lines.push('  chmod 0644 "$ENV_PROFILE"');
    lines.push('fi');
    lines.push('echo "[ENTORNO] Perfil global escrito en $ENV_PROFILE"');
    lines.push('');
  }

  // Phase 3: MIME File associations
  if (activeAssocs.length > 0) {
    lines.push('# --- FASE 3: ASOCIACIONES MIME PREDETERMINADAS (XDG) ---');
    if (c) {
      lines.push('# /etc/xdg/mimeapps.list define aplicaciones por defecto a nivel de sistema para todos los escritorios FreeDesktop');
    }
    lines.push('if [[ "$DRY_RUN" == "false" ]]; then');
    lines.push('  mkdir -p /etc/xdg');
    lines.push('  cat << \'EOF\' > /etc/xdg/mimeapps.list');
    lines.push('[Default Applications]');
    for (const assoc of activeAssocs) {
      lines.push(`${assoc.mimeType}=${assoc.linuxDesktopEntry}`);
    }
    lines.push('EOF');
    lines.push('fi');
    lines.push('echo "[ASOCIACIÓN] Tabla MIME corporativa actualizada en /etc/xdg/mimeapps.list"');
    lines.push('');
  }

  // Phase 4: /etc/skel default user profile
  if (activeProfiles.length > 0) {
    lines.push('# --- FASE 4: MOLDE DE PERFIL CORPORATIVO (/etc/skel) ---');
    if (c) {
      lines.push('# Todo fichero dentro de /etc/skel se copia automáticamente al directorio $HOME al dar de alta nuevos usuarios (useradd / PAM mkhomedir)');
    }
    lines.push('if [[ "$DRY_RUN" == "false" ]]; then');
    for (const rule of activeProfiles) {
      if (rule.id === 'prof-show-extensions') {
        if (c) {
          lines.push('  # En Linux el nombre completo (con extensión) ya se ve siempre; como equivalente, vista de lista con columna de tipo en Nautilus');
        }
        lines.push('  mkdir -p /etc/dconf/db/local.d /etc/dconf/profile');
        lines.push('  [[ -f /etc/dconf/profile/user ]] || printf "user-db:user\\nsystem-db:local\\n" > /etc/dconf/profile/user');
        lines.push('  printf "[org/gnome/nautilus/preferences]\\ndefault-folder-viewer=\'list-view\'\\n" > /etc/dconf/db/local.d/00-corp-files');
        lines.push('  command -v dconf >/dev/null && dconf update');
      }
      if (rule.id === 'prof-disable-firstrun') {
        lines.push('  mkdir -p /etc/firefox/policies');
        lines.push('  printf \'{"policies":{"DisableTelemetry":true,"OverrideFirstRunPage":""}}\\n\' > /etc/firefox/policies/policies.json');
      }
      if (rule.id === 'prof-skel-editor-settings') {
        lines.push('  mkdir -p /etc/skel/.config/Code/User');
        lines.push('  printf \'{"telemetry.telemetryLevel":"off","files.eol":"\\\\n"}\\n\' > /etc/skel/.config/Code/User/settings.json');
      }
      if (rule.id === 'prof-clean-public-desktop') {
        lines.push('  mkdir -p /etc/skel/Escritorio');
        lines.push('  printf "[Desktop Entry]\\nType=Link\\nName=Portal Documentacion TI\\nURL=https://www.unfantasmaenelsistema.com/\\nIcon=help-browser\\n" > /etc/skel/Escritorio/soporte-ti.desktop');
      }
      if (rule.id === 'prof-ps-execution-policy') {
        lines.push('  printf "readonly HISTTIMEFORMAT=\\"%%F %%T \\"\\nexport HISTTIMEFORMAT\\n" > /etc/profile.d/90-corp-audit.sh');
      }
    }
    lines.push('fi');
    lines.push('echo "[PERFIL] Esqueleto /etc/skel preparado para futuros usuarios corporativos."');
    lines.push('');
  }

  lines.push('echo "[OK] Aprovisionamiento desatendido finalizado (Código 0)."');
  lines.push('exit 0');

  return lines.join('\n');
}

export function generateScriptForState(state: PipelineState): string {
  switch (state.format) {
    case ScriptFormat.BATCH:
      return generateBatchScript(state);
    case ScriptFormat.BASH:
      return generateBashScript(state);
    case ScriptFormat.POWERSHELL:
    default:
      return generatePowerShellScript(state);
  }
}

export function auditCommandLine(rawCommand: string): {
  findings: CommandAuditFinding[];
  correctedCommand: string;
} {
  const cmd = rawCommand.trim();
  const findings: CommandAuditFinding[] = [];
  let corrected = cmd;

  if (!cmd) {
    return { findings: [], correctedCommand: '' };
  }

  // 1. Check destructive setx PATH
  if (/setx(\.exe)?\s+.*path/i.test(cmd)) {
    findings.push({
      severity: 'error',
      title: 'Peligro crítico: setx aplicado sobre la variable PATH',
      detail:
        'setx trunca cualquier cadena que supere 1024 caracteres y, si se usa con "%PATH%", fusiona las rutas del usuario actual dentro del registro HKLM global.',
      suggestion:
        'Lee PATH del registro sin expandir, añade la ruta solo si falta y guárdalo como REG_EXPAND_SZ (comando corregido abajo; ajusta la ruta).',
    });
    corrected = `powershell -NoProfile -Command "${buildPathAppendPowerShell('Path', 'C:\\CorpTools\\bin', true).join('; ').replace('{;', '{').replace('; }', ' }')}"`;
  }

  // 2. Check NSIS /s lowercase
  if (/\s\/s(\s|$)/.test(cmd) && !/msiexec|\/v"/i.test(cmd)) {
    findings.push({
      severity: 'error',
      title: 'Switch /s en minúscula detectado (Incompatible con NSIS)',
      detail:
        'Los instaladores NSIS (VLC, Firefox, Notepad++) exigen estrictamente /S en MAYÚSCULA. Con /s minúscula se abre la interfaz gráfica y se bloquea en la Sesión 0.',
      suggestion: 'Reemplaza /s por /S en mayúscula. Su posición da igual; solo /D=Ruta tiene que ir al final.',
    });
    corrected = corrected.replace(/\s\/s(\s|$)/g, ' /S$1');
  }

  // 3. Check NSIS /D="quoted path" or /D not at the end
  const nsisDMatch = corrected.match(/\/D="([^"]+)"/);
  if (nsisDMatch) {
    findings.push({
      severity: 'error',
      title: 'Parámetro /D= con comillas dobles en instalador NSIS',
      detail:
        'En NSIS el modificador /D=Ruta NUNCA admite comillas dobles (ni siquiera cuando la ruta tiene espacios) y debe ser obligatoriamente el último parámetro de toda la línea.',
      suggestion: `Elimina las comillas de /D=${nsisDMatch[1]} y sitúalo al final absoluto tras /S.`,
    });
    const cleanDir = nsisDMatch[1];
    corrected = corrected.replace(/\/D="[^"]+"\s*/g, '').trim();
    if (!corrected.includes('/S')) {
      corrected += ' /S';
    }
    corrected = `${corrected} /D=${cleanDir}`;
  }

  // 4. Check MSI lowercase properties or unquoted paths
  if (/msiexec/i.test(cmd)) {
    const unquotedMsi = cmd.match(/\/i\s+([^\s"][^"]+\s+[^"]+\.msi)/i);
    if (unquotedMsi) {
      findings.push({
        severity: 'error',
        title: 'Ruta .msi con espacios sin comillas dobles tras /i',
        detail: `msiexec romperá la ruta "${unquotedMsi[1]}" en el primer espacio y devolverá el código 1639 (Invalid command line argument).`,
        suggestion: 'Envuelve la ruta del archivo .msi entre comillas dobles.',
      });
      corrected = corrected.replace(unquotedMsi[1], `"${unquotedMsi[1]}"`);
    }

    const lowerPropMatches = cmd.match(/\b([a-z_]+)=([^\s]+)/g);
    if (lowerPropMatches && lowerPropMatches.length > 0) {
      findings.push({
        severity: 'error',
        title: `Propiedades MSI en minúscula detectadas (${lowerPropMatches.join(', ')})`,
        detail:
          'Windows Installer trata como privadas las propiedades con minúsculas: su valor no llega a la fase de instalación (servidor) y el cambio se pierde.',
        suggestion: 'Escribe el nombre de toda propiedad pública MSI íntegramente en MAYÚSCULAS (ej. ALLUSERS=1).',
      });
      for (const match of lowerPropMatches) {
        const [k, v] = match.split('=');
        corrected = corrected.replace(match, `${k.toUpperCase()}=${v}`);
      }
    }

    if (!/\/norestart|REBOOT=ReallySuppress/i.test(cmd)) {
      findings.push({
        severity: 'warning',
        title: 'Ausencia de /norestart en transacción msiexec',
        detail:
          'Si el paquete MSI actualiza archivos en uso, puede iniciar un reinicio inmediato (código 1641) cortando el resto de tu script.',
        suggestion: 'Añade /norestart para diferir el reinicio con código controlado 3010.',
      });
      corrected = `${corrected} /norestart`;
    }
  }

  // 5. Check Start-Process without -Wait or Inno Setup /SILENT without /SUPPRESSMSGBOXES
  if (/Start-Process/i.test(cmd) && !/-Wait/i.test(cmd)) {
    findings.push({
      severity: 'error',
      title: 'Start-Process sin el modificador -Wait',
      detail:
        'PowerShell lanzará el instalador de forma asíncrona en segundo plano y pasará inmediatamente a la siguiente línea antes de que termine la instalación.',
      suggestion: 'Añade -Wait -PassThru para esperar al subproceso y capturar su ExitCode.',
    });
    corrected = `${corrected} -Wait -PassThru`;
  }

  if (/\/SILENT|\/VERYSILENT/i.test(cmd) && !/\/SUPPRESSMSGBOXES/i.test(cmd)) {
    findings.push({
      severity: 'warning',
      title: 'Instalador Inno Setup sin /SUPPRESSMSGBOXES ni /SP-',
      detail:
        'Si surge una pregunta o advertencia durante el despliegue como cuenta SYSTEM, el instalador mostrará un cuadro modal invisible.',
      suggestion: 'Combina /VERYSILENT con /SUPPRESSMSGBOXES /SP- /NORESTART.',
    });
    corrected = corrected.replace(/\/(VERY)?SILENT\b/i, '/VERYSILENT /SUPPRESSMSGBOXES /SP-');
    if (!/\/NORESTART/i.test(corrected)) {
      corrected = `${corrected} /NORESTART`;
    }
  }

  // 6. Check Linux apt install interactive
  if (/^(sudo\s+)?apt(-get)?\s+install/i.test(cmd)) {
    if (!/DEBIAN_FRONTEND=noninteractive/.test(cmd) || !/\s-y(\s|$)/.test(cmd)) {
      findings.push({
        severity: 'error',
        title: 'Invocación de APT interactiva en script desatendido',
        detail:
          'El comando apt está diseñado para uso humano interactivo y sin DEBIAN_FRONTEND=noninteractive ni -y se detendrá esperando entrada por teclado (STDIN).',
        suggestion:
          'Usa DEBIAN_FRONTEND=noninteractive apt-get install -y -q con --force-confdef y --force-confold.',
      });
      const pkgs = cmd.replace(/^(sudo\s+)?apt(-get)?\s+install\s+(-y\s+)?/i, '');
      corrected = `DEBIAN_FRONTEND=noninteractive apt-get install -y -q -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" ${pkgs}`;
    }
  }

  if (findings.length === 0) {
    findings.push({
      severity: 'nominal',
      title: 'Sintaxis de despliegue desatendido validada correctamente',
      detail:
        'No se han detectado trampas de mayúsculas/minúsculas, bloqueos de Sesión 0 ni truncamientos de entorno en esta línea de comandos.',
      suggestion: 'Recuerda verificar siempre el código de retorno (0 o 3010) tras ejecutar el comando.',
    });
  }

  return { findings, correctedCommand: corrected };
}

export function buildSimulationSteps(
  state: PipelineState,
  fault: SimulationFault
): SimulationStep[] {
  const steps: SimulationStep[] = [];
  const isLinux = state.format === ScriptFormat.BASH;

  // Step 0: Elevation & Pre-flight check
  if (state.options.requireAdminCheck || state.options.waitForMsiMutex || state.options.checkDiskSpace) {
    const failedAdmin = fault === SimulationFault.NO_ADMIN;
    steps.push({
      id: 'sim-elevation',
      phase: '00. Pre-vuelo',
      title: isLinux
        ? 'Verificación de UID 0 (root) y espacio en /'
        : 'Comprobación UAC, espacio en disco y registro',
      commandPreview: isLinux
        ? '[[ "${EUID:-$(id -u)}" -eq 0 ]] && df -BM /'
        : state.format === ScriptFormat.BATCH
        ? 'net session >nul 2>&1'
        : '#Requires -RunAsAdministrator; Get-PSDrive C',
      targetArtifact: isLinux ? '/var/log/unattended-deploy.log' : `${state.options.logDirWin}\\deploy-session.log`,
      statusOnRun: failedAdmin ? 'error' : 'nominal',
      exitCode: failedAdmin ? 5 : 0,
      logOutput: failedAdmin
        ? [
            '[PRE-VUELO] Consultando privilegios de seguridad del proceso actual...',
            '[ERROR 5] Acceso denegado: el script se lanzó desde una sesión estándar sin elevación.',
            '[ABORTO] La secuencia se detiene preventivamente antes de tocar HKLM o Program Files.',
          ]
        : [
            '[PRE-VUELO] Token administrativo verificado correctamente.',
            state.options.checkDiskSpace
              ? '[DISCO] Espacio libre verificado: 48.4 GB disponibles (> 2.0 GB requeridos).'
              : '[LOG] Directorio de logs de auditoría inicializado.',
            state.options.waitForMsiMutex && !isLinux
              ? '[MSI] Reintento automático ante el código 1618 activado (20 intentos cada 30 s).'
              : `[LOG] Registro activo en ${isLinux ? state.options.logDirLinux : state.options.logDirWin}.`,
          ],
      didacticNote: failedAdmin
        ? 'Sin validación inicial de privilegios, un script intenta instalar paquetes y falla a mitad dejando el equipo en estado inconsistente.'
        : 'Validar permisos y espacio libre antes del primer paquete evita dejar el equipo a medio instalar.',
    });

    if (failedAdmin) {
      return steps;
    }
  }

  // Step 1..N: Packages
  state.selectedPackages.forEach((pkg, idx) => {
    const tpl = resolvePackageTemplate(pkg);
    const { executable, args } = buildWindowsPackageArgs(pkg, tpl, state.options.logDirWin);

    let status: 'nominal' | 'warning' | 'error' = 'nominal';
    let code = 0;
    let logs: string[] = [
      `[PAQUETE ${idx + 1}/${state.selectedPackages.length}] Iniciando ${tpl.name} ${tpl.version}...`,
      `[MOTOR] ${isLinux ? 'APT / Dpkg noninteractive' : tpl.engine}`,
      `[OK] Extracción y registro completados silenciosamente (Código 0).`,
    ];
    let note = tpl.didacticSummary;

    if (!isLinux && fault === SimulationFault.MSI_MUTEX_1618 && tpl.engine === InstallerEngine.MSI && idx === 0) {
      if (state.options.waitForMsiMutex) {
        status = 'nominal';
        code = 0;
        logs = [
          `[PAQUETE] Invocando msiexec.exe para ${tpl.winInstallerFile}...`,
          `[1618] Windows Installer ocupado por otra instalación (Global\\_MSIExecute). Reintento 1/20 en 30 s...`,
          `[REINTENTO 2] Motor libre. ${tpl.name} instalado con éxito (Código 0).`,
        ];
        note =
          'Mitigado: con la opción «Reintentar ante 1618» activa, el script esperó y repitió la instalación cuando Windows Installer quedó libre, en lugar de abortar.';
      } else {
        status = 'error';
        code = 1618;
        logs = [
          `[PAQUETE] Invocando msiexec.exe para ${tpl.winInstallerFile}...`,
          `[BLOQUEO] El mutex global '_MSIExecute' está ocupado por otra actualización en segundo plano.`,
          `[ERROR 1618] ERROR_INSTALL_ALREADY_RUNNING: Windows Installer solo permite una transacción activa a la vez.`,
        ];
        note =
          'El código 1618 aparece cuando otra instalación MSI tiene ocupado Windows Installer. Activa «Reintentar ante 1618» en las opciones del script para mitigarlo.';
      }
    } else if (!isLinux && fault === SimulationFault.NSIS_LOWERCASE_HANG && tpl.engine === InstallerEngine.NSIS) {
      status = 'error';
      code = 1460;
      logs = [
        `[PAQUETE] Ejecutando "${tpl.winInstallerFile}" /s (minúscula simulada)...`,
        `[CONGELADO] NSIS ignoró '/s' y abrió un cuadro de diálogo invisible en la Sesión 0 (SYSTEM).`,
        `[TIMEOUT 1460] El orquestador mató el subproceso tras agotar el tiempo máximo esperando clic humano.`,
      ];
      note =
        'En instaladores NSIS (Firefox, VLC, Notepad++), /S en mayúscula es obligatorio; /s abre la interfaz gráfica y bloquea despliegues remotos.';
    } else if (!isLinux && fault === SimulationFault.REBOOT_REQUIRED_3010 && idx === state.selectedPackages.length - 1) {
      status = 'warning';
      code = 3010;
      logs = [
        `[PAQUETE] Instalando ${tpl.name} ${tpl.version} con supresión de reinicio activo...`,
        `[ARCHIVOS EN USO] Se programó reemplazo de DLLs mediante PendingFileRenameOperations.`,
        `[AVISO 3010] ERROR_SUCCESS_REBOOT_REQUIRED: Instalación exitosa; reinicio pospuesto hasta cerrar el script.`,
      ];
      note =
        'Un buen script de automatización NUNCA trata el código 3010 como un fallo: marca una bandera interna y continúa configurando variables y perfiles.';
    }

    steps.push({
      id: `sim-pkg-${tpl.id}-${idx}`,
      phase: '01. Software',
      title: `${tpl.name} (${tpl.version})`,
      commandPreview: isLinux
        ? `DEBIAN_FRONTEND=noninteractive apt-get install -y -q ${tpl.linuxPackageName}`
        : `${executable} ${args}`,
      targetArtifact: isLinux
        ? `/usr/bin/${tpl.linuxPackageName.split(' ')[0]}`
        : tpl.detectPathWin ?? `C:\\Program Files\\${tpl.name}`,
      statusOnRun: status,
      exitCode: code,
      logOutput: logs,
      didacticNote: note,
    });
  });

  // Stop simulation early if a fatal error happened and stopOnError is enabled
  const fatalPkg = steps.find((s) => s.statusOnRun === 'error');
  if (fatalPkg && state.options.stopOnError) {
    return steps;
  }

  // Step Env Vars
  const activeEnvs = state.envVars.filter((e) => e.enabled);
  if (activeEnvs.length > 0) {
    steps.push({
      id: 'sim-env',
      phase: '02. Entorno',
      title: `Inyección de ${activeEnvs.length} variable(s) de entorno`,
      commandPreview: isLinux
        ? 'cat > /etc/profile.d/99-corp-env.sh'
        : '[Environment]::SetEnvironmentVariable(..., "Machine")',
      targetArtifact: isLinux
        ? '/etc/profile.d/99-corp-env.sh'
        : 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment',
      statusOnRun: 'nominal',
      exitCode: 0,
      logOutput: activeEnvs.map((e) =>
        e.isPathAppend
          ? `[PATH] Verificada idempotencia y anexada ruta: ${isLinux ? e.linuxValue : e.winValue}`
          : `[VAR] Persistida ${e.name}=${isLinux ? e.linuxValue : e.winValue} (${e.scope})`
      ),
      didacticNote:
        'Las variables escritas en el registro HKLM o /etc/profile.d están disponibles automáticamente para todo nuevo proceso sin truncar PATH largos.',
    });
  }

  // Step File Associations
  const activeAssocs = state.fileAssocs.filter((a) => a.enabled);
  if (activeAssocs.length > 0) {
    steps.push({
      id: 'sim-assoc',
      phase: '03. Asociaciones',
      title: `Registro de ${activeAssocs.length} extensión(es) corporativa(s)`,
      commandPreview: isLinux
        ? 'tee /etc/xdg/mimeapps.list'
        : 'assoc / ftype + dism /Import-DefaultAppAssociations',
      targetArtifact: isLinux
        ? '/etc/xdg/mimeapps.list'
        : 'HKLM\\SOFTWARE\\Classes + DefaultAppAssociations.xml',
      statusOnRun: 'nominal',
      exitCode: 0,
      logOutput: activeAssocs.map((a) =>
        isLinux
          ? `[MIME] ${a.mimeType} -> ${a.linuxDesktopEntry}`
          : `[CLASES] ${a.extension} -> ${a.progId} -> "${a.winExecutablePath}" "%1"`
      ),
      didacticNote: isLinux
        ? 'FreeDesktop consulta /etc/xdg/mimeapps.list cuando el usuario no ha definido aún una preferencia particular en ~/.config/mimeapps.list.'
        : 'En Windows 10/11, combinar ProgID con DISM /Import-DefaultAppAssociations evita el reseteo por hash criptográfico UserChoice en cuentas nuevas.',
    });
  }

  // Step Corporate Profile
  const activeProfiles = state.profileRules.filter((p) => p.enabled);
  if (activeProfiles.length > 0) {
    steps.push({
      id: 'sim-profile',
      phase: '04. Perfil Base',
      title: isLinux
        ? `Sellado de esqueleto corporativo (/etc/skel)`
        : `Montaje y sellado de C:\\Users\\Default\\NTUSER.DAT`,
      commandPreview: isLinux
        ? 'cp -r plantillas/* /etc/skel/'
        : 'reg load HKU\\DefaultCorp "C:\\Users\\Default\\NTUSER.DAT" ... reg unload',
      targetArtifact: isLinux ? '/etc/skel/.config/' : 'C:\\Users\\Default\\NTUSER.DAT',
      statusOnRun: 'nominal',
      exitCode: 0,
      logOutput: [
        isLinux
          ? '[SKEL] Copiando configuraciones predeterminadas en /etc/skel/...'
          : '[HIVE] Colmena NTUSER.DAT montada temporalmente en HKU\\DefaultCorp.',
        ...activeProfiles.map((p) => `[REGLA APLICADA] ${p.title}`),
        isLinux
          ? '[SKEL] Permisos 0644 verificados para creación futura de cuentas.'
          : '[HIVE] Recolección de handles completada y colmena HKU\\DefaultCorp descargada limpiamente.',
      ],
      didacticNote: isLinux
        ? 'Cualquier llamada posterior a useradd -m o inicio de sesión PAM mkhomedir clonará automáticamente /etc/skel en el $HOME del empleado.'
        : 'Descargar la colmena con reg unload al terminar es crítico: si queda bloqueada en memoria, ningún nuevo usuario podrá iniciar sesión en Windows.',
    });
  }

  return steps;
}
