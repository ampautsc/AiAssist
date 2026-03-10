import struct
import amulet_nbt as nbt

path = r'C:\Users\ampau\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds\45ac242d4af042e9b36a579a7254b7b2\level.dat'

with open(path, 'rb') as f:
    all_bytes = f.read()

print(f'Total file size: {len(all_bytes)} bytes')

version, length = struct.unpack('<II', all_bytes[:8])
print(f'Header: version={version}, length={length}')
print(f'Expected total: {8 + length} bytes')

print('\nFirst 20 bytes after header (hex):')
print(' '.join(f'{b:02X}' for b in all_bytes[8:28]))

# Try loading just the NBT part
print('\nAttempting to load NBT from bytes 8 onward...')
from io import BytesIO
nbt_data = all_bytes[8:]
print(f'NBT data size: {len(nbt_data)} bytes')

try:
    data = nbt.load(BytesIO(nbt_data), little_endian=True)
    print(f'\n✓ NBT loaded successfully!')
    print(f'Fields: {len(data.compound)}')
    if len(data.compound) > 0:
        print('\nSample fields:')
        for key in list(data.compound.keys())[:10]:
            print(f'  {key}: {data.compound[key]}')
except Exception as e:
    print(f'\n✗ Failed to load NBT: {e}')
