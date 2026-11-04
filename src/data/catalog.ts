import {
  BinarySampleProfile,
  CommandAuditPreset,
  CorporateProfileRule,
  DiagnosticChallenge,
  EngineAnatomyExample,
  EnvScope,
  EnvVarRule,
  ExitCodeEntry,
  FileAssociationRule,
  InstallerEngine,
  ScenarioPreset,
  ScriptFormat,
  SoftwarePackageTemplate,
  UiLevel,
} from '../types/deployment';

export const SOFTWARE_CATALOG: SoftwarePackageTemplate[] = [
  {
    id: '7zip-msi',
    name: '7-Zip Archiver',
    version: '24.08 LTS',
    vendor: 'Igor Pavlov',
    category: 'Compresión y Utilidades',
    engine: InstallerEngine.MSI,
    winInstallerFile: '7z2408-x64.msi',
    linuxPackageName: 'p7zip-full',
    wingetId: '7zip.7zip',
    processNameWin: '7zFM',
    detectPathWin: 'C:\\Program Files\\7-Zip\\7z.exe',
    silentSwitchWin: '/qn',
    passiveSwitchWin: '/qb!',
    noRestartSwitchWin: '/norestart',
    allUsersSwitchWin: 'ALLUSERS=1',
    didacticSummary:
      'Paquete nativo Windows Installer (.msi). Se invoca mediante msiexec.exe /i y admite propiedades públicas en MAYÚSCULAS como INSTALLDIR o ALLUSERS=1.',
  },
  {
    id: 'vscode-inno',
    name: 'Visual Studio Code (System)',
    version: '1.95.2',
    vendor: 'Microsoft',
    category: 'Desarrollo y Edición',
    engine: InstallerEngine.INNO,
    winInstallerFile: 'VSCodeSetup-x64-1.95.2.exe',
    linuxPackageName: 'code',
    wingetId: 'Microsoft.VisualStudioCode',
    processNameWin: 'Code',
    detectPathWin: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
    silentSwitchWin: '/VERYSILENT /SUPPRESSMSGBOXES /SP-',
    passiveSwitchWin: '/SILENT /SUPPRESSMSGBOXES /SP-',
    noRestartSwitchWin: '/NORESTART',
    allUsersSwitchWin: '',
    extraPropsWin: '/MERGETASKS=!runcode,addcontextmenufiles,addtopath',
    didacticSummary:
      'Empaquetado con Inno Setup. Crucial incluir !runcode en /MERGETASKS para impedir que el instalador abra el editor bajo la cuenta SYSTEM al terminar.',
  },
  {
    id: 'firefox-esr',
    name: 'Mozilla Firefox ESR',
    version: '128.4.0esr',
    vendor: 'Mozilla Foundation',
    category: 'Navegadores Corporativos',
    engine: InstallerEngine.NSIS,
    winInstallerFile: 'Firefox_Setup_128.4.0esr_x64.exe',
    linuxPackageName: 'firefox-esr',
    wingetId: 'Mozilla.Firefox.ESR',
    processNameWin: 'firefox',
    detectPathWin: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    silentSwitchWin: '/S',
    passiveSwitchWin: '/S',
    noRestartSwitchWin: '/PreventRebootRequired=true',
    allUsersSwitchWin: '/TaskbarShortcut=false /DesktopShortcut=false',
    caseSensitiveWarning:
      'NSIS distingue mayúsculas: /S funciona; /s en minúscula se ignora y abre ventana gráfica.',
    didacticSummary:
      'Instalador NSIS clásico. Exige /S en mayúscula estricta. Permite desactivar telemetría de mantenimiento y accesos directos intrusivos.',
  },
  {
    id: 'libreoffice-msi',
    name: 'LibreOffice Enterprise',
    version: '24.8.2',
    vendor: 'The Document Foundation',
    category: 'Ofimática',
    engine: InstallerEngine.MSI,
    winInstallerFile: 'LibreOffice_24.8.2_Win_x86-64.msi',
    linuxPackageName: 'libreoffice',
    wingetId: 'TheDocumentFoundation.LibreOffice',
    processNameWin: 'soffice.bin',
    detectPathWin: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    silentSwitchWin: '/qn',
    passiveSwitchWin: '/qb!',
    noRestartSwitchWin: '/norestart REBOOT=ReallySuppress',
    allUsersSwitchWin: 'ALLUSERS=1',
    extraPropsWin: 'CREATEDESKTOPLINK=0 REGISTER_NO_MSO_TYPES=1 UI_LANGS=es',
    didacticSummary:
      'MSI empresarial con tabla Property extensa: permite elegir idiomas de interfaz (UI_LANGS=es) y evitar secuestrar asociaciones de Office si conviven.',
  },
  {
    id: 'git-inno',
    name: 'Git SCM',
    version: '2.47.0',
    vendor: 'Software Freedom Conservancy',
    category: 'Control de Versiones',
    engine: InstallerEngine.INNO,
    winInstallerFile: 'Git-2.47.0-64-bit.exe',
    linuxPackageName: 'git',
    wingetId: 'Git.Git',
    processNameWin: 'git',
    detectPathWin: 'C:\\Program Files\\Git\\cmd\\git.exe',
    silentSwitchWin: '/VERYSILENT /NOCANCEL /SP-',
    passiveSwitchWin: '/SILENT /NOCANCEL /SP-',
    noRestartSwitchWin: '/NORESTART',
    allUsersSwitchWin: '',
    extraPropsWin: '/COMPONENTS="icons,ext\\reg\\shellhere,assoc,assoc_sh"',
    didacticSummary:
      'Permite preseleccionar componentes internos con /COMPONENTS o cargando una respuesta grabada previamente con /LOADINF="git-answers.inf".',
  },
  {
    id: 'vlc-nsis',
    name: 'VLC Media Player',
    version: '3.0.21',
    vendor: 'VideoLAN',
    category: 'Multimedia',
    engine: InstallerEngine.NSIS,
    winInstallerFile: 'vlc-3.0.21-win64.exe',
    linuxPackageName: 'vlc',
    wingetId: 'VideoLAN.VLC',
    processNameWin: 'vlc',
    detectPathWin: 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    silentSwitchWin: '/L=1034 /S',
    passiveSwitchWin: '/L=1034 /S',
    noRestartSwitchWin: '',
    allUsersSwitchWin: '',
    caseSensitiveWarning:
      'En NSIS, /S debe ir siempre como el último parámetro de la línea de comandos (salvo si se usa /D=Ruta).',
    didacticSummary:
      'Ejemplo clásico de orden estricto en NSIS: el código LCID de idioma (/L=1034 para español) precede obligatoriamente al modificador final /S.',
  },
  {
    id: 'python-burn',
    name: 'Python Runtime',
    version: '3.12.7',
    vendor: 'Python Software Foundation',
    category: 'Runtimes y Lenguajes',
    engine: InstallerEngine.WIX_BURN,
    winInstallerFile: 'python-3.12.7-amd64.exe',
    linuxPackageName: 'python3 python3-pip python3-venv',
    wingetId: 'Python.Python.3.12',
    processNameWin: 'python',
    detectPathWin: 'C:\\Program Files\\Python312\\python.exe',
    silentSwitchWin: '/quiet',
    passiveSwitchWin: '/passive',
    noRestartSwitchWin: '/norestart',
    allUsersSwitchWin: 'InstallAllUsers=1',
    extraPropsWin: 'PrependPath=1 Include_test=0 CompileAll=1',
    didacticSummary:
      'Bundle WiX Burn (.exe que orquesta múltiples .msi internos). InstallAllUsers=1 lo ubica en C:\\Program Files en lugar del perfil AppData local.',
  },
  {
    id: 'acrobat-is',
    name: 'Acrobat Reader DC (MUI)',
    version: '24.004',
    vendor: 'Adobe',
    category: 'Visores Documentales',
    engine: InstallerEngine.INSTALLSHIELD,
    winInstallerFile: 'AcroRdrDC24004_MUI.exe',
    linuxPackageName: 'evince',
    wingetId: 'Adobe.Acrobat.Reader.64-bit',
    processNameWin: 'AcroRd32',
    detectPathWin: 'C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe',
    silentSwitchWin: '/sAll /rs /rps',
    passiveSwitchWin: '/sPB /rs',
    noRestartSwitchWin: '/msi /norestart',
    allUsersSwitchWin: 'ALLUSERS=1',
    extraPropsWin: 'EULA_ACCEPT=YES DISABLEDESKTOPSHORTCUT=1',
    didacticSummary:
      'Bootstrapper híbrido: parámetros previos a /msi controlan el contenedor ejecutable (/sAll silencioso total); todo lo posterior a /msi pasa a msiexec.',
  },
  {
    id: 'chrome-ent-msi',
    name: 'Google Chrome Enterprise',
    version: '130.0.6723',
    vendor: 'Google',
    category: 'Navegadores Corporativos',
    engine: InstallerEngine.MSI,
    winInstallerFile: 'googlechromestandaloneenterprise64.msi',
    linuxPackageName: 'chromium',
    wingetId: 'Google.Chrome.EXE',
    processNameWin: 'chrome',
    detectPathWin: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    silentSwitchWin: '/qn',
    passiveSwitchWin: '/qb!',
    noRestartSwitchWin: '/norestart',
    allUsersSwitchWin: 'ALLUSERS=1',
    extraPropsWin: 'NOGOOGLEUPDATEPING=1 ALLOWDOWNGRADE=1',
    didacticSummary:
      'Variante MSI empresarial que se instala en C:\\Program Files para todos los usuarios y acepta plantillas administrativas ADMX en HKLM\\SOFTWARE\\Policies\\Google\\Chrome.',
  },
  {
    id: 'notepadpp-nsis',
    name: 'Notepad++ (x64)',
    version: '8.7.1',
    vendor: 'Don Ho',
    category: 'Desarrollo y Edición',
    engine: InstallerEngine.NSIS,
    winInstallerFile: 'npp.8.7.1.Installer.x64.exe',
    linuxPackageName: 'neovim',
    wingetId: 'Notepad++.Notepad++',
    processNameWin: 'notepad++',
    detectPathWin: 'C:\\Program Files\\Notepad++\\notepad++.exe',
    silentSwitchWin: '/S',
    passiveSwitchWin: '/S',
    noRestartSwitchWin: '',
    allUsersSwitchWin: '',
    extraPropsWin: '/noUpdater',
    caseSensitiveWarning:
      'Requiere /S en mayúscula; el flag /noUpdater desactiva el actualizador automático WinGUp para entornos con control de versiones.',
    didacticSummary:
      'Instalador NSIS ligero muy utilizado en administración de sistemas. El argumento /noUpdater impide que salten avisos de actualización a usuarios sin privilegios.',
  },
  {
    id: 'nodejs-lts-msi',
    name: 'Node.js Runtime LTS',
    version: '22.11.0 LTS',
    vendor: 'OpenJS Foundation',
    category: 'Runtimes y Lenguajes',
    engine: InstallerEngine.MSI,
    winInstallerFile: 'node-v22.11.0-x64.msi',
    linuxPackageName: 'nodejs npm',
    wingetId: 'OpenJS.NodeJS.LTS',
    processNameWin: 'node',
    detectPathWin: 'C:\\Program Files\\nodejs\\node.exe',
    silentSwitchWin: '/qn',
    passiveSwitchWin: '/qb!',
    noRestartSwitchWin: '/norestart',
    allUsersSwitchWin: 'ALLUSERS=1',
    extraPropsWin: 'ADDLOCAL="NodeRuntime,npm,EnvironmentPath"',
    didacticSummary:
      'MSI que permite seleccionar qué características exactas de la tabla Feature instalar mediante ADDLOCAL (evitando instalar Chocolatey o scripts de compilación innecesarios).',
  },
  {
    id: 'wireguard-msi',
    name: 'WireGuard VPN Client',
    version: '0.5.3',
    vendor: 'WireGuard Project',
    category: 'Redes y Seguridad',
    engine: InstallerEngine.MSI,
    winInstallerFile: 'wireguard-amd64-0.5.3.msi',
    linuxPackageName: 'wireguard-tools',
    wingetId: 'WireGuard.WireGuard',
    processNameWin: 'wireguard',
    detectPathWin: 'C:\\Program Files\\WireGuard\\wireguard.exe',
    silentSwitchWin: '/qn',
    passiveSwitchWin: '/qb!',
    noRestartSwitchWin: '/norestart',
    allUsersSwitchWin: 'ALLUSERS=1',
    extraPropsWin: 'DO_NOT_LAUNCH=1',
    didacticSummary:
      'Paquete MSI de seguridad. La propiedad pública DO_NOT_LAUNCH=1 impide que la interfaz de administración de túneles se abra inmediatamente tras finalizar msiexec.',
  },
];

export const INITIAL_ENV_VARS: EnvVarRule[] = [
  {
    id: 'env-tools-path',
    name: 'PATH',
    value: 'C:\\CorpTools\\bin',
    winValue: 'C:\\CorpTools\\bin',
    linuxValue: '/opt/corptools/bin',
    scope: EnvScope.MACHINE,
    isPathAppend: true,
    description:
      'Anexa el directorio corporativo de utilidades CLI al PATH global de forma idempotente (sin duplicar entradas ni truncar a 1024 bytes).',
    enabled: true,
  },
  {
    id: 'env-java-home',
    name: 'JAVA_HOME',
    value: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21',
    winValue: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21',
    linuxValue: '/usr/lib/jvm/java-21-openjdk-amd64',
    scope: EnvScope.MACHINE,
    isPathAppend: false,
    description:
      'Define la ruta canónica del JDK corporativo para herramientas de compilación (Maven, Gradle, agentes CI y aplicaciones empresariales).',
    enabled: true,
  },
  {
    id: 'env-telemetry-optout',
    name: 'DOTNET_CLI_TELEMETRY_OPTOUT',
    value: '1',
    winValue: '1',
    linuxValue: '1',
    scope: EnvScope.MACHINE,
    isPathAppend: false,
    description:
      'Desactiva el envío automático de telemetría de diagnóstico en entornos sujetos a cumplimiento normativo (ENS / ISO 27001).',
    enabled: true,
  },
  {
    id: 'env-corp-proxy',
    name: 'HTTPS_PROXY',
    value: 'http://proxy.corp.internal:8080',
    winValue: 'http://proxy.corp.internal:8080',
    linuxValue: 'http://proxy.corp.internal:8080',
    scope: EnvScope.MACHINE,
    isPathAppend: false,
    description:
      'Configura salida HTTP/S para gestores de paquetes CLI (git, pip, npm, curl, apt) a través del proxy perimetral de la red.',
    enabled: false,
  },
  {
    id: 'env-ca-bundle',
    name: 'SSL_CERT_FILE',
    value: 'C:\\ProgramData\\CorpPKI\\ca-root-bundle.pem',
    winValue: 'C:\\ProgramData\\CorpPKI\\ca-root-bundle.pem',
    linuxValue: '/etc/ssl/certs/ca-certificates.crt',
    scope: EnvScope.MACHINE,
    isPathAppend: false,
    description:
      'Permite a runtimes multiplataforma (Python, Node, Git) confiar en la Autoridad de Certificación (PKI) interna de la organización.',
    enabled: false,
  },
  {
    id: 'env-psmodule-path',
    name: 'PSModulePath',
    value: 'C:\\Program Files\\CorpModules\\PowerShell',
    winValue: 'C:\\Program Files\\CorpModules\\PowerShell',
    linuxValue: '/usr/local/share/powershell/Modules',
    scope: EnvScope.MACHINE,
    isPathAppend: true,
    description:
      'Registra el repositorio interno de módulos de administración para que Import-Module los localice automáticamente en todas las sesiones.',
    enabled: false,
  },
];

export const INITIAL_FILE_ASSOCS: FileAssociationRule[] = [
  {
    id: 'assoc-7z',
    extension: '.7z',
    label: 'Archivo comprimido 7-Zip',
    progId: '7-Zip.7z',
    appName: '7-Zip File Manager',
    winExecutablePath: 'C:\\Program Files\\7-Zip\\7zFM.exe',
    linuxDesktopEntry: 'org.gnome.FileRoller.desktop',
    mimeType: 'application/x-7z-compressed',
    enabled: true,
  },
  {
    id: 'assoc-log',
    extension: '.log',
    label: 'Registro de auditoría / eventos',
    progId: 'VSCode.log',
    appName: 'Visual Studio Code',
    winExecutablePath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
    linuxDesktopEntry: 'code.desktop',
    mimeType: 'text/x-log',
    enabled: true,
  },
  {
    id: 'assoc-json',
    extension: '.json',
    label: 'Documento de datos JSON',
    progId: 'VSCode.json',
    appName: 'Visual Studio Code',
    winExecutablePath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
    linuxDesktopEntry: 'code.desktop',
    mimeType: 'application/json',
    enabled: true,
  },
  {
    id: 'assoc-pdf',
    extension: '.pdf',
    label: 'Documento portátil PDF',
    progId: 'AcroExch.Document.DC',
    appName: 'Visor PDF Corporativo',
    winExecutablePath: 'C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe',
    linuxDesktopEntry: 'org.gnome.Evince.desktop',
    mimeType: 'application/pdf',
    enabled: false,
  },
  {
    id: 'assoc-mp4',
    extension: '.mp4',
    label: 'Vídeo MPEG-4',
    progId: 'VLC.mp4',
    appName: 'VLC Media Player',
    winExecutablePath: 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    linuxDesktopEntry: 'vlc.desktop',
    mimeType: 'video/mp4',
    enabled: false,
  },
  {
    id: 'assoc-yml',
    extension: '.yml',
    label: 'Manifiesto YAML (Ansible / CI / K8s)',
    progId: 'VSCode.yml',
    appName: 'Visual Studio Code',
    winExecutablePath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
    linuxDesktopEntry: 'code.desktop',
    mimeType: 'application/x-yaml',
    enabled: false,
  },
];

export const INITIAL_PROFILE_RULES: CorporateProfileRule[] = [
  {
    id: 'prof-show-extensions',
    title: 'Mostrar siempre extensiones de archivo reales',
    category: 'Seguridad e Higiene Operativa',
    winMechanism:
      'Monta C:\\Users\\Default\\NTUSER.DAT en HKU\\DefaultCorp y fija Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced -> HideFileExt = 0.',
    linuxMechanism:
      'Escribe preferencia dconf/GTK en /etc/skel/.config/ para visualización detallada en gestores de archivos.',
    didacticWhy:
      'Mitiga ataques de ingeniería social con doble extensión (ej. factura_trimestral.pdf.exe). Al inyectarse en NTUSER.DAT del perfil Default, todo nuevo empleado que inicie sesión por primera vez hereda la protección.',
    enabled: true,
  },
  {
    id: 'prof-disable-firstrun',
    title: 'Suprimir asistentes de bienvenida y privacidad en primer inicio',
    category: 'Experiencia Corporativa',
    winMechanism:
      'Política HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge (HideFirstRunExperience=1) y clave CloudContent\\DisableWindowsConsumerFeatures=1.',
    linuxMechanism:
      'Preconfigura policies.json en /etc/firefox/policies/ con OverrideFirstRunPage y DisableTelemetry=true.',
    didacticWhy:
      'Evita que cada usuario nuevo pierda minutos respondiendo pantallas promocionales o importando cuentas personales en equipos corporativos.',
    enabled: true,
  },
  {
    id: 'prof-skel-editor-settings',
    title: 'Plantilla base de editor y terminal para nuevos perfiles',
    category: 'Estandarización de Entorno',
    winMechanism:
      'Copia settings.json corporativo dentro de C:\\Users\\Default\\AppData\\Roaming\\Code\\User\\settings.json (UTF-8, LF, telemetría desactivada).',
    linuxMechanism:
      'Despliega estructura en /etc/skel/.config/Code/User/settings.json y alias corporativos en /etc/skel/.bashrc.',
    didacticWhy:
      'Diferencia clave de arquitectura: escribir en %APPDATA% durante el despliegue solo afecta al Administrador o SYSTEM. Escribir en C:\\Users\\Default (o /etc/skel en Linux) actúa como molde para todas las cuentas futuras.',
    enabled: true,
  },
  {
    id: 'prof-clean-public-desktop',
    title: 'Limpiar accesos directos comerciales y crear enlace de Soporte TI',
    category: 'Escritorio Gestionado',
    winMechanism:
      'Elimina .lnk residuales creados por instaladores en C:\\Users\\Public\\Desktop y genera Portal-Soporte-TI.url.',
    linuxMechanism:
      'Configura lanzador corporativo .desktop validado en /etc/skel/Escritorio/ y /usr/share/applications/.',
    didacticWhy:
      'Muchos instaladores escriben iconos en el Escritorio Público ignorando switches secundarios; una fase post-instalación sanea el escritorio compartido.',
    enabled: false,
  },
  {
    id: 'prof-ps-execution-policy',
    title: 'Habilitar ejecución de scripts firmados (RemoteSigned) y auditoría de bloques',
    category: 'Gobierno y Auditoría',
    winMechanism:
      'Establece ExecutionPolicy RemoteSigned en ámbito LocalMachine y activa EnableScriptBlockLogging=1 en HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging.',
    linuxMechanism:
      'Configura registro de comandos administrativos mediante auditd / syslog en /etc/profile.d/90-corp-audit.sh.',
    didacticWhy:
      'Permite la ejecución de scripts de inicio de sesión internos firmados mientras registra en el Visor de Eventos (ID 4104) cualquier código PowerShell ejecutado en el puesto.',
    enabled: false,
  },
];

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'preset-dev-workstation',
    title: 'Estación Ingeniería de Software',
    targetAudience: 'Equipos Desarrollo / DevOps',
    summary:
      'Despliega 7-Zip, VS Code, Git, Node.js LTS y Python 3.12 sin interfaz, configura JAVA_HOME + PATH seguro, asocia .log/.json/.yml y prepara plantilla en Default User.',
    recommendedFormat: ScriptFormat.POWERSHELL,
    packages: [
      { packageId: '7zip-msi', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '' },
      { packageId: 'vscode-inno', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '/MERGETASKS=!runcode,addcontextmenufiles,addtopath' },
      { packageId: 'git-inno', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '' },
      { packageId: 'nodejs-lts-msi', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: 'ADDLOCAL="NodeRuntime,npm,EnvironmentPath"' },
      { packageId: 'python-burn', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: 'PrependPath=1 Include_test=0' },
    ],
    enabledEnvIds: ['env-tools-path', 'env-java-home', 'env-telemetry-optout'],
    enabledAssocIds: ['assoc-7z', 'assoc-log', 'assoc-json', 'assoc-yml'],
    enabledProfileIds: ['prof-show-extensions', 'prof-disable-firstrun', 'prof-skel-editor-settings'],
  },
  {
    id: 'preset-classroom-lab',
    title: 'Aula Informática / FP Ciclos',
    targetAudience: 'Laboratorios SMR · ASIR · DAW',
    summary:
      'Script clásico en Batch (.bat) o PowerShell listo para clonar aulas: navegadores ESR, Notepad++, LibreOffice, VLC en español y perfil limpio para alumnado.',
    recommendedFormat: ScriptFormat.BATCH,
    packages: [
      { packageId: '7zip-msi', uiLevel: UiLevel.PASSIVE, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '' },
      { packageId: 'firefox-esr', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: false, extraArgs: '' },
      { packageId: 'notepadpp-nsis', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: false, extraArgs: '/noUpdater' },
      { packageId: 'libreoffice-msi', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: 'CREATEDESKTOPLINK=0 UI_LANGS=es' },
      { packageId: 'vlc-nsis', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: false, extraArgs: '' },
    ],
    enabledEnvIds: ['env-tools-path', 'env-telemetry-optout'],
    enabledAssocIds: ['assoc-7z', 'assoc-mp4'],
    enabledProfileIds: ['prof-show-extensions', 'prof-disable-firstrun', 'prof-clean-public-desktop'],
  },
  {
    id: 'preset-linux-corporate',
    title: 'Puesto Corporativo GNU/Linux',
    targetAudience: 'Debian / Ubuntu LTS Empresarial',
    summary:
      'Automatización Bash idempotente con DEBIAN_FRONTEND=noninteractive, variables en /etc/profile.d/, MIME xdg-mime y molde de usuario en /etc/skel.',
    recommendedFormat: ScriptFormat.BASH,
    packages: [
      { packageId: '7zip-msi', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '' },
      { packageId: 'vscode-inno', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '' },
      { packageId: 'git-inno', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '' },
      { packageId: 'firefox-esr', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: false, extraArgs: '' },
      { packageId: 'wireguard-msi', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: '' },
    ],
    enabledEnvIds: ['env-tools-path', 'env-java-home', 'env-ca-bundle'],
    enabledAssocIds: ['assoc-7z', 'assoc-log', 'assoc-json', 'assoc-pdf'],
    enabledProfileIds: ['prof-show-extensions', 'prof-disable-firstrun', 'prof-skel-editor-settings'],
  },
  {
    id: 'preset-office-kiosk',
    title: 'Puesto Administrativo Ofimático',
    targetAudience: 'Administración y Atención al Usuario',
    summary:
      'Instalación desatendida de Chrome Enterprise, visor PDF corporativo, suite ofimática, proxy perimetral, asociaciones XML para DISM y bloqueo de pantallas de primer uso.',
    recommendedFormat: ScriptFormat.POWERSHELL,
    packages: [
      { packageId: 'chrome-ent-msi', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: 'NOGOOGLEUPDATEPING=1' },
      { packageId: 'libreoffice-msi', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: 'CREATEDESKTOPLINK=0 UI_LANGS=es' },
      { packageId: 'acrobat-is', uiLevel: UiLevel.SILENT, suppressReboot: true, allUsers: true, enableLog: true, extraArgs: 'EULA_ACCEPT=YES DISABLEDESKTOPSHORTCUT=1' },
    ],
    enabledEnvIds: ['env-corp-proxy', 'env-ca-bundle', 'env-telemetry-optout'],
    enabledAssocIds: ['assoc-pdf', 'assoc-7z'],
    enabledProfileIds: ['prof-show-extensions', 'prof-disable-firstrun', 'prof-clean-public-desktop'],
  },
];

export const BINARY_INSPECTOR_SAMPLES: BinarySampleProfile[] = [
  {
    id: 'sample-inno-vscode',
    fileName: 'VSCodeSetup-x64-1.95.2.exe',
    fileSizeDesc: '94.8 MB · PE32+ executable (GUI) x86-64',
    detectedEngine: InstallerEngine.INNO,
    magicBytesHex: '4D 5A 90 00 03 00 00 00 ... 49 6E 6E 6F 20 53 65 74 75 70',
    signatureStrings: [
      'Inno Setup Setup Data (6.3.3) (u)',
      'Inno Setup Messages (6.0.0) (u)',
      'JR.Inno.Setup',
      '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART',
    ],
    recommendedSilentCmd:
      '"VSCodeSetup-x64-1.95.2.exe" /VERYSILENT /SUPPRESSMSGBOXES /SP- /NORESTART /MERGETASKS=!runcode,addtopath /LOG="C:\\Logs\\vscode.log"',
    unpackCommand: 'innounp.exe -x -d"C:\\Temp\\Unpacked" "VSCodeSetup-x64-1.95.2.exe"',
    forensicExplanation:
      'El recurso de manifiesto XML y la tabla de datos al final del binario PE contienen la cadena literal "Inno Setup Setup Data". Acepta /SAVEINF="respuestas.inf" para grabar selecciones interactivas y reproducirlas con /LOADINF.',
    catalogPackageId: 'vscode-inno',
  },
  {
    id: 'sample-nsis-firefox',
    fileName: 'Firefox_Setup_128.4.0esr_x64.exe',
    fileSizeDesc: '61.2 MB · PE32+ Nullsoft Self-Extractor',
    detectedEngine: InstallerEngine.NSIS,
    magicBytesHex: '4D 5A 90 00 03 00 00 00 ... 4E 75 6C 6C 73 6F 66 74 49 6E 73 74',
    signatureStrings: [
      'Nullsoft.NSIS.exehead',
      'NullsoftInst',
      'NSIS Error: Installer integrity check has failed',
    ],
    recommendedSilentCmd:
      '"Firefox_Setup_128.4.0esr_x64.exe" /S /PreventRebootRequired=true /TaskbarShortcut=false',
    unpackCommand: '7z.exe x "Firefox_Setup_128.4.0esr_x64.exe" -o"C:\\Temp\\FirefoxExtracted"',
    forensicExplanation:
      'La firma "NullsoftInst" tras el stub de descompresión confirma un instalador NSIS. Recuerda que /S debe escribirse obligatoriamente en MAYÚSCULA y que si usas /D=Ruta debe ser el último parámetro sin comillas.',
    catalogPackageId: 'firefox-esr',
  },
  {
    id: 'sample-msi-7zip',
    fileName: '7z2408-x64.msi',
    fileSizeDesc: '1.9 MB · Composite Document File V2 (OLE2 / MSI)',
    detectedEngine: InstallerEngine.MSI,
    magicBytesHex: 'D0 CF 11 E0 A1 B1 1A E1 00 00 00 00 00 00 00 00',
    signatureStrings: [
      'Windows Installer XML Toolset',
      'Property Table: ProductCode, UpgradeCode, ALLUSERS',
      'CustomAction Table / InstallExecuteSequence',
    ],
    recommendedSilentCmd:
      'msiexec.exe /i "7z2408-x64.msi" /qn /norestart ALLUSERS=1 /L*v "C:\\Logs\\7zip.log"',
    unpackCommand: 'msiexec.exe /a "7z2408-x64.msi" /qb TARGETDIR="C:\\Temp\\AdminExtract"',
    forensicExplanation:
      'Los primeros 8 bytes D0 CF 11 E0 A1 B1 1A E1 identifican un archivo Compound File Binary de Microsoft (base de datos relacional COM estructurada). Se inspecciona con Orca o SuperOrca para ver la tabla Property.',
    catalogPackageId: '7zip-msi',
  },
  {
    id: 'sample-burn-python',
    fileName: 'python-3.12.7-amd64.exe',
    fileSizeDesc: '25.4 MB · WiX Burn Bootstrapper Bundle',
    detectedEngine: InstallerEngine.WIX_BURN,
    magicBytesHex: '4D 5A 90 00 03 00 00 00 ... 2E 77 69 78 62 75 72 6E',
    signatureStrings: [
      '.wixburn',
      'WixBurnManifest',
      'Burn v3.14.0.8606, Windows v10.0',
      'InstallAllUsers=1 PrependPath=1',
    ],
    recommendedSilentCmd:
      '"python-3.12.7-amd64.exe" /quiet /norestart InstallAllUsers=1 PrependPath=1 Include_test=0 /log "C:\\Logs\\python312.log"',
    unpackCommand: 'dark.exe -x "C:\\Temp\\BurnUnpacked" "python-3.12.7-amd64.exe"',
    forensicExplanation:
      'Contiene la sección PE ".wixburn" que aloja una cadena de paquetes MSI internos (core.msi, pip.msi, tcltk.msi). En lugar de /qn utiliza /quiet o /passive y expone variables Burn como InstallAllUsers=1.',
    catalogPackageId: 'python-burn',
  },
  {
    id: 'sample-is-acrobat',
    fileName: 'AcroRdrDC24004_MUI.exe',
    fileSizeDesc: '312.0 MB · InstallShield / Adobe Setup Bootstrapper',
    detectedEngine: InstallerEngine.INSTALLSHIELD,
    magicBytesHex: '4D 5A 90 00 03 00 00 00 ... 49 6E 73 74 61 6C 6C 53 68 69 65 6C 64',
    signatureStrings: [
      'InstallShield Setup Player',
      'setup.ini / AcroRead.msi',
      '/sAll /rs /rps /msi',
    ],
    recommendedSilentCmd:
      '"AcroRdrDC24004_MUI.exe" /sAll /rs /rps /msi /norestart ALLUSERS=1 EULA_ACCEPT=YES',
    unpackCommand: '"AcroRdrDC24004_MUI.exe" -nos_o"C:\\Temp\\AdobeExtract" -nos_ne',
    forensicExplanation:
      'Empaquetador corporativo con MSI embebido. Permite extraer el .msi subyacente y el archivo setup.ini con el flag -nos_ne para aplicar transformaciones .mst personalizadas con Adobe Customization Wizard.',
    catalogPackageId: 'acrobat-is',
  },
];

export const COMMAND_AUDIT_PRESETS: CommandAuditPreset[] = [
  {
    id: 'audit-nsis-traps',
    label: 'Trampa NSIS: /s minúscula + /D con comillas',
    command: 'start "" /wait "vlc-3.0.21-win64.exe" /s /D="C:\\Program Files\\VideoLAN\\VLC" /L=1034',
  },
  {
    id: 'audit-msi-private',
    label: 'Error MSI: propiedades en minúscula y sin /norestart',
    command: 'msiexec.exe /i C:\\Deploy\\Paquetes Corporativos\\LibreOffice.msi /qn allusers=1 createdesktoplink=0',
  },
  {
    id: 'audit-setx-path',
    label: 'Destrucción de PATH: setx /M con %PATH%',
    command: 'setx /M PATH "%PATH%;C:\\CorpTools\\bin"',
  },
  {
    id: 'audit-inno-runcode',
    label: 'Inno Setup en Sesión 0 sin suprimir msgboxes',
    command: 'Start-Process -FilePath "VSCodeSetup-x64.exe" -ArgumentList "/SILENT"',
  },
  {
    id: 'audit-linux-apt',
    label: 'APT en script Bash sin modo no interactivo',
    command: 'apt install vim git curl',
  },
];

export const ENGINE_ANATOMY_EXAMPLES: EngineAnatomyExample[] = [
  {
    id: 'anat-msi',
    engineName: 'Windows Installer (MSI)',
    detectionHint: 'Extensión .msi o cabeceras Compound File Binary (D0 CF 11 E0); ejecuta msiexec.exe /? para ver sintaxis.',
    platform: 'Windows',
    tokens: [
      {
        id: 't1',
        token: 'msiexec.exe',
        role: 'Motor del sistema',
        explanation:
          'Ejecutable nativo de Windows responsable de procesar bases de datos relacionales de instalación (.msi) y parches (.msp) de forma transaccional (con rollback automático ante fallos).',
      },
      {
        id: 't2',
        token: '/i "LibreOffice_x64.msi"',
        role: 'Operación de instalación',
        explanation:
          '/i indica instalar o configurar un producto. Alternativas clave: /x desinstala (acepta ruta .msi o GUID {XXXX-...}), /p aplica un parche .msp y /a realiza extracción administrativa.',
        pitfall: 'Envuelve siempre la ruta entre comillas dobles por si el directorio contiene espacios.',
      },
      {
        id: 't3',
        token: '/qn',
        role: 'Nivel de Interfaz (UI Level)',
        explanation:
          'Quiet None: suprime el 100 % de ventanas y cuadros de diálogo. Otras variantes: /qb! (barra de progreso sin botón Cancelar), /qr (UI reducida), /qf (UI completa).',
        pitfall: 'Si el paquete pide confirmación y usas /qn sin aceptar propiedades requeridas, abortará silenciosamente con código 1603.',
      },
      {
        id: 't4',
        token: '/norestart',
        role: 'Control de reinicio',
        explanation:
          'Impide que msiexec reinicie el equipo de forma abrupta en mitad de una secuencia de varios paquetes. Devolverá el código 3010 indicando que el reinicio queda pendiente.',
      },
      {
        id: 't5',
        token: '/L*v "C:\\Logs\\app.log"',
        role: 'Auditoría detallada (Verbose Log)',
        explanation:
          'Registra cada acción estándar, propiedad evaluada y error interno. Indispensable para diagnosticar errores 1603 buscando la cadena "Return value 3" en el fichero.',
      },
      {
        id: 't6',
        token: 'ALLUSERS=1 CREATEDESKTOPLINK=0',
        role: 'Propiedades Públicas MSI',
        explanation:
          'Pares PROPIEDAD=VALOR al final del comando. En el estándar MSI, únicamente las propiedades escritas íntegramente en MAYÚSCULAS pueden modificarse desde la línea de comandos.',
        pitfall: 'Escribir allusers=1 en minúsculas es ignorado porque MSI las trata como propiedades privadas internas.',
      },
    ],
  },
  {
    id: 'anat-inno',
    engineName: 'Inno Setup (.exe)',
    detectionHint: 'En detalles del .exe o abriéndolo con 7-Zip/strings aparece "Inno Setup Setup Data". Acepta /? en consola.',
    platform: 'Windows',
    tokens: [
      {
        id: 'i1',
        token: '"VSCodeSetup-x64.exe"',
        role: 'Ejecutable empaquetado',
        explanation:
          'Instalador compilado con Inno Setup. Cuando se lanza desde Batch (.bat) conviene precederlo de start "" /wait para evitar que CMD continúe antes de que finalice el subproceso.',
      },
      {
        id: 'i2',
        token: '/VERYSILENT',
        role: 'Ocultación total',
        explanation:
          'A diferencia de /SILENT (que oculta el asistente pero muestra la ventana de progreso), /VERYSILENT oculta también la barra de progreso.',
      },
      {
        id: 'i3',
        token: '/SUPPRESSMSGBOXES /SP-',
        role: 'Supresión de diálogos modales',
        explanation:
          '/SP- desactiva el aviso inicial "¿Desea continuar con la instalación?" y /SUPPRESSMSGBOXES responde automáticamente con la opción predeterminada ante advertencias.',
        pitfall: 'Sin /SUPPRESSMSGBOXES, un aviso menor bloquea indefinidamente despliegues lanzados como cuenta SYSTEM sin sesión gráfica visible.',
      },
      {
        id: 'i4',
        token: '/NORESTART',
        role: 'Bloqueo de reinicio',
        explanation:
          'Evita reiniciar el sistema operativo aunque el instalador reemplace librerías compartidas en uso.',
      },
      {
        id: 'i5',
        token: '/MERGETASKS=!runcode,addtopath',
        role: 'Tareas adicionales selectivas',
        explanation:
          'Activa tareas opcionales del asistente (addtopath) y niega explícitamente otras precediéndolas con signo de exclamación (!runcode evita ejecutar la app al terminar).',
      },
      {
        id: 'i6',
        token: '/LOG="C:\\Logs\\vscode.log"',
        role: 'Trazabilidad Inno Setup',
        explanation:
          'Genera un registro detallado de extracción de ficheros, claves de registro creadas y tareas ejecutadas.',
      },
    ],
  },
  {
    id: 'anat-nsis',
    engineName: 'NSIS — Nullsoft Scriptable Install System',
    detectionHint: 'Usado por VLC, Firefox, Notepad++, 7-Zip (.exe). En recursos binarios figura "NullsoftInst".',
    platform: 'Windows',
    tokens: [
      {
        id: 'n1',
        token: '"vlc-3.0.21-win64.exe"',
        role: 'Instalador NSIS',
        explanation:
          'Binario autoextraíble ligero muy común en software libre para Windows.',
      },
      {
        id: 'n2',
        token: '/L=1034',
        role: 'Identificador de idioma (LCID)',
        explanation:
          'Selecciona el idioma decimal de Windows (1034 = Español tradicional/internacional, 1033 = Inglés EE. UU.) antes de ejecutar en segundo plano.',
      },
      {
        id: 'n3',
        token: '/S',
        role: 'Modo Silencioso (Sensible a mayúsculas)',
        explanation:
          'Activa ejecución silenciosa en NSIS.',
        pitfall: '¡Trampa crítica! Debe ser /S en MAYÚSCULA. Si escribes /s, NSIS lo descarta y abre el asistente gráfico.',
      },
      {
        id: 'n4',
        token: '/D=C:\\Apps\\VideoLAN\\VLC',
        role: 'Directorio destino (Sin comillas y al final)',
        explanation:
          'Sobrescribe la ruta de instalación predeterminada ($INSTDIR).',
        pitfall: 'Peculiaridad histórica de NSIS: /D= debe ser obligatoriamente el ÚLTIMO parámetro de toda la línea y NO debe llevar comillas ni siquiera cuando la ruta contiene espacios.',
      },
    ],
  },
  {
    id: 'anat-linux',
    engineName: 'APT / Dpkg Desatendido (Debian / Ubuntu)',
    detectionHint: 'Paquetes .deb y repositorios APT gestionados mediante scripts de aprovisionamiento o cloud-init.',
    platform: 'GNU/Linux',
    tokens: [
      {
        id: 'l1',
        token: 'DEBIAN_FRONTEND=noninteractive',
        role: 'Supresión de prompts Debconf',
        explanation:
          'Indica a debconf que jamás abra diálogos ncurses/whiptail pidiendo respuestas interactivas (como zona horaria o contraseñas de servicio).',
      },
      {
        id: 'l2',
        token: 'apt-get install -y -q',
        role: 'Confirmación automática y salida limpia',
        explanation:
          'apt-get mantiene interfaz estable para scripts (a diferencia de apt pensado para uso humano interactivo). -y asume Sí y -q reduce barras de progreso ruidosas.',
      },
      {
        id: 'l3',
        token: '-o Dpkg::Options::="--force-confdef"',
        role: 'Resolución segura de ficheros /etc',
        explanation:
          'Si un paquete actualiza un archivo de configuración modificado, elige automáticamente la acción segura por defecto del mantenedor sin detener el script.',
      },
      {
        id: 'l4',
        token: '-o Dpkg::Options::="--force-confold"',
        role: 'Preservación de configuración corporativa',
        explanation:
          'Complementa a confdef: conserva la configuración existente ya personalizada en el servidor o estación en lugar de sobrescribirla.',
      },
    ],
  },
];

export const EXIT_CODES_REFERENCE: ExitCodeEntry[] = [
  {
    code: 0,
    symbolicName: 'ERROR_SUCCESS',
    severity: 'nominal',
    meaning: 'La instalación finalizó íntegramente sin errores ni reinicios pendientes.',
    automationAction: 'Continuar con el siguiente paquete de la cola de despliegue.',
  },
  {
    code: 3010,
    symbolicName: 'ERROR_SUCCESS_REBOOT_REQUIRED',
    severity: 'warning',
    meaning: 'Instalación correcta, pero existen librerías o drivers que se sustituirán en el próximo reinicio.',
    automationAction: 'Tratar como ÉXITO (no abortar el script) y programar reinicio controlado al finalizar toda la secuencia.',
  },
  {
    code: 1641,
    symbolicName: 'ERROR_SUCCESS_REBOOT_INITIATED',
    severity: 'warning',
    meaning: 'Instalación correcta y el instalador acaba de ordenar el reinicio inmediato del sistema.',
    automationAction: 'Prevenir siempre añadiendo /norestart o REBOOT=ReallySuppress para no cortar paquetes posteriores.',
  },
  {
    code: 1618,
    symbolicName: 'ERROR_INSTALL_ALREADY_RUNNING',
    severity: 'error',
    meaning: 'Otra transacción de msiexec está activa simultáneamente (bloqueo del mutex global _MSIExecute).',
    automationAction: 'Implementar bucle de espera/reintento verificando el mutex Global\\_MSIExecute antes de invocar msiexec.',
  },
  {
    code: 1603,
    symbolicName: 'ERROR_INSTALL_FAILURE',
    severity: 'error',
    meaning: 'Error fatal genérico en una acción interna (falta prerrequisito, permisos insuficientes o Custom Action fallida).',
    automationAction: 'Revisar el archivo generado por /L*v y buscar hacia arriba desde "Return value 3".',
  },
  {
    code: 1602,
    symbolicName: 'ERROR_INSTALL_USEREXIT',
    severity: 'error',
    meaning: 'Un usuario o proceso canceló manualmente el asistente de instalación.',
    automationAction: 'Usar /qn o /qb! (con signo ! para ocultar el botón Cancelar).',
  },
];

export const DIAGNOSTIC_CHALLENGES: DiagnosticChallenge[] = [
  {
    id: 'chal-setx-path',
    title: 'Caso 01: Corrupción del PATH del sistema en script Batch',
    context:
      'Tras ejecutar este .bat de despliegue en estaciones con Visual Studio, Docker y SDKs instalados, varios comandos del sistema dejaron de funcionar en consolas nuevas.',
    brokenSnippet: `@echo off\nREM Añadir carpeta de utilidades corporativas al PATH del sistema\nsetx /M PATH "%PATH%;C:\\CorpTools\\bin"`,
    language: 'Batch CMD (.bat)',
    options: [
      {
        id: 'opt-a',
        label: 'Falta ejecutar gpupdate /force justo después de setx.',
        isCorrect: false,
        explanation: 'gpupdate actualiza directivas de grupo (GPO), pero no resuelve los dos fallos estructurales de ese comando setx.',
      },
      {
        id: 'opt-b',
        label: 'setx trunca variables a 1024 caracteres y además %PATH% mezcla el PATH de usuario con el de máquina.',
        isCorrect: true,
        explanation:
          'Exacto. %PATH% contiene la concatenación de Sistema + Usuario actual, contaminando el registro HKLM, y setx corta cualquier cadena que supere 1024 caracteres destruyendo rutas previas.',
      },
      {
        id: 'opt-c',
        label: 'En Windows las rutas dentro de PATH deben separarse con dos puntos (:) y no punto y coma (;).',
        isCorrect: false,
        explanation: 'Dos puntos (:) es el separador de PATH en sistemas POSIX/Linux; Windows utiliza punto y coma (;).',
      },
    ],
    fixedSnippet: `powershell -NoProfile -Command "$p=[Environment]::GetEnvironmentVariable('Path','Machine'); if($p -notlike '*C:\\CorpTools\\bin*'){ [Environment]::SetEnvironmentVariable('Path', $p.TrimEnd(';')+';C:\\CorpTools\\bin', 'Machine') }"`,
  },
  {
    id: 'chal-hkcu-system',
    title: 'Caso 02: Preferencias de usuario que nunca llegan a los empleados',
    context:
      'Lanzas el script mediante Intune / GPO de Inicio de Equipo (cuenta NT AUTHORITY\\SYSTEM). El script termina con código 0, pero cuando Ana inicia sesión en el PC sigue viendo las extensiones de archivo ocultas.',
    brokenSnippet: `# Mostrar extensiones de archivo para todos los empleados\nSet-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "HideFileExt" -Value 0`,
    language: 'PowerShell (.ps1)',
    options: [
      {
        id: 'opt-a',
        label: 'HKCU apunta únicamente a la colmena del usuario que ejecuta el script (SYSTEM), no al perfil Default ni a los usuarios.',
        isCorrect: true,
        explanation:
          'Correcto. Durante un despliegue desatendido como SYSTEM o Administrador local, HKCU modifica el perfil de esa cuenta técnica. Para nuevos usuarios corporativos debes montar C:\\Users\\Default\\NTUSER.DAT.',
      },
      {
        id: 'opt-b',
        label: 'El valor 0 oculta las extensiones y debería ser 1.',
        isCorrect: false,
        explanation: 'La propiedad se llama HideFileExt ("Ocultar extensiones"): 0 significa NO ocultarlas (mostrarlas), mientras que 1 las oculta.',
      },
      {
        id: 'opt-c',
        label: 'PowerShell no tiene permiso de escritura sobre el registro de Windows.',
        isCorrect: false,
        explanation: 'PowerShell dispone del proveedor nativo Registry (HKLM: y HKCU:) con plenos permisos cuando corre elevado.',
      },
    ],
    fixedSnippet: `reg.exe load "HKU\\DefaultCorp" "C:\\Users\\Default\\NTUSER.DAT"\nreg.exe add "HKU\\DefaultCorp\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideFileExt /t REG_DWORD /d 0 /f\n[gc]::Collect()\nreg.exe unload "HKU\\DefaultCorp"`,
  },
  {
    id: 'chal-nsis-hang',
    title: 'Caso 03: Despliegue congelado indefinidamente sin mensaje de error',
    context:
      'Tu script ejecuta la instalación desatendida de Firefox ESR y VLC en segundo plano (Sesión 0). El proceso nunca termina hasta saltar el timeout de 60 minutos.',
    brokenSnippet: `Start-Process -FilePath "C:\\Installers\\vlc-3.0.21-win64.exe" -ArgumentList "/s /L=1034" -Wait`,
    language: 'PowerShell (.ps1)',
    options: [
      {
        id: 'opt-a',
        label: 'Start-Process no soporta archivos .exe y requiere cmd /c.',
        isCorrect: false,
        explanation: 'Start-Process lanza ejecutables .exe de forma nativa y controla su ciclo de vida con -Wait y -PassThru.',
      },
      {
        id: 'opt-b',
        label: 'En instaladores NSIS el switch /S distingue mayúsculas y debe situarse al final tras /L=1034.',
        isCorrect: true,
        explanation:
          'Exacto. Al pasar /s en minúscula, NSIS ignora el modo silencioso y dibuja un asistente gráfico invisible en la Sesión 0 esperando un clic humano que jamás ocurrirá.',
      },
      {
        id: 'opt-c',
        label: 'El código de idioma 1034 no existe en Windows.',
        isCorrect: false,
        explanation: '1034 es un LCID válido de Windows para español.',
      },
    ],
    fixedSnippet: `$proc = Start-Process -FilePath "C:\\Installers\\vlc-3.0.21-win64.exe" -ArgumentList "/L=1034 /S" -Wait -PassThru\nif ($proc.ExitCode -ne 0) { throw "Error VLC: $($proc.ExitCode)" }`,
  },
  {
    id: 'chal-crlf-bash',
    title: 'Caso 04: Script de aprovisionamiento Linux falla en la línea 1',
    context:
      'Editas tu script deploy.sh en un equipo Windows, lo copias al servidor Ubuntu y al ejecutarlo como root obtienes: /bin/bash^M: bad interpreter: No such file or directory.',
    brokenSnippet: `#!/bin/bash\r\nset -euo pipefail\r\nDEBIAN_FRONTEND=noninteractive apt-get install -y vim`,
    language: 'Shell Linux (.sh)',
    options: [
      {
        id: 'opt-a',
        label: 'Ubuntu no incluye /bin/bash por defecto.',
        isCorrect: false,
        explanation: 'Ubuntu incluye /bin/bash de serie; el problema está en el carácter invisible pegado al final de la ruta.',
      },
      {
        id: 'opt-b',
        label: 'Saltos de línea CRLF (\\r\\n) de Windows hacen que el kernel busque un binario llamado "/bin/bash\\r".',
        isCorrect: true,
        explanation:
          'Correcto. En sistemas UNIX el delimitador de línea es únicamente LF (\\n). El retorno de carro \\r (^M) se interpreta como parte literal del nombre del intérprete en el shebang #!.',
      },
      {
        id: 'opt-c',
        label: 'DEBIAN_FRONTEND debe exportarse en otro archivo distinto.',
        isCorrect: false,
        explanation: 'Pasar DEBIAN_FRONTEND=noninteractive en línea delante del comando es totalmente válido en POSIX/Bash.',
      },
    ],
    fixedSnippet: `# Guardar siempre con finales de línea LF (\\n) o sanear con:\nsed -i 's/\\r$//' deploy.sh && chmod +x deploy.sh`,
  },
  {
    id: 'chal-msi-mutex-1618',
    title: 'Caso 05: Fallo aleatorio con código 1618 en el primer paquete tras encender el PC',
    context:
      'Tu script de inicio de equipo instala tres paquetes MSI seguidos. En el 30 % de los ordenadores falla el primero con ExitCode 1618, pero al lanzarlo a mano media hora después funciona.',
    brokenSnippet: `msiexec.exe /i "C:\\Deploy\\7z2408-x64.msi" /qn /norestart\nif %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%`,
    language: 'Windows Installer (.bat / .ps1)',
    options: [
      {
        id: 'opt-a',
        label: 'El archivo .msi está corrupto en el servidor SMB.',
        isCorrect: false,
        explanation: 'Un paquete corrupto devolvería error 1620 (ERROR_INSTALL_PACKAGE_INVALID) siempre, no 1618 de forma intermitente.',
      },
      {
        id: 'opt-b',
        label: 'Otro proceso msiexec.exe (ej. Windows Update o agente MDM) tiene bloqueado el mutex Global\\_MSIExecute en el arranque.',
        isCorrect: true,
        explanation:
          'Exacto. El motor Windows Installer solo admite una transacción ExecuteSequence a la vez en todo el sistema operativo. Esperar a que se libere Global\\_MSIExecute evita el error 1618.',
      },
      {
        id: 'opt-c',
        label: '7-Zip requiere reiniciar el ordenador antes de instalarse.',
        isCorrect: false,
        explanation: '7-Zip no exige reinicio previo; el código 1618 significa explícitamente ERROR_INSTALL_ALREADY_RUNNING.',
      },
    ],
    fixedSnippet: `$mutex = [System.Threading.Mutex]::OpenExisting("Global\\_MSIExecute")\n# Esperar hasta que cualquier otra instalación en curso libere el motor MSI`,
  },
  {
    id: 'chal-userchoice-hash',
    title: 'Caso 06: Windows 10/11 restablece el navegador o visor PDF y muestra notificación de bloqueo',
    context:
      'En tu script intentas forzar el visor PDF de cada usuario escribiendo directamente el ProgId dentro de HKCU\\...\\FileExts\\.pdf\\UserChoice, pero al abrir un PDF Windows muestra "Una aplicación causó un problema y se restableció el valor predeterminado".',
    brokenSnippet: `reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.pdf\\UserChoice" /v ProgId /t REG_SZ /d "AcroExch.Document.DC" /f`,
    language: 'Registro de Windows (File Associations)',
    options: [
      {
        id: 'opt-a',
        label: 'Desde Windows 8/10/11 la subclave UserChoice está protegida por un Hash criptográfico de usuario; para automatizar asociaciones debe usarse DISM /Import-DefaultAppAssociations con XML.',
        isCorrect: true,
        explanation:
          'Correcto. Microsoft introdujo el valor Hash en UserChoice para impedir que malware secuestre asociaciones desde el registro. La vía oficial corporativa es importar un fichero DefaultAppAssociations.xml mediante DISM o GPO.',
      },
      {
        id: 'opt-b',
        label: 'Falta reiniciar el proceso explorer.exe tras el comando reg add.',
        isCorrect: false,
        explanation: 'Reiniciar explorer.exe no genera el Hash criptográfico válido; al detectar discrepancia entre ProgId y Hash, el shell resetea la asociación.',
      },
      {
        id: 'opt-c',
        label: 'La extensión .pdf debe escribirse en mayúsculas (.PDF) en el Registro.',
        isCorrect: false,
        explanation: 'Las claves del registro de Windows no distinguen mayúsculas y las extensiones se registran en minúsculas (.pdf).',
      },
    ],
    fixedSnippet: `dism.exe /Online /Import-DefaultAppAssociations:"C:\\Deploy\\DefaultAppAssociations.xml"`,
  },
];
