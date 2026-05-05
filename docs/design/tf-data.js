/* TurnoFlash — mock data and helpers (vanilla, exposed via window.TF) */
(function () {
  const STATUSES = [
    { key: 'pending',          label: 'Pendiente',           short: 'Pend.',     icon: 'clock' },
    { key: 'confirmed',        label: 'Confirmado',          short: 'Conf.',     icon: 'check' },
    { key: 'reminded',         label: 'Recordatorio enviado',short: 'Record.',   icon: 'bell' },
    { key: 'client_confirmed', label: 'Cliente confirmó',    short: 'Cliente OK',icon: 'check2' },
    { key: 'checked_in',       label: 'Check-in',            short: 'Check-in',  icon: 'door' },
    { key: 'in_progress',      label: 'En curso',            short: 'En curso',  icon: 'play' },
    { key: 'completed',        label: 'Completado',          short: 'Listo',     icon: 'check-circle' },
    { key: 'cancelled',        label: 'Cancelado',           short: 'Cancel.',   icon: 'x' },
    { key: 'no_show',          label: 'No asistió',          short: 'No vino',   icon: 'ghost' },
  ];

  const NEXT_ACTIONS = {
    pending:           { label: 'Confirmar',     to: 'confirmed' },
    confirmed:         { label: 'Enviar recordatorio', to: 'reminded' },
    reminded:          { label: 'Marcar confirmado por cliente', to: 'client_confirmed' },
    client_confirmed:  { label: 'Hacer check-in',to: 'checked_in' },
    checked_in:        { label: 'Empezar',       to: 'in_progress' },
    in_progress:       { label: 'Completar',     to: 'completed' },
    completed:         null,
    cancelled:         null,
    no_show:           null,
  };

  const SERVICES = [
    { id: 's1', name: 'Corte de pelo',          duration: 30, buffer: 5,  price: 4500, color: '#22c55e', online: true,  approval: false },
    { id: 's2', name: 'Corte + barba',          duration: 45, buffer: 10, price: 6800, color: '#3b82f6', online: true,  approval: false },
    { id: 's3', name: 'Coloración completa',    duration: 90, buffer: 15, price: 18500,color: '#db2777', online: true,  approval: true  },
    { id: 's4', name: 'Manicura semipermanente',duration: 60, buffer: 10, price: 7200, color: '#f59e0b', online: true,  approval: false },
    { id: 's5', name: 'Tratamiento facial',     duration: 75, buffer: 10, price: 12000,color: '#8b5cf6', online: false, approval: true  },
    { id: 's6', name: 'Masaje descontracturante',duration:60, buffer: 15, price: 9500, color: '#06b6d4', online: true,  approval: false },
  ];

  const STAFF = [
    { id: 'p1', name: 'Sofía Martínez',  nick: 'Sofi',   color: '#db2777', specialties: ['Color', 'Corte'],     bookable: true,  online: true  },
    { id: 'p2', name: 'Lucas Fernández', nick: 'Lucho',  color: '#22c55e', specialties: ['Barbería'],            bookable: true,  online: true  },
    { id: 'p3', name: 'Camila Ruiz',     nick: 'Cami',   color: '#8b5cf6', specialties: ['Manicura', 'Pedicura'],bookable: true,  online: true  },
    { id: 'p4', name: 'Diego Álvarez',   nick: 'Diego',  color: '#3b82f6', specialties: ['Masajes'],             bookable: true,  online: false },
    { id: 'p5', name: 'Valentina Pérez', nick: 'Vale',   color: '#f59e0b', specialties: ['Estética facial'],     bookable: false, online: false },
  ];

  const CUSTOMERS = [
    { id: 'c1', name: 'Martina Gómez',   phone: '+54 9 11 4123-9821', email: 'martina@mail.com',   wa: true,  notes: 'Prefiere turnos a la mañana.' },
    { id: 'c2', name: 'Joaquín Ríos',    phone: '+54 9 11 5678-2345', email: 'joaco@mail.com',     wa: true,  notes: '' },
    { id: 'c3', name: 'Florencia Pereyra',phone:'+54 9 11 6098-1122', email: 'flor.p@mail.com',    wa: true,  notes: 'Alergia a tinturas con amoníaco.' },
    { id: 'c4', name: 'Tomás Castro',    phone: '+54 9 11 3344-7788', email: '',                    wa: false, notes: '' },
    { id: 'c5', name: 'Antonella Vega',  phone: '+54 9 11 4422-9090', email: 'anto@mail.com',      wa: true,  notes: 'Cliente desde 2022.' },
    { id: 'c6', name: 'Mateo Suárez',    phone: '+54 9 11 7711-2244', email: 'mateo.s@mail.com',   wa: true,  notes: '' },
    { id: 'c7', name: 'Lara Domínguez',  phone: '+54 9 11 8800-4321', email: 'lara@mail.com',      wa: true,  notes: 'Suele llegar 5 min tarde.' },
    { id: 'c8', name: 'Bruno Costa',     phone: '+54 9 11 5512-7878', email: '',                    wa: false, notes: '' },
    { id: 'c9', name: 'Renata Acosta',   phone: '+54 9 11 6677-3030', email: 'rena@mail.com',      wa: true,  notes: '' },
    { id: 'c10',name: 'Iván Molina',     phone: '+54 9 11 4488-1212', email: 'ivan.m@mail.com',    wa: true,  notes: '' },
  ];

  // Today: a fixed reference so the prototype is deterministic
  const TODAY = { y: 2026, m: 5, d: 5 }; // 5 May 2026
  const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Build today's appointments — varied statuses
  // Each: { id, customerId, serviceId, staffId, start: 'HH:MM', status }
  const APPTS_TODAY = [
    { id: 'a1', cu: 'c1',  sv: 's2', st: 'p2', t: '08:30', status: 'completed' },
    { id: 'a2', cu: 'c5',  sv: 's4', st: 'p3', t: '09:00', status: 'completed' },
    { id: 'a3', cu: 'c3',  sv: 's3', st: 'p1', t: '09:30', status: 'in_progress' },
    { id: 'a4', cu: 'c7',  sv: 's1', st: 'p2', t: '10:30', status: 'checked_in' },
    { id: 'a5', cu: 'c2',  sv: 's2', st: 'p2', t: '11:00', status: 'client_confirmed' },
    { id: 'a6', cu: 'c10', sv: 's6', st: 'p4', t: '11:30', status: 'reminded' },
    { id: 'a7', cu: 'c4',  sv: 's1', st: 'p2', t: '12:30', status: 'no_show' },
    { id: 'a8', cu: 'c9',  sv: 's4', st: 'p3', t: '13:00', status: 'confirmed' },
    { id: 'a9', cu: 'c6',  sv: 's2', st: 'p2', t: '14:00', status: 'confirmed' },
    { id: 'a10',cu: 'c8',  sv: 's5', st: 'p1', t: '14:30', status: 'pending' },
    { id: 'a11',cu: 'c1',  sv: 's6', st: 'p4', t: '15:30', status: 'pending' },
    { id: 'a12',cu: 'c3',  sv: 's1', st: 'p2', t: '16:30', status: 'cancelled' },
    { id: 'a13',cu: 'c5',  sv: 's3', st: 'p1', t: '17:00', status: 'confirmed' },
    { id: 'a14',cu: 'c7',  sv: 's2', st: 'p2', t: '18:30', status: 'pending' },
    { id: 'a15',cu: 'c10', sv: 's4', st: 'p3', t: '19:00', status: 'pending' },
  ];

  // Helpers
  function customer(id) { return CUSTOMERS.find(c => c.id === id); }
  function service(id)  { return SERVICES.find(s => s.id === id); }
  function staff(id)    { return STAFF.find(s => s.id === id); }
  function status(key)  { return STATUSES.find(s => s.key === key); }

  function fmtMoney(n) {
    return '$' + n.toLocaleString('es-AR');
  }

  function fmtDuration(min) {
    if (min < 60) return min + ' min';
    const h = Math.floor(min/60), m = min%60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function timeToMinutes(t) {
    const [h,m] = t.split(':').map(Number);
    return h*60 + m;
  }

  function addMinutes(t, mm) {
    const total = timeToMinutes(t) + mm;
    const h = Math.floor(total/60), m = total%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  // Stats for today's reminders/dashboard
  function stats(list) {
    const out = { total: list.length };
    STATUSES.forEach(s => out[s.key] = list.filter(a => a.status === s.key).length);
    return out;
  }

  window.TF = {
    STATUSES, NEXT_ACTIONS, SERVICES, STAFF, CUSTOMERS, APPTS_TODAY,
    TODAY, DAY_NAMES, MONTH_NAMES,
    customer, service, staff, status,
    fmtMoney, fmtDuration, timeToMinutes, addMinutes, stats,
  };
})();
