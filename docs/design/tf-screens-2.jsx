// TurnoFlash — appointments + calendars + clients/services/staff/reminders/admin
// Loads after tf-screens-1.jsx

// ───── Appointments ─────
function ScreenAppointments({ onMenu, onCreate, onOpen }) {
  const [view, setView] = React.useState('list'); // list | day | week
  const [filter, setFilter] = React.useState('all');
  const [appts, setAppts] = React.useState(TF.APPTS_TODAY);
  const [search, setSearch] = React.useState('');

  const visible = appts.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search) {
      const cu = TF.customer(a.cu);
      const sv = TF.service(a.sv);
      const q = search.toLowerCase();
      if (!cu.name.toLowerCase().includes(q) && !sv.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const advanceStatus = (ap, to) => {
    setAppts(prev => prev.map(x => x.id === ap.id ? {...x, status: to} : x));
  };

  return (
    <div style={{flex:1, overflowY:'auto', background:'var(--tf-bg)'}}>
      {/* Top */}
      <div style={{
        position:'sticky', top: 0, zIndex: 5,
        background:'var(--tf-surface)', borderBottom:'1px solid var(--tf-border)',
      }}>
        <MobileTopbar
          title="Turnos"
          subtitle="martes 5 may · 15 turnos"
          onMenu={onMenu}
          onAction={onCreate}
        />
        {/* View switcher */}
        <div style={{padding: '10px 14px 8px', display:'flex', gap: 8, alignItems:'center'}}>
          <div style={{
            display:'flex', background:'var(--tf-surface-2)',
            borderRadius: 10, padding: 3, border:'1px solid var(--tf-border)',
            flex: 1,
          }}>
            {[
              { k:'list',  l:'Lista' },
              { k:'day',   l:'Día' },
              { k:'week',  l:'Semana' },
            ].map(t => (
              <button key={t.k} onClick={() => setView(t.k)} className="tf-tap" style={{
                flex: 1, padding: '7px 10px', borderRadius: 7,
                border: 'none',
                background: view === t.k ? 'var(--tf-surface)' : 'transparent',
                fontWeight: 600, fontSize: 13, cursor:'pointer',
                color: view === t.k ? 'var(--tf-fg)' : 'var(--tf-fg-muted)',
                boxShadow: view === t.k ? 'var(--tf-shadow-sm)' : 'none',
              }}>{t.l}</button>
            ))}
          </div>
        </div>
        {/* Search + filters */}
        {view === 'list' && (
          <div style={{padding: '0 14px 10px', display:'flex', flexDirection:'column', gap: 8}}>
            <div style={{position:'relative'}}>
              <Ico.Search size={16} style={{position:'absolute', top: 11, left: 12, color: 'var(--tf-fg-muted)'}}/>
              <input className="tf-input" placeholder="Buscar cliente o servicio…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{paddingLeft: 36}}/>
            </div>
            <div style={{display:'flex', gap: 6, overflowX:'auto', paddingBottom: 4}}>
              {[
                { k:'all',              l:'Todos' },
                { k:'pending',          l:'Pendientes' },
                { k:'confirmed',        l:'Confirmados' },
                { k:'checked_in',       l:'Check-in' },
                { k:'in_progress',      l:'En curso' },
                { k:'completed',        l:'Completados' },
              ].map(f => (
                <button key={f.k} onClick={() => setFilter(f.k)} className="tf-tap" style={{
                  padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: filter === f.k ? 'var(--tf-fg)' : 'var(--tf-surface)',
                  color: filter === f.k ? 'var(--tf-bg)' : 'var(--tf-fg-muted)',
                  border:'1px solid var(--tf-border)', cursor:'pointer', flexShrink: 0,
                }}>{f.l}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {view === 'list' && (
        <div style={{padding: '12px 14px 100px', display:'flex', flexDirection:'column', gap: 8}}>
          {/* Group by morning/afternoon */}
          {visible.length === 0 && <EmptyState/>}
          {visible.length > 0 && (
            <>
              <SectionHeader label="Mañana" count={visible.filter(a => parseInt(a.t) < 13).length}/>
              {visible.filter(a => parseInt(a.t) < 13).map(a => (
                <ApptRow key={a.id} ap={a} onAction={advanceStatus}/>
              ))}
              <SectionHeader label="Tarde" count={visible.filter(a => parseInt(a.t) >= 13).length}/>
              {visible.filter(a => parseInt(a.t) >= 13).map(a => (
                <ApptRow key={a.id} ap={a} onAction={advanceStatus}/>
              ))}
            </>
          )}
        </div>
      )}

      {view === 'day' && <DayCalendar appts={visible} onOpen={onOpen}/>}
      {view === 'week' && <WeekCalendar/>}

      {/* Floating action */}
      <button onClick={onCreate} className="tf-mesh-primary tf-tap" style={{
        position:'absolute', right: 16, bottom: 86, zIndex: 4,
        width: 56, height: 56, borderRadius: 28, color:'#fff', border: 'none',
        boxShadow:'var(--tf-shadow-primary), var(--tf-shadow-lg)',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
      }}>
        <Ico.Plus size={24}/>
      </button>
    </div>
  );
}

function SectionHeader({ label, count }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: 8,
      padding: '6px 4px', fontSize: 11, fontWeight: 700,
      color:'var(--tf-fg-muted)', letterSpacing:'0.06em', textTransform:'uppercase',
    }}>
      <span>{label}</span>
      <span style={{
        background:'var(--tf-surface-2)', padding:'1px 7px', borderRadius: 999, fontSize: 10,
      }}>{count}</span>
      <div style={{flex:1, height: 1, background:'var(--tf-border)'}}/>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{padding: '40px 20px', textAlign:'center'}}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: 'var(--tf-surface-2)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        color:'var(--tf-fg-subtle)', marginBottom: 12,
      }}><Ico.Calendar size={24}/></div>
      <div style={{fontWeight: 700, fontSize: 15}}>Sin turnos</div>
      <div style={{fontSize: 12, color:'var(--tf-fg-muted)', marginTop: 4}}>
        No encontramos turnos con esos filtros.
      </div>
    </div>
  );
}

// ───── Day calendar ─────
function DayCalendar({ appts, onOpen }) {
  const HOUR_PX = 56;
  const startHour = 8, endHour = 20;
  const hours = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  const NOW_HOUR = 11;
  const NOW_MIN = 18;

  return (
    <div style={{padding: '10px 14px 100px'}}>
      {/* Date header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding: '8px 4px', marginBottom: 8,
      }}>
        <button className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.ChevL/></button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize: 11, color:'var(--tf-fg-muted)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.05em'}}>Martes</div>
          <div style={{fontSize: 18, fontWeight: 800, letterSpacing:'-0.02em'}}>5 de mayo</div>
        </div>
        <button className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.ChevR/></button>
      </div>

      <div style={{position:'relative', display:'flex', gap: 0,
        background:'var(--tf-surface)', borderRadius: 14,
        border:'1px solid var(--tf-border)', overflow:'hidden',
      }}>
        {/* Hour rail */}
        <div style={{width: 44, flexShrink: 0, paddingTop: 4, borderRight: '1px solid var(--tf-border)'}}>
          {hours.map(h => (
            <div key={h} style={{
              height: HOUR_PX, fontSize: 11, color: 'var(--tf-fg-muted)',
              padding: '4px 6px', textAlign:'right', fontVariantNumeric:'tabular-nums',
              fontWeight: 600,
            }}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>
        {/* Slots */}
        <div style={{flex:1, position:'relative', paddingTop: 4}}>
          {hours.map(h => (
            <div key={h} style={{
              height: HOUR_PX, borderTop: '1px dashed var(--tf-border)', position:'relative',
            }}>
              <div style={{
                position:'absolute', top:'50%', left: 0, right: 0,
                borderTop: '1px dotted var(--tf-border-2)', opacity: 0.5,
              }}/>
            </div>
          ))}

          {/* Now indicator */}
          <div style={{
            position:'absolute', left: 0, right: 0,
            top: 4 + (NOW_HOUR - startHour + NOW_MIN/60) * HOUR_PX,
            height: 0, borderTop: '2px solid var(--tf-secondary-500)',
            zIndex: 3,
          }}>
            <div style={{
              position:'absolute', left: -6, top: -5, width: 10, height: 10,
              borderRadius: 5, background: 'var(--tf-secondary-500)',
              boxShadow: 'var(--tf-shadow-secondary)',
            }}/>
            <span style={{
              position:'absolute', right: 6, top: -10, fontSize: 10, fontWeight: 700,
              color: 'var(--tf-secondary-500)', background:'var(--tf-surface)',
              padding:'1px 6px', borderRadius: 4,
            }}>{String(NOW_HOUR).padStart(2,'0')}:{String(NOW_MIN).padStart(2,'0')}</span>
          </div>

          {/* Appointments */}
          {appts.map(a => {
            const sv = TF.service(a.sv);
            const cu = TF.customer(a.cu);
            const startMin = TF.timeToMinutes(a.t) - startHour * 60;
            const top = 4 + (startMin / 60) * HOUR_PX;
            const h = (sv.duration / 60) * HOUR_PX;
            return (
              <div key={a.id}
                onClick={() => onOpen && onOpen(a)}
                className={`tf-st-${a.status}`}
                style={{
                  position:'absolute', left: 6, right: 6,
                  top, height: h - 2, borderRadius: 8,
                  background: 'var(--bg)', borderLeft: '4px solid var(--c)',
                  padding: '6px 8px', overflow: 'hidden', cursor: 'pointer',
                  boxShadow: 'var(--tf-shadow-xs)',
                }}>
                <div style={{display:'flex', alignItems:'center', gap: 5, marginBottom: 2}}>
                  <span style={{fontSize: 10, fontWeight: 700, color: 'var(--cb)', fontVariantNumeric:'tabular-nums'}}>
                    {a.t} · {sv.duration}m
                  </span>
                </div>
                <div style={{fontSize: 12, fontWeight: 700, color:'var(--cb)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {cu.name}
                </div>
                {h > 40 && <div style={{fontSize: 11, color: 'var(--cb)', opacity: 0.85, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {sv.name}
                </div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───── Week calendar ─────
function WeekCalendar() {
  const HOUR_PX = 38;
  const startHour = 9, endHour = 19;
  const hours = []; for (let h = startHour; h <= endHour; h++) hours.push(h);
  const days = [
    { lab:'Lun', d: 4, count: 8 },
    { lab:'Mar', d: 5, count: 15, today: true },
    { lab:'Mié', d: 6, count: 11 },
    { lab:'Jue', d: 7, count: 9 },
    { lab:'Vie', d: 8, count: 14 },
    { lab:'Sáb', d: 9, count: 18 },
    { lab:'Dom', d: 10, count: 0 },
  ];
  // Fake appts for the week
  const fakeAppts = [
    { day: 0, t: '10:00', dur: 30, status:'completed' },
    { day: 0, t: '14:00', dur: 60, status:'completed' },
    { day: 1, t: '09:30', dur: 90, status:'in_progress' },
    { day: 1, t: '11:00', dur: 45, status:'client_confirmed' },
    { day: 1, t: '13:00', dur: 60, status:'confirmed' },
    { day: 1, t: '17:00', dur: 90, status:'pending' },
    { day: 2, t: '10:00', dur: 60, status:'confirmed' },
    { day: 2, t: '15:00', dur: 30, status:'reminded' },
    { day: 3, t: '11:00', dur: 45, status:'pending' },
    { day: 3, t: '16:00', dur: 60, status:'confirmed' },
    { day: 4, t: '09:00', dur: 30, status:'confirmed' },
    { day: 4, t: '14:30', dur: 75, status:'pending' },
    { day: 5, t: '10:00', dur: 60, status:'confirmed' },
    { day: 5, t: '12:00', dur: 45, status:'confirmed' },
    { day: 5, t: '15:00', dur: 90, status:'pending' },
  ];

  return (
    <div style={{padding: '10px 14px 100px'}}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 4px', marginBottom: 8,
      }}>
        <button className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.ChevL/></button>
        <div style={{fontSize:14, fontWeight: 700}}>4 — 10 mayo</div>
        <button className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.ChevR/></button>
      </div>
      <div style={{
        background:'var(--tf-surface)', borderRadius: 14,
        border:'1px solid var(--tf-border)', overflow: 'hidden',
      }}>
        {/* Day headers */}
        <div style={{
          display:'grid', gridTemplateColumns: '32px repeat(7, 1fr)',
          borderBottom:'1px solid var(--tf-border)', background:'var(--tf-surface-2)',
        }}>
          <div></div>
          {days.map((d, i) => (
            <div key={i} style={{
              padding: '8px 2px', textAlign: 'center',
              borderLeft: '1px solid var(--tf-border)',
            }}>
              <div style={{fontSize: 9, color:'var(--tf-fg-muted)', fontWeight: 700, textTransform:'uppercase'}}>{d.lab}</div>
              <div style={{
                marginTop: 2,
                width: 22, height: 22, lineHeight: '22px', borderRadius: 11,
                fontSize: 12, fontWeight: 800, margin: '0 auto',
                background: d.today ? 'var(--tf-primary-500)' : 'transparent',
                color: d.today ? '#fff' : 'var(--tf-fg)',
              }}>{d.d}</div>
              <div style={{fontSize: 9, color:'var(--tf-fg-subtle)', marginTop: 2}}>{d.count || '—'}</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{
          display:'grid', gridTemplateColumns: '32px repeat(7, 1fr)',
          position:'relative', minHeight: hours.length * HOUR_PX,
        }}>
          {/* Hour rail */}
          <div>
            {hours.map(h => (
              <div key={h} style={{
                height: HOUR_PX, fontSize: 9, color: 'var(--tf-fg-muted)',
                padding: '2px 2px 0 0', textAlign:'right', borderTop:'1px dashed var(--tf-border)',
                fontWeight: 600,
              }}>
                {String(h).padStart(2,'0')}
              </div>
            ))}
          </div>
          {days.map((d, di) => (
            <div key={di} style={{
              borderLeft: '1px solid var(--tf-border)', position: 'relative',
              background: d.today ? 'rgba(34, 197, 94, 0.04)' : 'transparent',
            }}>
              {hours.map(h => (
                <div key={h} style={{height: HOUR_PX, borderTop: '1px dashed var(--tf-border)'}}/>
              ))}
              {fakeAppts.filter(a => a.day === di).map((a, i) => {
                const startMin = TF.timeToMinutes(a.t) - startHour * 60;
                const top = (startMin / 60) * HOUR_PX;
                const h = (a.dur / 60) * HOUR_PX;
                return (
                  <div key={i} className={`tf-st-${a.status}`} style={{
                    position:'absolute', left: 1, right: 1, top, height: Math.max(h - 1, 12),
                    background:'var(--bg)', borderLeft: '2px solid var(--c)',
                    borderRadius: 3, fontSize: 8, color:'var(--cb)',
                    padding:'1px 3px', overflow:'hidden', fontWeight:700, fontVariantNumeric:'tabular-nums',
                  }}>{a.t}</div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───── Appointment modal ─────
function ApptModal({ open, onClose, ap, mode = 'create' }) {
  if (!open) return null;
  const cu = ap ? TF.customer(ap.cu) : null;
  const sv = ap ? TF.service(ap.sv) : null;
  const st = ap ? TF.staff(ap.st) : null;

  return (
    <>
      <div onClick={onClose} style={{
        position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', zIndex: 40,
        animation:'tf-fade-in 0.2s ease',
      }}/>
      <div style={{
        position:'absolute', left: 0, right: 0, bottom: 0, zIndex: 41,
        background:'var(--tf-surface)', borderRadius: '20px 20px 0 0',
        animation:'tf-fade-in 0.25s ease', maxHeight: '85%', overflowY: 'auto',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{padding: '8px 0', display:'flex', justifyContent:'center'}}>
          <div style={{width: 40, height: 4, borderRadius: 2, background:'var(--tf-border-2)'}}/>
        </div>
        <div style={{padding: '8px 18px 18px'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16}}>
            <div style={{fontSize: 18, fontWeight: 800, letterSpacing:'-0.02em'}}>
              {mode === 'create' ? 'Nuevo turno' : 'Detalle de turno'}
            </div>
            <button onClick={onClose} className="tf-btn tf-btn-icon tf-btn-ghost"><Ico.X/></button>
          </div>

          {mode === 'create' ? (
            <div style={{display:'flex', flexDirection:'column', gap: 12}}>
              <Field label="Cliente">
                <div style={{
                  display:'flex', alignItems:'center', gap: 10, padding: '10px 12px',
                  borderRadius: 'var(--tf-radius)', background:'var(--tf-surface-2)',
                  border:'1px solid var(--tf-border)',
                }}>
                  <Avatar name="Martina Gómez" color="#db2777" size={28}/>
                  <div style={{flex:1, minWidth: 0}}>
                    <div style={{fontSize: 13, fontWeight: 600}}>Martina Gómez</div>
                    <div style={{fontSize: 11, color:'var(--tf-fg-muted)'}}>+54 9 11 4123-9821</div>
                  </div>
                  <Ico.ChevR size={14} style={{color:'var(--tf-fg-muted)'}}/>
                </div>
              </Field>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10}}>
                <Field label="Fecha">
                  <input className="tf-input" defaultValue="05/05/2026"/>
                </Field>
                <Field label="Hora">
                  <input className="tf-input" defaultValue="15:30"/>
                </Field>
              </div>
              <Field label="Servicio">
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6}}>
                  {TF.SERVICES.slice(0,4).map(s => (
                    <button key={s.id} className="tf-tap" style={{
                      padding:'10px', borderRadius:'var(--tf-radius)',
                      background: s.id === 's2' ? 'var(--tf-primary-50)' : 'var(--tf-surface)',
                      border: `1px solid ${s.id === 's2' ? 'var(--tf-primary-500)' : 'var(--tf-border)'}`,
                      textAlign:'left', cursor:'pointer',
                    }}>
                      <div style={{display:'flex', alignItems:'center', gap: 6, marginBottom: 2}}>
                        <span style={{width: 8, height: 8, borderRadius: 4, background: s.color}}/>
                        <span style={{fontSize: 12, fontWeight: 600}}>{s.name}</span>
                      </div>
                      <div style={{fontSize: 10, color:'var(--tf-fg-muted)'}}>{TF.fmtDuration(s.duration)} · {TF.fmtMoney(s.price)}</div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Profesional">
                <div style={{display:'flex', gap: 6, overflowX:'auto'}}>
                  {TF.STAFF.filter(s => s.bookable).map(s => (
                    <button key={s.id} className="tf-tap" style={{
                      flexShrink: 0, padding:'8px 12px 8px 8px', borderRadius: 999,
                      background: s.id === 'p2' ? 'var(--tf-fg)' : 'var(--tf-surface)',
                      color: s.id === 'p2' ? 'var(--tf-bg)' : 'var(--tf-fg)',
                      border: '1px solid var(--tf-border)',
                      display:'flex', alignItems:'center', gap: 6, fontSize: 12, fontWeight: 600, cursor:'pointer',
                    }}>
                      <span style={{width: 8, height: 8, borderRadius: 4, background: s.color}}/>
                      {s.nick}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Notas (opcional)">
                <textarea className="tf-input" rows="2" placeholder="Algo importante para este turno…"/>
              </Field>
              <div style={{display:'flex', gap: 8, marginTop: 8}}>
                <button onClick={onClose} className="tf-btn tf-btn-ghost" style={{flex: 1}}>Cancelar</button>
                <button onClick={onClose} className="tf-btn tf-btn-primary" style={{flex: 2, justifyContent:'center'}}>Crear turno</button>
              </div>
            </div>
          ) : (
            // Detail mode
            <div>
              <div style={{display:'flex', alignItems:'center', gap: 12, marginBottom: 14}}>
                <Avatar name={cu.name} color={st.color} size={48}/>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 17, fontWeight: 700}}>{cu.name}</div>
                  <div style={{fontSize: 12, color:'var(--tf-fg-muted)', display:'flex', gap: 6, alignItems:'center'}}>
                    <Ico.Phone size={11}/>{cu.phone}
                  </div>
                </div>
                <StatusBadge status={ap.status}/>
              </div>
              <div style={{
                display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 8,
                padding: 12, borderRadius: 12, background:'var(--tf-surface-2)', marginBottom: 14,
              }}>
                <DetailItem label="Fecha" value="Martes 5 may"/>
                <DetailItem label="Hora" value={`${ap.t} – ${TF.addMinutes(ap.t, sv.duration)}`}/>
                <DetailItem label="Servicio" value={sv.name} dot={sv.color}/>
                <DetailItem label="Profesional" value={st.name} dot={st.color}/>
                <DetailItem label="Duración" value={TF.fmtDuration(sv.duration)}/>
                <DetailItem label="Precio" value={TF.fmtMoney(sv.price)}/>
              </div>
              {/* Action buttons */}
              <div style={{display:'flex', flexDirection:'column', gap: 8}}>
                {TF.NEXT_ACTIONS[ap.status] && (
                  <button className="tf-btn tf-btn-primary" style={{width:'100%', justifyContent:'center'}}>
                    {TF.NEXT_ACTIONS[ap.status].label} →
                  </button>
                )}
                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 6}}>
                  <button className="tf-btn tf-btn-ghost" style={{flexDirection:'column', padding: '10px 6px', height: 'auto', fontSize: 11, gap: 4}}>
                    <Ico.Wa size={18}/>WhatsApp
                  </button>
                  <button className="tf-btn tf-btn-ghost" style={{flexDirection:'column', padding: '10px 6px', height: 'auto', fontSize: 11, gap: 4}}>
                    <Ico.Edit size={18}/>Editar
                  </button>
                  <button className="tf-btn tf-btn-ghost" style={{flexDirection:'column', padding: '10px 6px', height: 'auto', fontSize: 11, gap: 4, color:'var(--tf-danger-600)'}}>
                    <Ico.X size={18}/>Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{fontSize: 11, fontWeight: 700, color:'var(--tf-fg-muted)', textTransform:'uppercase', letterSpacing:'0.05em'}}>{label}</label>
      <div style={{marginTop: 6}}>{children}</div>
    </div>
  );
}

function DetailItem({ label, value, dot }) {
  return (
    <div>
      <div style={{fontSize: 10, fontWeight: 600, color:'var(--tf-fg-muted)', textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize: 13, fontWeight: 600, marginTop: 2, display:'flex', alignItems:'center', gap: 6}}>
        {dot && <span style={{width: 8, height: 8, borderRadius: 4, background: dot}}/>}
        {value}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenAppointments, DayCalendar, WeekCalendar, ApptModal, Field, DetailItem });
