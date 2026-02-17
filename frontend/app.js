const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let currentPage = 1;
let currentFilters = { type: '', category: '', start: '', end: '' };
let editingId = null;

// ========== LOGIN / REGISTER ==========
async function login() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);
        
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';
    } catch (error) {
        document.getElementById('loginError').innerText = error.message;
    }
}

async function register() {
    const name = document.getElementById('registerName')?.value;
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);
        
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';
    } catch (error) {
        document.getElementById('registerError').innerText = error.message;
    }
}

// ========== DASHBOARD ==========
async function loadDashboard() {
    if (!token) { window.location.href = 'index.html'; return; }
    
    try {
        const userRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        document.getElementById('userEmail').innerText = userData.user.email;
        document.getElementById('balance').innerText = parseFloat(userData.user.balance).toFixed(2);
        
        const transRes = await fetch(`${API_URL}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const transData = await transRes.json();
        
        let html = '';
        transData.transactions.slice(0, 5).forEach(t => {
            const clase = t.type === 'income' ? 'income' : 'expense';
            const signo = t.type === 'income' ? '+' : '-';
            html += `<tr>
                <td>${t.date.substring(0,10)}</td>
                <td>${t.category_name || '-'}</td>
                <td>${t.description || '-'}</td>
                <td class="${clase}">${signo}$${parseFloat(t.amount).toFixed(2)}</td>
            </tr>`;
        });
        document.getElementById('recentTable').innerHTML = '<tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr>' + html;
        
        await loadAlarmSummary();
        
    } catch (error) {
        alert('Error cargando dashboard');
    }
}

// ========== ALARMAS EN DASHBOARD ==========
async function loadAlarmSummary() {
    try {
        const month = new Date().toISOString().substring(0,7) + '-01';
        const res = await fetch(`${API_URL}/transactions/limits?month=${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const limits = await res.json();
        
        let html = '<table style="width:100%"><tr><th>Categoría</th><th>Gastado</th><th>Límite</th><th>Estado</th></tr>';
        let alarmCount = 0;
        
        limits.forEach(l => {
            if (l.type === 'expense' && l.monthly_limit && l.monthly_limit > 0) {
                const gastado = l.current_spending || 0;
                if (gastado >= l.monthly_limit * 0.8) {
                    alarmCount++;
                    const estado = gastado > l.monthly_limit ? '🔴 EXCEDIDO' : '🟡 CUIDADO';
                    const color = gastado > l.monthly_limit ? 'red' : 'orange';
                    html += `<tr>
                        <td>${l.category_name}</td>
                        <td>$${gastado.toFixed(2)}</td>
                        <td>$${l.monthly_limit.toFixed(2)}</td>
                        <td style="color: ${color};">${estado}</td>
                    </tr>`;
                }
            }
        });
        
        if (alarmCount === 0) {
            html = '<p>✅ TODAS LAS ALARMAS EN ORDEN</p>';
        } else {
            html += '</table>';
        }
        
        document.getElementById('alarmSummary').innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando alarmas:', error);
    }
}

// ========== TRANSACCIONES ==========
async function loadTransactions() {
    if (!token) { window.location.href = 'index.html'; return; }
    
    try {
        const userRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        document.getElementById('userEmail').innerText = userData.user.email;
        document.getElementById('balance').innerText = parseFloat(userData.user.balance).toFixed(2);
        
        const catRes = await fetch(`${API_URL}/transactions/categories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const categories = await catRes.json();
        
        let catOptions = '<option value="">TODAS LAS CATEGORÍAS</option>';
        categories.forEach(c => {
            catOptions += `<option value="${c.id}">${c.name}</option>`;
        });
        document.getElementById('filterCategory').innerHTML = catOptions;
        
        let url = `${API_URL}/transactions?page=${currentPage}&limit=10`;
        if (currentFilters.type) url += `&type=${currentFilters.type}`;
        if (currentFilters.category) url += `&category=${currentFilters.category}`;
        if (currentFilters.start) url += `&startDate=${currentFilters.start}`;
        if (currentFilters.end) url += `&endDate=${currentFilters.end}`;
        
        const transRes = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const transData = await transRes.json();
        
        let totalIncome = 0, totalExpense = 0;
        transData.transactions.forEach(t => {
            if (t.type === 'income') totalIncome += parseFloat(t.amount);
            else totalExpense += parseFloat(t.amount);
        });
        
        document.getElementById('totalIncome').innerText = totalIncome.toFixed(2);
        document.getElementById('totalExpense').innerText = totalExpense.toFixed(2);
        document.getElementById('netTotal').innerText = (totalIncome - totalExpense).toFixed(2);
        
        let html = '<table><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Acciones</th></tr>';
        
        transData.transactions.forEach(t => {
            const clase = t.type === 'income' ? 'income' : 'expense';
            const signo = t.type === 'income' ? '+' : '-';
            html += `<tr>
                <td>${t.date.substring(0,10)}</td>
                <td>${t.category_name || '-'}</td>
                <td>${t.description || '-'}</td>
                <td class="${clase}">${signo}$${parseFloat(t.amount).toFixed(2)}</td>
                <td>
                    <button class="edit" onclick="editTransaction(${t.id})">✏️</button>
                    <button class="delete" onclick="deleteTransaction(${t.id})">🗑️</button>
                </td>
            </tr>`;
        });
        
        html += '</table>';
        document.getElementById('transactionsList').innerHTML = html;
        document.getElementById('pageInfo').innerText = `Página ${currentPage}`;
        
        await loadCategories();
        await loadAlarms();
        
    } catch (error) {
        console.error(error);
    }
}

function applyFilters() {
    currentFilters = {
        type: document.getElementById('filterType').value,
        category: document.getElementById('filterCategory').value,
        start: document.getElementById('filterStart').value,
        end: document.getElementById('filterEnd').value
    };
    currentPage = 1;
    loadTransactions();
}

function resetFilters() {
    currentFilters = { type: '', category: '', start: '', end: '' };
    document.getElementById('filterType').value = '';
    document.getElementById('filterStart').value = '';
    document.getElementById('filterEnd').value = '';
    currentPage = 1;
    loadTransactions();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadTransactions();
    }
}

function nextPage() {
    currentPage++;
    loadTransactions();
}

// ========== CRUD TRANSACCIONES ==========
function openModal() {
    editingId = null;
    document.getElementById('modalTitle').innerText = 'NUEVA TRANSACCIÓN';
    document.getElementById('modalAmount').value = '';
    document.getElementById('modalDesc').value = '';
    document.getElementById('modalDate').value = new Date().toISOString().substring(0,10);
    loadCategoriesModal();
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

async function loadCategoriesModal() {
    const type = document.getElementById('modalType').value;
    const res = await fetch(`${API_URL}/transactions/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const categories = await res.json();
    
    let html = '<option value="">SELECCIONA UNA CATEGORÍA</option>';
    categories.filter(c => c.type === type).forEach(c => {
        html += `<option value="${c.id}">${c.name}</option>`;
    });
    document.getElementById('modalCategory').innerHTML = html;
}

async function saveTransaction() {
    const category_id = document.getElementById('modalCategory').value;
    if (!category_id) {
        alert('Selecciona una categoría');
        return;
    }
    
    const data = {
        category_id: parseInt(category_id),
        amount: parseFloat(document.getElementById('modalAmount').value),
        type: document.getElementById('modalType').value,
        description: document.getElementById('modalDesc').value,
        date: document.getElementById('modalDate').value
    };
    
    if (!data.amount || data.amount <= 0) {
        alert('Ingresa un monto válido');
        return;
    }
    
    try {
        let url = `${API_URL}/transactions`;
        let method = 'POST';
        
        if (editingId) {
            url = `${API_URL}/transactions/${editingId}`;
            method = 'PUT';
        }
        
        const res = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
        closeModal();
        loadTransactions();
        
        const userRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        document.getElementById('balance').innerText = parseFloat(userData.user.balance).toFixed(2);
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function editTransaction(id) {
    editingId = id;
    document.getElementById('modalTitle').innerText = 'EDITAR TRANSACCIÓN';
    
    const res = await fetch(`${API_URL}/transactions/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const t = await res.json();
    
    document.getElementById('modalType').value = t.type;
    await loadCategoriesModal();
    document.getElementById('modalCategory').value = t.category_id;
    document.getElementById('modalAmount').value = t.amount;
    document.getElementById('modalDesc').value = t.description || '';
    document.getElementById('modalDate').value = t.date.substring(0,10);
    
    document.getElementById('modal').style.display = 'block';
}

async function deleteTransaction(id) {
    if (!confirm('¿Eliminar transacción?')) return;
    
    try {
        await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        loadTransactions();
        
        const userRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        document.getElementById('balance').innerText = parseFloat(userData.user.balance).toFixed(2);
        
    } catch (error) {
        alert('Error eliminando');
    }
}

// ========== CATEGORÍAS ==========
async function loadCategories() {
    try {
        const res = await fetch(`${API_URL}/transactions/categories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const categories = await res.json();
        
        let html = '<tr><th>NOMBRE</th><th>TIPO</th><th>ACCIONES</th></tr>';
        categories.forEach(c => {
            html += `<tr>
                <td>${c.name}</td>
                <td class="${c.type}">${c.type === 'income' ? 'INGRESO' : 'GASTO'}</td>
                <td>
                    ${c.user_id ? `
                        <button onclick="editCategory(${c.id}, '${c.name}', '${c.type}')">✏️ EDITAR</button>
                        <button onclick="deleteCategory(${c.id})">🗑️ ELIMINAR</button>
                    ` : 'GLOBAL'}
                </td>
            </tr>`;
        });
        
        const table = document.getElementById('categoriesTable');
        if (table) table.innerHTML = html;
        
        let catOptions = '';
        categories.filter(c => c.type === 'expense').forEach(c => {
            catOptions += `<option value="${c.id}">${c.name}</option>`;
        });
        
        const alarmSelect = document.getElementById('alarmCategory');
        if (alarmSelect) alarmSelect.innerHTML = catOptions;
        
        // También cargar para ingresos programados
        let incomeOptions = '';
        categories.filter(c => c.type === 'income').forEach(c => {
            incomeOptions += `<option value="${c.id}">${c.name}</option>`;
        });
        
        const schedSelect = document.getElementById('schedCategory');
        if (schedSelect) schedSelect.innerHTML = incomeOptions;
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

async function createCategory() {
    const name = document.getElementById('newCatName').value;
    const type = document.getElementById('newCatType').value;
    
    if (!name) {
        alert('Escribe un nombre para la categoría');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/transactions/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, type })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
        document.getElementById('newCatName').value = '';
        loadCategories();
        loadTransactions();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function editCategory(id, oldName, oldType) {
    const newName = prompt('Nuevo nombre para la categoría:', oldName);
    if (!newName) return;
    
    try {
        const res = await fetch(`${API_URL}/transactions/categories/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
        loadCategories();
        loadTransactions();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteCategory(id) {
    if (!confirm('¿Seguro que quieres eliminar esta categoría?')) return;
    
    try {
        const res = await fetch(`${API_URL}/transactions/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
        loadCategories();
        loadTransactions();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ========== ALARMAS (LÍMITES DE GASTO) ==========
async function loadAlarms() {
    try {
        // Verificar token
        if (!token) return;
        
        const monthInput = document.getElementById('alarmMonth')?.value;
        let month = monthInput;
        
        if (month && month.length === 7) {
            month = month + '-01';
        } else if (!month) {
            month = new Date().toISOString().substring(0,7) + '-01';
        }
        
        // Fetch a la API
        const res = await fetch(`${API_URL}/transactions/limits?month=${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Error cargando límites');
        
        const limits = await res.json();
        
        // Generar HTML
        let html = '<tr><th>CATEGORÍA</th><th>LÍMITE</th><th>GASTADO</th><th>ESTADO</th><th>ACCIÓN</th></tr>';
        let hasAlarms = false;
        
        limits.forEach(l => {
            if (l.type === 'expense') {
                const limite = parseFloat(l.monthly_limit) || 0;
                const gastado = parseFloat(l.current_spending) || 0;
                
                if (limite > 0) hasAlarms = true;
                
                const porcentaje = limite > 0 ? (gastado / limite * 100).toFixed(0) : 0;
                
                let estado = limite === 0 ? 'SIN LÍMITE' : '✅ OK';
                let color = 'black';
                
                if (limite > 0) {
                    if (gastado > limite) {
                        estado = '🚨 EXCEDIDO';
                        color = 'red';
                    } else if (gastado >= limite * 0.8) {
                        estado = '⚠️ CUIDADO';
                        color = 'orange';
                    }
                }
                
                html += `<tr>
                    <td>${l.category_name}</td>
                    <td>${limite > 0 ? '$' + limite.toFixed(2) : 'SIN LÍMITE'}</td>
                    <td>$${gastado.toFixed(2)} ${limite > 0 ? '(' + porcentaje + '%)' : ''}</td>
                    <td style="color: ${color};">${estado}</td>
                    <td>
                        ${limite > 0 ? `<button onclick="deleteAlarm(${l.category_id})">🗑️</button>` : ''}
                    </td>
                </tr>`;
            }
        });
        
        if (!hasAlarms) {
            html = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay límites establecidos</td></tr>';
        }
        
        document.getElementById('alarmsTable').innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando alarmas:', error);
        document.getElementById('alarmsTable').innerHTML = 
            '<tr><td colspan="5" style="text-align: center; color: red;">Error cargando alarmas</td></tr>';
    }
}

async function setAlarm() {
    const category_id = document.getElementById('alarmCategory').value;
    const monthly_limit = parseFloat(document.getElementById('alarmLimit').value);
    let month = document.getElementById('alarmMonth').value;
    
    if (!month) {
        month = new Date().toISOString().substring(0,7) + '-01';
    } else {
        month = month + '-01';
    }
    
    if (!category_id || !monthly_limit || monthly_limit <= 0) {
        alert('Selecciona categoría y escribe un límite válido');
        return;
    }
    
    try {
        console.log('Enviando límite:', { category_id, monthly_limit, month });
        
        const res = await fetch(`${API_URL}/transactions/limits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                category_id: parseInt(category_id), 
                monthly_limit, 
                month 
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
        document.getElementById('alarmLimit').value = '';
        alert(' Límite guardado correctamente');
        loadAlarms();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

    async function deleteAlarm(category_id) {
        if (!confirm('¿Eliminar límite de esta categoría?')) return;
        
        try {
            const monthInput = document.getElementById('alarmMonth')?.value;
            let month = monthInput;
            if (month && month.length === 7) {
                month = month + '-01';
            } else if (!month) {
                month = new Date().toISOString().substring(0,7) + '-01';
            }
            
            // Usar la nueva ruta DELETE
            const res = await fetch(`${API_URL}/transactions/limits/${category_id}?month=${month}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${token}` 
                }
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error);
            }
            
            alert('✅ Límite eliminado');
            loadAlarms(); // Recargar la lista
            
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

// ========== CRON JOBS (INGRESOS PROGRAMADOS) ==========
function toggleSchedFields() {
    const freq = document.getElementById('schedFrequency').value;
    document.getElementById('weeklyField').style.display = freq === 'weekly' ? 'block' : 'none';
    document.getElementById('monthlyField').style.display = freq === 'monthly' ? 'block' : 'none';
}

async function createScheduledIncome() {
    const data = {
        category_id: parseInt(document.getElementById('schedCategory').value),
        amount: parseFloat(document.getElementById('schedAmount').value),
        description: document.getElementById('schedDesc').value,
        frequency: document.getElementById('schedFrequency').value,
        start_date: document.getElementById('schedStartDate').value
    };
    
    if (data.frequency === 'weekly') {
        data.day_of_week = parseInt(document.getElementById('schedDayOfWeek').value);
    }
    
    if (data.frequency === 'monthly') {
        data.day_of_month = parseInt(document.getElementById('schedDayOfMonth').value);
    }
    
    if (!data.category_id || !data.amount || !data.description || !data.start_date) {
        document.getElementById('schedResult').innerHTML = '<p style="color: red;"> Todos los campos son requeridos</p>';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/scheduled`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
        document.getElementById('schedResult').innerHTML = '<p style="color: green;">Ingreso programado creado</p>';
        document.getElementById('schedDesc').value = '';
        document.getElementById('schedAmount').value = '';
        document.getElementById('schedStartDate').value = '';
        loadScheduledIncomes();
        
    } catch (error) {
        document.getElementById('schedResult').innerHTML = `<p style="color: red;"> ${error.message}</p>`;
    }
}

async function testCronJob(frequency) {
    try {
        let data = {
            category_id: 1,
            amount: 100,
            description: `CRON TEST - ${frequency.toUpperCase()}`,
            type: 'income',
            date: new Date().toISOString().substring(0,10)
        };
        
        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) throw new Error('Error creando transacción');
        
        const result = await res.json();
        
        document.getElementById('cronResult').innerHTML = `
            <p style="color: green;"> TRANSACCIÓN CREADA: $${result.transaction.amount}</p>
            <p>Descripción: ${result.transaction.description}</p>
            <p>Fecha: ${result.transaction.date}</p>
            <p>Nuevo balance: $${result.currentBalance}</p>
        `;
        
        const userRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        document.getElementById('balance').innerText = parseFloat(userData.user.balance).toFixed(2);
        
    } catch (error) {
        document.getElementById('cronResult').innerHTML = `<p style="color: red;">❌ ERROR: ${error.message}</p>`;
    }
}

async function loadScheduledIncomes() {
    try {
        const res = await fetch(`${API_URL}/scheduled`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                document.getElementById('scheduledTable').innerHTML = '<tr><td colspan="6">Endpoint de ingresos programados no disponible</td></tr>';
                return;
            }
            throw new Error('Error cargando');
        }
        
        const schedules = await res.json();
        
        let html = '<tr><th>DESCRIPCIÓN</th><th>MONTO</th><th>FRECUENCIA</th><th>PRÓXIMA FECHA</th><th>ESTADO</th><th>ACCIÓN</th></tr>';
        
        schedules.forEach(s => {
            let proxima = 'No disponible';
            if (s.frequency === 'weekly' && s.day_of_week !== null) {
                const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                proxima = `Cada ${dias[s.day_of_week]}`;
            } else if (s.frequency === 'biweekly') {
                proxima = 'Cada 14 días';
            } else if (s.frequency === 'monthly' && s.day_of_month) {
                proxima = `Día ${s.day_of_month} de cada mes`;
            }
            
            html += `<tr>
                <td>${s.description}</td>
                <td>$${parseFloat(s.amount).toFixed(2)}</td>
                <td>${s.frequency}</td>
                <td>${proxima}</td>
                <td class="${s.active ? 'active' : 'inactive'}">${s.active ? 'ACTIVO' : 'INACTIVO'}</td>
                <td>
                    ${s.active ? `<button onclick="deactivateScheduled(${s.id})">DESACTIVAR</button>` : ''}
                </td>
            </tr>`;
        });
        
        document.getElementById('scheduledTable').innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando ingresos programados:', error);
    }
}

async function deactivateScheduled(id) {
    if (!confirm('¿Desactivar este ingreso programado?')) return;
    
    try {
        await fetch(`${API_URL}/scheduled/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        loadScheduledIncomes();
        
    } catch (error) {
        alert('Error desactivando');
    }
}

// ========== LOGOUT ==========
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// ========== INICIALIZAR SEGÚN PÁGINA ==========
if (window.location.pathname.includes('dashboard.html')) {
    loadDashboard();
}

if (window.location.pathname.includes('transactions.html')) {
    loadTransactions();
}

if (window.location.pathname.includes('cron.html')) {
    (async function() {
        if (!token) { window.location.href = 'index.html'; return; }
        
        const userRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        document.getElementById('userEmail').innerText = userData.user.email;
        document.getElementById('balance').innerText = parseFloat(userData.user.balance).toFixed(2);
        
        await loadCategories();
        loadScheduledIncomes();
        toggleSchedFields();
    })();
}

// Tabs de index.html
if (document.getElementById('loginTab')) {
    document.getElementById('loginTab').onclick = function() {
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('registerTab').classList.remove('active');
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('registerForm').classList.remove('active');
    };

    document.getElementById('registerTab').onclick = function() {
        document.getElementById('registerTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('loginForm').classList.remove('active');
    };
}