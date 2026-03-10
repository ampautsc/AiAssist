import amulet_nbt as nbt
import struct

path = r'C:\Users\ampau\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds\a76aa9be9b084b199ede32b632e7c8c3\level.dat'

# Check header
with open(path, 'rb') as f:
    header = f.read(8)
    version, length = struct.unpack('<II', header)
    print(f'Header: version={version}, length={length}')

# Load and check NBT
data = nbt.load(path, little_endian=True)

print('\n=== NBT Contents ===')
for key in sorted(data.keys()):
    print(f'{key}: {data[key]}')

print('\n=== Missing Required Fields ===')
required = [
    'LevelName', 'GameType', 'Generator', 'RandomSeed',
    'SpawnX', 'SpawnY', 'SpawnZ', 'StorageVersion', 
    'Platform', 'lastOpenedWithVersion', 
    'MinimumCompatibleClientVersion', 'NetworkVersion',
    'hasBeenLoadedInCreative', 'Difficulty'
]

missing = [field for field in required if field not in data]
if missing:
    print('\n'.join(missing))
else:
    print('All required fields present!')
