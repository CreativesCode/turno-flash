// TurnoFlash — main app: prototype + canvas with tabs

const { useState, useEffect, useRef } = React;

// Mobile prototype: full app navigation inside iOS frame
function MobilePrototype({ tweaks, dark, onToggleDark, role = 'owner' }) {
  const [route, setRoute] = useState('landing'); // landing | login | home | appointments | customers | services | staff | reminders | organizations | users | invite | new-org
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalCreate, setModalCreate] = useState(false);
  const [modalDetail, setModalDetail] = useState(null);
  const [tab, setTab] = useState('home');

  const showTabBar = !['landing', 'login', 'new-org'].includes(route);

  const onNav = (to) => {
    setRoute(to);
    if (['home','appointments','customers','reminders'].includes(to)) {
      setTab(to);
    }
  };

  const onTab = (t) => {
    if (t === 'create') {
      setModalCreate(true);
      return;
    }
    setTab(t);
    setRoute(t);
  };

  return (
    <MobileScreen dark={dark}
      density={tweaks.density}
      radius={tweaks.radius}>
      <div style={{flex:1, position:'relative', overflow:'hidden', display:'flex', flexDirection:'column'}}>
        {route === 'landing' && <ScreenLanding onLogin={() => setRoute('login')}/>}
        {route === 'login'   && <ScreenLogin onSignIn={() => { setRoute('home'); setTab('home'); }}/>}
        {route === 'home'    && <ScreenHome onMenu={() => setDrawerOpen(true)} onNav={onNav} role={role} cardStyle={tweaks.cardStyle}/>}
        {route === 'appointments' && <ScreenAppointments onMenu={() => setDrawerOpen(true)} onCreate={() => setModalCreate(true)} onOpen={(a) => setModalDetail(a)}/>}
        {route === 'customers' && <ScreenCustomers onMenu={() => setDrawerOpen(true)} onCreate={() => {}}/>}
        {route === 'services' && <ScreenServices onMenu={() => setDrawerOpen(true)} onCreate={() => {}}/>}
        {route === 'staff' && <ScreenStaff onMenu={() => setDrawerOpen(true)} onCreate={() => {}}/>}
        {route === 'reminders' && <ScreenReminders onMenu={() => setDrawerOpen(true)}/>}
        {route === 'organizations' && <ScreenOrganizations onMenu={() => setDrawerOpen(true)}/>}
        {route === 'users' && <ScreenUsers onMenu={() => setDrawerOpen(true)}/>}
        {route === 'new-org' && <ScreenNewOrg onMenu={() => setDrawerOpen(true)} onBack={() => setRoute('organizations')}/>}

        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
          route={route} onNav={onNav} role={role} dark={dark} onToggleTheme={onToggleDark}/>

        <ApptModal open={modalCreate} onClose={() => setModalCreate(false)} mode="create"/>
        <ApptModal open={!!modalDetail} onClose={() => setModalDetail(null)} ap={modalDetail} mode="detail"/>
      </div>
      {showTabBar && <MobileTabBar active={tab} onChange={onTab}/>}
    </MobileScreen>
  );
}

// Desktop prototype
function DesktopPrototype({ tweaks, dark, onToggleDark, role = 'owner' }) {
  const [route, setRoute] = useState('home');
  const [modalCreate, setModalCreate] = useState(false);
  const [modalDetail, setModalDetail] = useState(null);

  const cls = [
    'tf-root',
    dark ? 'tf-dark' : '',
    tweaks.density === 'compact' ? 'tf-density-compact' : (tweaks.density === 'comfy' ? 'tf-density-comfy' : ''),
    tweaks.radius === 'tight' ? 'tf-radius-tight' : (tweaks.radius === 'soft' ? 'tf-radius-soft' : ''),
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={{display:'flex', height:'100%', overflow:'hidden', position:'relative'}}>
      <DesktopSidebar route={route} onNav={setRoute} role={role} dark={dark} onToggleTheme={onToggleDark}/>
      {route === 'home' && <DesktopHome cardStyle={tweaks.cardStyle} onNav={setRoute}/>}
      {route === 'appointments' && <DesktopAppointments onCreate={() => setModalCreate(true)} onOpen={a => setModalDetail(a)}/>}
      {route === 'customers' && (
        <DesktopWrapper>
          <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)'}}>
            <div>
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Clientes</div>
              <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>{TF.CUSTOMERS.length} en la base</div>
            </div>
            <button className="tf-btn tf-btn-primary"><Ico.Plus size={16}/>Nuevo cliente</button>
          </div>
          <div style={{padding: 24}}>
            <div style={{position:'relative', maxWidth: 480, marginBottom: 16}}>
              <Ico.Search size={16} style={{position:'absolute', top: 11, left: 12, color: 'var(--tf-fg-muted)'}}/>
              <input className="tf-input" placeholder="Buscar por nombre, teléfono…" style={{paddingLeft: 36}}/>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 10}}>
              {TF.CUSTOMERS.map(c => <CustomerCard key={c.id} c={c}/>)}
            </div>
          </div>
        </DesktopWrapper>
      )}
      {route === 'services' && (
        <DesktopWrapper>
          <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)'}}>
            <div>
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Servicios</div>
              <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>Catálogo y precios</div>
            </div>
            <button className="tf-btn tf-btn-primary"><Ico.Plus size={16}/>Nuevo servicio</button>
          </div>
          <div style={{padding: 24, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 12}}>
            {TF.SERVICES.map(s => <ServiceCard key={s.id} s={s}/>)}
          </div>
        </DesktopWrapper>
      )}
      {route === 'staff' && (
        <DesktopWrapper>
          <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)'}}>
            <div>
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Profesionales</div>
              <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>{TF.STAFF.length} en el equipo</div>
            </div>
            <button className="tf-btn tf-btn-primary"><Ico.Plus size={16}/>Nuevo profesional</button>
          </div>
          <div style={{padding: 24, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 12}}>
            {TF.STAFF.map(s => (
              <Card key={s.id} style={{padding: 14, display:'flex', gap: 12}}>
                <Avatar name={s.name} color={s.color} size={48}/>
                <div style={{flex:1, minWidth: 0}}>
                  <div style={{fontWeight: 700, fontSize: 15}}>{s.name} <span style={{color:'var(--tf-fg-muted)', fontWeight:500, fontSize:12}}>· {s.nick}</span></div>
                  <div style={{display:'flex', gap: 4, marginTop: 6, flexWrap: 'wrap'}}>
                    {s.specialties.map(sp => (
                      <span key={sp} style={{fontSize: 10, fontWeight: 600, padding:'2px 7px', borderRadius: 999, background:'var(--tf-surface-2)', color:'var(--tf-fg-muted)', border:'1px solid var(--tf-border)'}}>{sp}</span>
                    ))}
                  </div>
                  <div style={{display:'flex', gap: 10, marginTop: 8, fontSize: 11, color:'var(--tf-fg-muted)'}}>
                    <span style={{display:'inline-flex', alignItems:'center', gap: 4}}>
                      <span style={{width:8, height:8, borderRadius:4, background: s.bookable ? 'var(--tf-primary-500)' : 'var(--tf-fg-subtle)'}}/>
                      {s.bookable ? 'Reservable' : 'No reservable'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DesktopWrapper>
      )}
      {route === 'reminders' && (
        <DesktopWrapper>
          <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)'}}>
            <div>
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Recordatorios</div>
              <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>WhatsApp · automatización</div>
            </div>
            <button className="tf-btn tf-btn-primary"><Ico.Send size={16}/>Enviar lote</button>
          </div>
          <DesktopRemindersBody/>
        </DesktopWrapper>
      )}
      {route === 'organizations' && (
        <DesktopWrapper>
          <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)'}}>
            <div>
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Organizaciones</div>
              <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>5 negocios</div>
            </div>
            <button className="tf-btn tf-btn-primary"><Ico.Plus size={16}/>Nueva organización</button>
          </div>
          <DesktopOrgsList/>
        </DesktopWrapper>
      )}
      {route === 'users' && (
        <DesktopWrapper>
          <div style={{padding: '16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface)'}}>
            <div>
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Usuarios</div>
              <div style={{fontSize: 12, color:'var(--tf-fg-muted)'}}>6 cuentas</div>
            </div>
            <button className="tf-btn tf-btn-primary"><Ico.UserPlus size={16}/>Invitar usuario</button>
          </div>
          <DesktopUsersList/>
        </DesktopWrapper>
      )}

      <ApptModal open={modalCreate} onClose={() => setModalCreate(false)} mode="create"/>
      <ApptModal open={!!modalDetail} onClose={() => setModalDetail(null)} ap={modalDetail} mode="detail"/>
    </div>
  );
}

// Tweaks defaults
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "normal",
  "radius": "normal",
  "cardStyle": "gradient"
}/*EDITMODE-END*/;

// Main App
function App() {
  const [tab, setTab] = useState('prototype'); // prototype | canvas
  const [device, setDevice] = useState('mobile'); // mobile | desktop
  const [dark, setDark] = useState(false);
  const [role, setRole] = useState('owner');
  const t = useTweaks(TWEAK_DEFAULTS);

  return (
    <div style={{
      width: '100vw', height: '100vh', display:'flex', flexDirection:'column',
      background: dark ? '#020617' : '#f1f5f9',
      fontFamily: 'Manrope, system-ui, sans-serif', color: dark ? '#f1f5fb' : '#0b1220',
    }}>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, padding: '10px 16px', display:'flex', alignItems:'center', gap: 12,
        background: dark ? '#0d1322' : '#ffffff',
        borderBottom: `1px solid ${dark ? '#1c2540' : '#e2e6ec'}`,
      }}>
        <div style={{display:'flex', alignItems:'center', gap: 8}}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #22c55e, #13833c)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
            boxShadow: '0 4px 10px -3px rgba(34,197,94,0.5)',
          }}><Ico.Lightning size={16}/></div>
          <div>
            <div style={{fontWeight: 800, fontSize: 14, letterSpacing:'-0.02em'}}>TurnoFlash</div>
            <div style={{fontSize: 10, color: dark ? '#9aa6bd' : '#5b6677', lineHeight: 1}}>Rediseño · prototipo</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex', background: dark ? '#131a2c' : '#f1f5f9',
          borderRadius: 10, padding: 3, marginLeft: 16,
        }}>
          {[
            { k:'prototype', l:'Prototipo' },
            { k:'canvas',    l:'Canvas (todas las pantallas)' },
          ].map(x => (
            <button key={x.k} onClick={() => setTab(x.k)} style={{
              padding: '7px 14px', borderRadius: 7, border: 'none',
              background: tab === x.k ? (dark ? '#0d1322' : '#fff') : 'transparent',
              color: tab === x.k ? (dark ? '#f1f5fb' : '#0b1220') : (dark ? '#9aa6bd' : '#5b6677'),
              fontWeight: 600, fontSize: 13, cursor:'pointer',
              boxShadow: tab === x.k ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{x.l}</button>
          ))}
        </div>

        <div style={{flex: 1}}/>

        {/* Device + role + theme */}
        {tab === 'prototype' && (
          <>
            <div style={{
              display:'flex', background: dark ? '#131a2c' : '#f1f5f9',
              borderRadius: 8, padding: 3,
            }}>
              {[
                { k:'mobile',  l:'Mobile' },
                { k:'desktop', l:'Desktop' },
              ].map(x => (
                <button key={x.k} onClick={() => setDevice(x.k)} style={{
                  padding: '6px 12px', borderRadius: 5, border: 'none',
                  background: device === x.k ? (dark ? '#0d1322' : '#fff') : 'transparent',
                  color: device === x.k ? (dark ? '#f1f5fb' : '#0b1220') : (dark ? '#9aa6bd' : '#5b6677'),
                  fontWeight: 600, fontSize: 12, cursor:'pointer',
                }}>{x.l}</button>
              ))}
            </div>
            <select value={role} onChange={e => setRole(e.target.value)} style={{
              padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: dark ? '#131a2c' : '#fff', color: dark ? '#f1f5fb' : '#0b1220',
              border: `1px solid ${dark ? '#1c2540' : '#e2e6ec'}`, cursor: 'pointer',
            }}>
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </>
        )}
        <button onClick={() => setDark(!dark)} style={{
          width: 32, height: 32, borderRadius: 8, cursor:'pointer',
          background: dark ? '#131a2c' : '#fff', color: dark ? '#f1f5fb' : '#0b1220',
          border: `1px solid ${dark ? '#1c2540' : '#e2e6ec'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {dark ? <Ico.Sun size={16}/> : <Ico.Moon size={16}/>}
        </button>
      </div>

      {/* Content */}
      <div style={{flex: 1, overflow:'hidden', display:'flex'}}>
        {tab === 'prototype' ? (
          device === 'mobile' ? (
            <MobileFrameStage>
              <MobilePrototype tweaks={t.values} dark={dark} onToggleDark={() => setDark(!dark)} role={role}/>
            </MobileFrameStage>
          ) : (
            <DesktopStage dark={dark}>
              <DesktopPrototype tweaks={t.values} dark={dark} onToggleDark={() => setDark(!dark)} role={role}/>
            </DesktopStage>
          )
        ) : (
          <CanvasView tweaks={t.values} dark={dark} role={role}/>
        )}
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks" defaultPosition={{ x: 16, y: 80 }}>
        <TweakSection title="Apariencia">
          <TweakRadio label="Densidad" value={t.values.density} onChange={v => t.setTweak('density', v)}
            options={[
              { value:'compact', label:'Compacta' },
              { value:'normal',  label:'Normal' },
              { value:'comfy',   label:'Cómoda' },
            ]}/>
          <TweakRadio label="Radio" value={t.values.radius} onChange={v => t.setTweak('radius', v)}
            options={[
              { value:'tight',  label:'Tight' },
              { value:'normal', label:'Normal' },
              { value:'soft',   label:'Soft' },
            ]}/>
          <TweakRadio label="Estilo de tarjetas" value={t.values.cardStyle} onChange={v => t.setTweak('cardStyle', v)}
            options={[
              { value:'gradient', label:'Gradiente' },
              { value:'flat',     label:'Plano' },
            ]}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Mobile frame stage (centers iOS frame)
function MobileFrameStage({ children, dark }) {
  return (
    <div style={{flex:1, overflow:'auto', display:'flex', justifyContent:'center', alignItems:'flex-start', padding: '24px 16px'}}>
      <IOSDevice width={402} height={874} dark={dark}>
        {children}
      </IOSDevice>
    </div>
  );
}

// Desktop stage (window chrome around the desktop prototype)
function DesktopStage({ dark, children }) {
  return (
    <div style={{flex:1, overflow:'auto', padding: 20, display:'flex', justifyContent:'center', alignItems:'flex-start'}}>
      <div style={{
        width: '100%', maxWidth: 1380, height: 'calc(100vh - 120px)', minHeight: 700,
        borderRadius: 14, overflow:'hidden',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.25), 0 8px 16px -4px rgba(0,0,0,0.1)',
        border: `1px solid ${dark ? '#1c2540' : '#d8dde6'}`,
      }}>
        {/* Window chrome */}
        <div style={{
          height: 32, background: dark ? '#161e30' : '#e9ecf2',
          borderBottom: `1px solid ${dark ? '#1c2540' : '#d8dde6'}`,
          display:'flex', alignItems:'center', padding: '0 12px', gap: 6,
        }}>
          <span style={{width:11, height:11, borderRadius:6, background:'#ff5f57'}}/>
          <span style={{width:11, height:11, borderRadius:6, background:'#febc2e'}}/>
          <span style={{width:11, height:11, borderRadius:6, background:'#28c840'}}/>
          <span style={{flex:1, textAlign:'center', fontSize:11, color: dark ? '#9aa6bd' : '#5b6677', fontWeight: 600}}>app.turnoflash.com</span>
        </div>
        <div style={{height:'calc(100% - 32px)', display:'flex'}}>
          {children}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App/>);
