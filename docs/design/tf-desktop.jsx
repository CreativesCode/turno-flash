// TurnoFlash — desktop versions of key screens. Loads after tf-screens-3.jsx

// Desktop sidebar (always-on)
function DesktopSidebar({ route, onNav, role = 'owner', dark, onToggleTheme }) {
  const items = [
    { key: 'home',          icon: Ico.Home,     label: 'Dashboard' },
    { key: 'appointments',  icon: Ico.Calendar, label: 'Turnos' },
    { key: 'customers',     icon: Ico.Users,    label: 'Clientes' },
    { key: 'services',      icon: Ico.Package,  label: 'Servicios', roles: ['owner','admin'] },
    { key: 'staff',         icon: Ico.UserCog,  label: 'Profesionales', roles: ['owner','admin'] },
    { key: 'reminders',     icon: Ico.Bell,     label: 'Recordatorios' },
    { sep: true, key: 's1' },
    { key: 'organizations', icon: Ico.Building, label: 'Organizaciones', roles: ['admin'] },
    { key: 'users',         icon: Ico.Users,    label: 'Usuarios', roles: ['admin'] },
    { key: 'invite',        icon: Ico.UserPlus, label: 'Invitar', roles: ['owner','admin'] },
  ];
  return (
    <aside style={{
      width: 240, height: '100%', flexShrink: 0,
      background: 'var(--tf-surface)', borderRight: '1px solid var(--tf-border)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '20px 18px', borderBottom: '1px solid var(--tf-border)',
        display:'flex', alignItems:'center', gap: 10,
      }}>
        <div className="tf-mesh-primary" style={{
          width: 36, height: 36, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', boxShadow: 'var(--tf-shadow-primary)',
        }}>
          <Ico.Lightning size={20}/>
        </div>
        <div>
          <div style={{fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em'}}>TurnoFlash</div>
          <div style={{fontSize: 11, color: 'var(--tf-fg-muted)'}}>Studio Bella</div>
        </div>
      </div>
      <div style={{padding: '14px 18px', borderBottom: '1px solid var(--tf-border)'}}>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <Avatar name="Sofía Martínez" color="var(--tf-secondary-500)" size={36}/>
          <div style={{minWidth: 0, flex: 1}}>
            <div style={{fontWeight: 600, fontSize: 13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>Sofía Martínez</div>
            <div style={{fontSize: 11, color: 'var(--tf-fg-muted)'}}>
              {role === 'admin' ? 'Administradora' : role === 'owner' ? 'Dueña' : 'Staff'}
            </div>
          </div>
        </div>
      </div>
      <nav style={{flex: 1, padding: '10px 12px', overflowY: 'auto'}}>
        {items.filter(it => !it.roles || it.roles.includes(role)).map(it => {
          if (it.sep) return <div key={it.key} style={{height: 1, background: 'var(--tf-border)', margin: '8px 6px'}}/>;
          const I = it.icon;
          const isActive = route === it.key;
          return (
            <button key={it.key} onClick={() => onNav(it.key)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 12px', borderRadius: 'var(--tf-radius)',
              border: 'none', background: isActive ? 'var(--tf-primary-50)' : 'transparent',
              color: isActive ? 'var(--tf-primary-700)' : 'var(--tf-fg-muted)',
              fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer',
              textAlign: 'left',
            }}>
              <I size={17}/>{it.label}
            </button>
          );
        })}
      </nav>
      <div style={{padding: 12, borderTop: '1px solid var(--tf-border)', display:'flex', flexDirection:'column', gap: 4}}>
        <button onClick={onToggleTheme} style={{
          display:'flex', alignItems:'center', gap: 12, padding:'9px 12px',
          border:'none', background: 'transparent', color:'var(--tf-fg-muted)',
          borderRadius:'var(--tf-radius)', fontWeight: 500, fontSize: 13, cursor:'pointer',
          textAlign: 'left',
        }}>
          {dark ? <><Ico.Sun size={17}/>Tema claro</> : <><Ico.Moon size={17}/>Tema oscuro</>}
        </button>
        <button style={{
          display:'flex', alignItems:'center', gap: 12, padding:'9px 12px',
          border:'none', background: 'transparent', color:'var(--tf-danger-600)',
          borderRadius:'var(--tf-radius)', fontWeight: 500, fontSize: 13, cursor:'pointer',
          textAlign: 'left',
        }}>
          <Ico.LogOut size={17}/>Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// Desktop dashboard home
function DesktopHome({ cardStyle = 'gradient', onNav }) {
  const stats = TF.stats(TF.APPTS_TODAY);
  const cards = [
    { key:'appointments', title: 'Turnos',        sub: `${stats.total} hoy`,    icon: Ico.Calendar, mesh: 'tf-mesh-info' },
    { key:'customers',    title: 'Clientes',      sub: `${TF.CUSTOMERS.length} activos`, icon: Ico.Users, mesh: 'tf-mesh-primary' },
    { key:'reminders',    title: 'Recordatorios', sub: `${stats.confirmed + stats.client_confirmed} listos`, icon: Ico.Bell, mesh: 'tf-mesh-secondary' },
    { key:'services',     title: 'Servicios',     sub: `${TF.SERVICES.length} en catálogo`, icon: Ico.Package, mesh: 'tf-mesh-warn' },
    { key:'staff',        title: 'Equipo',        sub: `${TF.STAFF.length} profesionales`,  icon: Ico.UserCog, mesh: 'tf-mesh-violet' },
  ];

  return (
    <div style={{flex:1, overflowY:'auto', background: 'var(--tf-bg)'}}>
      {/* License banner */}
      <div style={{
        margin: '16px 24px 0', padding: '12px 16px',
        borderRadius: 12, background: 'var(--tf-warn-100)',
        color: '#92400e', display:'flex', gap: 12, alignItems:'center', fontSize: 13,
      }}>
        <Ico.AlertTri size={18}/>
        <div style={{flex: 1}}>
          <strong>Licencia próxima a vencer:</strong> tu licencia de Studio Bella vence en 8 días.
        </div>
        <button className="tf-btn" style={{padding:'6px 14px', background:'var(--tf-warn-600)', color:'#fff'}}>Renovar</button>
      </div>

      <div style={{padding: '24px 24px 32px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 22}}>
          <div>
            <div style={{fontSize: 13, color: 'var(--tf-fg-muted)', fontWeight: 600}}>Studio Bella · Palermo · martes 5 may</div>
            <div style={{fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', marginTop: 4}}>Hola Sofía 👋</div>
          </div>
          <button className="tf-btn tf-btn-primary"><Ico.Plus size={16}/>Nuevo turno</button>
        </div>

        {/* KPI grid */}
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap: 14, marginBottom: 22}}>
          <Card style={{padding: 22, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right: -30, top:-30, width: 200, height: 200, borderRadius:100, background:'radial-gradient(circle, rgba(34,197,94,0.16), transparent 70%)'}}/>
            <div style={{fontSize: 12, color: 'var(--tf-fg-muted)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.06em'}}>Hoy</div>
            <div style={{display:'flex', alignItems:'baseline', gap: 8, marginTop: 6}}>
              <span style={{fontSize: 48, fontWeight: 800, letterSpacing:'-0.04em', lineHeight: 1}}>{stats.total}</span>
              <span style={{fontSize: 16, color: 'var(--tf-fg-muted)', fontWeight: 600}}>turnos</span>
            </div>
            <div style={{display:'flex', gap: 8, marginTop: 14, flexWrap:'wrap'}}>
              <MiniStat label="Confirmados" value={stats.confirmed + stats.client_confirmed + stats.reminded} status="confirmed"/>
              <MiniStat label="Pendientes" value={stats.pending} status="pending"/>
              <MiniStat label="En curso" value={stats.in_progress + stats.checked_in} status="in_progress"/>
              <MiniStat label="Listos" value={stats.completed} status="completed"/>
            </div>
          </Card>
          <KPI mesh="tf-mesh-info" icon={Ico.Calendar} value="86%" label="Ocupación semana"/>
          <KPI mesh="tf-mesh-primary" icon={Ico.Wa} value="92%" label="Confirmación WA"/>
          <KPI mesh="tf-mesh-secondary" icon={Ico.Bolt} value="14" label="Nuevos clientes"/>
        </div>

        {/* Atajos */}
        <div style={{fontSize: 12, fontWeight: 700, color:'var(--tf-fg-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom: 10}}>
          Atajos
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 12, marginBottom: 22}}>
          {cards.map(c => (
            <DashCard key={c.key} card={c} style={cardStyle} onClick={() => onNav(c.key)}/>
          ))}
        </div>

        {/* Two-col: próximos + actividad */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14}}>
          <Card style={{padding: 18}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
              <div style={{fontWeight: 700, fontSize: 15}}>Próximos turnos</div>
              <a onClick={() => onNav('appointments')} style={{fontSize:12, color:'var(--tf-primary-600)', fontWeight: 600}}>Ver todos →</a>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap: 8}}>
              {TF.APPTS_TODAY.filter(a => ['confirmed','client_confirmed','reminded','pending'].includes(a.status)).slice(0, 4).map(a => (
                <ApptRow key={a.id} ap={a}/>
              ))}
            </div>
          </Card>
          <Card style={{padding: 18}}>
            <div style={{fontWeight: 700, fontSize: 15, marginBottom: 12}}>Actividad reciente</div>
            <div style={{display:'flex', flexDirection:'column', gap: 12}}>
              {[
                { i: Ico.Check, c: 'var(--tf-primary-500)', t: 'Florencia P. completó su turno', s: 'hace 2 min' },
                { i: Ico.Door, c: 'var(--tf-warn-500)', t: 'Lara D. hizo check-in', s: 'hace 8 min' },
                { i: Ico.Wa, c: '#22c55e', t: '14 recordatorios enviados', s: 'hace 1 h' },
                { i: Ico.UserPlus, c: 'var(--tf-info-500)', t: 'Nuevo cliente: Iván Molina', s: 'hace 3 h' },
                { i: Ico.X, c: 'var(--tf-danger-500)', t: 'Tomás C. canceló turno de las 12:30', s: 'hace 4 h' },
              ].map((e, i) => {
                const I = e.i;
                return (
                  <div key={i} style={{display:'flex', gap: 10, alignItems:'flex-start'}}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${e.c}1a`, color: e.c,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}><I size={15}/></div>
                    <div style={{flex: 1}}>
                      <div style={{fontSize: 13, fontWeight: 500}}>{e.t}</div>
                      <div style={{fontSize: 11, color:'var(--tf-fg-muted)'}}>{e.s}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPI({ mesh, icon, value, label }) {
  const I = icon;
  return (
    <Card style={{padding: 18, display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight: 130}}>
      <div className={mesh} style={{
        width: 36, height: 36, borderRadius: 10, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}><I size={18}/></div>
      <div>
        <div style={{fontSize: 28, fontWeight: 800, letterSpacing:'-0.03em', lineHeight: 1}}>{value}</div>
        <div style={{fontSize: 12, color:'var(--tf-fg-muted)', marginTop: 4}}>{label}</div>
      </div>
    </Card>
  );
}

// Desktop appointments — 2 column with day calendar + side list
function DesktopAppointments({ onCreate, onOpen }) {
  const [view, setView] = React.useState('day');
  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--tf-bg)'}}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', display:'flex', alignItems:'center', gap: 14,
        borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)',
      }}>
        <div style={{flex: 1}}>
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Turnos</div>
          <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>martes 5 may · 15 turnos</div>
        </div>
        <div style={{
          display:'flex', background:'var(--tf-surface-2)',
          borderRadius: 10, padding: 3, border:'1px solid var(--tf-border)',
        }}>
          {[
            { k:'list',  l:'Lista', i: Ico.MoreH },
            { k:'day',   l:'Día',   i: Ico.Calendar },
            { k:'week',  l:'Semana',i: Ico.Calendar },
          ].map(t => {
            const I = t.i;
            return (
              <button key={t.k} onClick={() => setView(t.k)} style={{
                padding: '7px 14px', borderRadius: 7, border: 'none',
                background: view === t.k ? 'var(--tf-surface)' : 'transparent',
                fontWeight: 600, fontSize: 13, cursor:'pointer',
                color: view === t.k ? 'var(--tf-fg)' : 'var(--tf-fg-muted)',
                boxShadow: view === t.k ? 'var(--tf-shadow-sm)' : 'none',
                display:'flex', alignItems:'center', gap: 6,
              }}><I size={14}/>{t.l}</button>
            );
          })}
        </div>
        <button className="tf-btn tf-btn-ghost"><Ico.Filter size={14}/>Filtros</button>
        <button className="tf-btn tf-btn-primary" onClick={onCreate}><Ico.Plus size={16}/>Nuevo turno</button>
      </div>
      {/* Content */}
      <div style={{flex:1, display:'grid', gridTemplateColumns: '1fr 360px', gap: 0, overflow:'hidden'}}>
        <div style={{overflowY:'auto'}}>
          {view === 'day' && <DayCalendar appts={TF.APPTS_TODAY} onOpen={onOpen}/>}
          {view === 'week' && <WeekCalendar/>}
          {view === 'list' && (
            <div style={{padding: '16px 24px', display:'flex', flexDirection:'column', gap: 10}}>
              {TF.APPTS_TODAY.map(a => <ApptRow key={a.id} ap={a}/>)}
            </div>
          )}
        </div>
        {/* Right rail: today summary */}
        <div style={{
          borderLeft:'1px solid var(--tf-border)', background:'var(--tf-surface)',
          padding: '18px', overflowY:'auto', display:'flex', flexDirection:'column', gap: 16,
        }}>
          <div>
            <div style={{fontSize: 11, fontWeight: 700, color:'var(--tf-fg-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom: 10}}>Resumen del día</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8}}>
              {TF.STATUSES.slice(0, 6).map(s => {
                const n = TF.APPTS_TODAY.filter(a => a.status === s.key).length;
                return (
                  <div key={s.key} className={`tf-st-${s.key}`} style={{
                    padding: '8px 10px', borderRadius: 8, background:'var(--bg)',
                  }}>
                    <div style={{fontSize: 10, color:'var(--cb)', fontWeight: 600}}>{s.label}</div>
                    <div style={{fontSize: 18, fontWeight: 800, color:'var(--cb)'}}>{n}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{fontSize: 11, fontWeight: 700, color:'var(--tf-fg-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom: 10}}>Próximo en agenda</div>
            <ApptRow ap={TF.APPTS_TODAY.find(a => a.status === 'client_confirmed')}/>
          </div>
          <div>
            <div style={{fontSize: 11, fontWeight: 700, color:'var(--tf-fg-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom: 10}}>Equipo</div>
            <div style={{display:'flex', flexDirection:'column', gap: 6}}>
              {TF.STAFF.filter(s => s.bookable).map(s => {
                const cnt = TF.APPTS_TODAY.filter(a => a.st === s.id).length;
                return (
                  <div key={s.id} style={{display:'flex', alignItems:'center', gap: 10, padding: '6px 0'}}>
                    <Avatar name={s.name} color={s.color} size={28}/>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize: 13, fontWeight: 600}}>{s.nick}</div>
                      <div style={{fontSize: 10, color:'var(--tf-fg-muted)'}}>{s.specialties.join(', ')}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: 'var(--tf-surface-2)', color: 'var(--tf-fg-muted)',
                    }}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic desktop screen wrapper that uses the right mobile screen content
function DesktopWrapper({ children }) {
  return (
    <div style={{flex:1, overflow:'auto', background:'var(--tf-bg)'}}>
      {children}
    </div>
  );
}

Object.assign(window, { DesktopSidebar, DesktopHome, KPI, DesktopAppointments, DesktopWrapper });
