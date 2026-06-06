import json

with open('lyrics_data.json', 'r', encoding='utf-8') as f:
    lyrics = json.load(f)

print("ALL LYRICS COLUMNS:")
for col_idx in range(len(lyrics[0])):
    artist = lyrics[0][col_idx].strip()
    song = lyrics[1][col_idx].strip() if len(lyrics) > 1 and col_idx < len(lyrics[1]) else ""
    if artist or song:
        print(f"Col {col_idx:2d}: {artist} - {song}")
