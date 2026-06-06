import json
import os
import re
from datetime import datetime, timedelta

def excel_date_to_iso(excel_val):
    if not excel_val or excel_val == '-':
        return None
    try:
        # Check if it's already in YYYY-MM-DD format
        if '-' in str(excel_val) and len(str(excel_val)) == 10:
            return str(excel_val)
        
        # Parse Excel serial number
        serial = float(excel_val)
        # Excel's base date is Dec 30, 1899 due to leap year bug in 1900
        base_date = datetime(1899, 12, 30)
        delta = timedelta(days=serial)
        target_date = base_date + delta
        return target_date.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        return None

def calculate_days(last_played_str):
    if not last_played_str:
        return 999  # If never played, put a high number so it flags as warning and floats to the top
    try:
        last_played = datetime.strptime(last_played_str, '%Y-%m-%d')
        today = datetime.now()
        # Strip time
        today = datetime(today.year, today.month, today.day)
        delta = today - last_played
        return max(0, delta.days)
    except ValueError:
        return 999

def clean_value(val):
    if val is None:
        return ""
    val_str = str(val).strip()
    if val_str == '-':
        return ""
    return val_str

def normalize_text(text):
    if not text:
        return ""
    # Lowercase, strip accents, and remove non-alphanumeric chars
    text = text.lower().strip()
    # Basic accent replacement
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ü': 'u', 'ñ': 'n', '’': "'", '`': "'"
    }
    for orig, rep in replacements.items():
        text = text.replace(orig, rep)
    # Remove standard punctuation and spacing
    text = re.sub(r'[^a-z0-9\s\']', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def merge_databases():
    print("Reading BBDD and Lyrics JSON files...")
    
    with open('bbdd_data.json', 'r', encoding='utf-8') as f:
        bbdd = json.load(f)
        
    with open('lyrics_data.json', 'r', encoding='utf-8') as f:
        lyrics = json.load(f)
        
    # Build dictionary of lyrics by column index
    lyrics_by_col = {}
    for col_idx in range(len(lyrics[0])):
        artist = clean_value(lyrics[0][col_idx])
        song = clean_value(lyrics[1][col_idx]) if len(lyrics) > 1 and col_idx < len(lyrics[1]) else ""
        text = lyrics[2][col_idx] if len(lyrics) > 2 and col_idx < len(lyrics[2]) else ""
        
        if artist or song:
            key = (normalize_text(artist), normalize_text(song))
            lyrics_by_col[key] = {
                'artist': artist,
                'song': song,
                'lyrics': text
            }
            
    # Hardcoded manual mappings for spelling differences
    # format: (normalized_bbdd_artist, normalized_bbdd_song) -> (normalized_lyrics_artist, normalized_lyrics_song)
    manual_mappings = {
        ('alvaro de luna', 'todo contigo'): ('alvaro luna', 'todo contigo'),
        ('andy y lucas', 'tanto la queria'): ('andy lucas', 'tanto la queria'),
        ("the rembrants", "i'll be there for you"): ("the rembrants", "i'll be there for you") # Quote standardization
    }

    # Standardize lyrics keys with normalized keys
    lyrics_db = {}
    for key, data in lyrics_by_col.items():
        # Clean quotes in song name to straight quote for standardization
        norm_artist = key[0]
        norm_song = key[1].replace("’", "'").replace("`", "'")
        lyrics_db[(norm_artist, norm_song)] = data['lyrics']

    songs_list = []
    
    # Process BBDD rows
    # Row 0 is empty, Row 1 is header, Row 2 onwards are data rows
    header = bbdd[1]
    print(f"Header: {header}")
    
    for row in bbdd[2:]:
        # Excel column mapping:
        # A: Index-0 (ignore, we can use our own JSON ID or Column B Index)
        # B: Index
        # C: Letter
        # D: Artist
        # E: Song
        # F: Guitar Level
        # G: Lyrics Level
        # H: Last played serial
        # I: Days (derived, but let's parse it)
        # J: Tutorial
        # K: Tutorial Link
        # L: Acordes
        # M: Progress (derived)
        # N: Level (derived)
        # O: Warning Days (derived)
        
        if len(row) < 12:
            continue
            
        song_idx = clean_value(row[1])
        if not song_idx:
            continue
            
        letter = clean_value(row[2])
        artist = clean_value(row[3])
        song_title = clean_value(row[4])
        
        if not artist or not song_title:
            continue
            
        guitar_lvl = 0
        try:
            guitar_lvl = int(float(row[5])) if row[5] else 0
        except ValueError:
            pass
            
        lyrics_lvl = 0
        try:
            lyrics_lvl = int(float(row[6])) if row[6] else 0
        except ValueError:
            pass
            
        last_played_iso = excel_date_to_iso(row[7])
        days = calculate_days(last_played_iso)
        
        tutorial = clean_value(row[9])
        tutorial_link = clean_value(row[10])
        acordes = clean_value(row[11])
        
        # Calculate lyrics mapping key
        norm_bbdd_artist = normalize_text(artist)
        norm_bbdd_song = normalize_text(song_title)
        
        # Try finding in manual mappings first
        map_key = (norm_bbdd_artist, norm_bbdd_song)
        if map_key in manual_mappings:
            lookup_key = manual_mappings[map_key]
        else:
            lookup_key = (norm_bbdd_artist, norm_bbdd_song)
            
        # Lookup lyrics
        song_lyrics = lyrics_db.get(lookup_key, "")
        
        # Log status
        lyrics_status = "FOUND" if song_lyrics else "MISSING"
        print(f"Index {song_idx}: {artist} - {song_title} | Lyrics: {lyrics_status}")
        
        song_entry = {
            "id": int(song_idx),
            "letter": letter,
            "artist": artist,
            "title": song_title,
            "guitar_level": guitar_lvl,
            "lyrics_level": lyrics_lvl,
            "last_played": last_played_iso,
            "days": days,
            "tutorial": tutorial,
            "tutorial_link": tutorial_link,
            "chords": acordes,
            "lyrics": song_lyrics
        }
        
        songs_list.append(song_entry)
        
    # Write consolidated database to JSON
    with open('songs_db.json', 'w', encoding='utf-8') as f:
        json.dump(songs_list, f, indent=2, ensure_ascii=False)
        
    print(f"\nSuccessfully wrote {len(songs_list)} songs to songs_db.json")

if __name__ == '__main__':
    merge_databases()
