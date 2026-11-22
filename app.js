// Datos iniciales por defecto
const DEFAULT_SOLICITUDES = [
  {
    codigo: "SOL-001",
    cliente: "Carlos Mendoza",
    servicio: "Integración Pasarela de Pagos",
    fecha: "2026-11-20 10:00",
    estado: "APROBADA"
  }
];

const DEFAULT_USUARIOS = [
  { id: 1, nombre: "Administrador", email: "admin@admin.com", rol: "ADMIN" },
  { id: 2, nombre: "Bryan De Jesús Cuadrado", email: "bryan.cuadrado@sena.edu.co", rol: "QA_LEAD" }
];

let solicitudes = JSON.parse(localStorage.getItem("sena_solicitudes")) || [...DEFAULT_SOLICITUDES];
let usuarios = JSON.parse(localStorage.getItem("sena_usuarios")) || [...DEFAULT_USUARIOS];
let alertasCount = Number(localStorage.getItem("sena_alertas")) || 0;
let apiOnline = false;

// Utilidad de hora actual
function horaActual() {
  return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Registro en consola PSP
function registrarLog(tipo, mensaje) {
  const consoleEl = document.getElementById("psp-log-console");
  if (!consoleEl) return;
  const line = document.createElement("div");
  line.className = tipo === "ERROR" ? "log-err" : tipo === "INFO" ? "log-info" : "log-ok";
  line.textContent = `[${horaActual()}] [${tipo}] ${mensaje}`;
  consoleEl.prepend(line);
}

// Guardar estado local
function persistirDatos() {
  localStorage.setItem("sena_solicitudes", JSON.stringify(solicitudes));
  localStorage.setItem("sena_usuarios", JSON.stringify(usuarios));
  localStorage.setItem("sena_alertas", String(alertasCount));
}

// ==================== AUTENTICACIÓN ====================
document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const pass = document.getElementById("login-pass").value.trim();
  const alertBox = document.getElementById("login-alert");

  const usuarioValido = usuarios.find(u => u.email.toLowerCase() === email);
  if (usuarioValido && pass.length >= 4) {
    alertBox.classList.add("hidden");
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("hidden");
    document.getElementById("active-user-name").textContent = usuarioValido.nombre;
    document.getElementById("active-user-role").textContent = `ROL: ${usuarioValido.rol}`;
    registrarLog("SISTEMA", `Sesión iniciada por ${usuarioValido.nombre} (${usuarioValido.email}).`);
    inicializarApp();
  } else {
    alertBox.textContent = "Credenciales inválidas. Verifique correo registrado y contraseña.";
    alertBox.className = "alert alert-error";
  }
});

document.getElementById("btn-logout").addEventListener("click", () => {
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
});

// ==================== NAVEGACIÓN ENTRE MÓDULOS ====================
const TITULOS_VISTAS = {
  "view-solicitudes": ["Gestión y Agendamiento de Solicitudes", "Módulo operativo con validación en tiempo real y trazabilidad PSP"],
  "view-apis": ["Integración API REST de Usuarios", "Conexión directa con UsuarioServlet.java (/api/usuarios)"],
  "view-psp": ["Auditoría y Calidad de Software (PSP / ISO 25010)", "Trazabilidad de casos de prueba y defectos resueltos en Jira"],
  "view-reportes": ["Reportes Operativos Consolidados", "Exportación de datos para auditoría y sustentación"]
};

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.getAttribute("data-view");
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");

    const [titulo, subtitulo] = TITULOS_VISTAS[target];
    document.getElementById("page-title").textContent = titulo;
    document.getElementById("page-subtitle").textContent = subtitulo;

    if (target === "view-reportes") renderReporte();
  });
});

// ==================== MÓDULO 1: GESTIÓN DE SOLICITUDES ====================
function renderSolicitudes() {
  const tbody = document.getElementById("tabla-solicitudes");
  tbody.innerHTML = "";

  solicitudes.forEach((sol, idx) => {
    const badgeClass =
      sol.estado === "APROBADA" ? "badge-approved" :
      sol.estado === "RECHAZADA" ? "badge-rejected" : "badge-pending";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${sol.codigo}</strong></td>
      <td>${sol.cliente}</td>
      <td>${sol.servicio}</td>
      <td>${sol.fecha}</td>
      <td><span class="badge ${badgeClass}">${sol.estado}</span></td>
      <td>
        <div class="action-stack">
          <button class="btn btn-primary btn-sm" onclick="cambiarEstadoSolicitud(${idx}, 'APROBADA')">Aprobar</button>
          <button class="btn btn-danger btn-sm" onclick="cambiarEstadoSolicitud(${idx}, 'RECHAZADA')">Rechazar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("kpi-total").textContent = solicitudes.length;
  document.getElementById("kpi-pendientes").textContent = solicitudes.filter(s => s.estado === "PENDIENTE").length;
  document.getElementById("kpi-aprobadas").textContent = solicitudes.filter(s => s.estado === "APROBADA").length;
  document.getElementById("kpi-alertas").textContent = alertasCount;
}

window.cambiarEstadoSolicitud = function (index, nuevoEstado) {
  const sol = solicitudes[index];
  const anterior = sol.estado;
  if (anterior === nuevoEstado) return;
  sol.estado = nuevoEstado;
  persistirDatos();
  renderSolicitudes();
  registrarLog("TRAZABILIDAD", `Solicitud ${sol.codigo} (${sol.cliente}) cambió de ${anterior} → ${nuevoEstado}.`);
};

document.getElementById("form-solicitud").addEventListener("submit", function (e) {
  e.preventDefault();
  const clienteInput = document.getElementById("sol-cliente");
  const servicioInput = document.getElementById("sol-servicio");
  const fechaInput = document.getElementById("sol-fecha");
  const feedback = document.getElementById("sol-feedback");

  const cliente = clienteInput.value.trim();
  const servicio = servicioInput.value;
  const fechaRaw = fechaInput.value;

  // CP-02: Validación campos vacíos
  if (!cliente || !fechaRaw) {
    alertasCount++;
    persistirDatos();
    renderSolicitudes();
    feedback.textContent = "Validación fallida: El nombre del cliente y la fecha son campos obligatorios.";
    feedback.className = "alert alert-error";
    registrarLog("ERROR VALIDACIÓN", "Intento de registro bloqueado por campos vacíos.");
    return;
  }

  // BUG-01 & BUG-02 corregidos: normalización .toLowerCase() y exclusión de RECHAZADA
  const clienteNorm = cliente.toLowerCase();
  const duplicada = solicitudes.some(
    s => s.cliente.trim().toLowerCase() === clienteNorm &&
         s.servicio === servicio &&
         s.estado !== "RECHAZADA"
  );

  if (duplicada) {
    alertasCount++;
    persistirDatos();
    renderSolicitudes();
    feedback.textContent = `Bloqueo por duplicidad: ${cliente} ya tiene una solicitud activa para ${servicio}.`;
    feedback.className = "alert alert-error";
    registrarLog("ERROR DUPLICIDAD", `Registro duplicado bloqueado para ${cliente} (${servicio}).`);
    return;
  }

  const nuevoCodigo = `SOL-${String(solicitudes.length + 1).padStart(3, "0")}`;
  const fechaFormateada = fechaRaw.replace("T", " ");

  solicitudes.push({
    codigo: nuevoCodigo,
    cliente,
    servicio,
    fecha: fechaFormateada,
    estado: "PENDIENTE"
  });

  persistirDatos();
  renderSolicitudes();
  feedback.textContent = `Solicitud ${nuevoCodigo} creada exitosamente en estado PENDIENTE.`;
  feedback.className = "alert alert-success";
  registrarLog("REGISTRO EXITOSO", `Creada solicitud ${nuevoCodigo} para ${cliente} (${servicio}).`);

  clienteInput.value = "";
  fechaInput.value = "";
});

document.getElementById("btn-reset-demo").addEventListener("click", () => {
  solicitudes = [...DEFAULT_SOLICITUDES];
  alertasCount = 0;
  persistirDatos();
  renderSolicitudes();
  document.getElementById("sol-feedback").classList.add("hidden");
  registrarLog("SISTEMA", "Datos de demostración restaurados al estado base.");
});

// ==================== MÓDULO 2: INTEGRACIÓN API USUARIOS (UsuarioServlet) ====================
function actualizarBadgeApi(conectado) {
  apiOnline = conectado;
  const pill = document.getElementById("api-status-badge");
  const text = document.getElementById("api-status-text");
  if (conectado) {
    pill.innerHTML = `<span class="dot dot-ok"></span><span>API Java: Conectada (/api/usuarios)</span>`;
  } else {
    pill.innerHTML = `<span class="dot dot-warn"></span><span>API Java: Modo Respaldo Local</span>`;
  }
}

function renderUsuarios() {
  const tbody = document.getElementById("tabla-usuarios");
  tbody.innerHTML = "";
  usuarios.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>#${u.id}</strong></td>
      <td>${u.nombre}</td>
      <td>${u.email}</td>
      <td><span class="badge badge-approved">${u.rol}</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="eliminarUsuarioApi(${u.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById("json-response-viewer").textContent = JSON.stringify(usuarios, null, 2);
}

async function sincronizarUsuariosDesdeApi() {
  const url = document.getElementById("api-base-url").value.trim();
  try {
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (Array.isArray(data)) {
      usuarios = data;
      persistirDatos();
      actualizarBadgeApi(true);
      renderUsuarios();
      registrarLog("API GET", `Sincronizados ${data.length} usuarios desde UsuarioServlet.`);
    }
  } catch (err) {
    actualizarBadgeApi(false);
    renderUsuarios();
    registrarLog("INFO", "Servidor Tomcat local no detectado; operando con persistencia local sincronizada.");
  }
}

document.getElementById("btn-sync-api").addEventListener("click", sincronizarUsuariosDesdeApi);

document.getElementById("form-usuario-api").addEventListener("submit", async function (e) {
  e.preventDefault();
  const nombre = document.getElementById("usr-nombre").value.trim();
  const email = document.getElementById("usr-email").value.trim().toLowerCase();
  const rol = document.getElementById("usr-rol").value;
  const feedback = document.getElementById("usr-feedback");
  const url = document.getElementById("api-base-url").value.trim();

  if (usuarios.some(u => u.email.toLowerCase() === email)) {
    feedback.textContent = "Error: Ya existe un usuario registrado con ese correo.";
    feedback.className = "alert alert-error";
    return;
  }

  // Envío compatible con request.getParameter() de UsuarioServlet.doPost
  const params = new URLSearchParams();
  params.append("nombre", nombre);
  params.append("email", email);
  params.append("rol", rol);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await sincronizarUsuariosDesdeApi();
    feedback.textContent = `Usuario ${nombre} creado en UsuarioServlet (HTTP 201 Created).`;
    feedback.className = "alert alert-success";
  } catch (err) {
    const nuevoId = usuarios.reduce((max, u) => Math.max(max, u.id), 0) + 1;
    usuarios.push({ id: nuevoId, nombre, email, rol });
    persistirDatos();
    renderUsuarios();
    feedback.textContent = `Usuario ${nombre} registrado localmente (ID #${nuevoId}).`;
    feedback.className = "alert alert-success";
    registrarLog("API POST", `Usuario ${nombre} (${rol}) registrado en el directorio.`);
  }

  document.getElementById("usr-nombre").value = "";
  document.getElementById("usr-email").value = "";
});

window.eliminarUsuarioApi = async function (id) {
  if (id === 1) {
    alert("El usuario Administrador principal no puede ser eliminado.");
    return;
  }
  const url = `${document.getElementById("api-base-url").value.trim()}?id=${id}`;
  try {
    const resp = await fetch(url, { method: "DELETE" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await sincronizarUsuariosDesdeApi();
  } catch (err) {
    usuarios = usuarios.filter(u => u.id !== id);
    persistirDatos();
    renderUsuarios();
    registrarLog("API DELETE", `Usuario ID #${id} eliminado del sistema.`);
  }
};

// ==================== MÓDULO 4: REPORTES OPERATIVOS ====================
function renderReporte() {
  const box = document.getElementById("reporte-resumen-grid");
  const aprobadas = solicitudes.filter(s => s.estado === "APROBADA").length;
  const pendientes = solicitudes.filter(s => s.estado === "PENDIENTE").length;
  const rechazadas = solicitudes.filter(s => s.estado === "RECHAZADA").length;

  box.innerHTML = `
    <div class="report-item">
      <strong>Total Solicitudes Procesadas</strong>
      <p style="font-size:22px; color:#00324D; margin-top:6px;">${solicitudes.length}</p>
    </div>
    <div class="report-item">
      <strong>Tasa de Aprobación Operativa</strong>
      <p style="font-size:22px; color:#39A900; margin-top:6px;">${solicitudes.length ? Math.round((aprobadas / solicitudes.length) * 100) : 0}% (${aprobadas} aprobadas)</p>
    </div>
    <div class="report-item">
      <strong>Pendientes / Rechazadas</strong>
      <p style="font-size:22px; color:#d97706; margin-top:6px;">${pendientes} pend. / ${rechazadas} rech.</p>
    </div>
    <div class="report-item">
      <strong>Usuarios Activos en API</strong>
      <p style="font-size:22px; color:#00324D; margin-top:6px;">${usuarios.length} cuentas</p>
    </div>
  `;
}

document.getElementById("btn-export-json").addEventListener("click", () => {
  const payload = {
    proyecto: "AppIntegracionSena",
    fechaGeneracion: new Date().toISOString(),
    usuarios,
    solicitudes
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "reporte_AppIntegracionSena.json";
  a.click();
});

document.getElementById("btn-export-csv").addEventListener("click", () => {
  const filas = [
    ["Codigo", "Cliente", "Servicio", "Fecha", "Estado"],
    ...solicitudes.map(s => [s.codigo, s.cliente, s.servicio, s.fecha, s.estado])
  ];
  const csv = filas.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "solicitudes_AppIntegracionSena.csv";
  a.click();
});

// Inicialización general
function inicializarApp() {
  renderSolicitudes();
  renderUsuarios();
  sincronizarUsuariosDesdeApi();
  registrarLog("SISTEMA", "Módulo de Gestión de Solicitudes inicializado correctamente.");
}
