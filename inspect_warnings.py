import json

with open('bbdd_data.json', 'r', encoding='utf-8') as f:
    bbdd = json.load(f)

# Print first 20 rows of columns: Song, Guitar, Lyrics, Last played, Days, Progress, Level, Warning Days
headers = bbdd[1]
print("Index | Song | Guitar | Lyrics | Last Played | Days | Progress | Level (Col N) | Warning (Col O)")
print("-" * 100)
for row in bbdd[2:]:
    if len(row) > 14:
        idx = row[1]
        song = row[4]
        guitar = row[5]
        lyrics = row[6]
        last_played = row[7]
        days = row[8]
        progress = row[12]
        level = row[13]
        warning = row[14]
        print(f"{idx:5s} | {song:25s} | {guitar:6s} | {lyrics:6s} | {last_played:11s} | {days:4s} | {progress:8s} | {level:13s} | {warning:15s}")
