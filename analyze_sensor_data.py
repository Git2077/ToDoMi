import json
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime
import os
import glob

def load_dataset(filename):
    try:
        with open(filename, 'r') as file:
            data = json.load(file)
            if 'data' not in data:
                print(f"Warnung: Keine Sensordaten in {filename} gefunden")
                return None
            
            # Metadata aus Dateinamen extrahieren falls nicht in JSON
            if 'actual_position' not in data:
                position = filename.split('sensor_data_')[1].split('_2')[0]
                data['actual_position'] = position
                
            return {
                'actual_position': data['actual_position'],
                'detected_position': data.get('detected_position', 'unknown'),
                'data': data['data'] if isinstance(data['data'], list) else data['data']['data']
            }
    except Exception as e:
        print(f"Fehler beim Laden von {filename}: {e}")
        return None

def analyze_multiple_datasets():
    # Finde alle sensor_data JSON Dateien im aktuellen Verzeichnis
    files = glob.glob('sensor_data_*.json')
    
    if not files:
        print("Keine Sensordaten gefunden!")
        print("Bitte erst Messungen durchführen:")
        print("1. App öffnen")
        print("2. 'Debugging starten' klicken")
        print("3. Position auswählen")
        print("4. ~70 Sekunden warten")
        print("5. 'Debugging stoppen' klicken")
        print("6. Für alle 4 Positionen wiederholen")
        return

    print(f"Gefundene Datendateien:")
    for f in files:
        print(f"- {f}")
    print()

    datasets = {}
    for file in files:
        try:
            data = load_dataset(file)
            datasets[data['actual_position']] = data
        except Exception as e:
            print(f"Fehler beim Laden von {file}: {e}")
    
    if not datasets:
        print("Keine gültigen Datensätze gefunden!")
        return

    # Plotting für alle Datensätze
    fig = plt.figure(figsize=(15, 12))
    plt.subplots_adjust(left=0.1, right=0.9, hspace=0.4)

    for idx, (position, data) in enumerate(datasets.items(), 1):
        print(f"\nAnalyse für {position}:")
        print(f"------------------------")
        print(f"Gesamtdauer: {len(data['data'])/60:.1f} Sekunden")
        
        # Analysiere nur die "stabilen" Daten
        patterns = analyze_patterns(data['data'], transition_time=5)
        if patterns is None:
            print("Zu wenig Daten für aussagekräftige Analyse")
            continue
            
        print(f"Analysierte Dauer: {len(patterns['variance'])*100/60:.1f} Sekunden")
        
        # Extrahiere Werte
        times = [(d['timestamp'] - data['data'][0]['timestamp'])/1000 for d in data['data']]
        gravity_x = [d['gravity']['x'] for d in data['data']]
        gravity_y = [d['gravity']['y'] for d in data['data']]
        gravity_z = [d['gravity']['z'] for d in data['data']]

        # Plot für jede Position
        ax = plt.subplot(2, 2, idx)
        plt.plot(times, gravity_x, 'r-', label='X', alpha=0.7)
        plt.plot(times, gravity_y, 'g-', label='Y', alpha=0.7)
        plt.plot(times, gravity_z, 'b-', label='Z', alpha=0.7)
        plt.title(f'Position: {position}')
        plt.xlabel('Zeit (Sekunden)')
        plt.ylabel('Schwerkraft (m/s²)')
        plt.grid(True)
        plt.legend()

        # Muster-Analyse
        print(f"\nAnalyse für {position}:")
        print(f"------------------------")
        print(f"Durchschnittliche Varianz X: {np.mean(patterns['variance'][0]):.2f}")
        print(f"Durchschnittliche Varianz Y: {np.mean(patterns['variance'][1]):.2f}")
        print(f"Durchschnittliche Varianz Z: {np.mean(patterns['variance'][2]):.2f}")
        
        # Frequenzanalyse
        frequencies = np.abs(patterns['frequency'][0])
        dominant_freq = np.argmax(frequencies[1:]) + 1
        print(f"Dominante Frequenz: {dominant_freq} Hz")

    suggest_detection_algorithm(datasets)
    plt.show()

def analyze_patterns(data, window_size=100, transition_time=5):
    # Berechne Samples die übersprungen werden sollen (bei 60Hz)
    skip_samples = int(transition_time * 60)
    
    # Entferne die ersten und letzten n Sekunden
    clean_data = data[skip_samples:-skip_samples]
    
    if len(clean_data) < window_size:
        print("Warnung: Zu wenig Daten nach Entfernung der Übergangszeiten")
        return None
        
    patterns = {
        'variance': [],
        'frequency': [],
        'orientation': [],
        'movement': []
    }
    
    for i in range(0, len(clean_data), window_size):
        window = clean_data[i:i+window_size]
        if len(window) < window_size:
            continue
            
        # Extrahiere x,y,z Werte aus gravity
        gravity_x = [d['gravity']['x'] for d in window]
        gravity_y = [d['gravity']['y'] for d in window]
        gravity_z = [d['gravity']['z'] for d in window]
        
        # Berechne Varianz für jede Achse
        variance_x = np.var(gravity_x)
        variance_y = np.var(gravity_y)
        variance_z = np.var(gravity_z)
        
        # Frequenzanalyse
        frequencies_x = np.fft.fft(gravity_x)
        
        # Durchschnittliche Orientierung als Array [x,y,z]
        mean_orientation = [
            np.mean(gravity_x),
            np.mean(gravity_y),
            np.mean(gravity_z)
        ]
        
        # Bewegungserkennung
        movement = 'moving' if max(variance_x, variance_y, variance_z) > 0.1 else 'still'
        
        patterns['variance'].append([variance_x, variance_y, variance_z])
        patterns['frequency'].append(frequencies_x)
        patterns['orientation'].append(mean_orientation)
        patterns['movement'].append(movement)
    
    return patterns

def suggest_detection_algorithm(datasets):
    print("\nAnalyse für verbesserten Erkennungsalgorithmus:")
    print("---------------------------------------------")
    
    # Analysiere charakteristische Merkmale jeder Position
    position_characteristics = {}
    
    for position, data in datasets.items():
        patterns = analyze_patterns(data['data'])
        
        # Berechne durchschnittliche Merkmale
        avg_variance = np.mean(patterns['variance'], axis=0)
        avg_orientation = np.mean(patterns['orientation'], axis=0)
        movement_ratio = sum(1 for m in patterns['movement'] if m == 'moving') / len(patterns['movement'])
        
        position_characteristics[position] = {
            'variance': avg_variance,
            'orientation': avg_orientation,
            'movement_ratio': movement_ratio
        }
        
        print(f"\nPosition: {position}")
        print(f"Durchschnittliche Varianz (X,Y,Z): {avg_variance}")
        print(f"Durchschnittliche Orientierung: {avg_orientation}")
        print(f"Bewegungsanteil: {movement_ratio:.2%}")
    
    # Vorschlag für verbesserten Algorithmus
    print("\nVorgeschlagener verbesserter Algorithmus:")
    print("----------------------------------------")
    print("function detectPosition(data, windowSize = 20) {")
    print("    const window = data.slice(-windowSize);")
    print("    ")
    print("    // Berechne Varianz")
    print("    const varX = calculateVariance(window.map(d => d.gravity.x));")
    print("    const varY = calculateVariance(window.map(d => d.gravity.y));")
    print("    const varZ = calculateVariance(window.map(d => d.gravity.z));")
    print("    ")
    print("    // Berechne durchschnittliche Orientierung")
    print("    const avgX = average(window.map(d => Math.abs(d.gravity.x)));")
    print("    const avgY = average(window.map(d => Math.abs(d.gravity.y)));")
    print("    const avgZ = average(window.map(d => Math.abs(d.gravity.z)));")
    print("    ")
    print("    // Bewegungserkennung")
    print("    const isMoving = (varX + varY + varZ) > 0.1;")
    print("    ")
    print("    // Positionserkennung basierend auf den Analysen")
    if len(position_characteristics) >= 4:
        sit_vars = position_characteristics['sitzend_still']['variance']
        stand_vars = position_characteristics['stehend_still']['variance']
        print(f"    // Schwellenwerte basierend auf Analyse:")
        print(f"    // Sitzen: Varianz ~{sit_vars}")
        print(f"    // Stehen: Varianz ~{stand_vars}")
    
    print("    return {")
    print("        isStanding: detectStanding(avgX, avgY, avgZ, varX, varY, varZ),")
    print("        isMoving: isMoving")
    print("    };")
    print("}")

# Hauptausführung
if __name__ == "__main__":
    analyze_multiple_datasets() 