// TurnoFlash — mobile screens. Loads after tf-ui.jsx.
const TF2 = window.TF;

// ───── Landing ─────
function ScreenLanding({ onLogin }) {
  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      {/* Hero */}
      <div className="tf-mesh-primary" style={{
        padding: '24px 22px 36px', color: '#fff', position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 36}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter: 'blur(8px)',
            }}><Ico.Lightning size={16}/></div>
            <span style={{fontWeight:800, fontSize: 16, letterSpacing:'-0.02em'}}>TurnoFlash</span>
          </div>
          <button onClick={onLogin} style={{
            background: 'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)',
            color: '#fff', border:'1px solid rgba(255,255,255,0.25)',
            padding: '6px 12px', borderRadius: 999, fontWeight: 600, fontSize: 12, cursor:'pointer',
          }}>Ingresar</button>
        </div>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding: '4px 10px', borderRadius:999,
          background:'rgba(255,255,255,0.2)', backdropFilter:'blur(8px)',
          fontSize: 11, fontWeight: 600, marginBottom: 14,
        }}>
          <Ico.Sparkle size={12}/> Recordatorios automáticos por WhatsApp
        </div>
        <h1 style={{
          fontSize: 30, lineHeight: 1.1, margin: 0, fontWeight: 800, letterSpacing:'-0.03em',
        }}>Tu agenda,<br/>en piloto automático.</h1>
        <p style={{
          fontSize: 14, lineHeight: 1.5, margin: '12px 0 18px',
          color: 'rgba(255,255,255,0.85)',
        }}>
          Reservas, recordatorios y check-in para peluquerías, barberías,
          consultorios y estéticas. Todo desde el celular.
        </p>
        <div style={{display:'flex', gap: 8}}>
          <button onClick={onLogin} className="tf-btn" style={{
            background: '#fff', color: 'var(--tf-primary-700)', boxShadow: 'var(--tf-shadow-md)',
          }}>Probar gratis <Ico.ChevR size={14}/></button>
          <button className="tf-btn" style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            border:'1px solid rgba(255,255,255,0.3)',
          }}>Ver demo</button>
        </div>

        {/* Floating mini-mockup */}
        <div style={{
          marginTop: 28, padding: 12, borderRadius: 14,
          background: 'rgba(255,255,255,0.95)',
          color: 'var(--tf-fg)', boxShadow: 'var(--tf-shadow-lg)',
          transform: 'rotate(-1deg)',
        }}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom: 10}}>
            <Avatar name="Martina Gómez" color="#db2777" size={28}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600}}>Martina Gómez</div>
              <div style={{fontSize:11, color:'var(--tf-fg-muted)'}}>Coloración · 09:30</div>
            </div>
            <StatusBadge status="confirmed" size="sm"/>
          </div>
          <div style={{display:'flex', gap:6}}>
            <div style={{flex:1, padding:'8px', background:'var(--tf-primary-50)', borderRadius:8, fontSize:11, color:'var(--tf-primary-700)', fontWeight:600, textAlign:'center'}}>
              ✓ Recordatorio enviado
            </div>
            <div style={{padding:'8px 10px', background:'#22c55e', color:'#fff', borderRadius:8, fontSize:11, fontWeight:600}}>
              Check-in
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{padding: '28px 22px'}}>
        <div style={{fontSize: 12, fontWeight: 700, color: 'var(--tf-primary-600)', letterSpacing: '0.08em', textTransform:'uppercase'}}>
          Para tu negocio
        </div>
        <h2 style={{fontSize:22, fontWeight:800, margin:'6px 0 18px', letterSpacing:'-0.02em'}}>
          Todo lo que necesitás, en un solo lugar.
        </h2>
        <div style={{display:'grid', gap: 10}}>
          {[
            { icon: Ico.Calendar, title: 'Agenda flexible', desc: 'Vista lista, día y semana. Crea turnos en segundos.', mesh: 'tf-mesh-info' },
            { icon: Ico.Wa,        title: 'WhatsApp', desc: 'Recordatorios uno a uno o por lote. Sin configurar.', mesh: 'tf-mesh-primary' },
            { icon: Ico.Users,     title: 'Clientes', desc: 'Historial, notas y datos. Búsqueda instantánea.', mesh: 'tf-mesh-secondary' },
            { icon: Ico.Award,     title: 'Servicios', desc: 'Duración, buffer, precio. Reserva online opcional.', mesh: 'tf-mesh-warn' },
            { icon: Ico.UserCog,   title: 'Equipo', desc: 'Asigná turnos por profesional, con su color.', mesh: 'tf-mesh-violet' },
            { icon: Ico.Sparkle,   title: '9 estados', desc: 'Pendiente, confirmado, check-in, en curso, listo…', mesh: 'tf-mesh-info' },
          ].map((f, i) => {
            const I = f.icon;
            return (
              <Card key={i} style={{padding: 14, display:'flex', gap: 12, alignItems:'flex-start'}}>
                <div className={f.mesh} style={{
                  width: 38, height: 38, borderRadius: 10, color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
                  boxShadow: 'var(--tf-shadow-sm)',
                }}><I size={18}/></div>
                <div>
                  <div style={{fontWeight:700, fontSize: 14}}>{f.title}</div>
                  <div style={{fontSize:12, color:'var(--tf-fg-muted)', marginTop:2, lineHeight:1.4}}>{f.desc}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div style={{padding: '0 22px 32px'}}>
        <div className="tf-mesh-secondary" style={{
          padding: 22, borderRadius: 18, color: '#fff',
          boxShadow: 'var(--tf-shadow-secondary)', textAlign: 'center',
        }}>
          <div style={{fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em'}}>¿Empezamos?</div>
          <div style={{fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '6px 0 14px'}}>
            14 días gratis. Sin tarjeta.
          </div>
          <button onClick={onLogin} className="tf-btn" style={{
            background: '#fff', color: 'var(--tf-secondary-700)', width: '100%',
            justifyContent: 'center', fontWeight: 700,
          }}>Crear cuenta</button>
        </div>
      </div>

      <div style={{padding:'18px 22px 26px', textAlign:'center', fontSize:11, color:'var(--tf-fg-subtle)'}}>
        © 2026 TurnoFlash · hecho en 🇦🇷
      </div>
    </div>
  );
}

// ───── Login ─────
function ScreenLogin({ onSignIn }) {
  const [showPw, setShowPw] = React.useState(false);
  return (
    <div style={{
      flex:1, overflowY:'auto', background:'var(--tf-bg)',
      display: 'flex', flexDirection: 'column',
      padding: '56px 22px 24px',
    }}>
      {/* Brand mark */}
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 12, marginBottom: 28}}>
        <div className="tf-mesh-primary" style={{
          width: 56, height: 56, borderRadius: 16,
          display:'flex', alignItems:'center', justifyContent:'center',
          color: '#fff', boxShadow: 'var(--tf-shadow-primary)',
        }}><Ico.Lightning size={28}/></div>
        <div style={{fontSize: 20, fontWeight: 800, letterSpacing:'-0.02em'}}>TurnoFlash</div>
      </div>

      <div>
        <Card style={{padding: 22}}>
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em'}}>Bienvenida</div>
          <div style={{fontSize: 13, color:'var(--tf-fg-muted)', marginTop: 4}}>
            Ingresá con tu cuenta para administrar tu agenda.
          </div>
          <div style={{marginTop: 20, display:'flex', flexDirection:'column', gap: 14}}>
            <div>
              <label style={{fontSize: 12, fontWeight: 600, color:'var(--tf-fg-muted)'}}>Email</label>
              <input className="tf-input" defaultValue="sofia@studiobella.com" style={{marginTop: 4}}/>
            </div>
            <div>
              <label style={{fontSize: 12, fontWeight: 600, color:'var(--tf-fg-muted)'}}>Contraseña</label>
              <div style={{position:'relative', marginTop: 4}}>
                <input className="tf-input" type={showPw ? 'text' : 'password'} defaultValue="********" style={{paddingRight: 38}}/>
                <button onClick={() => setShowPw(!showPw)} style={{
                  position:'absolute', right: 6, top: 6,
                  width: 30, height: 30, borderRadius: 6,
                  border: 'none', background: 'transparent',
                  color: 'var(--tf-fg-muted)', cursor: 'pointer',
                }}>
                  {showPw ? <Ico.EyeOff size={16}/> : <Ico.Eye size={16}/>}
                </button>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <a style={{fontSize:12, color:'var(--tf-primary-600)', fontWeight: 600}}>¿Olvidaste tu contraseña?</a>
            </div>
            <button className="tf-btn tf-btn-primary" onClick={onSignIn} style={{width: '100%', justifyContent:'center'}}>
              Ingresar
            </button>
          </div>
        </Card>
        <div style={{textAlign:'center', fontSize:12, color:'var(--tf-fg-muted)', margin:'18px 0'}}>
          ¿Aún no tenés cuenta? <span style={{color:'var(--tf-fg)', fontWeight: 600}}>Pedí una invitación</span>
        </div>
      </div>
    </div>
  );
}

// ───── Dashboard home ─────
function ScreenHome({ onMenu, onNav, role = 'owner', cardStyle = 'gradient' }) {
  const stats = TF.stats(TF.APPTS_TODAY);
  const cards = [
    { key:'appointments', title: 'Turnos', sub: `${stats.total} hoy`, icon: Ico.Calendar, mesh: 'tf-mesh-info' },
    { key:'customers',    title: 'Clientes', sub: `${TF.CUSTOMERS.length} activos`, icon: Ico.Users, mesh: 'tf-mesh-primary' },
    { key:'reminders',    title: 'Recordatorios', sub: `${stats.confirmed + stats.client_confirmed} listos`, icon: Ico.Bell, mesh: 'tf-mesh-secondary' },
    { key:'services',     title: 'Servicios', sub: `${TF.SERVICES.length} en catálogo`, icon: Ico.Package, mesh: 'tf-mesh-warn' },
    { key:'staff',        title: 'Equipo',    sub: `${TF.STAFF.length} profesionales`, icon: Ico.UserCog, mesh: 'tf-mesh-violet' },
  ];
  if (role === 'admin') {
    cards.push({ key:'organizations', title: 'Organizaciones', sub: '12 negocios', icon: Ico.Building, mesh: 'tf-mesh-info' });
  }
  return (
    <div style={{flex:1, overflowY: 'auto', background:'var(--tf-bg)'}}>
      {/* License banner */}
      <div style={{
        margin: '12px 14px 0', padding: '10px 12px',
        borderRadius: 12, background: 'var(--tf-warn-100)',
        color: 'var(--tf-warn-600)', display:'flex', gap: 10, alignItems:'center',
        fontSize: 12,
      }}>
        <Ico.AlertTri size={16}/>
        <div style={{flex:1, color: '#92400e'}}>
          <strong>Licencia:</strong> vence en 8 días.
        </div>
        <a style={{fontWeight: 700}}>Renovar</a>
      </div>

      {/* Header */}
      <div style={{padding: '18px 18px 8px'}}>
        <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 14}}>
          <button onClick={onMenu} className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.Menu/></button>
          <div style={{flex:1}}>
            <div style={{fontSize:12, color:'var(--tf-fg-muted)'}}>Studio Bella · Palermo</div>
            <div style={{fontSize:18, fontWeight: 800, letterSpacing:'-0.02em'}}>Hola, Sofía 👋</div>
          </div>
          <Avatar name="Sofía Martínez" color="var(--tf-secondary-500)" size={38}/>
        </div>

        {/* Hero stat */}
        <Card style={{padding: 18, marginBottom: 18, position:'relative', overflow:'hidden'}}>
          <div style={{position:'absolute', right: -20, top: -20, width: 130, height: 130, borderRadius: 65,
            background: 'radial-gradient(circle, rgba(34,197,94,0.18), transparent 70%)'}}/>
          <div style={{fontSize: 12, color: 'var(--tf-fg-muted)', fontWeight: 600}}>Hoy · martes 5 may</div>
          <div style={{display:'flex', alignItems:'baseline', gap: 6, marginTop: 4}}>
            <span style={{fontSize: 38, fontWeight: 800, letterSpacing:'-0.04em'}}>{stats.total}</span>
            <span style={{fontSize: 14, color: 'var(--tf-fg-muted)', fontWeight: 600}}>turnos</span>
          </div>
          <div style={{display:'flex', gap: 8, marginTop: 12, flexWrap: 'wrap'}}>
            <MiniStat label="Confirmados" value={stats.confirmed + stats.client_confirmed + stats.reminded} status="confirmed"/>
            <MiniStat label="Pendientes" value={stats.pending} status="pending"/>
            <MiniStat label="En curso" value={stats.in_progress + stats.checked_in} status="in_progress"/>
            <MiniStat label="Completados" value={stats.completed} status="completed"/>
          </div>
        </Card>
      </div>

      {/* Cards grid */}
      <div style={{padding: '0 18px'}}>
        <div style={{fontSize: 12, fontWeight: 700, color:'var(--tf-fg-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom: 10}}>
          Atajos
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 10}}>
          {cards.map(c => (
            <DashCard key={c.key} card={c} style={cardStyle} onClick={() => onNav(c.key)}/>
          ))}
        </div>
      </div>

      {/* Próximo turno */}
      <div style={{padding: '20px 18px 100px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
          <div style={{fontSize: 12, fontWeight: 700, color:'var(--tf-fg-muted)', letterSpacing:'0.06em', textTransform:'uppercase'}}>
            Próximos
          </div>
          <a onClick={() => onNav('appointments')} style={{fontSize: 12, fontWeight: 600, color: 'var(--tf-primary-600)'}}>Ver todos</a>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap: 8}}>
          {TF.APPTS_TODAY.filter(a => ['confirmed','client_confirmed','reminded','pending'].includes(a.status)).slice(0, 3).map(a => (
            <ApptRow key={a.id} ap={a}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, status }) {
  const s = TF.status(status);
  return (
    <div className={`tf-st-${status}`} style={{
      flex: '1 1 calc(50% - 4px)', minWidth: 0,
      padding: '8px 10px', borderRadius: 10, background: 'var(--bg)',
      display:'flex', flexDirection:'column', gap: 2,
    }}>
      <span style={{fontSize:11, color:'var(--cb)', fontWeight: 600}}>{label}</span>
      <span style={{fontSize: 20, fontWeight: 800, color:'var(--cb)', lineHeight: 1}}>{value}</span>
    </div>
  );
}

function DashCard({ card, style, onClick }) {
  const I = card.icon;
  if (style === 'gradient') {
    return (
      <button onClick={onClick} className={`${card.mesh} tf-tap`} style={{
        padding: 14, borderRadius: 14, color: '#fff', textAlign:'left',
        border:'none', cursor:'pointer', boxShadow: 'var(--tf-shadow-sm)',
        display:'flex', flexDirection:'column', gap: 18, minHeight: 110,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(6px)',
        }}><I size={16}/></div>
        <div>
          <div style={{fontWeight: 700, fontSize: 15}}>{card.title}</div>
          <div style={{fontSize: 11, color:'rgba(255,255,255,0.85)', marginTop: 2}}>{card.sub}</div>
        </div>
      </button>
    );
  }
  return (
    <button onClick={onClick} className="tf-tap" style={{
      padding: 14, borderRadius: 14, background: 'var(--tf-surface)',
      border: '1px solid var(--tf-border)', textAlign:'left',
      cursor: 'pointer', boxShadow: 'var(--tf-shadow-sm)',
      display:'flex', flexDirection:'column', gap: 18, minHeight: 110, color: 'var(--tf-fg)',
    }}>
      <div className={card.mesh} style={{
        width: 32, height: 32, borderRadius: 8,
        display:'flex', alignItems:'center', justifyContent:'center', color: '#fff',
      }}><I size={16}/></div>
      <div>
        <div style={{fontWeight: 700, fontSize: 15}}>{card.title}</div>
        <div style={{fontSize: 11, color:'var(--tf-fg-muted)', marginTop: 2}}>{card.sub}</div>
      </div>
    </button>
  );
}

// ───── Appointment row (list) ─────
function ApptRow({ ap, onAction }) {
  const cu = TF.customer(ap.cu);
  const sv = TF.service(ap.sv);
  const st = TF.staff(ap.st);
  const next = TF.NEXT_ACTIONS[ap.status];
  return (
    <Card className={`tf-st-${ap.status}`} style={{padding: 12, display:'flex', gap: 12, position:'relative', overflow:'hidden'}}>
      <div style={{position:'absolute', left:0, top:0, bottom:0, width: 4, background:'var(--c)'}}/>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minWidth: 50, paddingLeft: 6}}>
        <div style={{fontSize: 16, fontWeight: 800, letterSpacing:'-0.02em'}}>{ap.t}</div>
        <div style={{fontSize: 10, color:'var(--tf-fg-muted)'}}>{TF.fmtDuration(sv.duration)}</div>
      </div>
      <div style={{width: 1, background:'var(--tf-border)'}}/>
      <div style={{flex:1, minWidth: 0}}>
        <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 4}}>
          <div style={{fontWeight: 700, fontSize: 14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{cu.name}</div>
        </div>
        <div style={{fontSize: 12, color: 'var(--tf-fg-muted)', display:'flex', alignItems:'center', gap: 6, marginBottom: 6}}>
          <span style={{display:'inline-block', width:6, height:6, borderRadius:3, background: sv.color}}/>
          {sv.name}
          <span>·</span>
          <span style={{display:'inline-block', width:6, height:6, borderRadius:3, background: st.color}}/>
          {st.nick}
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 6, flexWrap:'wrap'}}>
          <StatusBadge status={ap.status} size="sm"/>
          {next && (
            <button onClick={() => onAction && onAction(ap, next.to)} style={{
              fontSize: 11, fontWeight: 600,
              padding: '3px 8px', borderRadius: 999,
              background: 'var(--tf-primary-50)', color:'var(--tf-primary-700)',
              border:'1px solid var(--tf-primary-200)', cursor:'pointer',
            }}>{next.label} →</button>
          )}
        </div>
      </div>
    </Card>
  );
}

Object.assign(window, {
  ScreenLanding, ScreenLogin, ScreenHome, MiniStat, DashCard, ApptRow,
});
