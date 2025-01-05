document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodo');
    const todoList = document.getElementById('todoList');

    // Lädt gespeicherte Todos oder erstellt leeres Array
    let todos = JSON.parse(localStorage.getItem('todos')) || [];

    // Todos anzeigen
    function renderTodos() {
        todoList.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span>${todo.text}</span>
                <button class="delete-btn">×</button>
            `;

            // Checkbox Event
            li.querySelector('input').addEventListener('change', () => toggleTodo(index));
            
            // Delete Button Event
            li.querySelector('.delete-btn').addEventListener('click', () => deleteTodo(index));

            todoList.appendChild(li);
        });
        saveTodos();
    }

    // Neues Todo hinzufügen
    function addTodo(text) {
        if (text.trim()) {
            todos.push({ text, completed: false });
            renderTodos();
        }
    }

    // Todo löschen
    function deleteTodo(index) {
        todos.splice(index, 1);
        renderTodos();
    }

    // Todo Status ändern
    function toggleTodo(index) {
        todos[index].completed = !todos[index].completed;
        renderTodos();
    }

    // Todos im localStorage speichern
    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    // Event Listeners
    addTodoBtn.addEventListener('click', () => {
        addTodo(todoInput.value);
        todoInput.value = '';
    });

    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo(todoInput.value);
            todoInput.value = '';
        }
    });

    // Initial render
    renderTodos();

    // Sensor-Funktionalität
    function initSensors() {
        // Prüfen ob Gerät Sensoren unterstützt
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ erfordert Benutzerinteraktion für Sensor-Zugriff
            document.body.addEventListener('click', async () => {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') {
                        enableSensors();
                    }
                } catch (error) {
                    console.log('Sensor-Zugriff nicht erlaubt:', error);
                }
            }, { once: true });
        } else {
            // Direkter Zugriff für andere Geräte
            enableSensors();
        }
    }

    function enableSensors() {
        let isStanding = false;
        let standingTime = 0;
        let sittingTime = 0;
        let lastUpdate = Date.now();
        let readings = []; // Sammeln mehrerer Messungen

        window.addEventListener('devicemotion', (event) => {
            const { x, y, z } = event.accelerationIncludingGravity;
            const now = Date.now();
            const timeDiff = now - lastUpdate;
            
            // Mehrere Messungen sammeln (Puffer von 10 Werten)
            readings.push({ x, y, z });
            if (readings.length > 10) readings.shift();
            
            // Position bestimmen durch Analyse mehrerer Messungen
            const position = determinePosition(readings);
            
            if (position !== isStanding) {
                isStanding = position;
                console.log('Position changed:', isStanding ? 'Stehend' : 'Sitzend');
            }

            // Zeit aktualisieren
            if (isStanding) {
                standingTime += timeDiff;
            } else {
                sittingTime += timeDiff;
            }
            
            lastUpdate = now;
            
            // Anzeige aktualisieren
            updateDisplay(isStanding, standingTime, sittingTime, { x, y, z });
        });
    }

    function determinePosition(readings) {
        // Durchschnittswerte berechnen
        const avg = readings.reduce((acc, val) => {
            return {
                x: acc.x + val.x,
                y: acc.y + val.y,
                z: acc.z + val.z
            };
        }, { x: 0, y: 0, z: 0 });
        
        avg.x /= readings.length;
        avg.y /= readings.length;
        avg.z /= readings.length;

        // Sitzen: Telefon meist horizontal (z ≈ 9.8)
        // Stehen: Telefon meist vertikal in der Tasche (y ≈ 9.8)
        const isStanding = Math.abs(avg.y) > 8;
        
        return isStanding;
    }

    function updateDisplay(isStanding, standingTime, sittingTime, acceleration) {
        const sensorStatus = document.getElementById('sensorStatus');
        sensorStatus.innerHTML = `
            <h2>Aktivitäts-Tracker</h2>
            <div class="activity-stats">
                <p>Status: <span>${isStanding ? 'Stehend' : 'Sitzend'}</span></p>
                <p>Stehzeit: <span>${formatTime(standingTime)}</span></p>
                <p>Sitzzeit: <span>${formatTime(sittingTime)}</span></p>
                <p class="debug">
                    X: ${Math.round(acceleration.x)}<br>
                    Y: ${Math.round(acceleration.y)}<br>
                    Z: ${Math.round(acceleration.z)}
                </p>
            </div>
        `;
    }

    // Zeit formatieren
    function formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }

    // Sensor-Initialisierung aufrufen
    initSensors();

    // Zeiten im localStorage speichern
    function saveActivityTimes(standing, sitting) {
        const today = new Date().toISOString().split('T')[0];
        const times = JSON.parse(localStorage.getItem('activityTimes') || '{}');
        times[today] = { standing, sitting };
        localStorage.setItem('activityTimes', JSON.stringify(times));
    }

    // Zeiten laden
    function loadActivityTimes() {
        const today = new Date().toISOString().split('T')[0];
        const times = JSON.parse(localStorage.getItem('activityTimes') || '{}');
        return times[today] || { standing: 0, sitting: 0 };
    }
});
