import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import './style.css'; // Asegúrate de que este archivo exista en src/ o bórralo si no lo usas.

document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos del DOM para las secciones principales
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm"); // Formulario de registro fuera del dashboard
    const dashboardRegisterForm = document.getElementById("dashboard-register-form"); // Formulario de registro dentro del dashboard

    const loginSection = document.getElementById("login-section");
    const registerSection = document.getElementById("register-section"); // Sección de registro fuera del dashboard
    const dashboardSection = document.getElementById("dashboard");

    const usernameSpan = document.getElementById("user-name");

    // Referencias para mostrar mensajes al usuario
    const respuestaDiv = document.getElementById("respuesta"); // Para login
    const registerRespuestaDiv = document.getElementById("register-respuesta"); // Para registro fuera del dashboard
    const dashboardRegisterRespuestaDiv = document.getElementById("dashboard-register-respuesta"); // Para registro dentro del dashboard
    const userReportRespuestaDiv = document.getElementById("user-report-respuesta"); // Para reporte de usuarios
    const editRespuestaDiv = document.getElementById('edit-respuesta'); // Para el modal de edición

    // Enlaces de navegación entre Login/Registro
    const showRegisterLink = document.getElementById("show-register-link");
    const showLoginLink = document.getElementById("show-login-link");

    // Vistas específicas dentro del Dashboard
    const dashboardContentView = document.getElementById("dashboard-content");
    const statsView = document.getElementById("stats-view");
    const registerUserView = document.getElementById("register-user-view");
    const userReportView = document.getElementById("user-report-view");
    const usersTableBody = document.getElementById("users-table-body"); // Cuerpo de la tabla de usuarios

    // Elementos del menú de navegación del Dashboard
    const menuDashboard = document.getElementById("menu-dashboard");
    const menuRegisterUser = document.getElementById("menu-register-user");
    const menuUserReport = document.getElementById("menu-user-report");

    // Referencias y control del Modal de Edición
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const editUserForm = document.getElementById('editUserForm');
    const editIdInput = document.getElementById('edit-id');
    const editNombreInput = document.getElementById('edit-nombre');
    const editEmailInput = document.getElementById('edit-email');
    const editPasswordInput = document.getElementById('edit-password');

    // URL base de tu API de backend (Asegúrate de que este puerto sea el correcto de tu backend)
    const API_BASE_URL = 'http://localhost:5000/api'; // O import.meta.env.VITE_API_URL en producción/entornos

    // --- Funciones auxiliares para mostrar/ocultar secciones y vistas ---

    /**
     * Oculta todas las secciones principales y muestra la deseada.
     * @param {string} sectionId El ID de la sección principal a mostrar (ej. "login-section", "dashboard").
     */
    function showSection(sectionId) {
        loginSection.classList.add("d-none");
        registerSection.classList.add("d-none");
        dashboardSection.classList.add("d-none");
        document.getElementById(sectionId).classList.remove("d-none");
    }

    /**
     * Oculta todas las vistas dentro del dashboard y muestra la deseada.
     * @param {HTMLElement} viewElement El elemento de vista del dashboard a mostrar (ej. statsView, registerUserView).
     */
    function showDashboardView(viewElement) {
        statsView.classList.add("d-none");
        registerUserView.classList.add("d-none");
        userReportView.classList.add("d-none");
        viewElement.classList.remove("d-none");
    }

    /**
     * Muestra el dashboard, carga el nombre del usuario y las estadísticas por defecto.
     * @param {string} nombre El nombre del usuario logueado.
     */
    function mostrarDashboard(nombre) {
        showSection("dashboard");
        usernameSpan.textContent = nombre;
        showDashboardView(statsView); // Por defecto, muestra las estadísticas
        cargarEstadisticas();
    }

    /**
     * Muestra un mensaje en un elemento div de respuesta.
     * @param {HTMLElement} divElement El elemento div donde mostrar el mensaje.
     * @param {string} message El mensaje a mostrar.
     * @param {boolean} isSuccess Indica si es un mensaje de éxito (true) o error (false).
     */
    function showResponseMessage(divElement, message, isSuccess) {
        divElement.style.display = 'block';
        divElement.className = `mt-3 alert alert-${isSuccess ? 'success' : 'danger'}`;
        divElement.innerText = message;
        // Ocultar el mensaje después de 5 segundos
        setTimeout(() => {
            divElement.style.display = 'none';
        }, 5000);
    }

    /**
     * Carga las estadísticas desde el backend y actualiza la UI del dashboard.
     */
    async function cargarEstadisticas() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn("No hay token de autenticación para cargar estadísticas.");
                logout(); // Si no hay token, redirigir al login
                return;
            }

            const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("Error al obtener estadísticas:", errorData.message || errorData.error || "Error desconocido");
                showResponseMessage(respuestaDiv, "Error al cargar las estadísticas: " + (errorData.message || errorData.error || "Desconocido"), false);
                return;
            }

            const data = await res.json();

            // Actualizar los elementos del DOM con los datos reales recibidos del backend
            document.getElementById('active-users').textContent = data.activos_hoy || '0';
            document.getElementById('today-sessions').textContent = data.sesiones_hoy || '0'; // Asegúrate de que tu backend provea este dato
            document.getElementById('total-registers').textContent = data.usuarios_totales || '0';

        } catch (err) {
            console.error("Error al conectar con el servidor para estadísticas:", err);
            showResponseMessage(respuestaDiv, "No se pudo conectar al servidor para obtener las estadísticas.", false);
        }
    }

    /**
     * Carga la lista de usuarios desde el backend y las muestra en la tabla.
     */
    async function cargarUsuarios() {
        usersTableBody.innerHTML = '<tr><td colspan="4">Cargando usuarios...</td></tr>';
        userReportRespuestaDiv.style.display = 'none'; // Ocultar mensajes anteriores
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn("No hay token de autenticación para cargar usuarios.");
                logout();
                return;
            }

            const res = await fetch(`${API_BASE_URL}/usuarios`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("Error al obtener usuarios:", errorData.message || errorData.error || "Error desconocido");
                showResponseMessage(userReportRespuestaDiv, "Error al cargar usuarios: " + (errorData.message || errorData.error || "Desconocido"), false);
                usersTableBody.innerHTML = '<tr><td colspan="4">No se pudieron cargar los usuarios.</td></tr>';
                return;
            }

            const usuarios = await res.json();
            usersTableBody.innerHTML = ''; // Limpiar la tabla antes de añadir nuevos datos

            if (usuarios.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="4">No hay usuarios registrados.</td></tr>';
                return;
            }

            usuarios.forEach(usuario => {
                const row = `
                    <tr>
                        <td>${usuario.id}</td>
                        <td>${usuario.nombre || 'N/A'}</td>
                        <td>${usuario.email}</td>
                        <td>
                            <button class="btn btn-sm btn-info me-2" onclick="editUser(${usuario.id})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${usuario.id})">Eliminar</button>
                        </td>
                    </tr>
                `;
                usersTableBody.innerHTML += row;
            });

        } catch (err) {
            console.error("Error al conectar con el servidor para usuarios:", err);
            showResponseMessage(userReportRespuestaDiv, "No se pudo conectar al servidor para obtener la lista de usuarios.", false);
            usersTableBody.innerHTML = '<tr><td colspan="4">Error de conexión.</td></tr>';
        }
    }

    // --- Lógica de inicialización al cargar la página ---

    // Verificar si hay una sesión activa al cargar la página (token y usuario en localStorage)
    const storedUser = JSON.parse(localStorage.getItem("usuario"));
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
        mostrarDashboard(storedUser.nombre);
    } else {
        showSection("login-section"); // Si no hay sesión, mostrar la sección de login por defecto
    }

    // --- Event Listeners para formularios y navegación ---

    // Manejo del envío del formulario de LOGIN
    loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${API_BASE_URL}/usuarios/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                showResponseMessage(respuestaDiv, 'Inicio de sesión exitoso', true);
                localStorage.setItem("token", data.token);
                localStorage.setItem("usuario", JSON.stringify(data.usuario));
                mostrarDashboard(data.usuario.nombre);
                loginForm.reset(); // Limpiar formulario de login
            } else {
                showResponseMessage(respuestaDiv, data.message || data.error || "Credenciales incorrectas o error al iniciar sesión.", false);
            }
        } catch (err) {
            console.error("Error al iniciar sesión:", err);
            showResponseMessage(respuestaDiv, "No se pudo conectar con el servidor para iniciar sesión.", false);
        }
    });

    // Manejo del envío del formulario de REGISTRO (fuera del dashboard)
    registerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("register-nombre").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;

        try {
            const response = await fetch(`${API_BASE_URL}/usuarios`, { // Endpoint para crear usuario
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                showResponseMessage(registerRespuestaDiv, data.mensaje || 'Usuario registrado exitosamente.', true);
                registerForm.reset(); // Limpiar formulario
            } else {
                showResponseMessage(registerRespuestaDiv, data.error || 'Error al registrar usuario.', false);
            }
        } catch (err) {
            console.error("Error al registrar usuario:", err);
            showResponseMessage(registerRespuestaDiv, "No se pudo conectar con el servidor para registrar el usuario.", false);
        }
    });

    // Manejo del envío del formulario de REGISTRO (dentro del dashboard, para administradores)
    dashboardRegisterForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("dashboard-register-nombre").value;
        const email = document.getElementById("dashboard-register-email").value;
        const password = document.getElementById("dashboard-register-password").value;
        const token = localStorage.getItem('token'); // Se necesita token para registrar si la ruta está protegida

        if (!token) {
            showResponseMessage(dashboardRegisterRespuestaDiv, "No autorizado. Inicie sesión para registrar usuarios.", false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/usuarios`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ nombre, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                showResponseMessage(dashboardRegisterRespuestaDiv, data.mensaje || 'Usuario registrado exitosamente.', true);
                dashboardRegisterForm.reset();
                if (!userReportView.classList.contains('d-none')) { // Si la tabla de usuarios está visible
                    cargarUsuarios(); // Recargar la lista de usuarios
                }
            } else {
                showResponseMessage(dashboardRegisterRespuestaDiv, data.error || 'Error al registrar usuario.', false);
            }
        } catch (err) {
            console.error("Error al registrar usuario desde dashboard:", err);
            showResponseMessage(dashboardRegisterRespuestaDiv, "No se pudo conectar con el servidor para registrar el usuario.", false);
        }
    });

    // Manejo del envío del formulario de EDICIÓN (desde el modal)
    editUserForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = editIdInput.value;
        const nombre = editNombreInput.value;
        const email = editEmailInput.value;
        const password = editPasswordInput.value; // Puede estar vacío si no se cambió

        const token = localStorage.getItem('token');
        if (!token) {
            showResponseMessage(editRespuestaDiv, "No autorizado. Inicie sesión.", false);
            return;
        }

        const body = { nombre, email };
        if (password) { // Solo si se proporciona una nueva contraseña
            body.password = password;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
                method: 'PUT', // Método PUT para modificar
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                showResponseMessage(editRespuestaDiv, data.mensaje || 'Usuario actualizado exitosamente.', true);
                editUserModal.hide(); // Cerrar el modal
                cargarUsuarios(); // Recargar la tabla para ver los cambios
            } else {
                showResponseMessage(editRespuestaDiv, data.error || 'Error al actualizar usuario.', false);
            }
        } catch (err) {
            console.error("Error al actualizar usuario:", err);
            showResponseMessage(editRespuestaDiv, "No se pudo conectar con el servidor para actualizar el usuario.", false);
        }
    });


    // --- Navegación entre las vistas principales (Login/Registro) ---
    showRegisterLink?.addEventListener("click", (e) => {
        e.preventDefault();
        showSection("register-section");
        // Limpiar mensajes y formularios al cambiar de vista
        registerRespuestaDiv.style.display = 'none';
        respuestaDiv.style.display = 'none';
        loginForm.reset();
    });

    showLoginLink?.addEventListener("click", (e) => {
        e.preventDefault();
        showSection("login-section");
        // Limpiar mensajes y formularios al cambiar de vista
        respuestaDiv.style.display = 'none';
        registerRespuestaDiv.style.display = 'none';
        registerForm.reset();
    });

    // --- Navegación dentro del Dashboard ---
    menuDashboard?.addEventListener("click", (e) => {
        e.preventDefault();
        showDashboardView(statsView);
        cargarEstadisticas(); // Recargar estadísticas al volver a esta vista
    });

    menuRegisterUser?.addEventListener("click", (e) => {
        e.preventDefault();
        showDashboardView(registerUserView);
        dashboardRegisterForm.reset(); // Limpiar formulario de registro del dashboard
        dashboardRegisterRespuestaDiv.style.display = 'none';
    });

    menuUserReport?.addEventListener("click", async (e) => {
        e.preventDefault();
        showDashboardView(userReportView);
        await cargarUsuarios(); // Cargar usuarios cuando se selecciona esta vista
    });

    // --- Funciones globales (para ser llamadas directamente desde onclick en el HTML) ---

    /**
     * Cierra la sesión del usuario.
     */
    window.logout = function () {
        localStorage.removeItem("usuario");
        localStorage.removeItem("token");
        showSection("login-section"); // Volver a la sección de login
        loginForm.reset(); // Limpiar el formulario de login
        // Ocultar todos los mensajes de respuesta y resetear contenido del dashboard
        respuestaDiv.style.display = 'none';
        registerRespuestaDiv.style.display = 'none';
        dashboardRegisterRespuestaDiv.style.display = 'none';
        userReportRespuestaDiv.style.display = 'none';
        editRespuestaDiv.style.display = 'none';
        usersTableBody.innerHTML = ''; // Limpiar la tabla de usuarios
        document.getElementById('active-users').textContent = '0';
        document.getElementById('today-sessions').textContent = '0';
        document.getElementById('total-registers').textContent = '0';
    };

    /**
     * Función para iniciar el proceso de edición de un usuario.
     * Abre el modal de edición y prellena con los datos del usuario.
     * @param {number} id El ID del usuario a editar.
     */
    window.editUser = async function (id) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showResponseMessage(userReportRespuestaDiv, "No autorizado. Inicie sesión para editar usuarios.", false);
                return;
            }

            // Petición GET para obtener los datos del usuario específico
            const res = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json();
                showResponseMessage(userReportRespuestaDiv, "Error al obtener datos del usuario: " + (errorData.message || errorData.error || "Desconocido"), false);
                return;
            }

            const usuario = await res.json();

            // Prellenar el formulario del modal con los datos obtenidos
            editIdInput.value = usuario.id;
            editNombreInput.value = usuario.nombre;
            editEmailInput.value = usuario.email;
            editPasswordInput.value = ''; // La contraseña no se prellena por seguridad

            editRespuestaDiv.style.display = 'none'; // Ocultar mensajes anteriores del modal

            // Mostrar el modal de edición
            editUserModal.show();

        } catch (err) {
            console.error("Error al obtener usuario para edición:", err);
            showResponseMessage(userReportRespuestaDiv, "No se pudo conectar al servidor para obtener datos del usuario.", false);
        }
    };

    /**
     * Función para eliminar un usuario.
     * @param {number} id El ID del usuario a eliminar.
     */
    window.deleteUser = async function (id) {
        if (!confirm(`¿Estás seguro de que quieres eliminar al usuario con ID ${id}? Esta acción es irreversible.`)) {
            return; // El usuario canceló la eliminación
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showResponseMessage(userReportRespuestaDiv, "No autorizado. Inicie sesión para eliminar usuarios.", false);
                return;
            }

            const res = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (res.ok) {
                showResponseMessage(userReportRespuestaDiv, data.mensaje || 'Usuario eliminado exitosamente.', true);
                cargarUsuarios(); // Recargar la tabla después de eliminar
            } else {
                showResponseMessage(userReportRespuestaDiv, data.error || 'Error al eliminar usuario.', false);
            }
        } catch (err) {
            console.error("Error al eliminar usuario:", err);
            showResponseMessage(userReportRespuestaDiv, "No se pudo conectar con el servidor para eliminar el usuario.", false);
        }
    };
});