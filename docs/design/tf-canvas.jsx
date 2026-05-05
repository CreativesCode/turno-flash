// TurnoFlash — canvas view: shows every screen on a pannable design canvas

function CanvasView({ tweaks, dark, role }) {
  const cls = [
    'tf-root',
    dark ? 'tf-dark' : '',
    tweaks.density === 'compact' ? 'tf-density-compact' : (tweaks.density === 'comfy' ? 'tf-density-comfy' : ''),
    tweaks.radius === 'tight' ? 'tf-radius-tight' : (tweaks.radius === 'soft' ? 'tf-radius-soft' : ''),
  ].filter(Boolean).join(' ');

  // Mobile screens use iOS frame at 375x812 visible area (frame adds chrome)
  const M = 390, MH = 844;
  // Desktop screens
  const D = 1280, DH = 800;

  return (
    <div className={cls} style={{flex:1, overflow:'hidden', background: dark ? '#0a1020' : '#eef1f6'}}>
      <DesignCanvas defaultZoom={0.55}>
        {/* ───────── Mobile section ───────── */}
        <DCSection id="mobile-public" title="Mobile · Público">
          <DCArtboard id="m-landing" label="Landing" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <ScreenLanding onLogin={() => {}}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-login" label="Login" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <ScreenLogin onSignIn={() => {}}/>
            </FrameMobile>
          </DCArtboard>
        </DCSection>

        <DCSection id="mobile-app" title="Mobile · Operación diaria">
          <DCArtboard id="m-home" label="Dashboard" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks} tab="home">
              <ScreenHome onMenu={() => {}} onNav={() => {}} role={role} cardStyle={tweaks.cardStyle}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-appts" label="Turnos · Lista" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks} tab="appointments">
              <ScreenAppointments onMenu={() => {}} onCreate={() => {}} onOpen={() => {}}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-appts-create" label="Crear turno" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <div style={{flex:1, position:'relative', overflow:'hidden'}}>
                <ScreenAppointments onMenu={() => {}} onCreate={() => {}} onOpen={() => {}}/>
                <ApptModal open={true} onClose={() => {}} mode="create" embed/>
              </div>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-appt-detail" label="Detalle de turno" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <div style={{flex:1, position:'relative', overflow:'hidden'}}>
                <ScreenAppointments onMenu={() => {}} onCreate={() => {}} onOpen={() => {}}/>
                <ApptModal open={true} onClose={() => {}} mode="detail" embed
                  ap={TF.APPTS_TODAY.find(a => a.status === 'client_confirmed')}/>
              </div>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-customers" label="Clientes" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks} tab="customers">
              <ScreenCustomers onMenu={() => {}}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-services" label="Servicios" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <ScreenServices onMenu={() => {}}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-staff" label="Profesionales" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <ScreenStaff onMenu={() => {}}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-reminders" label="Recordatorios WA" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks} tab="reminders">
              <ScreenReminders onMenu={() => {}}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-drawer" label="Menú lateral" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks} tab="home">
              <div style={{flex:1, position:'relative', overflow:'hidden'}}>
                <ScreenHome onMenu={() => {}} onNav={() => {}} role={role} cardStyle={tweaks.cardStyle}/>
                <Drawer open={true} onClose={() => {}} route="home" onNav={() => {}} role={role} dark={dark} embed/>
              </div>
            </FrameMobile>
          </DCArtboard>
        </DCSection>

        <DCSection id="mobile-admin" title="Mobile · Admin (super-usuario)">
          <DCArtboard id="m-orgs" label="Organizaciones" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <ScreenOrganizations onMenu={() => {}}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-users" label="Usuarios" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <ScreenUsers onMenu={() => {}}/>
            </FrameMobile>
          </DCArtboard>
          <DCArtboard id="m-new-org" label="Nueva organización" width={M} height={MH}>
            <FrameMobile dark={dark} tweaks={tweaks}>
              <ScreenNewOrg onMenu={() => {}} onBack={() => {}}/>
            </FrameMobile>
          </DCArtboard>
        </DCSection>

        {/* ───────── Desktop section ───────── */}
        <DCSection id="desktop-app" title="Desktop · Operación">
          <DCArtboard id="d-home" label="Dashboard desktop" width={D} height={DH}>
            <FrameDesktop dark={dark} tweaks={tweaks}>
              <DesktopSidebar route="home" onNav={() => {}} role={role} dark={dark} onToggleTheme={() => {}}/>
              <DesktopHome cardStyle={tweaks.cardStyle} onNav={() => {}}/>
            </FrameDesktop>
          </DCArtboard>
          <DCArtboard id="d-appts" label="Turnos desktop" width={D} height={DH}>
            <FrameDesktop dark={dark} tweaks={tweaks}>
              <DesktopSidebar route="appointments" onNav={() => {}} role={role} dark={dark} onToggleTheme={() => {}}/>
              <DesktopAppointments onCreate={() => {}} onOpen={() => {}}/>
            </FrameDesktop>
          </DCArtboard>
          <DCArtboard id="d-customers" label="Clientes desktop" width={D} height={DH}>
            <FrameDesktop dark={dark} tweaks={tweaks}>
              <DesktopSidebar route="customers" onNav={() => {}} role={role} dark={dark} onToggleTheme={() => {}}/>
              <div style={{flex:1, overflow:'auto', background:'var(--tf-bg)', display:'flex', flexDirection:'column'}}>
                <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)', flexShrink:0}}>
                  <div>
                    <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Clientes</div>
                    <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>{TF.CUSTOMERS.length} en la base</div>
                  </div>
                  <button className="tf-btn tf-btn-primary"><Ico.Plus size={16}/>Nuevo cliente</button>
                </div>
                <div style={{padding: 24, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 10}}>
                  {TF.CUSTOMERS.map(c => <CustomerCard key={c.id} c={c}/>)}
                </div>
              </div>
            </FrameDesktop>
          </DCArtboard>
          <DCArtboard id="d-services" label="Servicios desktop" width={D} height={DH}>
            <FrameDesktop dark={dark} tweaks={tweaks}>
              <DesktopSidebar route="services" onNav={() => {}} role={role} dark={dark} onToggleTheme={() => {}}/>
              <div style={{flex:1, overflow:'auto', background:'var(--tf-bg)', display:'flex', flexDirection:'column'}}>
                <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)', flexShrink:0}}>
                  <div>
                    <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Servicios</div>
                    <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>Catálogo y precios</div>
                  </div>
                  <button className="tf-btn tf-btn-primary"><Ico.Plus size={16}/>Nuevo servicio</button>
                </div>
                <div style={{padding: 24, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 12}}>
                  {TF.SERVICES.map(s => <ServiceCard key={s.id} s={s}/>)}
                </div>
              </div>
            </FrameDesktop>
          </DCArtboard>
          <DCArtboard id="d-reminders" label="Recordatorios desktop" width={D} height={DH}>
            <FrameDesktop dark={dark} tweaks={tweaks}>
              <DesktopSidebar route="reminders" onNav={() => {}} role={role} dark={dark} onToggleTheme={() => {}}/>
              <div style={{flex:1, overflow:'auto', background:'var(--tf-bg)', display:'flex', flexDirection:'column'}}>
                <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)', flexShrink:0}}>
                  <div>
                    <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Recordatorios</div>
                    <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>WhatsApp · automatización</div>
                  </div>
                  <button className="tf-btn tf-btn-primary"><Ico.Send size={16}/>Enviar lote</button>
                </div>
                <DesktopRemindersBody/>
              </div>
            </FrameDesktop>
          </DCArtboard>
        </DCSection>

        <DCSection id="desktop-admin" title="Desktop · Admin">
          <DCArtboard id="d-orgs" label="Organizaciones (admin)" width={D} height={DH}>
            <FrameDesktop dark={dark} tweaks={tweaks}>
              <DesktopSidebar route="organizations" onNav={() => {}} role="admin" dark={dark} onToggleTheme={() => {}}/>
              <div style={{flex:1, overflow:'auto', background:'var(--tf-bg)', display:'flex', flexDirection:'column'}}>
                <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)', flexShrink: 0}}>
                  <div>
                    <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Organizaciones</div>
                    <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>5 negocios</div>
                  </div>
                  <button className="tf-btn tf-btn-primary"><Ico.Plus size={16}/>Nueva organización</button>
                </div>
                <DesktopOrgsList/>
              </div>
            </FrameDesktop>
          </DCArtboard>
          <DCArtboard id="d-users" label="Usuarios (admin)" width={D} height={DH}>
            <FrameDesktop dark={dark} tweaks={tweaks}>
              <DesktopSidebar route="users" onNav={() => {}} role="admin" dark={dark} onToggleTheme={() => {}}/>
              <div style={{flex:1, overflow:'auto', background:'var(--tf-bg)', display:'flex', flexDirection:'column'}}>
                <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)', flexShrink: 0}}>
                  <div>
                    <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Usuarios</div>
                    <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>6 cuentas</div>
                  </div>
                  <button className="tf-btn tf-btn-primary"><Ico.UserPlus size={16}/>Invitar usuario</button>
                </div>
                <DesktopUsersList/>
              </div>
            </FrameDesktop>
          </DCArtboard>
        </DCSection>

        {/* Status system reference */}
        <DCSection id="system" title="Sistema · Estados (color-coded)">
          <DCArtboard id="s-statuses" label="9 estados" width={680} height={520}>
            <div style={{padding: 24, background: dark ? '#0d1322' : '#fff', height:'100%', overflow:'auto'}}>
              <div style={{fontSize: 13, color: dark ? '#9aa6bd' : '#5b6677', marginBottom: 14}}>
                Sistema sólido por estado: cada estado del turno tiene una identidad cromática.
              </div>
              <div className="tf-root" style={{display:'flex', flexDirection:'column', gap: 8}}>
                {TF.STATUSES.map(s => (
                  <div key={s.key} className={`tf-st-${s.key}`} style={{
                    display:'flex', alignItems:'center', gap: 12, padding: '10px 14px', borderRadius: 10,
                    background:'var(--bg)', border: '1px solid color-mix(in oklab, var(--cb), transparent 80%)',
                  }}>
                    <span style={{width:10, height:10, borderRadius:5, background:'var(--c)'}}/>
                    <span style={{flex:1, fontWeight: 600, fontSize: 14, color:'var(--cb)'}}>{s.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                      background:'var(--c)', color:'#fff', textTransform:'uppercase', letterSpacing:'0.05em',
                    }}>{s.key}</span>
                  </div>
                ))}
              </div>
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>
    </div>
  );
}

// Frame helper for mobile screens inside canvas
function FrameMobile({ dark, tweaks, tab, children }) {
  const cls = [
    'tf-root',
    dark ? 'tf-dark' : '',
    tweaks.density === 'compact' ? 'tf-density-compact' : (tweaks.density === 'comfy' ? 'tf-density-comfy' : ''),
    tweaks.radius === 'tight' ? 'tf-radius-tight' : (tweaks.radius === 'soft' ? 'tf-radius-soft' : ''),
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{
      width: '100%', height: '100%',
      background: 'var(--tf-bg)', color:'var(--tf-fg)',
      display:'flex', flexDirection:'column', overflow:'hidden',
      borderRadius: 24, border: '1px solid var(--tf-border)',
    }}>
      {children}
      {tab && <MobileTabBar active={tab} onChange={() => {}}/>}
    </div>
  );
}

function FrameDesktop({ dark, tweaks, children }) {
  const cls = [
    'tf-root',
    dark ? 'tf-dark' : '',
    tweaks.density === 'compact' ? 'tf-density-compact' : (tweaks.density === 'comfy' ? 'tf-density-comfy' : ''),
    tweaks.radius === 'tight' ? 'tf-radius-tight' : (tweaks.radius === 'soft' ? 'tf-radius-soft' : ''),
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{
      width: '100%', height:'100%', display:'flex',
      background:'var(--tf-bg)', color:'var(--tf-fg)', overflow:'hidden',
      borderRadius: 10, border:'1px solid var(--tf-border)',
    }}>
      {children}
    </div>
  );
}

// Desktop-only org/users lists (no mobile topbar)
function DesktopOrgsList() {
  const orgs = [
    { name: 'Studio Bella', slug: 'studio-bella', owner: 'Sofía M.', members: 5, license: 'active', expires: '12 dic 2026' },
    { name: 'Barbería Norte', slug: 'barberia-norte', owner: 'Lucas F.', members: 3, license: 'active', expires: '02 nov 2026' },
    { name: 'Centro Estético Sur', slug: 'estetico-sur', owner: 'Valentina P.', members: 8, license: 'expiring', expires: '12 may 2026' },
    { name: 'Spa Palermo', slug: 'spa-palermo', owner: 'Camila R.', members: 6, license: 'active', expires: '08 jul 2026' },
    { name: 'Clínica Vida', slug: 'clinica-vida', owner: 'Diego A.', members: 12, license: 'expired', expires: '12 abr 2026' },
  ];
  return (
    <div style={{padding: 24, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 12}}>
      {orgs.map((o, i) => {
        const lic = o.license === 'active' ? { c:'var(--tf-primary-600)', bg:'var(--tf-primary-100)', l:'Activa' } :
                    o.license === 'expiring' ? { c:'var(--tf-warn-600)', bg:'var(--tf-warn-100)', l:'Por vencer' } :
                    { c:'var(--tf-danger-600)', bg:'var(--tf-danger-100)', l:'Vencida' };
        return (
          <Card key={i} style={{padding: 14}}>
            <div style={{display:'flex', alignItems:'flex-start', gap: 12}}>
              <div className="tf-mesh-info" style={{width:42, height:42, borderRadius:10, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <Ico.Building size={20}/>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <span style={{fontWeight:700, fontSize:15}}>{o.name}</span>
                  <span style={{fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999, background:lic.bg, color:lic.c}}>{lic.l}</span>
                </div>
                <div style={{fontSize:12, color:'var(--tf-fg-muted)', marginTop:2}}>/{o.slug} · {o.owner} · {o.members} miembros</div>
                <div style={{fontSize:11, color:'var(--tf-fg-subtle)', marginTop:4}}>Vence: {o.expires}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// Desktop reminders body (no mobile topbar)
function DesktopRemindersBody() {
  const targets = TF.APPTS_TODAY.filter(a => ['confirmed','client_confirmed','reminded'].includes(a.status));
  return (
    <div style={{padding: 24, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 14, alignItems:'flex-start'}}>
      <div className="tf-mesh-info" style={{padding:18, borderRadius:14, color:'#fff', boxShadow:'var(--tf-shadow-sm)'}}>
        <Ico.Calendar size={20}/>
        <div style={{fontSize:32, fontWeight:800, marginTop:10, letterSpacing:'-0.02em'}}>{targets.length}</div>
        <div style={{fontSize:12, opacity:0.85}}>Por enviar hoy</div>
      </div>
      <div className="tf-mesh-primary" style={{padding:18, borderRadius:14, color:'#fff', boxShadow:'var(--tf-shadow-sm)'}}>
        <Ico.Check size={20}/>
        <div style={{fontSize:32, fontWeight:800, marginTop:10, letterSpacing:'-0.02em'}}>3</div>
        <div style={{fontSize:12, opacity:0.85}}>Enviados</div>
      </div>
      <div className="tf-mesh-secondary" style={{padding:18, borderRadius:14, color:'#fff', boxShadow:'var(--tf-shadow-sm)'}}>
        <Ico.Wa size={20}/>
        <div style={{fontSize:32, fontWeight:800, marginTop:10, letterSpacing:'-0.02em'}}>92%</div>
        <div style={{fontSize:12, opacity:0.85}}>Tasa de respuesta</div>
      </div>
      <Card style={{padding:18, gridColumn:'1 / -1'}}>
        <div style={{fontWeight:700, fontSize:15, marginBottom:12}}>Por enviar</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8}}>
          {targets.map(a => {
            const cu = TF.customer(a.cu);
            const sv = TF.service(a.sv);
            return (
              <div key={a.id} style={{padding:12, display:'flex', gap:10, alignItems:'center', borderRadius:10, background:'var(--tf-surface-2)', border:'1px solid var(--tf-border)'}}>
                <Avatar name={cu.name} color={sv.color} size={36}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:700}}>{cu.name}</div>
                  <div style={{fontSize:11, color:'var(--tf-fg-muted)'}}>{a.t} · {sv.name}</div>
                </div>
                <button style={{padding:'8px 12px', borderRadius:999, background:'#22c55e', color:'#fff', border:'none', fontWeight:700, fontSize:11, display:'flex', alignItems:'center', gap:4, cursor:'pointer'}}>
                  <Ico.Wa size={12}/>Enviar
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function DesktopUsersList() {
  const users = [
    { name: 'Sofía Martínez', email: 'sofia@studiobella.com', role: 'owner', org: 'Studio Bella' },
    { name: 'Lucas Fernández', email: 'lucas@barberianorte.com', role: 'owner', org: 'Barbería Norte' },
    { name: 'Camila Ruiz', email: 'cami@studiobella.com', role: 'staff', org: 'Studio Bella' },
    { name: 'Diego Álvarez', email: 'diego@spapalermo.com', role: 'staff', org: 'Spa Palermo' },
    { name: 'Admin Principal', email: 'admin@turnoflash.com', role: 'admin', org: '—' },
    { name: 'Valentina Pérez', email: 'vale@esteticosur.com', role: 'owner', org: 'Centro Estético Sur' },
  ];
  const rs = (r) => r === 'admin' ? { bg:'var(--tf-secondary-100)', c:'var(--tf-secondary-600)' } :
                    r === 'owner' ? { bg:'var(--tf-primary-100)', c:'var(--tf-primary-700)' } :
                                    { bg:'var(--tf-info-100)', c:'var(--tf-info-600)' };
  return (
    <div style={{padding: 24, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 10}}>
      {users.map((u, i) => {
        const s = rs(u.role);
        return (
          <Card key={i} style={{padding: 12, display:'flex', alignItems:'center', gap: 12}}>
            <Avatar name={u.name} color="var(--tf-fg)" size={40}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:14}}>{u.name}</div>
              <div style={{fontSize:12, color:'var(--tf-fg-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.email}</div>
              <div style={{fontSize:11, color:'var(--tf-fg-subtle)', marginTop:2}}>{u.org}</div>
            </div>
            <span style={{fontSize:10, fontWeight:700, padding:'4px 9px', borderRadius:999, background:s.bg, color:s.c, textTransform:'uppercase', letterSpacing:'0.04em'}}>{u.role}</span>
          </Card>
        );
      })}
    </div>
  );
}

Object.assign(window, { CanvasView, FrameMobile, FrameDesktop, DesktopOrgsList, DesktopUsersList, DesktopRemindersBody });
