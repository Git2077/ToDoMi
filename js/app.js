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
        window.addEventListener('deviceorientation', (event) => {
            // Werte auslesen
            const compass = Math.round(event.alpha);  // Kompass
            const tilt = Math.round(event.beta);      // Neigung vor/zurück
            const roll = Math.round(event.gamma);     // Neigung links/rechts

            // Werte anzeigen
            const sensorStatus = document.getElementById('sensorStatus');
            sensorStatus.innerHTML = `
                <p>Kompass: ${compass}°</p>
                <p>Neigung vor/zurück: ${tilt}°</p>
                <p>Neigung links/rechts: ${roll}°</p>
            `;

            // Liste neigen (basierend auf Seitenneigung)
            const todoList = document.getElementById('todoList');
            todoList.style.setProperty('--tilt-angle', `${roll/5}deg`);
            todoList.classList.add('tilted');
        });

        window.addEventListener('devicemotion', (event) => {
            // Optional: Bewegungsdaten anzeigen
            const motionData = `
                <p>Bewegung X: ${Math.round(event.acceleration.x || 0)} m/s²</p>
                <p>Bewegung Y: ${Math.round(event.acceleration.y || 0)} m/s²</p>
                <p>Bewegung Z: ${Math.round(event.acceleration.z || 0)} m/s²</p>
            `;
            
            // Bewegungsdaten an bestehende Anzeige anhängen
            document.getElementById('sensorStatus').innerHTML += motionData;
        });
    }

    // Sensor-Initialisierung aufrufen
    initSensors();
});
