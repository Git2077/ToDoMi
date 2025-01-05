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
        let graphUpdateInterval = null;
        let timerInterval = null;

        const startBtn = document.getElementById('startRecording');
        const timeDisplay = document.getElementById('recordingTime');
        const canvas = document.getElementById('sensorGraph');
        const ctx = canvas.getContext('2d');

        // Canvas-Größe anpassen
        function resizeCanvas() {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

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
            
            return Math.abs(avgY) > 6.0 && Math.abs(avgX) < 5.0;
        }

        function handleMotion(event) {
            if (!isRecording) return;

            const timestamp = Date.now();
            
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

        function updateGraph() {
            if (!sensorData.length) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Raster zeichnen
            ctx.strokeStyle = '#eee';
            ctx.lineWidth = 1;
            for (let i = 0; i < canvas.height; i += 20) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }

            // Daten zeichnen
            ['x', 'y', 'z'].forEach((axis, index) => {
                const colors = ['#f44336', '#4CAF50', '#2196F3'];
                ctx.beginPath();
                ctx.strokeStyle = colors[index];
                ctx.lineWidth = 2;
                
                sensorData.forEach((data, i) => {
                    const x = (i / sensorData.length) * canvas.width;
                    const y = canvas.height / 2 - data.gravity[axis] * 10;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
            });
        }

        startBtn.addEventListener('click', () => {
            if (!isRecording) {
                isRecording = true;
                startTime = Date.now();
                sensorData = [];
                startBtn.textContent = 'Aufzeichnung stoppen';
                
                window.addEventListener('devicemotion', handleMotion);
                graphUpdateInterval = setInterval(updateGraph, 100);
                timerInterval = setInterval(updateTimer, 1000);
                
            } else {
                isRecording = false;
                startBtn.textContent = 'Aufzeichnung starten';
                
                window.removeEventListener('devicemotion', handleMotion);
                clearInterval(graphUpdateInterval);
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

    initSensors();
});
