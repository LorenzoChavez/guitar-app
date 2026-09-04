// Strumming Pattern Visualizer & Audio Controller for Guitar Song Tracker
// Multi-time signature support (4/4, 3/4, 6/8) with Loop Audio Player

class StrumRenderer {
    static currentPlayingAudio = null;
    static currentPlayingButton = null;

    static STROKE_TYPES = {
        'down': {
            id: 'down',
            label: 'Abajo',
            symbol: '↓',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"></line><polyline points="19 14 12 21 5 14"></polyline></svg>',
            className: 'stroke-down',
            tooltip: 'Rasgueo completo hacia abajo'
        },
        'up': {
            id: 'up',
            label: 'Arriba',
            symbol: '↑',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="21" x2="12" y2="3"></line><polyline points="5 10 12 3 19 10"></polyline></svg>',
            className: 'stroke-up',
            tooltip: 'Rasgueo completo hacia arriba'
        },
        'slap': {
            id: 'slap',
            label: 'Apagado (✕)',
            symbol: '✕',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
            className: 'stroke-slap',
            tooltip: 'Apagado / Chnk con la palma'
        },
        'bass': {
            id: 'bass',
            label: 'Bordonas (↓b)',
            symbol: '↓b',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="17 14 12 19 7 14"></polyline><circle cx="12" cy="4" r="2" fill="currentColor"></circle></svg>',
            className: 'stroke-bass',
            tooltip: 'Toque de cuerdas graves / bordonas'
        },
        'treble': {
            id: 'treble',
            label: 'Agudas (↑a)',
            symbol: '↑a',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="7 10 12 5 17 10"></polyline><circle cx="12" cy="20" r="2" fill="currentColor"></circle></svg>',
            className: 'stroke-treble',
            tooltip: 'Toque de cuerdas agudas'
        },
        'rest': {
            id: 'rest',
            label: 'Silencio (·)',
            symbol: '·',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>',
            className: 'stroke-rest',
            tooltip: 'Movimiento al aire / Sin tocar'
        }
    };

    /**
     * Render the visual rhythm pattern strip HTML
     */
    static renderPatternStrip(pattern, options = {}) {
        if (!Array.isArray(pattern) || pattern.length === 0) {
            return '<div class="strum-strip-empty">Sin patrón definido</div>';
        }

        const isCompact = options.compact === true;
        let html = `<div class="strum-pattern-strip ${isCompact ? 'strum-strip-compact' : ''}">`;

        pattern.forEach((slot, index) => {
            const typeKey = slot.type || 'rest';
            const strokeInfo = StrumRenderer.STROKE_TYPES[typeKey] || StrumRenderer.STROKE_TYPES['rest'];
            const isAccent = !!slot.accent;
            const beat = slot.beat || (index + 1);

            html += `
                <div class="strum-beat-slot ${strokeInfo.className} ${isAccent ? 'is-accent' : ''}" title="Tiempo ${beat}: ${strokeInfo.label}">
                    <span class="strum-accent-marker">${isAccent ? '>' : '&nbsp;'}</span>
                    <div class="strum-arrow-box">
                        ${strokeInfo.iconSvg}
                    </div>
                    <span class="strum-beat-label">${beat}</span>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    /**
     * Render a complete Strum Card for the library catalog
     */
    static renderCard(strum, options = {}) {
        const id = strum.id;
        const audioId = options.audioIdPrefix ? `${options.audioIdPrefix}-${id}` : id;
        const name = StrumRenderer.escapeXML(strum.name || 'Sin título');
        const timeSig = strum.time_signature || '4/4';
        const bpm = strum.bpm ? `${strum.bpm} BPM` : '';
        const diff = strum.difficulty || 'Básico';
        const description = StrumRenderer.escapeXML(strum.description || '');
        const audioFile = strum.audio_file || '';
        const audioUrl = audioFile ? (audioFile.startsWith('http') || audioFile.startsWith('/') ? audioFile : `/audio/strums/${audioFile}`) : '';

        let diffClass = 'diff-basic';
        if (diff === 'Intermedio') diffClass = 'diff-medium';
        if (diff === 'Avanzado') diffClass = 'diff-advanced';

        const patternHtml = StrumRenderer.renderPatternStrip(strum.pattern);

        let audioPlayerHtml = '';
        if (audioUrl) {
            audioPlayerHtml = `
                <div class="strum-audio-player" data-strum-id="${id}">
                    <audio id="audio-${audioId}" src="${audioUrl}" preload="none"></audio>
                    <button type="button" class="btn-audio-control btn-audio-play" onclick="StrumRenderer.togglePlay('${audioId}')" title="Reproducir muestra">
                        <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
                        <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    </button>
                    <div class="audio-timeline" onclick="StrumRenderer.seekAudio(event, '${audioId}')">
                        <div class="audio-progress" id="progress-${audioId}"></div>
                    </div>
                    <span class="audio-timer" id="timer-${audioId}">0:00</span>
                    <button type="button" class="btn-audio-control btn-audio-loop active" id="loop-${audioId}" onclick="StrumRenderer.toggleLoop('${audioId}')" title="Bucle continuo (Loop)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                    </button>
                </div>
            `;
        } else {
            audioPlayerHtml = `
                <div class="strum-no-audio">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-audio-icon">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <line x1="23" y1="9" x2="17" y2="15"></line>
                        <line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                    <span>Sin audio de muestra</span>
                </div>
            `;
        }

        const actionsHtml = options.hideActions ? '' : `
            <div class="strum-card-actions">
                <button type="button" class="btn-strum-action btn-strum-edit" onclick="app.editStrum('${id}')" title="Editar rasgueo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button type="button" class="btn-strum-action btn-strum-delete" onclick="app.deleteStrum('${id}')" title="Eliminar rasgueo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        return `
            <div class="strum-card" id="strum-card-${id}" data-strum-id="${id}">
                <div class="strum-card-header">
                    <div class="strum-card-titles">
                        <h3 class="strum-title">${name}</h3>
                        <div class="strum-badges">
                            <span class="strum-badge badge-time">${timeSig}</span>
                            ${bpm ? `<span class="strum-badge badge-bpm">${bpm}</span>` : ''}
                            <span class="strum-badge ${diffClass}">${diff}</span>
                        </div>
                    </div>
                    ${actionsHtml}
                </div>

                ${description ? `<p class="strum-description">${description}</p>` : ''}

                <div class="strum-strip-container">
                    ${patternHtml}
                </div>

                <div class="strum-player-container">
                    ${audioPlayerHtml}
                </div>
            </div>
        `;
    }

    /**
     * Render the Strum bar in the Song Viewer
     */
    static renderSongStrumBar(strum) {
        if (!strum) return '';
        const id = strum.id;
        const name = StrumRenderer.escapeXML(strum.name || 'Rasgueo');
        const timeSig = strum.time_signature || '4/4';
        const bpm = strum.bpm ? `${strum.bpm} BPM` : '';
        const audioFile = strum.audio_file || '';
        const audioUrl = audioFile ? (audioFile.startsWith('http') || audioFile.startsWith('/') ? audioFile : `/audio/strums/${audioFile}`) : '';

        const patternHtml = StrumRenderer.renderPatternStrip(strum.pattern, { compact: true });

        let audioBtnHtml = '';
        if (audioUrl) {
            audioBtnHtml = `
                <div class="song-strum-audio-wrap">
                    <audio id="audio-song-${id}" src="${audioUrl}" preload="none"></audio>
                    <button type="button" class="btn-song-strum-play" id="btn-play-song-${id}" onclick="StrumRenderer.togglePlay('song-${id}')" title="Escuchar ritmo">
                        <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
                        <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        <span>Ritmo</span>
                    </button>
                    <button type="button" class="btn-song-strum-loop active" id="loop-song-${id}" onclick="StrumRenderer.toggleLoop('song-${id}')" title="Repetición continua (Loop)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                    </button>
                </div>
            `;
        }

        return `
            <div class="song-strum-banner" data-strum-id="${id}">
                <div class="song-strum-info">
                    <span class="song-strum-badge-icon">🎸</span>
                    <span class="song-strum-title">${name}</span>
                    <span class="strum-badge badge-time">${timeSig}</span>
                    ${bpm ? `<span class="strum-badge badge-bpm">${bpm}</span>` : ''}
                </div>
                <div class="song-strum-pattern">
                    ${patternHtml}
                </div>
                ${audioBtnHtml}
            </div>
        `;
    }

    // =========================================================================
    // AUDIO CONTROLLER METHODS
    // =========================================================================

    static togglePlay(audioId) {
        const audio = document.getElementById(`audio-${audioId}`);
        if (!audio) return;

        const isPlaying = !audio.paused;

        // If another audio is currently playing, stop it first
        if (StrumRenderer.currentPlayingAudio && StrumRenderer.currentPlayingAudio !== audio) {
            StrumRenderer.stopCurrentAudio();
        }

        if (isPlaying) {
            audio.pause();
            StrumRenderer.updatePlayButtonState(audioId, false);
            StrumRenderer.currentPlayingAudio = null;
        } else {
            // Ensure loop setting is applied
            const loopBtn = document.getElementById(`loop-${audioId}`);
            audio.loop = loopBtn ? loopBtn.classList.contains('active') : true;

            // Bind listeners if not already bound
            if (!audio._hasListeners) {
                audio.addEventListener('timeupdate', () => StrumRenderer.updateProgress(audioId));
                audio.addEventListener('ended', () => {
                    if (!audio.loop) {
                        StrumRenderer.updatePlayButtonState(audioId, false);
                        StrumRenderer.currentPlayingAudio = null;
                    }
                });
                audio._hasListeners = true;
            }

            audio.play().then(() => {
                StrumRenderer.updatePlayButtonState(audioId, true);
                StrumRenderer.currentPlayingAudio = audio;
                StrumRenderer.currentPlayingButton = audioId;
            }).catch(err => {
                console.error('Error playing strum audio:', err);
            });
        }
    }

    static toggleLoop(audioId) {
        const loopBtn = document.getElementById(`loop-${audioId}`);
        const audio = document.getElementById(`audio-${audioId}`);
        if (!loopBtn) return;

        const isLooping = loopBtn.classList.toggle('active');
        if (audio) {
            audio.loop = isLooping;
        }
    }

    static stopCurrentAudio() {
        if (StrumRenderer.currentPlayingAudio) {
            StrumRenderer.currentPlayingAudio.pause();
            StrumRenderer.currentPlayingAudio.currentTime = 0;
            if (StrumRenderer.currentPlayingButton) {
                StrumRenderer.updatePlayButtonState(StrumRenderer.currentPlayingButton, false);
            }
            StrumRenderer.currentPlayingAudio = null;
            StrumRenderer.currentPlayingButton = null;
        }
        if (window.app && typeof window.app.updateSidebarPlayingBar === 'function') {
            window.app.updateSidebarPlayingBar(null, false);
        }
    }

    static updatePlayButtonState(audioId, isPlaying) {
        // Find play buttons (both in catalog card and song banner)
        const container = document.querySelector(`[data-strum-id="${audioId.replace('song-', '')}"]`);
        if (container) {
            const playIcons = container.querySelectorAll('.icon-play');
            const pauseIcons = container.querySelectorAll('.icon-pause');

            playIcons.forEach(el => el.style.display = isPlaying ? 'none' : 'block');
            pauseIcons.forEach(el => el.style.display = isPlaying ? 'block' : 'none');
        }

        if (window.app && typeof window.app.updateSidebarPlayingBar === 'function') {
            window.app.updateSidebarPlayingBar(audioId, isPlaying);
        }
    }

    static updateProgress(audioId) {
        const audio = document.getElementById(`audio-${audioId}`);
        const progress = document.getElementById(`progress-${audioId}`);
        const timer = document.getElementById(`timer-${audioId}`);
        if (!audio || !progress) return;

        const percent = (audio.currentTime / (audio.duration || 1)) * 100;
        progress.style.width = `${percent}%`;

        if (timer) {
            const curMin = Math.floor(audio.currentTime / 60);
            const curSec = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
            timer.innerText = `${curMin}:${curSec}`;
        }
    }

    static seekAudio(e, audioId) {
        const audio = document.getElementById(`audio-${audioId}`);
        const timeline = e.currentTarget;
        if (!audio || !timeline) return;

        const rect = timeline.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const newTime = (clickX / width) * (audio.duration || 1);
        audio.currentTime = newTime;
    }

    static escapeXML(str) {
        return (str || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.StrumRenderer = StrumRenderer;
}
