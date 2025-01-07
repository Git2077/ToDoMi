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
        let sensorData = [];
        let startTime = null;
        let timerInterval = null;
        let sittingSeconds = 0;
        let standingSeconds = 0;
        let lastUpdate = null;

        const startBtn = document.getElementById('startRecording');
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
            const avgX = window.reduce((sum, d) => sum + Math.abs(d.gravity.x), 0) / windowSize;
            const avgY = window.reduce((sum, d) => sum + Math.abs(d.gravity.y), 0) / windowSize;
            
            return Math.abs(avgY) > 4.0 && Math.abs(avgX) < 5.0;
        }

        function handleMotion(event) {
            if (!isRecording) return;

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

            sensorData.push(data);

            const isStanding = detectStandingByOrientation(sensorData);
            document.getElementById('standingStatus').textContent = 
                isStanding ? 'Stehend' : 'Sitzend';

            updateDisplay(data);

            if (sensorData.length > 100) {
                sensorData = sensorData.slice(-100);
            }

            updatePositionTimes();
        }

        function updateDisplay(data) {
            const sensorValues = document.querySelector('.sensor-values');
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
            if (!isRecording || !lastUpdate) return;
            
            const now = Date.now();
            const delta = (now - lastUpdate) / 1000;
            const isStanding = detectStandingByOrientation(sensorData);
            
            if (isStanding) {
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

        startBtn.addEventListener('click', () => {
            if (!isRecording) {
                isRecording = true;
                startTime = Date.now();
                lastUpdate = startTime;
                sensorData = [];
                sittingSeconds = 0;
                standingSeconds = 0;
                startBtn.textContent = 'Aufzeichnung stoppen';
                
                window.addEventListener('devicemotion', handleMotion);
                timerInterval = setInterval(updateTimer, 1000);
                
            } else {
                isRecording = false;
                startBtn.textContent = 'Aufzeichnung starten';
                
                window.removeEventListener('devicemotion', handleMotion);
                clearInterval(timerInterval);
                
                if (sensorData.length > 0) {
                    saveRecordings(sensorData);
                }
            }
        });
    }

    function saveRecordings(data) {
        const filename = `sensor_data_${new Date().toISOString().replace(/:/g, '_')}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    if (!window.DeviceMotionEvent) {
        console.error('Device Motion API nicht verfügbar');
        alert('Ihr Gerät unterstützt keine Bewegungssensoren');
        return;
    }

    initSensors();
});
