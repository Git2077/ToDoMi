document.addEventListener('DOMContentLoaded', () => {
    function initSensors() {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.body.addEventListener('click', async () => {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') {
                        enableSensors();
                    }
                } catch (error) {
                    console.error('Sensor-Zugriff nicht erlaubt:', error);
                }
            }, { once: true });
        } else {
            enableSensors();
        }
    }

    function enableSensors() {
        let isRecording = false;
        let isMeasuring = false;
        let sensorData = [];
        let startTime = null;
        let timerInterval = null;
        let sittingSeconds = 0;
        let standingSeconds = 0;
        let lastUpdate = null;
        let lastPosition = null;
        let measurementData = [];
        let currentActivity = null;

        const startStopButton = document.getElementById('startStopButton');
        const debugButton = document.getElementById('startRecording');
        const timeDisplay = document.getElementById('recordingTime');

        function updateTimer() {
            if (!startTime) return;
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            timeDisplay.textContent = `${minutes}:${seconds}`;
        }

        function detectStandingByOrientation(data, windowSize = 20) {
            if (data.length < windowSize) return false;
            
            const window = data.slice(-windowSize);
            
            // Berechne Durchschnitte
            const avgY = window.reduce((sum, d) => sum + d.gravity.y, 0) / windowSize;
            const avgZ = window.reduce((sum, d) => sum + d.gravity.z, 0) / windowSize;
            
            // Berechne Varianz für Bewegungserkennung
            const varX = calculateVariance(window.map(d => d.gravity.x));
            const varY = calculateVariance(window.map(d => d.gravity.y));
            const varZ = calculateVariance(window.map(d => d.gravity.z));
            
            // Bewegungserkennung
            const totalVariance = varX + varY + varZ;
            const isMoving = totalVariance > 0.1;
            
            // Bei starker Bewegung alte Position beibehalten
            if (isMoving && lastPosition !== null) {
                return lastPosition;
            }
            
            // Stehen: Y-Achse stark nach unten (~9.4), Z-Achse nahe 0
            return avgY > 8.5 && Math.abs(avgZ) < 2.0;
        }

        // Hilfsfunktion für Varianzberechnung
        function calculateVariance(values) {
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        }

        function handleMotion(event) {
            if (!isMeasuring) return;

            const timestamp = Date.now();
            lastUpdate = lastUpdate || timestamp;
            
            if (!event.accelerationIncludingGravity) {
                console.error('Keine Gravity-Daten verfügbar');
                return;
            }

            const data = {
                timestamp: timestamp,
                gravity: {
                    x: event.accelerationIncludingGravity.x || 0,
                    y: event.accelerationIncludingGravity.y || 0,
                    z: event.accelerationIncludingGravity.z || 0
                },
                rotation: {
                    alpha: event.rotationRate?.alpha || 0,
                    beta: event.rotationRate?.beta || 0,
                    gamma: event.rotationRate?.gamma || 0
                }
            };

            measurementData.push(data);
            if (measurementData.length > 20) {
                measurementData = measurementData.slice(-20);
            }

            if (isRecording) {
                sensorData.push(data);
                if (sensorData.length > 18000) {
                    sensorData = sensorData.slice(-18000);
                }
            }

            const isStanding = detectStandingByOrientation(measurementData);
            lastPosition = isStanding;
            
            document.getElementById('standingStatus').textContent = 
                isStanding ? 'Stehend' : 'Sitzend';

            updateDisplay(data);
            updatePositionTimes();
        }

        function updateDisplay(data) {
            const sensorValues = document.querySelector('.sensor-values');
            if (!isRecording) {
                sensorValues.innerHTML = '';
                return;
            }
            
            sensorValues.innerHTML = `
                <div>
                    <strong>Schwerkraft:</strong><br>
                    X: ${data.gravity.x.toFixed(2)}<br>
                    Y: ${data.gravity.y.toFixed(2)}<br>
                    Z: ${data.gravity.z.toFixed(2)}
                </div>
                <div>
                    <strong>Rotation:</strong><br>
                    α: ${data.rotation.alpha.toFixed(1)}°<br>
                    β: ${data.rotation.beta.toFixed(1)}°<br>
                    γ: ${data.rotation.gamma.toFixed(1)}°
                </div>
            `;
        }

        function updatePositionTimes() {
            if (!isMeasuring || !lastUpdate || lastPosition === null) return;
            
            const now = Date.now();
            const delta = (now - lastUpdate) / 1000;
            
            if (lastPosition) {
                standingSeconds += delta;
            } else {
                sittingSeconds += delta;
            }
            
            lastUpdate = now;
            
            document.getElementById('sittingTime').textContent = formatTime(sittingSeconds);
            document.getElementById('standingTime').textContent = formatTime(standingSeconds);
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
            return `${mins}:${secs}`;
        }

        startStopButton.addEventListener('click', () => {
            if (!isMeasuring) {
                // Starte Messung direkt
                isMeasuring = true;
                startStopButton.textContent = 'Stop';
                startTime = Date.now();
                lastUpdate = startTime;
                sittingSeconds = 0;
                standingSeconds = 0;
                measurementData = [];
                window.addEventListener('devicemotion', handleMotion);
                timerInterval = setInterval(updateTimer, 1000);
            } else {
                // Stop-Logik bleibt gleich
                isMeasuring = false;
                startStopButton.textContent = 'Start';
                window.removeEventListener('devicemotion', handleMotion);
                clearInterval(timerInterval);
                startTime = null;
                lastUpdate = null;
                lastPosition = null;
                measurementData = [];
                timeDisplay.textContent = '00:00';
            }
        });

        async function selectPosition() {
            const position = prompt(
                'Position für diese Aufnahme:\n' +
                '1: Sitzend still\n' +
                '2: Sitzend bewegend\n' +
                '3: Stehend still\n' +
                '4: Stehend gehend\n' +
                'Bitte Nummer eingeben:'
            );

            const activities = {
                '1': 'sitzend_still',
                '2': 'sitzend_bewegend',
                '3': 'stehend_still',
                '4': 'stehend_gehend'
            };

            return activities[position] || null;
        }

        debugButton.addEventListener('click', async () => {
            if (!isRecording) {
                currentActivity = await selectPosition();
                if (!currentActivity) {
                    alert('Bitte eine gültige Position wählen!');
                    return;
                }
                isRecording = true;
                sensorData = [];
                debugButton.textContent = 'Debugging stoppen';
            } else {
                isRecording = false;
                debugButton.textContent = 'Debugging starten';
                if (sensorData.length > 0) {
                    const metadata = {
                        detected_position: document.getElementById('standingStatus').textContent,
                        actual_position: currentActivity,
                        location: 'hosentasche_hinten_rechts',
                        data: sensorData
                    };
                    
                    const filename = `sensor_data_${metadata.actual_position}_${new Date().toISOString().replace(/:/g, '_')}.json`;
                    const blob = new Blob([JSON.stringify(metadata, null, 2)], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    
                    URL.revokeObjectURL(url);
                }
            }
        });
    }

    if (!window.DeviceMotionEvent) {
        console.error('Device Motion API nicht verfügbar');
        alert('Ihr Gerät unterstützt keine Bewegungssensoren');
        return;
    }

    initSensors();

    const deploymentDate = new Date().toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.querySelector('.version-info').textContent = `Version deployed: ${deploymentDate}`;
});
