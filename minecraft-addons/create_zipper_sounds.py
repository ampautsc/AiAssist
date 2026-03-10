"""Create placeholder zipper sounds"""
import wave
import struct
import math
import os

def create_zipper_sound(filename, duration=0.5, ascending=True):
    """Create a simple zipper-like sound using frequency sweep"""
    sample_rate = 44100
    num_samples = int(sample_rate * duration)
    
    # Frequency sweep for zipper effect
    start_freq = 800 if ascending else 1200
    end_freq = 1200 if ascending else 800
    
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        progress = i / num_samples
        
        # Frequency sweep
        freq = start_freq + (end_freq - start_freq) * progress
        
        # Add some noise-like modulation for texture
        noise_mod = 1 + 0.3 * math.sin(2 * math.pi * 50 * t)
        
        # Envelope (fade in/out)
        if progress < 0.1:
            envelope = progress / 0.1
        elif progress > 0.9:
            envelope = (1 - progress) / 0.1
        else:
            envelope = 1.0
        
        # Generate sample with some harmonics
        sample = 0.5 * math.sin(2 * math.pi * freq * t * noise_mod)
        sample += 0.25 * math.sin(2 * math.pi * freq * 2 * t)
        sample += 0.15 * math.sin(2 * math.pi * freq * 3 * t)
        
        sample *= envelope * 0.5  # Overall volume
        samples.append(int(sample * 32767))
    
    # Write WAV file
    with wave.open(filename.replace('.ogg', '.wav'), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        for s in samples:
            wav.writeframes(struct.pack('h', max(-32767, min(32767, s))))
    
    print(f"Created {filename.replace('.ogg', '.wav')}")

# Create sounds
os.makedirs('resource-packs/monarch_garden/sounds/tent', exist_ok=True)
create_zipper_sound('resource-packs/monarch_garden/sounds/tent/zip_open.ogg', ascending=True)
create_zipper_sound('resource-packs/monarch_garden/sounds/tent/zip_close.ogg', ascending=False)

print("Note: Created .wav files - Minecraft accepts .wav in sounds folder")
print("Rename to .ogg or convert if needed")
