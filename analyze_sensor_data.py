import json
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

# Daten aus der JSON-Datei laden
with open('sensor_data_2025-01-05T21_08_26.234Z.json', 'r') as file:
    data = json.load(file)

# Zeitstempel in relative Sekunden konvertieren (vom ersten Zeitstempel aus)
first_timestamp = data[0]['timestamp']
relative_times = [(d['timestamp'] - first_timestamp) / 1000 for d in data]

# Extrahiere Werte
gravity_x = [d['gravity']['x'] for d in data]
gravity_y = [d['gravity']['y'] for d in data]
gravity_z = [d['gravity']['z'] for d in data]

# Bewegungserkennung basierend auf X/Y-Werten
def detect_standing_by_orientation(data, window_size=20):
    predictions = []
    
    for i in range(len(data)):
        start = max(0, i - window_size // 2)
        end = min(len(data), i + window_size // 2)
        window = data[start:end]
        
        avg_x = np.mean([abs(d['gravity']['x']) for d in window])
        avg_y = np.mean([abs(d['gravity']['y']) for d in window])
        
        is_standing = abs(avg_y) > 4.0 and abs(avg_x) < 5.0
        predictions.append(1 if is_standing else 0)
    
    return predictions

# Führe Erkennung durch
predicted_standing = detect_standing_by_orientation(data)

# Plotting
fig = plt.figure(figsize=(15, 10))
plt.subplots_adjust(left=0.1, right=0.9, hspace=0.3)

# Plot 1: Schwerkraft-Werte
ax1 = plt.subplot(2, 1, 1)
plt.plot(relative_times, gravity_x, 'r-', label='X', alpha=0.7)
plt.plot(relative_times, gravity_y, 'g-', label='Y', alpha=0.7)
plt.plot(relative_times, gravity_z, 'b-', label='Z', alpha=0.7)
plt.title('Schwerkraft über Zeit')
plt.xlabel('Zeit (Sekunden)')
plt.ylabel('Schwerkraft (m/s²)')
plt.grid(True)
plt.legend()

# Plot 2: Absolute Werte von X und Y mit Schwellenwerten
plt.subplot(2, 1, 2)
plt.plot(relative_times, [abs(x) for x in gravity_x], 'r-', label='|X|', alpha=0.7)
plt.plot(relative_times, [abs(y) for y in gravity_y], 'g-', label='|Y|', alpha=0.7)
plt.axhline(y=5.0, color='r', linestyle='--', label='X-Schwellenwert (5.0)')
plt.axhline(y=6.0, color='g', linestyle='--', label='Y-Schwellenwert (6.0)')
plt.title('Absolute Schwerkraftwerte mit Schwellenwerten')
plt.xlabel('Zeit (Sekunden)')
plt.ylabel('|Schwerkraft| (m/s²)')
plt.grid(True)
plt.legend()

plt.show()

# Statistik ausgeben
print(f"\nAnalyse der Sensordaten:")
print(f"------------------------")
print(f"Anzahl Datenpunkte: {len(data)}")
print(f"Durchschnittliche X-Werte: {np.mean([abs(x) for x in gravity_x]):.2f}")
print(f"Durchschnittliche Y-Werte: {np.mean([abs(y) for y in gravity_y]):.2f}")
print(f"Durchschnittliche Z-Werte: {np.mean([abs(z) for z in gravity_z]):.2f}")
print(f"Aufzeichnungsdauer: {relative_times[-1]:.1f} Sekunden") 