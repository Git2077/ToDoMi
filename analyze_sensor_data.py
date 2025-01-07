import json
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

def load_dataset(filename):
    with open(filename, 'r') as file:
        data = json.load(file)
        return {
            'actual_position': data['actual_position'],
            'detected_position': data['detected_position'],
            'data': data['data']
        }

def analyze_multiple_datasets():
    # Liste der Dateinamen (werden durch die Debug-Funktion erstellt)
    files = [
        'sensor_data_sitzend_still_*.json',
        'sensor_data_sitzend_bewegend_*.json',
        'sensor_data_stehend_still_*.json',
        'sensor_data_stehend_gehend_*.json'
    ]
    
    datasets = {}
    for file in files:
        data = load_dataset(file)
        datasets[data['actual_position']] = data

    # Plotting für alle Datensätze
    fig = plt.figure(figsize=(15, 12))
    plt.subplots_adjust(left=0.1, right=0.9, hspace=0.4)

    for idx, (position, data) in enumerate(datasets.items(), 1):
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
        patterns = analyze_patterns(data['data'])
        print(f"\nAnalyse für {position}:")
        print(f"------------------------")
        print(f"Durchschnittliche Varianz X: {np.mean(patterns['variance'][0]):.2f}")
        print(f"Durchschnittliche Varianz Y: {np.mean(patterns['variance'][1]):.2f}")
        print(f"Durchschnittliche Varianz Z: {np.mean(patterns['variance'][2]):.2f}")
        
        # Frequenzanalyse
        frequencies = np.abs(patterns['frequency'][0])
        dominant_freq = np.argmax(frequencies[1:]) + 1
        print(f"Dominante Frequenz: {dominant_freq} Hz")

    plt.show()

def analyze_patterns(data, window_size=100):
    patterns = {
        'variance': [],      # Wie stark schwanken die Werte?
        'frequency': [],     # Wie schnell ändern sich die Werte?
        'orientation': [],   # Grundausrichtung des Geräts
        'movement': []       # Bewegungsmuster (Gehen vs. Stillstand)
    }
    
    for i in range(0, len(data), window_size):
        window = data[i:i+window_size]
        
        # Varianz der Bewegung
        variance_x = np.var([d['gravity']['x'] for d in window])
        variance_y = np.var([d['gravity']['y'] for d in window])
        variance_z = np.var([d['gravity']['z'] for d in window])
        
        # Frequenzanalyse (FFT)
        frequencies_x = np.fft.fft([d['gravity']['x'] for d in window])
        
        # Durchschnittliche Orientierung
        mean_orientation = np.mean([d['gravity'] for d in window], axis=0)
        
        # Bewegungserkennung (vereinfacht)
        movement = 'moving' if max(variance_x, variance_y, variance_z) > 0.1 else 'still'
        
        patterns['variance'].append([variance_x, variance_y, variance_z])
        patterns['frequency'].append(frequencies_x)
        patterns['orientation'].append(mean_orientation)
        patterns['movement'].append(movement)
    
    return patterns

# Hauptausführung
if __name__ == "__main__":
    analyze_multiple_datasets() 