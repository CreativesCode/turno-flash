// TurnoFlash — clients, services, staff, reminders, admin (orgs/users)
// Loads after tf-screens-2.jsx

// ───── Customers ─────
function ScreenCustomers({ onMenu, onCreate }) {
  const [q, setQ] = React.useState('');
  const filtered = TF.CUSTOMERS.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.phone.includes(q) || c.email.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      <MobileTopbar title="Clientes" subtitle={`${TF.CUSTOMERS.length} en la base`} onMenu={onMenu} onAction={onCreate}/>
      <div style={{padding: '12px 14px 8px', position:'sticky', top: 0, background:'var(--tf-bg)', zIndex: 2}}>
        <div style={{position:'relative'}}>
          <Ico.Search size={16} style={{position:'absolute', top: 11, left: 12, color: 'var(--tf-fg-muted)'}}/>
          <input className="tf-input" placeholder="Buscar por nombre, teléfono…"
            value={q} onChange={e => setQ(e.target.value)} style={{paddingLeft: 36}}/>
        </div>
      </div>
      <div style={{padding: '0 14px 100px', display:'flex', flexDirection:'column', gap: 8}}>
        {filtered.map(c => <CustomerCard key={c.id} c={c}/>)}
      </div>
    </div>
  );
}

function CustomerCard({ c }) {
  const palette = ['#db2777','#22c55e','#3b82f6','#f59e0b','#8b5cf6','#06b6d4','#ef4444'];
  const color = palette[c.id.charCodeAt(c.id.length-1) % palette.length];
  return (
    <Card style={{padding: 12, display:'flex', gap: 12, alignItems:'center'}}>
      <Avatar name={c.name} color={color} size={42}/>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{display:'flex', alignItems:'center', gap: 6, marginBottom: 2}}>
          <span style={{fontWeight: 700, fontSize: 14}}>{c.name}</span>
          {c.wa && (
            <span style={{
              display:'inline-flex', alignItems:'center', gap: 3,
              padding: '1px 6px', borderRadius: 999,
              background: '#dcfce7', color:'#16a34a',
              fontSize: 10, fontWeight: 700,
            }}><Ico.Wa size={10}/>WA</span>
          )}
        </div>
        <div style={{fontSize: 12, color:'var(--tf-fg-muted)', display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap'}}>
          <span style={{display:'flex', alignItems:'center', gap: 4}}><Ico.Phone size={11}/>{c.phone}</span>
          {c.email && <span style={{display:'flex', alignItems:'center', gap: 4}}><Ico.Mail size={11}/>{c.email}</span>}
        </div>
        {c.notes && <div style={{fontSize: 11, marginTop: 4, color:'var(--tf-fg-muted)', fontStyle:'italic'}}>"{c.notes}"</div>}
      </div>
      <button className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.MoreV/></button>
    </Card>
  );
}

// ───── Services ─────
function ScreenServices({ onMenu, onCreate }) {
  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      <MobileTopbar title="Servicios" subtitle="Catálogo y precios" onMenu={onMenu} onAction={onCreate}/>
      <div style={{padding: '14px 14px 100px', display:'flex', flexDirection:'column', gap: 10}}>
        {TF.SERVICES.map(s => <ServiceCard key={s.id} s={s}/>)}
      </div>
    </div>
  );
}

function ServiceCard({ s }) {
  const [active, setActive] = React.useState(true);
  return (
    <Card style={{padding: 14, position: 'relative', overflow: 'hidden'}}>
      <div style={{position:'absolute', top:0, left:0, right:0, height: 3, background: s.color}}/>
      <div style={{display:'flex', alignItems:'flex-start', gap: 12}}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: s.color, color: '#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: `0 4px 12px -4px ${s.color}55`,
        }}><Ico.Scissor size={20}/></div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap: 10}}>
            <div style={{fontWeight: 700, fontSize: 15}}>{s.name}</div>
            <div style={{fontSize: 16, fontWeight: 800, color:'var(--tf-fg)', whiteSpace:'nowrap'}}>{TF.fmtMoney(s.price)}</div>
          </div>
          <div style={{display:'flex', gap: 10, marginTop: 6, fontSize: 12, color:'var(--tf-fg-muted)'}}>
            <span style={{display:'inline-flex', alignItems:'center', gap: 4}}>
              <Ico.Clock size={12}/>{TF.fmtDuration(s.duration)}
            </span>
            <span>+{s.buffer}m buffer</span>
          </div>
          <div style={{display:'flex', gap: 6, marginTop: 8, flexWrap:'wrap'}}>
            {s.online && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: 'var(--tf-info-100)', color: 'var(--tf-info-600)',
              }}>Reserva online</span>
            )}
            {s.approval && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: 'var(--tf-warn-100)', color: 'var(--tf-warn-600)',
              }}>Requiere aprobación</span>
            )}
          </div>
        </div>
      </div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--tf-border)'}}>
        <button onClick={() => setActive(!active)} style={{
          display:'flex', alignItems:'center', gap: 8,
          background:'none', border:'none', cursor:'pointer', padding: 0,
        }}>
          <span style={{
            width: 32, height: 18, borderRadius: 9, padding: 2,
            background: active ? 'var(--tf-primary-500)' : 'var(--tf-border-2)',
            transition: 'background 0.2s',
          }}>
            <span style={{
              display:'block', width: 14, height: 14, borderRadius: 7, background:'#fff',
              transform: active ? 'translateX(14px)' : 'translateX(0)',
              transition: 'transform 0.2s',
            }}/>
          </span>
          <span style={{fontSize: 12, fontWeight: 600, color: active ? 'var(--tf-primary-700)' : 'var(--tf-fg-muted)'}}>
            {active ? 'Activo' : 'Pausado'}
          </span>
        </button>
        <button className="tf-btn tf-btn-ghost" style={{padding:'6px 10px', fontSize: 12}}>
          <Ico.Edit size={14}/>Editar
        </button>
      </div>
    </Card>
  );
}

// ───── Staff ─────
function ScreenStaff({ onMenu, onCreate }) {
  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      <MobileTopbar title="Profesionales" subtitle={`${TF.STAFF.length} en el equipo`} onMenu={onMenu} onAction={onCreate}/>
      <div style={{padding: '14px 14px 100px', display:'flex', flexDirection:'column', gap: 10}}>
        {TF.STAFF.map(s => (
          <Card key={s.id} style={{padding: 14, display:'flex', gap: 12, alignItems:'flex-start'}}>
            <div style={{position:'relative'}}>
              <Avatar name={s.name} color={s.color} size={48}/>
              {s.bookable && (
                <span style={{
                  position:'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7,
                  background: 'var(--tf-primary-500)', border: '2px solid var(--tf-surface)',
                }}/>
              )}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display:'flex', alignItems:'baseline', gap: 6, flexWrap:'wrap'}}>
                <span style={{fontWeight: 700, fontSize: 15}}>{s.name}</span>
                <span style={{fontSize: 11, color:'var(--tf-fg-muted)'}}>· {s.nick}</span>
              </div>
              <div style={{display:'flex', gap: 4, marginTop: 6, flexWrap: 'wrap'}}>
                {s.specialties.map(sp => (
                  <span key={sp} style={{
                    fontSize: 10, fontWeight: 600, padding:'2px 7px', borderRadius: 999,
                    background: 'var(--tf-surface-2)', color:'var(--tf-fg-muted)',
                    border: '1px solid var(--tf-border)',
                  }}>{sp}</span>
                ))}
              </div>
              <div style={{display:'flex', gap: 10, marginTop: 8, fontSize: 11, color:'var(--tf-fg-muted)'}}>
                <span style={{display:'inline-flex', alignItems:'center', gap: 4}}>
                  <span style={{width:8, height:8, borderRadius:4, background: s.bookable ? 'var(--tf-primary-500)' : 'var(--tf-fg-subtle)'}}/>
                  {s.bookable ? 'Reservable' : 'No reservable'}
                </span>
                <span style={{display:'inline-flex', alignItems:'center', gap: 4}}>
                  <span style={{width:8, height:8, borderRadius:4, background: s.online ? 'var(--tf-info-500)' : 'var(--tf-fg-subtle)'}}/>
                  {s.online ? 'Online sí' : 'Online no'}
                </span>
              </div>
            </div>
            <button className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.MoreV/></button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ───── Reminders ─────
function ScreenReminders({ onMenu }) {
  const [day, setDay] = React.useState('today');
  const targets = TF.APPTS_TODAY.filter(a => ['confirmed','client_confirmed','reminded'].includes(a.status));

  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      <MobileTopbar title="Recordatorios" subtitle="WhatsApp" onMenu={onMenu}/>

      {/* Day chips */}
      <div style={{padding: '12px 14px 8px', display:'flex', gap: 6, overflowX:'auto'}}>
        {[
          { k: 'today',     l: 'Hoy', d: '5 may' },
          { k: 'tomorrow',  l: 'Mañana', d: '6 may' },
          { k: 'd2',        l: '+2 días', d: '7 may' },
          { k: 'd3',        l: '+3 días', d: '8 may' },
        ].map(c => (
          <button key={c.k} onClick={() => setDay(c.k)} className="tf-tap" style={{
            padding: '8px 14px', borderRadius: 12,
            background: day === c.k ? 'var(--tf-fg)' : 'var(--tf-surface)',
            color: day === c.k ? 'var(--tf-bg)' : 'var(--tf-fg)',
            border: '1px solid var(--tf-border)', cursor:'pointer',
            fontWeight: 600, fontSize: 12, display:'flex', flexDirection:'column', alignItems:'center', gap: 1,
            flexShrink: 0,
          }}>
            <span style={{fontSize: 13, fontWeight: 700}}>{c.l}</span>
            <span style={{fontSize: 10, opacity: 0.7}}>{c.d}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{padding: '6px 14px', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 8}}>
        <StatCard mesh="tf-mesh-info" icon={Ico.Calendar} value={targets.length} label="Por enviar"/>
        <StatCard mesh="tf-mesh-primary" icon={Ico.Check} value="3" label="Enviados"/>
        <StatCard mesh="tf-mesh-secondary" icon={Ico.Wa} value="92%" label="Tasa de respuesta"/>
      </div>

      {/* Batch action */}
      <div style={{padding: '12px 14px'}}>
        <button className="tf-mesh-primary tf-tap" style={{
          width: '100%', padding: 14, borderRadius: 14, color:'#fff',
          border: 'none', boxShadow: 'var(--tf-shadow-primary)',
          display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          <Ico.Send size={18}/>
          Enviar a {targets.length} clientes ahora
        </button>
      </div>

      {/* List */}
      <div style={{padding: '4px 14px 100px'}}>
        <div style={{fontSize: 11, fontWeight: 700, color:'var(--tf-fg-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom: 8, padding: '0 4px'}}>
          Por enviar
        </div>
        <div style={{display:'flex', flexDirection:'column', gap: 8}}>
          {targets.map(a => {
            const cu = TF.customer(a.cu);
            const sv = TF.service(a.sv);
            return (
              <Card key={a.id} style={{padding: 12, display:'flex', gap: 10, alignItems:'center'}}>
                <Avatar name={cu.name} color={sv.color} size={36}/>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 13, fontWeight: 700}}>{cu.name}</div>
                  <div style={{fontSize: 11, color:'var(--tf-fg-muted)'}}>{a.t} · {sv.name}</div>
                </div>
                <button style={{
                  padding: '8px 10px', borderRadius: 999,
                  background: '#22c55e', color: '#fff', border: 'none',
                  fontWeight: 700, fontSize: 11, display: 'flex', alignItems:'center', gap: 4,
                  cursor: 'pointer', boxShadow: '0 4px 10px -3px rgba(34,197,94,0.5)',
                }}>
                  <Ico.Wa size={12}/>Enviar
                </button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ mesh, icon, value, label }) {
  const I = icon;
  return (
    <div className={mesh} style={{
      padding: 12, borderRadius: 12, color: '#fff',
      boxShadow: 'var(--tf-shadow-sm)', display:'flex', flexDirection:'column', gap: 8,
    }}>
      <I size={16}/>
      <div>
        <div style={{fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing:'-0.02em'}}>{value}</div>
        <div style={{fontSize: 10, color:'rgba(255,255,255,0.85)', marginTop: 2}}>{label}</div>
      </div>
    </div>
  );
}

// ───── Admin: organizations ─────
function ScreenOrganizations({ onMenu }) {
  const orgs = [
    { name: 'Studio Bella', slug: 'studio-bella', owner: 'Sofía M.', members: 5, license: 'active', tz: 'America/Argentina/BA', expires: '12 dic 2026' },
    { name: 'Barbería Norte', slug: 'barberia-norte', owner: 'Lucas F.', members: 3, license: 'active', tz: 'America/Argentina/BA', expires: '02 nov 2026' },
    { name: 'Centro Estético Sur', slug: 'estetico-sur', owner: 'Valentina P.', members: 8, license: 'expiring', tz: 'America/Argentina/BA', expires: '12 may 2026' },
    { name: 'Spa Palermo', slug: 'spa-palermo', owner: 'Camila R.', members: 6, license: 'active', tz: 'America/Argentina/BA', expires: '08 jul 2026' },
    { name: 'Clínica Vida', slug: 'clinica-vida', owner: 'Diego A.', members: 12, license: 'expired', tz: 'America/Argentina/BA', expires: '12 abr 2026' },
  ];
  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      <MobileTopbar title="Organizaciones" subtitle={`${orgs.length} negocios`} onMenu={onMenu} onAction={() => {}}/>
      <div style={{padding: '14px 14px 100px', display:'flex', flexDirection:'column', gap: 10}}>
        {orgs.map((o, i) => {
          const lic = o.license === 'active' ? { c:'var(--tf-primary-600)', bg:'var(--tf-primary-100)', l:'Activa' } :
                      o.license === 'expiring' ? { c:'var(--tf-warn-600)', bg:'var(--tf-warn-100)', l:'Por vencer' } :
                      { c:'var(--tf-danger-600)', bg:'var(--tf-danger-100)', l:'Vencida' };
          return (
            <Card key={i} style={{padding: 14}}>
              <div style={{display:'flex', alignItems:'flex-start', gap: 12}}>
                <div className="tf-mesh-info" style={{
                  width: 42, height: 42, borderRadius: 10, color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
                }}><Ico.Building size={20}/></div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{display:'flex', alignItems:'center', gap: 6}}>
                    <span style={{fontWeight: 700, fontSize: 15}}>{o.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding:'2px 7px', borderRadius: 999,
                      background: lic.bg, color: lic.c,
                    }}>{lic.l}</span>
                  </div>
                  <div style={{fontSize: 12, color:'var(--tf-fg-muted)', marginTop: 2}}>
                    /{o.slug} · {o.owner} · {o.members} miembros
                  </div>
                  <div style={{fontSize: 11, color:'var(--tf-fg-subtle)', marginTop: 4}}>
                    Vence: {o.expires}
                  </div>
                </div>
                <button className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.MoreV/></button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ───── Admin: users ─────
function ScreenUsers({ onMenu }) {
  const users = [
    { name: 'Sofía Martínez',  email: 'sofia@studiobella.com',  role: 'owner',  org: 'Studio Bella' },
    { name: 'Lucas Fernández', email: 'lucas@barberianorte.com',role: 'owner',  org: 'Barbería Norte' },
    { name: 'Camila Ruiz',     email: 'cami@studiobella.com',   role: 'staff',  org: 'Studio Bella' },
    { name: 'Diego Álvarez',   email: 'diego@spapalermo.com',   role: 'staff',  org: 'Spa Palermo' },
    { name: 'Admin Principal', email: 'admin@turnoflash.com',   role: 'admin',  org: '—' },
    { name: 'Valentina Pérez', email: 'vale@esteticosur.com',   role: 'owner',  org: 'Centro Estético Sur' },
  ];
  const roleStyle = (r) =>
    r === 'admin'  ? { bg: 'var(--tf-secondary-100)', c: 'var(--tf-secondary-600)' } :
    r === 'owner'  ? { bg: 'var(--tf-primary-100)',   c: 'var(--tf-primary-700)' } :
                     { bg: 'var(--tf-info-100)',      c: 'var(--tf-info-600)' };
  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      <MobileTopbar title="Usuarios" subtitle={`${users.length} cuentas`} onMenu={onMenu}
        onAction={() => {}} actionIcon={<Ico.UserPlus/>}/>
      <div style={{padding:'12px 14px'}}>
        <button className="tf-btn tf-btn-soft" style={{width:'100%', justifyContent:'center'}}>
          <Ico.Mail size={16}/>Invitar nuevo usuario
        </button>
      </div>
      <div style={{padding: '4px 14px 100px', display:'flex', flexDirection:'column', gap: 8}}>
        {users.map((u, i) => {
          const rs = roleStyle(u.role);
          return (
            <Card key={i} style={{padding: 12, display:'flex', alignItems:'center', gap: 12}}>
              <Avatar name={u.name} color="var(--tf-fg)" size={40}/>
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontWeight: 700, fontSize: 14}}>{u.name}</div>
                <div style={{fontSize: 12, color:'var(--tf-fg-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.email}</div>
                <div style={{fontSize: 11, color:'var(--tf-fg-subtle)', marginTop: 2}}>{u.org}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding:'4px 9px', borderRadius: 999,
                background: rs.bg, color: rs.c, textTransform: 'uppercase', letterSpacing:'0.04em',
              }}>{u.role}</span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ───── New Org form ─────
function ScreenNewOrg({ onMenu, onBack }) {
  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      <MobileTopbar
        title="Nueva organización"
        leading={<button onClick={onBack} className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.ChevL/></button>}
      />
      <div style={{padding: '18px 16px 100px', display:'flex', flexDirection:'column', gap: 14}}>
        <Field label="Nombre del negocio">
          <input className="tf-input" defaultValue="Estética Norte"/>
        </Field>
        <Field label="Slug (URL)">
          <div style={{display:'flex', alignItems:'center', gap: 8}}>
            <span style={{fontSize: 13, color:'var(--tf-fg-muted)'}}>turnoflash.com/</span>
            <input className="tf-input" defaultValue="estetica-norte" style={{flex:1}}/>
          </div>
          <div style={{fontSize: 11, color:'var(--tf-fg-subtle)', marginTop: 4}}>Auto-generado desde el nombre</div>
        </Field>
        <Field label="Owner asignado">
          <div style={{
            display:'flex', alignItems:'center', gap: 10, padding: '10px 12px',
            borderRadius: 'var(--tf-radius)', background:'var(--tf-surface-2)',
            border:'1px solid var(--tf-border)',
          }}>
            <Avatar name="Valentina Pérez" color="var(--tf-warn-500)" size={28}/>
            <div style={{flex:1}}>
              <div style={{fontSize: 13, fontWeight: 600}}>Valentina Pérez</div>
              <div style={{fontSize: 11, color:'var(--tf-fg-muted)'}}>vale@esteticosur.com</div>
            </div>
            <Ico.ChevR size={14} style={{color:'var(--tf-fg-muted)'}}/>
          </div>
        </Field>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10}}>
          <Field label="Inicio licencia"><input className="tf-input" defaultValue="05/05/2026"/></Field>
          <Field label="Fin licencia"><input className="tf-input" defaultValue="05/05/2027"/></Field>
        </div>
        <Field label="Zona horaria">
          <select className="tf-input">
            <option>America/Argentina/Buenos_Aires</option>
            <option>America/Mexico_City</option>
            <option>Europe/Madrid</option>
          </select>
        </Field>
        <button className="tf-btn tf-btn-primary" style={{justifyContent:'center', marginTop: 8}}>
          Crear organización
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenCustomers, CustomerCard, ScreenServices, ServiceCard,
  ScreenStaff, ScreenReminders, StatCard,
  ScreenOrganizations, ScreenUsers, ScreenNewOrg,
});
