// TurnoFlash — shared atoms (icons, badge, sidebar, navbar). Loads after React + tf-data.js.
const TF = window.TF;

// ───── Icons (Lucide-style stroke 1.75) ─────
const Ico = {};
const mkIcon = (path) => function Icon({ size = 18, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {path}
    </svg>
  );
};
Ico.Home     = mkIcon(<><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></>);
Ico.Calendar = mkIcon(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>);
Ico.Users    = mkIcon(<><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15 14a4 4 0 0 1 6 4"/></>);
Ico.Package  = mkIcon(<><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>);
Ico.UserCog  = mkIcon(<><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="18" cy="13" r="2.5"/><path d="M18 8.5v1M18 16.5v1M22.3 11.5l-.9.5M14.6 14.5l-.9.5M22.3 14.5l-.9-.5M14.6 11.5l-.9-.5"/></>);
Ico.Bell     = mkIcon(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 21a2 2 0 0 0 4 0"/></>);
Ico.Building = mkIcon(<><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></>);
Ico.UserPlus = mkIcon(<><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M19 8v6M16 11h6"/></>);
Ico.LogOut   = mkIcon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>);
Ico.Sun      = mkIcon(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>);
Ico.Moon     = mkIcon(<path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z"/>);
Ico.Search   = mkIcon(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>);
Ico.Plus     = mkIcon(<><path d="M12 5v14M5 12h14"/></>);
Ico.Filter   = mkIcon(<path d="M3 5h18l-7 9v6l-4-2v-4z"/>);
Ico.MoreH    = mkIcon(<><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></>);
Ico.MoreV    = mkIcon(<><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></>);
Ico.Phone    = mkIcon(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/>);
Ico.Mail     = mkIcon(<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>);
Ico.Wa       = mkIcon(<path d="M20.5 12a8.5 8.5 0 1 1-15.4 4.9L4 21l4.2-1.1A8.5 8.5 0 0 1 20.5 12zM8.6 8c-.3 0-.7.1-1 .5-.4.4-1.4 1.3-1.4 3.2s1.4 3.7 1.6 3.9c.2.3 2.7 4.4 6.7 6 3.3 1.3 4 1 4.7.9.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.8s-.4-.3-.8-.5c-.4-.2-2.3-1.1-2.7-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.2 1.6-.2.2-.4.3-.8.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.3.3-.6.1-.2.1-.4 0-.6-.1-.2-.9-2.1-1.2-2.9-.3-.7-.6-.6-.8-.6h-.6z"/>);
Ico.Edit     = mkIcon(<><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4z"/></>);
Ico.Trash    = mkIcon(<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></>);
Ico.Check    = mkIcon(<path d="M20 6L9 17l-5-5"/>);
Ico.X        = mkIcon(<path d="M6 6l12 12M18 6L6 18"/>);
Ico.Eye      = mkIcon(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
Ico.EyeOff   = mkIcon(<><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.6 4M6.6 6.6A17 17 0 0 0 2 12s4 6 10 6a10 10 0 0 0 4-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>);
Ico.Clock    = mkIcon(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
Ico.ChevL    = mkIcon(<path d="M15 18l-6-6 6-6"/>);
Ico.ChevR    = mkIcon(<path d="M9 18l6-6-6-6"/>);
Ico.ChevD    = mkIcon(<path d="M6 9l6 6 6-6"/>);
Ico.ChevU    = mkIcon(<path d="M6 15l6-6 6 6"/>);
Ico.Menu     = mkIcon(<><path d="M3 6h18M3 12h18M3 18h18"/></>);
Ico.Bolt     = mkIcon(<path d="M13 2L3 14h7l-1 8 10-12h-7z"/>);
Ico.Sparkle  = mkIcon(<><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z"/></>);
Ico.Door     = mkIcon(<><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><path d="M3 21h18M15 12v.5"/></>);
Ico.Play     = mkIcon(<path d="M6 4l14 8L6 20z"/>);
Ico.CheckCir = mkIcon(<><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>);
Ico.Ghost    = mkIcon(<><path d="M5 11a7 7 0 1 1 14 0v9l-2-2-2 2-2-2-2 2-2-2-2 2-2-2z"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/></>);
Ico.Scissor  = mkIcon(<><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1L20 20M14 12l6-6M8.1 15.9l6-6"/></>);
Ico.Lightning= mkIcon(<path d="M13 2L3 14h7l-1 8 10-12h-7z"/>);
Ico.MapPin   = mkIcon(<><path d="M12 21s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></>);
Ico.Award    = mkIcon(<><circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/></>);
Ico.Send     = mkIcon(<><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></>);
Ico.AlertTri = mkIcon(<><path d="M12 3l10 18H2z"/><path d="M12 9v5M12 17v.5"/></>);

// Status icon by key
const STATUS_ICON = {
  pending: Ico.Clock, confirmed: Ico.Check, reminded: Ico.Bell,
  client_confirmed: Ico.CheckCir, checked_in: Ico.Door, in_progress: Ico.Play,
  completed: Ico.CheckCir, cancelled: Ico.X, no_show: Ico.Ghost,
};

// ───── Status badge ─────
function StatusBadge({ status, size = 'md', dot = true }) {
  const s = TF.status(status);
  const I = STATUS_ICON[status];
  const cls = `tf-badge tf-st-${status}`;
  const style = size === 'sm' ? { fontSize: 10, padding: '2px 7px' } : {};
  return (
    <span className={cls} style={style}>
      {dot && size !== 'icon' && <span className="tf-dot"></span>}
      {size === 'icon' ? <I size={12}/> : s.label}
    </span>
  );
}

// ───── Avatar ─────
function Avatar({ name, color, size = 32 }) {
  const initials = name.split(' ').slice(0,2).map(x => x[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size/2,
      background: color || 'var(--tf-primary-500)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.15)'
    }}>{initials}</div>
  );
}

// ───── Card ─────
function Card({ children, flat, className = '', style, onClick }) {
  return (
    <div className={`tf-card ${flat ? 'tf-card-flat' : ''} ${className}`}
         style={style} onClick={onClick}>
      {children}
    </div>
  );
}

// ───── Mobile screen shell (used inside iOS frame) ─────
function MobileScreen({ children, dark, density = 'normal', radius = 'normal' }) {
  const cls = [
    'tf-root',
    dark ? 'tf-dark' : '',
    density === 'compact' ? 'tf-density-compact' : (density === 'comfy' ? 'tf-density-comfy' : ''),
    radius === 'tight' ? 'tf-radius-tight' : (radius === 'soft' ? 'tf-radius-soft' : ''),
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{
      width: '100%', height: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {children}
    </div>
  );
}

// ───── Mobile top bar ─────
function MobileTopbar({ title, subtitle, onMenu, onAction, actionIcon, leading, dark }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderBottom: '1px solid var(--tf-border)',
      background: 'var(--tf-surface)', flexShrink: 0,
    }}>
      {leading || (
        <button className="tf-btn tf-btn-icon tf-btn-ghost tf-tap"
          onClick={onMenu} aria-label="Menú">
          <Ico.Menu/>
        </button>
      )}
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize: 16, fontWeight: 700}}>{title}</div>
        {subtitle && <div style={{fontSize: 12, color: 'var(--tf-fg-muted)'}}>{subtitle}</div>}
      </div>
      {onAction && (
        <button className="tf-btn tf-btn-icon tf-btn-ghost tf-tap" onClick={onAction}>
          {actionIcon || <Ico.Plus/>}
        </button>
      )}
    </div>
  );
}

// ───── Bottom tab bar (mobile primary nav) ─────
function MobileTabBar({ active, onChange, profile = 'owner' }) {
  // We surface the 5 most-used; rest in drawer
  const tabs = [
    { key: 'home',         icon: Ico.Home,      label: 'Inicio' },
    { key: 'appointments', icon: Ico.Calendar,  label: 'Turnos' },
    { key: 'create',       icon: Ico.Plus,      label: '',        primary: true },
    { key: 'customers',    icon: Ico.Users,     label: 'Clientes' },
    { key: 'reminders',    icon: Ico.Bell,      label: 'Avisos' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      borderTop: '1px solid var(--tf-border)', background: 'var(--tf-surface)',
      padding: '6px 4px 8px', flexShrink: 0,
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
    }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        const I = t.icon;
        if (t.primary) {
          return (
            <button key={t.key} onClick={() => onChange(t.key)} className="tf-tap"
              style={{
                background: 'none', border: 'none', display: 'flex',
                justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
              }}>
              <span className="tf-mesh-primary" style={{
                width: 48, height: 48, borderRadius: 16,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', boxShadow: 'var(--tf-shadow-primary)',
                transform: 'translateY(-8px)',
              }}>
                <I size={22}/>
              </span>
            </button>
          );
        }
        return (
          <button key={t.key} onClick={() => onChange(t.key)} className="tf-tap"
            style={{
              background: 'none', border: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '4px 2px', cursor: 'pointer',
              color: isActive ? 'var(--tf-primary-600)' : 'var(--tf-fg-muted)',
            }}>
            <I size={20}/>
            <span style={{fontSize: 10, fontWeight: isActive ? 700 : 500}}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───── Drawer (mobile sidebar) ─────
function Drawer({ open, onClose, route, onNav, role = 'owner', dark, onToggleTheme }) {
  if (!open) return null;
  const items = [
    { key: 'home',          icon: Ico.Home,     label: 'Dashboard' },
    { key: 'appointments',  icon: Ico.Calendar, label: 'Turnos' },
    { key: 'customers',     icon: Ico.Users,    label: 'Clientes' },
    { key: 'services',      icon: Ico.Package,  label: 'Servicios', roles: ['owner','admin'] },
    { key: 'staff',         icon: Ico.UserCog,  label: 'Profesionales', roles: ['owner','admin'] },
    { key: 'reminders',     icon: Ico.Bell,     label: 'Recordatorios' },
    { sep: true },
    { key: 'organizations', icon: Ico.Building, label: 'Organizaciones', roles: ['admin'] },
    { key: 'users',         icon: Ico.Users,    label: 'Usuarios', roles: ['admin'] },
    { key: 'invite',        icon: Ico.UserPlus, label: 'Invitar', roles: ['owner','admin'] },
  ];
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 30, animation: 'tf-fade-in 0.2s ease',
      }}/>
      <aside style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 270, background: 'var(--tf-surface)', zIndex: 31,
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--tf-shadow-lg)',
        animation: 'tf-fade-in 0.25s ease',
      }}>
        <div style={{padding: '20px 18px 14px', borderBottom: '1px solid var(--tf-border)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <div className="tf-mesh-primary" style={{
              width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: 'var(--tf-shadow-primary)',
            }}>
              <Ico.Lightning size={20}/>
            </div>
            <div>
              <div style={{fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em'}}>TurnoFlash</div>
              <div style={{fontSize: 11, color: 'var(--tf-fg-muted)'}}>Studio Bella · Palermo</div>
            </div>
          </div>
        </div>
        <div style={{padding: '14px 18px', borderBottom: '1px solid var(--tf-border)'}}>
          <div style={{display:'flex', alignItems:'center', gap: 10}}>
            <Avatar name="Sofía Martínez" color="var(--tf-secondary-500)" size={36}/>
            <div style={{minWidth: 0}}>
              <div style={{fontWeight: 600, fontSize: 14}}>Sofía Martínez</div>
              <div style={{fontSize: 11, color: 'var(--tf-fg-muted)'}}>
                {role === 'admin' ? 'Administradora' : role === 'owner' ? 'Dueña' : 'Staff'}
              </div>
            </div>
          </div>
        </div>
        <nav style={{flex: 1, padding: '12px 10px', overflowY: 'auto'}}>
          {items.filter(it => !it.roles || it.roles.includes(role)).map((it, i) => {
            if (it.sep) return <div key={i} style={{height: 1, background: 'var(--tf-border)', margin: '8px 6px'}}/>;
            const I = it.icon;
            const isActive = route === it.key;
            return (
              <button key={it.key} onClick={() => { onNav(it.key); onClose(); }}
                className="tf-tap"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 'var(--tf-radius)',
                  border: 'none', background: isActive ? 'var(--tf-primary-50)' : 'transparent',
                  color: isActive ? 'var(--tf-primary-700)' : 'var(--tf-fg-muted)',
                  fontWeight: isActive ? 700 : 500, fontSize: 14, cursor: 'pointer',
                  textAlign: 'left',
                }}>
                <I size={18}/>{it.label}
              </button>
            );
          })}
        </nav>
        <div style={{padding: 12, borderTop: '1px solid var(--tf-border)', display: 'flex', flexDirection: 'column', gap: 4}}>
          <button onClick={onToggleTheme} className="tf-tap"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              border: 'none', background: 'transparent', color: 'var(--tf-fg-muted)',
              borderRadius: 'var(--tf-radius)', fontWeight: 500, fontSize: 14, cursor: 'pointer',
              textAlign: 'left', width: '100%',
            }}>
            {dark ? <><Ico.Sun size={18}/>Tema claro</> : <><Ico.Moon size={18}/>Tema oscuro</>}
          </button>
          <button className="tf-tap"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              border: 'none', background: 'transparent', color: 'var(--tf-danger-600)',
              borderRadius: 'var(--tf-radius)', fontWeight: 500, fontSize: 14, cursor: 'pointer',
              textAlign: 'left', width: '100%',
            }}>
            <Ico.LogOut size={18}/>Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

// Export
Object.assign(window, {
  Ico, STATUS_ICON, StatusBadge, Avatar, Card,
  MobileScreen, MobileTopbar, MobileTabBar, Drawer,
});
