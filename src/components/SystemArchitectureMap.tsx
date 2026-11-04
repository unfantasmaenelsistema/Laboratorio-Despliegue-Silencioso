import React, { useState } from 'react';
import { Database, FolderTree, Layers, ShieldAlert, Users } from 'lucide-react';
import { PipelineState, resolvePackageTemplate } from '../utils/scriptGenerator';

interface SystemArchitectureMapProps {
  state: PipelineState;
}

type ScopeLayer = 'machine' | 'session0' | 'default_profile';

export const SystemArchitectureMap: React.FC<SystemArchitectureMapProps> = ({
  state,
}) => {
  const [activeLayer, setActiveLayer] = useState<ScopeLayer>('default_profile');

  const activeEnvs = state.envVars.filter((e) => e.enabled);
  const activeAssocs = state.fileAssocs.filter((a) => a.enabled);
  const activeProfiles = state.profileRules.filter((p) => p.enabled);

  return (
    <section
      id="arquitectura"
      aria-labelledby="arquitectura-heading"
      className="py-12 border-t border-slate-200"
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-sky-700 mb-1.5">
              Arquitectura Interna del Sistema Operativo · Windows vs GNU/Linux
            </p>
            <h2
              id="arquitectura-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance"
            >
              Mapa de Persistencia: Registro, Sesión 0 y Perfil Predeterminado
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Comprende exactamente qué ramas del Registro de Windows (<code className="text-slate-800">HKLM</code>, <code className="text-slate-800">HKU\DefaultCorp</code>) y qué directorios POSIX (<code className="text-slate-800">/etc/profile.d</code>, <code className="text-slate-800">/etc/skel</code>) transforma tu configuración actual y por qué falla el uso ingenuo de <code className="text-slate-800">HKCU</code>.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Capas de arquitectura del sistema"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeLayer === 'default_profile'}
              onClick={() => setActiveLayer('default_profile')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeLayer === 'default_profile'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Molde Nuevos Usuarios (NTUSER.DAT / skel)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeLayer === 'machine'}
              onClick={() => setActiveLayer('machine')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeLayer === 'machine'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Nivel Máquina (HKLM / /etc)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeLayer === 'session0'}
              onClick={() => setActiveLayer('session0')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeLayer === 'session0'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Aislamiento de Sesión 0 (SYSTEM)
            </button>
          </div>
        </div>

        {activeLayer === 'default_profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                <Database className="w-4 h-4 text-sky-700 shrink-0" />
                <span>Windows: Inyección en Colmena C:\Users\Default\NTUSER.DAT</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cada vez que un empleado del dominio Active Directory o Entra ID inicia sesión por primera vez en la estación, el servicio <code className="text-slate-800">ProfSvc</code> clona la carpeta <code className="text-slate-800">C:\Users\Default</code> y su archivo oculto <code className="text-slate-800">NTUSER.DAT</code> para construir el nuevo <code className="text-slate-800">HKCU</code> del usuario.
              </p>

              <div className="bg-[#0B1120] text-slate-100 rounded-lg p-4 font-mono text-xs space-y-2 overflow-x-auto">
                <div className="text-slate-400">
                  # Ciclo de vida seguro de montaje de colmena en tu script actual:
                </div>
                <div className="text-sky-300">
                  1. reg.exe load &quot;HKU\DefaultCorpProfile&quot; &quot;C:\Users\Default\NTUSER.DAT&quot;
                </div>
                {activeProfiles.length > 0 ? (
                  activeProfiles.map((r, i) => (
                    <div key={r.id} className="text-emerald-300 pl-3">
                      2.{i + 1} [Inyectado] {r.title}
                    </div>
                  ))
                ) : (
                  <div className="text-amber-300 pl-3">
                    (Activa políticas en la pestaña 04. Perfil Base para verlas aquí)
                  </div>
                )}
                <div className="text-amber-200">
                  3. [gc]::Collect(); reg.exe unload &quot;HKU\DefaultCorpProfile&quot;
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Importante: Si olvidas ejecutar <code className="text-slate-700">reg unload</code>, el archivo <code className="text-slate-700">NTUSER.DAT</code> queda bloqueado por el kernel y los nuevos usuarios recibirán un perfil temporal corrupto.
              </p>
            </div>

            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                <FolderTree className="w-4 h-4 text-sky-700 shrink-0" />
                <span>GNU/Linux: Esqueleto /etc/skel y Base de Datos dconf</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                En distribuciones empresariales Debian, Ubuntu y RHEL, tanto <code className="text-slate-800">useradd -m</code> como el módulo PAM <code className="text-slate-800">pam_mkhomedir.so</code> (usado al autenticar contra LDAP/Active Directory con SSSD) copian recursivamente el contenido de <code className="text-slate-800">/etc/skel</code> hacia <code className="text-slate-800">/home/usuario</code>.
              </p>

              <div className="bg-[#0B1120] text-slate-100 rounded-lg p-4 font-mono text-xs space-y-1.5 overflow-x-auto">
                <div className="text-slate-400">
                  # Árbol /etc/skel generado por tu configuración actual:
                </div>
                <div className="text-sky-300">/etc/skel/</div>
                <div className="text-slate-300 pl-4">├── .bashrc (Alias y entorno de usuario)</div>
                <div className="text-emerald-300 pl-4">
                  ├── .config/Code/User/settings.json (UTF-8, LF, sin telemetría)
                </div>
                <div className="text-emerald-300 pl-4">
                  └── Escritorio/soporte-ti.desktop (Lanzador corporativo)
                </div>
                <div className="text-sky-300 pt-1">/etc/firefox/policies/</div>
                <div className="text-emerald-300 pl-4">
                  └── policies.json (DisableTelemetry, OverrideFirstRunPage)
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                <Users className="w-4 h-4 text-sky-700 shrink-0" />
                <span>
                  Resultado: Tanto en Windows como en Linux, el primer inicio de sesión del empleado tarda menos de 3 segundos y arranca con todas las herramientas listas.
                </span>
              </div>
            </div>
          </div>
        )}

        {activeLayer === 'machine' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Layers className="w-4 h-4 text-sky-700" />
                  <span>1. Binarios y Tabla Uninstall ({state.selectedPackages.length})</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Al especificar <code className="text-slate-800">ALLUSERS=1</code> o <code className="text-slate-800">InstallAllUsers=1</code>, el software se instala en <code className="text-slate-800">C:\Program Files</code> y registra su huella en <code className="text-slate-800">HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall</code>.
                </p>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11.5px] text-slate-800 space-y-1">
                  {state.selectedPackages.map((p, idx) => {
                    const tpl = resolvePackageTemplate(p);
                    return (
                      <div key={idx} className="truncate">
                        • {tpl.detectPathWin ?? `C:\\Program Files\\${tpl.name}`}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Layers className="w-4 h-4 text-sky-700" />
                  <span>2. Entorno del Sistema ({activeEnvs.length})</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  En Windows se persisten en <code className="text-slate-800">HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment</code>; en Linux mediante scripts modulares en <code className="text-slate-800">/etc/profile.d/99-corp-env.sh</code>.
                </p>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11.5px] text-slate-800 space-y-1">
                  {activeEnvs.map((e) => (
                    <div key={e.id} className="truncate">
                      • {e.name} = {e.winValue}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Layers className="w-4 h-4 text-sky-700" />
                  <span>3. Clases y Asociaciones ({activeAssocs.length})</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Los ProgID se declaran en <code className="text-slate-800">HKLM\SOFTWARE\Classes</code> y el archivo <code className="text-slate-800">DefaultAppAssociations.xml</code> se inyecta con DISM en <code className="text-slate-800">C:\Windows\System32\OEMDefaultAssociations.xml</code>.
                </p>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11.5px] text-slate-800 space-y-1">
                  {activeAssocs.map((a) => (
                    <div key={a.id} className="truncate">
                      • {a.extension} → {a.progId} ({a.mimeType})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLayer === 'session0' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Por qué los scripts que funcionan en tu escritorio fallan al desplegarse por red</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Cuando pruebas un script manualmente en tu PC, corre en la <strong>Sesión 1 (Interactiva)</strong> con tu usuario y acceso a pantalla. Sin embargo, cuando lo despliegas mediante <strong>GPO de Inicio de Equipo, Microsoft Intune, SCCM o Ansible</strong>, el agente ejecuta el script en la <strong>Sesión 0 no interactiva</strong> bajo la identidad <code className="text-slate-900">NT AUTHORITY\SYSTEM</code>:
              </p>
              <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc pl-5">
                <li>
                  <strong>Cero interfaz gráfica:</strong> Si un instalador muestra una ventana o popup porque olvidaste <code className="text-slate-800">/qn</code>, <code className="text-slate-800">/S</code> o <code className="text-slate-800">/SUPPRESSMSGBOXES</code>, nadie podrá verlo ni pulsar «Aceptar». El proceso quedará colgado hasta agotar el timeout.
                </li>
                <li>
                  <strong>Trampa de %APPDATA% y HKCU:</strong> Para la cuenta <code className="text-slate-800">SYSTEM</code>, la variable <code className="text-slate-800">%USERPROFILE%</code> apunta a <code className="text-slate-800">C:\Windows\System32\config\systemprofile</code> y <code className="text-slate-800">HKCU</code> apunta a <code className="text-slate-800">HKU\S-1-5-18</code>. Ningún usuario humano verá jamás lo que escribas ahí.
                </li>
              </ul>
            </div>

            <div className="lg:col-span-5 bg-[#0B1120] text-slate-100 rounded-xl p-4 font-mono text-xs space-y-2">
              <div className="text-slate-400 border-b border-slate-800 pb-2">
                Comparativa de Contexto de Ejecución
              </div>
              <div className="space-y-1 text-red-300">
                <div>[Contexto Sesión 0 — NT AUTHORITY\SYSTEM]</div>
                <div>WHOAMI     = nt authority\system</div>
                <div>SESSIONNAME = Services (Sesión 0 aislada)</div>
                <div>HKCU       = HKEY_USERS\S-1-5-18</div>
                <div>APPDATA    = C:\Windows\System32\config\systemprofile\AppData</div>
              </div>
              <div className="space-y-1 text-emerald-300 pt-2 border-t border-slate-800">
                <div>[Solución Aplicada por este Laboratorio]</div>
                <div>Software   -&gt; ALLUSERS=1 (C:\Program Files)</div>
                <div>Entorno    -&gt; Scope Machine (HKLM)</div>
                <div>Perfiles   -&gt; reg load HKU\DefaultCorp (C:\Users\Default)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
