from flask import Flask, jsonify, request, send_from_directory
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static', static_url_path='')

DB_FILE = 'songs_db.json'

def load_db():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            songs = json.load(f)
            # Re-calculate days dynamically on load
            today = datetime.now()
            today = datetime(today.year, today.month, today.day)
            for song in songs:
                if song.get('last_played'):
                    try:
                        last_played = datetime.strptime(song['last_played'], '%Y-%m-%d')
                        song['days'] = max(0, (today - last_played).days)
                    except ValueError:
                        song['days'] = 999
                else:
                    song['days'] = 999
            return songs
    except Exception as e:
        print(f"Error loading database: {e}")
        return []

def save_db(songs):
    try:
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(songs, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving database: {e}")
        return False

# Serve index.html at root
@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

# API Endpoints
@app.route('/api/songs', methods=['GET'])
def get_songs():
    songs = load_db()
    return jsonify(songs)

@app.route('/api/songs/<int:song_id>/played', methods=['POST'])
def mark_played(song_id):
    songs = load_db()
    found = False
    today_str = datetime.now().strftime('%Y-%m-%d')
    
    for song in songs:
        if song['id'] == song_id:
            song['last_played'] = today_str
            song['days'] = 0
            found = True
            break
            
    if found:
        save_db(songs)
        return jsonify({"success": True, "last_played": today_str})
    return jsonify({"success": False, "error": "Song not found"}), 404

@app.route('/api/songs/<int:song_id>/levels', methods=['POST'])
def update_levels(song_id):
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400
        
    guitar_level = data.get('guitar_level')
    lyrics_level = data.get('lyrics_level')
    
    songs = load_db()
    found = False
    for song in songs:
        if song['id'] == song_id:
            if guitar_level is not None:
                song['guitar_level'] = int(guitar_level)
            if lyrics_level is not None:
                song['lyrics_level'] = int(lyrics_level)
            found = True
            break
            
    if found:
        save_db(songs)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Song not found"}), 404

@app.route('/api/songs/<int:song_id>/edit', methods=['POST'])
def edit_song(song_id):
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400
        
    songs = load_db()
    found = False
    for song in songs:
        if song['id'] == song_id:
            song['artist'] = data.get('artist', song.get('artist')).strip()
            song['title'] = data.get('title', song.get('title')).strip()
            # Extract letter from artist name
            if song['artist']:
                song['letter'] = song['artist'][0].upper()
            
            # Optional conversion for levels
            if 'guitar_level' in data:
                song['guitar_level'] = int(data['guitar_level'])
            if 'lyrics_level' in data:
                song['lyrics_level'] = int(data['lyrics_level'])
                
            song['tutorial'] = data.get('tutorial', song.get('tutorial'))
            song['tutorial_link'] = data.get('tutorial_link', song.get('tutorial_link')).strip()
            song['chords'] = data.get('chords', song.get('chords')).strip()
            song['lyrics'] = data.get('lyrics', song.get('lyrics')).strip()
            
            # Last played check
            if 'last_played' in data:
                lp = data['last_played']
                if lp == "" or lp is None:
                    song['last_played'] = None
                else:
                    song['last_played'] = lp
                    
            found = True
            break
            
    if found:
        save_db(songs)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Song not found"}), 404

@app.route('/api/songs/add', methods=['POST'])
def add_song():
    data = request.json
    if not data or not data.get('artist') or not data.get('title'):
        return jsonify({"success": False, "error": "Artist and Title are required"}), 400
        
    songs = load_db()
    # Generate unique ID
    new_id = max([s['id'] for s in songs], default=0) + 1
    
    artist = data.get('artist').strip()
    title = data.get('title').strip()
    letter = artist[0].upper() if artist else ""
    
    guitar_lvl = int(data.get('guitar_level', 0))
    lyrics_lvl = int(data.get('lyrics_level', 0))
    tutorial = data.get('tutorial', 'No')
    tutorial_link = data.get('tutorial_link', '').strip()
    chords = data.get('chords', '').strip()
    lyrics_text = data.get('lyrics', '').strip()
    last_played = data.get('last_played')
    if not last_played:
        last_played = None
        
    new_song = {
        "id": new_id,
        "letter": letter,
        "artist": artist,
        "title": title,
        "guitar_level": guitar_lvl,
        "lyrics_level": lyrics_lvl,
        "last_played": last_played,
        "days": 999 if not last_played else 0,
        "tutorial": tutorial,
        "tutorial_link": tutorial_link,
        "chords": chords,
        "lyrics": lyrics_text
    }
    
    songs.append(new_song)
    save_db(songs)
    return jsonify({"success": True, "id": new_id})

@app.route('/api/songs/delete/<int:song_id>', methods=['POST'])
def delete_song(song_id):
    songs = load_db()
    initial_len = len(songs)
    songs = [s for s in songs if s['id'] != song_id]
    
    if len(songs) < initial_len:
        save_db(songs)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Song not found"}), 404

@app.route('/api/export', methods=['GET'])
def export_csv():
    # Export a CSV file that Excel can read natively with correct column formats
    import csv
    import io
    from flask import Response
    
    songs = load_db()
    
    # Setup string stream and CSV writer
    output = io.StringIO()
    # UTF-8 BOM character so Excel opens it with accents correctly
    output.write('\ufeff')
    
    writer = csv.writer(output, delimiter=';') # Semicolon works best for European Excel setups
    
    # Headers
    writer.writerow([
        'Index', 'Letter', 'Artist', 'Song', 'Guitar Level', 
        'Lyrics Level', 'Last Played', 'Days Since Last Played', 
        'Tutorial', 'Tutorial Link', 'Chords', 'Progress %'
    ])
    
    for s in songs:
        # Progress calculation
        progress_val = ((s.get('guitar_level', 0) + s.get('lyrics_level', 0)) / 6)
        progress_percent = f"{int(progress_val * 100)}%"
        
        writer.writerow([
            s.get('id', ''),
            s.get('letter', ''),
            s.get('artist', ''),
            s.get('title', ''),
            s.get('guitar_level', 0),
            s.get('lyrics_level', 0),
            s.get('last_played', '') or 'Never',
            s.get('days', 999),
            s.get('tutorial', 'No'),
            s.get('tutorial_link', ''),
            s.get('chords', ''),
            progress_percent
        ])
        
    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=guitar_songs_export.csv'
    return response

if __name__ == '__main__':
    print("Starting Guitar Songs server...")
    print("Serving frontend files from: static/")
    print("Press Ctrl+C to stop.")
    app.run(host='127.0.0.1', port=5000, debug=True)
