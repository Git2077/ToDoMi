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
        let isRecording = false;
        let isStanding = false;
        let recordings = [];
        let startTime = null;
        let graphUpdateInterval;

        const startBtn = document.getElementById('startRecording');
        const toggleBtn = document.getElementById('togglePosition');
        const timeDisplay = document.getElementById('recordingTime');
        const canvas = document.getElementById('sensorGraph');
        const ctx = canvas.getContext('2d');

        startBtn.addEventListener('click', () => {
            if (!isRecording) {
                // Aufzeichnung starten
                isRecording = true;
                startTime = Date.now();
                recordings = [];
                startBtn.textContent = 'Aufzeichnung stoppen';
                updateGraph();
            } else {
                // Aufzeichnung stoppen und speichern
                isRecording = false;
                startBtn.textContent = 'Aufzeichnung starten';
                saveRecordings(recordings);
                clearInterval(graphUpdateInterval);
            }
        });

        toggleBtn.addEventListener('click', () => {
            isStanding = !isStanding;
            toggleBtn.textContent = `Position: ${isStanding ? 'Stehend' : 'Sitzend'}`;
        });

        window.addEventListener('devicemotion', (event) => {
            if (!isRecording) return;

            const data = {
                timestamp: Date.now(),
                gravity: {
                    x: event.accelerationIncludingGravity.x,
                    y: event.accelerationIncludingGravity.y,
                    z: event.accelerationIncludingGravity.z
                },
                acceleration: {
                    x: event.acceleration.x,
                    y: event.acceleration.y,
                    z: event.acceleration.z
                },
                rotation: {
                    alpha: event.rotationRate.alpha,
                    beta: event.rotationRate.beta,
                    gamma: event.rotationRate.gamma
                },
                isStanding
            };

            recordings.push(data);
            updateDisplay(data);
        });

        function updateGraph() {
            graphUpdateInterval = setInterval(() => {
                if (!recordings.length) return;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Letzte 100 Messungen anzeigen
                const displayData = recordings.slice(-100);
                
                // Zeichne Beschleunigungsdaten
                ctx.beginPath();
                ctx.strokeStyle = '#4CAF50';
                displayData.forEach((data, i) => {
                    const x = (i / 100) * canvas.width;
                    const y = canvas.height - (data.gravity.y + 10) * 10;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();

                // Zeitanzeige aktualisieren
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                timeDisplay.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 100);
        }
    }

    function saveRecordings(data) {
        const filename = `sensor_data_${new Date().toISOString()}.json`;
        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
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

    function updateDisplay(data) {
        const sensorValues = document.querySelector('.sensor-values');
        sensorValues.innerHTML = `
            <div>
                <strong>Schwerkraft:</strong><br>
                X: ${Math.round(data.gravity.x || 0)}<br>
                Y: ${Math.round(data.gravity.y || 0)}<br>
                Z: ${Math.round(data.gravity.z || 0)}
            </div>
            <div>
                <strong>Beschleunigung:</strong><br>
                X: ${Math.round(data.acceleration.x || 0)}<br>
                Y: ${Math.round(data.acceleration.y || 0)}<br>
                Z: ${Math.round(data.acceleration.z || 0)}
            </div>
            <div>
                <strong>Rotation:</strong><br>
                α: ${Math.round(data.rotation.alpha || 0)}°<br>
                β: ${Math.round(data.rotation.beta || 0)}°<br>
                γ: ${Math.round(data.rotation.gamma || 0)}°
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

    function visualizeData(recordings) {
        const sensorStatus = document.getElementById('sensorStatus');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Hier könnte man die Daten als Graph darstellen
        // X-Achse: Zeit
        // Y-Achse: verschiedene Sensordaten
        // Farbige Markierung der Steh/Sitz-Phasen
    }

    // Bewegungserkennung basierend auf Orientierung
    function detectStandingByOrientation(data, windowSize = 20) {
        const predictions = [];
        
        for (let i = 0; i < data.length; i++) {
            // Bestimme das Fenster
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(data.length, i + Math.floor(windowSize / 2));
            const window = data.slice(start, end);
            
            // Berechne Durchschnittswerte für X und Y
            const avgX = window.reduce((sum, d) => sum + d.gravity.x, 0) / window.length;
            const avgY = window.reduce((sum, d) => sum + d.gravity.y, 0) / window.length;
            
            // Klassifizierung:
            // - Stehen: Y-Werte höher, X-Werte niedriger
            // - Sitzen: Y-Werte niedriger, X-Werte höher
            const isStanding = avgY > 6.0 && avgX < 5.0;
            predictions.push(isStanding);
        }
        
        return predictions;
    }

    // Aktualisiere die Bewegungserkennung in der processMotion Funktion
    function processMotion(event) {
        if (!isRecording) return;

        const timestamp = Date.now();
        const gravity = event.accelerationIncludingGravity;
        const rotation = {
            alpha: event.rotationRate.alpha,
            beta: event.rotationRate.beta,
            gamma: event.rotationRate.gamma
        };
        
        // Füge neue Daten hinzu
        sensorData.push({
            timestamp: timestamp,
            gravity: {
                x: gravity.x,
                y: gravity.y,
                z: gravity.z
            },
            rotation: rotation
        });

        // Wende die neue Erkennungsmethode an
        if (sensorData.length >= 20) { // Mindestens Fenstergröße
            const predictions = detectStandingByOrientation(sensorData);
            const currentPrediction = predictions[predictions.length - 1];
            
            // Aktualisiere UI
            document.getElementById('standingStatus').textContent = 
                currentPrediction ? 'Stehend' : 'Sitzend';
            
            // Speichere Vorhersage
            sensorData[sensorData.length - 1].isStanding = currentPrediction;
        }
    }
});
