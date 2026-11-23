const DEFAULT_BASE_URL = "http://localhost:8080/api-sena";

const FALLBACK_SOLICITUDES = [
  {
    id: 1,
    codigo: "SOL-001",
    cliente: "Carlos Mendoza",
    servicio: "Integración Pasarela de Pagos",
    fecha: "2026-11-20 10:00",
    estado: "APROBADA"
  }
];

const FALLBACK_USUARIOS = [
  { id: 1, nombre: "Administrador", email: "admin@admin.com", rol: "ADMIN" },
  { id: 2, nombre: "Bryan De Jesús Cuadrado", email: "bryan.cuadrado@sena.edu.co", rol: "QA_LEAD" }
];

const VISTAS_POR_ROL = {
  ADMIN: ["view-solicitudes", "view-apis", "view-psp", "view-reportes"],
  QA_LEAD: ["view-solicitudes", "view-psp", "view-reportes"],
  USER: ["view-solicitudes"]
};

const TITULOS_VISTAS = {
  "view-solicitudes": ["Gestión de Solicitudes", "Registro, validación de duplicados y control de estados en MySQL"],
  "view-apis": ["Usuarios API", "Consumo directo de GET, POST y DELETE sobre UsuarioServlet"],
  "view-psp": ["Calidad y PSP", "Trazabilidad de pruebas funcionales y defectos corregidos"],
  "view-reportes": ["Reportes Operativos", "Consolidado de registros y exportación de archivos"]
};

let solicitudes = [];
let usuarios = [];
let usuarioActual = null;
let alertasCount = Number(localStorage.getItem("sena_alertas")) || 0;
let apiOnline = false;

function getBaseUrl() {
  const input = document.getElementById("api-base-url");
  const raw = input ? input.value.trim() : DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function horaActual() {
  return new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function registrarLog(tipo, mensaje) {
  const consoleEl = document.getElementById("psp-log-console");
  if (!consoleEl) return;
  const line = document.createElement("div");
  line.className = tipo === "ERROR" ? "log-err" : tipo === "INFO" ? "log-info" : "log-ok";
  line.textContent = `[${horaActual()}] [${tipo}] ${mensaje}`;
  consoleEl.prepend(line);
}

function actualizarBadgeApi(conectado) {
  apiOnline = conectado;
  const pill = document.getElementById("api-status-badge");
  if (!pill) return;
  if (conectado) {
    pill.innerHTML = `<span class="dot dot-ok"></span><span>API conectada · MySQL</span>`;
  } else {
    pill.innerHTML = `<span class="dot dot-warn"></span><span>Modo respaldo local</span>`;
  }
}

function mostrarAlerta(el, tipo, texto) {
  el.textContent = texto;
  el.className = `alert ${tipo === "ok" ? "alert-success" : "alert-error"}`;
}

// ==================== PERMISOS POR ROL ====================
function rolActual() {
  return (usuarioActual?.rol || "USER").toUpperCase();
}

function esCliente() {
  return rolActual() === "USER";
}

function puedeGestionarEstados() {
  const rol = rolActual();
  return rol === "ADMIN" || rol === "QA_LEAD";
}

function aplicarPermisosPorRol(rolRaw) {
  const rol = (rolRaw || "USER").toUpperCase();
  const permitidas = VISTAS_POR_ROL[rol] || VISTAS_POR_ROL.USER;
  const vistaCliente = rol === "USER";

  document.querySelectorAll(".nav-item").forEach(btn => {
    const view = btn.getAttribute("data-view");
    btn.classList.toggle("hidden", !permitidas.includes(view));
  });

  // Ocultar elementos internos cuando el usuario es cliente (USER)
  const kpiGrid = document.querySelector("#view-solicitudes .kpi-grid");
  const logPanel = document.querySelector("#view-solicitudes .log-panel");
  const thAcciones = document.querySelector("#view-solicitudes table thead th:last-child");
  const tituloBandeja = document.querySelector("#view-solicitudes .card-header-row h3");
  const inputCliente = document.getElementById("sol-cliente");

  if (kpiGrid) kpiGrid.classList.toggle("hidden", vistaCliente);
  if (logPanel) logPanel.classList.toggle("hidden", vistaCliente);
  if (thAcciones) thAcciones.classList.toggle("hidden", vistaCliente);
  if (tituloBandeja) tituloBandeja.textContent = vistaCliente ? "Mis solicitudes" : "Bandeja de solicitudes";

  if (inputCliente) {
    if (vistaCliente) {
      inputCliente.value = usuarioActual?.nombre || "";
      inputCliente.readOnly = true;
      inputCliente.style.backgroundColor = "#f1f5f9";
    } else {
      inputCliente.value = "";
      inputCliente.readOnly = false;
      inputCliente.style.backgroundColor = "";
    }
  }

  cambiarVista("view-solicitudes");
}

function cambiarVista(target) {
  document.querySelectorAll(".nav-item").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-view") === target);
  });

  document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
  const destino = document.getElementById(target);
  if (destino) destino.classList.remove("hidden");

  if (target === "view-solicitudes" && esCliente()) {
    document.getElementById("page-title").textContent = "Mis Solicitudes";
    document.getElementById("page-subtitle").textContent = "Registra nuevos servicios y consulta el estado de tus pedidos";
  } else {
    const [titulo, subtitulo] = TITULOS_VISTAS[target];
    document.getElementById("page-title").textContent = titulo;
    document.getElementById("page-subtitle").textContent = subtitulo;
  }

  if (target === "view-reportes") renderReporte();
}

// ==================== AUTENTICACIÓN (/api/login) ====================
document.getElementById("login-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value.trim();
  const alertBox = document.getElementById("login-alert");
  const btn = document.getElementById("btn-login-submit");

  if (!email || !password) {
    mostrarAlerta(alertBox, "error", "Ingresa correo y contraseña.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Verificando...";

  try {
    const resp = await fetch(`${getBaseUrl()}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await resp.json();

    if (resp.ok && data.exito) {
      actualizarBadgeApi(true);
      iniciarSesionUI(data.usuario || { nombre: "Administrador", email, rol: "ADMIN" });
    } else {
      mostrarAlerta(alertBox, "error", data.mensaje || "Credenciales incorrectas.");
    }
  } catch (err) {
    if (email.toLowerCase() === "admin@admin.com" && password === "123456") {
      actualizarBadgeApi(false);
      iniciarSesionUI(FALLBACK_USUARIOS[0]);
      registrarLog("INFO", "Servidor Tomcat no disponible; sesión abierta en modo local.");
    } else {
      mostrarAlerta(alertBox, "error", "No se pudo conectar con Tomcat (localhost:8080) y las credenciales locales no coinciden.");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Ingresar";
  }
});

function iniciarSesionUI(usuario) {
  usuarioActual = usuario;
  document.getElementById("login-alert").classList.add("hidden");
  document.getElementById("sol-feedback").classList.add("hidden");
  document.getElementById("usr-feedback").classList.add("hidden");
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  document.getElementById("active-user-name").textContent = usuario.nombre;
  document.getElementById("active-user-role").textContent = usuario.rol;
  aplicarPermisosPorRol(usuario.rol);
  if (!esCliente()) {
    registrarLog("OK", `Sesión iniciada: ${usuario.nombre} (${usuario.rol}).`);
  }
  inicializarApp();
}

document.getElementById("btn-logout").addEventListener("click", () => {
  usuarioActual = null;
  document.getElementById("sol-feedback").classList.add("hidden");
  document.getElementById("usr-feedback").classList.add("hidden");
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
});

// ==================== NAVEGACIÓN ====================
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-view");
    const permitidas = VISTAS_POR_ROL[rolActual()] || VISTAS_POR_ROL.USER;
    if (!permitidas.includes(target)) return;
    cambiarVista(target);
  });
});

// ==================== SOLICITUDES (/api/solicitudes) ====================
function renderSolicitudes() {
  const tbody = document.getElementById("tabla-solicitudes");
  tbody.innerHTML = "";

  const vistaCliente = esCliente();
  const nombreActualNorm = (usuarioActual?.nombre || "").trim().toLowerCase();
  const visibles = vistaCliente
    ? solicitudes.filter(s => (s.cliente || "").trim().toLowerCase() === nombreActualNorm)
    : solicitudes;

  if (!visibles.length) {
    const msg = vistaCliente ? "Aún no tienes solicitudes registradas." : "No hay solicitudes registradas.";
    tbody.innerHTML = `<tr><td colspan="${vistaCliente ? 5 : 6}" class="empty-row">${msg}</td></tr>`;
  } else {
    visibles.forEach(sol => {
      const badgeClass =
        sol.estado === "APROBADA" ? "badge-approved" :
        sol.estado === "RECHAZADA" ? "badge-rejected" : "badge-pending";

      const celdaAcciones = vistaCliente
        ? ""
        : `<td class="text-right">
             <div class="action-stack">
               <button class="btn btn-success-soft btn-sm" onclick="cambiarEstadoSolicitud(${sol.id}, 'APROBADA')">Aprobar</button>
               <button class="btn btn-danger-soft btn-sm" onclick="cambiarEstadoSolicitud(${sol.id}, 'RECHAZADA')">Rechazar</button>
             </div>
           </td>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="mono"><strong>${escaparHtml(sol.codigo)}</strong></td>
        <td>${escaparHtml(sol.cliente)}</td>
        <td>${escaparHtml(sol.servicio)}</td>
        <td class="mono">${escaparHtml(sol.fecha)}</td>
        <td><span class="badge ${badgeClass}">${escaparHtml(sol.estado)}</span></td>
        ${celdaAcciones}
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("kpi-total").textContent = solicitudes.length;
  document.getElementById("kpi-pendientes").textContent = solicitudes.filter(s => s.estado === "PENDIENTE").length;
  document.getElementById("kpi-aprobadas").textContent = solicitudes.filter(s => s.estado === "APROBADA").length;
  document.getElementById("kpi-alertas").textContent = alertasCount;
}

async function cargarSolicitudesDesdeApi() {
  try {
    const resp = await fetch(`${getBaseUrl()}/api/solicitudes`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (Array.isArray(data)) {
      solicitudes = data;
      localStorage.setItem("sena_solicitudes", JSON.stringify(solicitudes));
      actualizarBadgeApi(true);
      renderSolicitudes();
      if (!esCliente()) {
        registrarLog("INFO", `Cargadas ${data.length} solicitudes desde MySQL.`);
      }
    }
  } catch (err) {
    actualizarBadgeApi(false);
    solicitudes = JSON.parse(localStorage.getItem("sena_solicitudes")) || [...FALLBACK_SOLICITUDES];
    renderSolicitudes();
  }
}

function generarSiguienteCodigo() {
  const maxNum = solicitudes.reduce((max, s) => {
    const match = String(s.codigo || "").match(/(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `SOL-${String(maxNum + 1).padStart(3, "0")}`;
}

window.cambiarEstadoSolicitud = async function (id, nuevoEstado) {
  if (!puedeGestionarEstados()) return;

  const sol = solicitudes.find(s => s.id === id);
  if (!sol || sol.estado === nuevoEstado) return;
  const anterior = sol.estado;

  try {
    const resp = await fetch(`${getBaseUrl()}/api/solicitudes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: String(id), estado: nuevoEstado })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await cargarSolicitudesDesdeApi();
    registrarLog("OK", `Solicitud ${sol.codigo}: ${anterior} -> ${nuevoEstado} (guardado en MySQL).`);
  } catch (err) {
    sol.estado = nuevoEstado;
    localStorage.setItem("sena_solicitudes", JSON.stringify(solicitudes));
    renderSolicitudes();
    registrarLog("INFO", `Solicitud ${sol.codigo} actualizada localmente a ${nuevoEstado}.`);
  }
};

document.getElementById("form-solicitud").addEventListener("submit", async function (e) {
  e.preventDefault();
  const clienteInput = document.getElementById("sol-cliente");
  const servicioInput = document.getElementById("sol-servicio");
  const fechaInput = document.getElementById("sol-fecha");
  const feedback = document.getElementById("sol-feedback");

  const cliente = esCliente() ? (usuarioActual?.nombre || "").trim() : clienteInput.value.trim();
  const servicio = servicioInput.value;
  const fechaRaw = fechaInput.value;

  if (!cliente || !fechaRaw) {
    alertasCount++;
    localStorage.setItem("sena_alertas", String(alertasCount));
    renderSolicitudes();
    mostrarAlerta(feedback, "error", "El cliente y la fecha son obligatorios.");
    if (!esCliente()) registrarLog("ERROR", "Registro bloqueado: campos obligatorios vacíos.");
    return;
  }

  const clienteNorm = cliente.toLowerCase();
  const duplicada = solicitudes.some(
    s => s.cliente.trim().toLowerCase() === clienteNorm &&
         s.servicio === servicio &&
         s.estado !== "RECHAZADA"
  );

  if (duplicada) {
    alertasCount++;
    localStorage.setItem("sena_alertas", String(alertasCount));
    renderSolicitudes();
    mostrarAlerta(feedback, "error", `Ya existe una solicitud activa para ${servicio}.`);
    if (!esCliente()) registrarLog("ERROR", `Duplicidad detectada para ${cliente} (${servicio}).`);
    return;
  }

  const codigo = generarSiguienteCodigo();
  const fecha = fechaRaw.replace("T", " ");

  try {
    const resp = await fetch(`${getBaseUrl()}/api/solicitudes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, cliente, servicio, fecha, estado: "PENDIENTE" })
    });
    const data = await resp.json();
    if (!resp.ok) {
      mostrarAlerta(feedback, "error", data.mensaje || "No se pudo guardar la solicitud.");
      return;
    }
    await cargarSolicitudesDesdeApi();
    mostrarAlerta(feedback, "ok", `Solicitud ${codigo} registrada correctamente.`);
    if (!esCliente()) registrarLog("OK", `POST /api/solicitudes -> ${codigo} (${cliente}).`);
  } catch (err) {
    const nuevoId = solicitudes.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
    solicitudes.unshift({ id: nuevoId, codigo, cliente, servicio, fecha, estado: "PENDIENTE" });
    localStorage.setItem("sena_solicitudes", JSON.stringify(solicitudes));
    renderSolicitudes();
    mostrarAlerta(feedback, "ok", `Solicitud ${codigo} guardada en modo local.`);
  }

  if (!esCliente()) clienteInput.value = "";
  fechaInput.value = "";
});

document.getElementById("btn-refresh-sol").addEventListener("click", cargarSolicitudesDesdeApi);

// ==================== USUARIOS (/api/usuarios) ====================
function renderUsuarios() {
  const tbody = document.getElementById("tabla-usuarios");
  tbody.innerHTML = "";

  if (!usuarios.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No hay usuarios registrados.</td></tr>`;
  } else {
    usuarios.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="mono">#${escaparHtml(u.id)}</td>
        <td>${escaparHtml(u.nombre)}</td>
        <td>${escaparHtml(u.email)}</td>
        <td><span class="badge badge-neutral">${escaparHtml(u.rol)}</span></td>
        <td class="text-right">
          <button class="btn btn-danger-soft btn-sm" onclick="eliminarUsuarioApi(${u.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("json-response-viewer").textContent = JSON.stringify(usuarios, null, 2);
}

async function sincronizarUsuariosDesdeApi() {
  try {
    const resp = await fetch(`${getBaseUrl()}/api/usuarios`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (Array.isArray(data)) {
      usuarios = data;
      localStorage.setItem("sena_usuarios", JSON.stringify(usuarios));
      actualizarBadgeApi(true);
      renderUsuarios();
      registrarLog("INFO", `GET /api/usuarios -> ${data.length} registros.`);
    }
  } catch (err) {
    actualizarBadgeApi(false);
    usuarios = JSON.parse(localStorage.getItem("sena_usuarios")) || [...FALLBACK_USUARIOS];
    renderUsuarios();
  }
}

document.getElementById("btn-sync-api").addEventListener("click", async () => {
  await sincronizarUsuariosDesdeApi();
  await cargarSolicitudesDesdeApi();
});

document.getElementById("form-usuario-api").addEventListener("submit", async function (e) {
  e.preventDefault();
  const nombre = document.getElementById("usr-nombre").value.trim();
  const email = document.getElementById("usr-email").value.trim().toLowerCase();
  const password = document.getElementById("usr-pass").value.trim() || "123456";
  const rol = document.getElementById("usr-rol").value;
  const feedback = document.getElementById("usr-feedback");

  try {
    const resp = await fetch(`${getBaseUrl()}/api/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password, rol })
    });
    const data = await resp.json();
    if (!resp.ok) {
      mostrarAlerta(feedback, "error", data.mensaje || "Error al crear usuario.");
      return;
    }
    await sincronizarUsuariosDesdeApi();
    mostrarAlerta(feedback, "ok", `Usuario ${nombre} registrado en MySQL.`);
    registrarLog("OK", `POST /api/usuarios -> ${email} (${rol}).`);
  } catch (err) {
    const nuevoId = usuarios.reduce((max, u) => Math.max(max, u.id), 0) + 1;
    usuarios.push({ id: nuevoId, nombre, email, rol });
    localStorage.setItem("sena_usuarios", JSON.stringify(usuarios));
    renderUsuarios();
    mostrarAlerta(feedback, "ok", `Usuario ${nombre} registrado en modo local.`);
  }

  document.getElementById("usr-nombre").value = "";
  document.getElementById("usr-email").value = "";
});

window.eliminarUsuarioApi = async function (id) {
  if (id === 1) {
    alert("La cuenta principal de Administrador no se puede eliminar.");
    return;
  }
  try {
    const resp = await fetch(`${getBaseUrl()}/api/usuarios?id=${id}`, { method: "DELETE" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await sincronizarUsuariosDesdeApi();
    registrarLog("OK", `DELETE /api/usuarios?id=${id} ejecutado.`);
  } catch (err) {
    usuarios = usuarios.filter(u => u.id !== id);
    localStorage.setItem("sena_usuarios", JSON.stringify(usuarios));
    renderUsuarios();
    registrarLog("INFO", `Usuario #${id} eliminado localmente.`);
  }
};

// ==================== REPORTES ====================
function renderReporte() {
  const box = document.getElementById("reporte-resumen-grid");
  const aprobadas = solicitudes.filter(s => s.estado === "APROBADA").length;
  const pendientes = solicitudes.filter(s => s.estado === "PENDIENTE").length;
  const rechazadas = solicitudes.filter(s => s.estado === "RECHAZADA").length;
  const tasa = solicitudes.length ? Math.round((aprobadas / solicitudes.length) * 100) : 0;

  box.innerHTML = `
    <div class="report-item">
      <span>Solicitudes registradas</span>
      <strong>${solicitudes.length}</strong>
    </div>
    <div class="report-item">
      <span>Tasa de aprobación</span>
      <strong>${tasa}% (${aprobadas})</strong>
    </div>
    <div class="report-item">
      <span>Pendientes / Rechazadas</span>
      <strong>${pendientes} / ${rechazadas}</strong>
    </div>
    <div class="report-item">
      <span>Cuentas de usuario</span>
      <strong>${usuarios.length}</strong>
    </div>
  `;
}

document.getElementById("btn-export-json").addEventListener("click", () => {
  const payload = {
    proyecto: "AppIntegracionSena",
    fechaGeneracion: new Date().toISOString(),
    fuente: apiOnline ? "MySQL / Tomcat" : "Local",
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

async function inicializarApp() {
  if (esCliente()) {
    await cargarSolicitudesDesdeApi();
  } else {
    await Promise.all([cargarSolicitudesDesdeApi(), sincronizarUsuariosDesdeApi()]);
  }
}