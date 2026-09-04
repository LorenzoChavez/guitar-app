from flask import Flask, jsonify, request, send_from_directory
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static', static_url_path='')

DB_FILE = 'songs_db.json'
CHORDS_DB_FILE = 'chords_db.json'
STRUMS_DB_FILE = 'strums_db.json'
STRUMS_AUDIO_DIR = os.path.join('static', 'audio', 'strums')
os.makedirs(STRUMS_AUDIO_DIR, exist_ok=True)

def load_db():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, 'r', encoding='utf-8-sig') as f:
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
                
                # Initialize play_count if missing
                song['play_count'] = song.get('play_count', 0)
                
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

def load_chords_db():
    if not os.path.exists(CHORDS_DB_FILE):
        return []
    try:
        with open(CHORDS_DB_FILE, 'r', encoding='utf-8-sig') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading chords database: {e}")
        return []

def save_chords_db(chords):
    try:
        with open(CHORDS_DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(chords, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving chords database: {e}")
        return False

def load_strums_db():
    if not os.path.exists(STRUMS_DB_FILE):
        return []
    try:
        with open(STRUMS_DB_FILE, 'r', encoding='utf-8-sig') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading strums database: {e}")
        return []

def save_strums_db(strums):
    try:
        with open(STRUMS_DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(strums, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving strums database: {e}")
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

@app.route('/api/db-status', methods=['GET'])
def get_db_status():
    songs = load_db()
    last_mod = None
    if os.path.exists(DB_FILE):
        mtime = os.path.getmtime(DB_FILE)
        dt = datetime.fromtimestamp(mtime)
        last_mod = dt.strftime('%Y-%m-%d %H:%M:%S')
    return jsonify({
        "count": len(songs),
        "last_modified": last_mod
    })

@app.route('/api/db-import', methods=['POST'])
def import_db():
    data = request.json
    if not isinstance(data, list):
        return jsonify({"success": False, "error": "Invalid format, expected list of songs"}), 400
    
    if save_db(data):
        return jsonify({"success": True, "count": len(data)})
    return jsonify({"success": False, "error": "Failed to save imported database"}), 500

# Chords Endpoints
@app.route('/api/chords', methods=['GET'])
def get_chords():
    return jsonify(load_chords_db())

@app.route('/api/chords', methods=['POST'])
def save_chord():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({"success": False, "error": "Chord name is required"}), 400
    
    chords = load_chords_db()
    chord_id = data.get('id')
    if not chord_id:
        import re
        chord_id = re.sub(r'[^a-zA-Z0-9]+', '-', data['name'].lower()).strip('-')
        data['id'] = chord_id

    # Check if updating existing
    updated = False
    for i, c in enumerate(chords):
        if c.get('id') == chord_id or c.get('name').lower() == data['name'].lower():
            chords[i] = data
            updated = True
            break
    if not updated:
        chords.append(data)
    
    if save_chords_db(chords):
        return jsonify({"success": True, "chord": data})
    return jsonify({"success": False, "error": "Failed to save chord"}), 500

@app.route('/api/chords/<string:chord_id>', methods=['DELETE'])
def delete_chord(chord_id):
    chords = load_chords_db()
    initial_len = len(chords)
    chords = [c for c in chords if c.get('id') != chord_id and c.get('name') != chord_id]
    if len(chords) < initial_len:
        save_chords_db(chords)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Chord not found"}), 404

# Strums Endpoints
@app.route('/api/strums', methods=['GET'])
def get_strums():
    return jsonify(load_strums_db())

@app.route('/api/strums', methods=['POST'])
def save_strum():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({"success": False, "error": "Strum name is required"}), 400
    
    strums = load_strums_db()
    strum_id = data.get('id')
    if not strum_id:
        import re
        strum_id = re.sub(r'[^a-zA-Z0-9]+', '-', data['name'].lower()).strip('-')
        data['id'] = strum_id

    # Check if updating existing
    updated = False
    for i, s in enumerate(strums):
        if s.get('id') == strum_id or s.get('name', '').lower() == data['name'].lower():
            strums[i] = data
            updated = True
            break
    if not updated:
        strums.append(data)
    
    if save_strums_db(strums):
        return jsonify({"success": True, "strum": data})
    return jsonify({"success": False, "error": "Failed to save strum"}), 500

@app.route('/api/strums/<string:strum_id>', methods=['DELETE'])
def delete_strum(strum_id):
    strums = load_strums_db()
    initial_len = len(strums)
    target_strum = next((s for s in strums if s.get('id') == strum_id), None)
    if target_strum and target_strum.get('audio_file'):
        audio_path = os.path.join(STRUMS_AUDIO_DIR, target_strum['audio_file'])
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception as e:
                print(f"Could not remove audio file: {e}")

    strums = [s for s in strums if s.get('id') != strum_id]
    if len(strums) < initial_len:
        save_strums_db(strums)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Strum not found"}), 404

@app.route('/api/strums/upload-audio', methods=['POST'])
def upload_strum_audio():
    if 'audio' not in request.files:
        return jsonify({"success": False, "error": "No audio file provided"}), 400
    file = request.files['audio']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
    
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac']
    if ext not in allowed_exts:
        return jsonify({"success": False, "error": f"Invalid format. Allowed: {', '.join(allowed_exts)}"}), 400
    
    import uuid
    safe_name = f"strum_{uuid.uuid4().hex[:10]}{ext}"
    filepath = os.path.join(STRUMS_AUDIO_DIR, safe_name)
    file.save(filepath)
    return jsonify({"success": True, "filename": safe_name, "url": f"/audio/strums/{safe_name}"})

@app.route('/api/songs/<int:song_id>/played', methods=['POST'])
def mark_played(song_id):
    songs = load_db()
    found = False
    today_str = datetime.now().strftime('%Y-%m-%d')
    
    for song in songs:
        if song['id'] == song_id:
            song['last_played'] = today_str
            song['days'] = 0
            song['play_count'] += 1
            new_play_count = song['play_count']
            found = True
            break
            
    if found:
        save_db(songs)
        return jsonify({"success": True, "last_played": today_str, "play_count": new_play_count})
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

            # Strums association
            if 'strums' in data:
                song['strums'] = data.get('strums', [])
                
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
    strums = data.get('strums', [])
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
        "strums": strums,
        "lyrics": lyrics_text,
        "play_count": 0
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

@app.route('/api/shutdown', methods=['POST'])
def shutdown_server():
    def kill_process():
        import time
        time.sleep(0.6)
        os._exit(0)
    import threading
    threading.Thread(target=kill_process, daemon=True).start()
    return jsonify({'success': True, 'message': 'Servidor detenido con éxito.'})

if __name__ == '__main__':
    print("Starting Guitar Songs server...")
    print("Serving frontend files from: static/")
    print("Press Ctrl+C to stop.")
    app.run(host='127.0.0.1', port=5000, debug=True)
