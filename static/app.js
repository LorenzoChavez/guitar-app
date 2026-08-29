// JavaScript SPA Controller - Guitar Song Tracker & Lyrics Viewer

class GuitarApp {
    constructor() {
        this.songs = [];
        this.currentSongId = null;
        this.currentView = 'dashboard-view';
        this.history = ['dashboard-view'];
        this.zoomLevel = 16; // default font size in px

        // Auto Scroll State
        this.isScrolling = false;
        this.scrollIntervalId = null;
        this.scrollSpeed = 3; // 1 to 10

        // Active filters state
        this.filterGuitar = 'all';
        this.filterWarning = 'all';
        this.filterTutorial = 'all';
        this.filterBacklog = false;

        // Dashboard filters state
        this.dbFilterArtist = 'all';
        this.dbFilterTutorial = false;
        this.dbFilterLyrics = 'all';
        this.dbFilterWarning = 'all';
        this.dbSortBy = 'days-desc';

        // Song Viewer State
        this.currentTransposeOffset = 0;

        // Chords State
        this.chords = [];
        this.filterChordRoot = 'all';
        this.filterChordType = 'all';
        this.filterChordSearch = '';
        this.activeChordEditing = null;
        this.editorActiveFinger = '1';
        this.editorChordState = {
            name: '',
            root: 'C',
            type: 'Major',
            base_fret: 1,
            frets: [0, 0, 0, 0, 0, 0],
            fingers: [0, 0, 0, 0, 0, 0],
            barres: []
        };

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.fetchSongs();
        await this.fetchChords();
        this.showView('dashboard-view');
    }

    async fetchSongs() {
        try {
            const response = await fetch('/api/songs');
            if (response.ok) {
                this.songs = await response.json();
                this.updateGlobalStats();
            } else {
                console.error("Failed to load songs from API");
            }
        } catch (err) {
            console.error("Connection error loading songs:", err);
        }
    }

    async fetchChords() {
        try {
            const response = await fetch('/api/chords');
            if (response.ok) {
                this.chords = await response.json();
            }
        } catch (err) {
            console.error("Connection error loading chords:", err);
        }
    }

    bindEvents() {
        // Navigation binds
        document.querySelectorAll('.nav-item[data-target]').forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.showView(target);
            });
        });

        // Search & Filters binds
        document.getElementById('search-input').addEventListener('input', () => this.renderDirectory());
        document.getElementById('sort-by').addEventListener('change', () => this.renderDirectory());

        // Level (Guitar) pills
        document.querySelectorAll('#filter-group-guitar .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#filter-group-guitar .pill-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filterGuitar = e.currentTarget.getAttribute('data-value');
                this.renderDirectory();
            });
        });

        // Warning pills
        document.querySelectorAll('#filter-group-warning .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#filter-group-warning .pill-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filterWarning = e.currentTarget.getAttribute('data-value');
                this.renderDirectory();
            });
        });

        // Tutorial pills
        document.querySelectorAll('#filter-group-tutorial .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#filter-group-tutorial .pill-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filterTutorial = e.currentTarget.getAttribute('data-value');
                this.renderDirectory();
            });
        });

        // Clear button
        document.getElementById('btn-clear-filters').addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            document.getElementById('sort-by').value = 'artist';

            this.filterGuitar = 'all';
            this.filterWarning = 'all';
            this.filterTutorial = 'all';
            this.filterBacklog = false;

            // Reset active classes
            document.querySelectorAll('.filter-group-inline').forEach(group => {
                group.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                const allPill = group.querySelector('.pill-btn[data-value="all"]');
                if (allPill) allPill.classList.add('active');
            });

            const backlogBtn = document.getElementById('filter-backlog-btn');
            if (backlogBtn) backlogBtn.classList.remove('active');

            this.renderDirectory();
        });

        // Backlog toggle filter
        const backlogBtn = document.getElementById('filter-backlog-btn');
        if (backlogBtn) {
            backlogBtn.addEventListener('click', () => {
                this.filterBacklog = !this.filterBacklog;
                backlogBtn.classList.toggle('active', this.filterBacklog);
                this.renderDirectory();
            });
        }

        // Add Song Form Submit
        document.getElementById('add-song-form').addEventListener('submit', (e) => this.handleAddSongSubmit(e));

        // Mark Played Button
        document.getElementById('btn-mark-played').addEventListener('click', () => this.markCurrentSongPlayed());

        // Chords & Lyrics Edit Panel Modal
        document.getElementById('btn-edit-song').addEventListener('click', () => this.openEditModal());
        document.getElementById('btn-close-modal').addEventListener('click', () => this.closeEditModal());
        document.getElementById('btn-cancel-edit').addEventListener('click', () => this.closeEditModal());
        document.getElementById('edit-song-form').addEventListener('submit', (e) => this.handleEditSongSubmit(e));

        // Delete Song Button
        document.getElementById('btn-delete-song').addEventListener('click', () => this.deleteCurrentSong());

        // Sidebar Toggle
        document.getElementById('btn-toggle-sidebar').addEventListener('click', () => this.toggleSidebar());

        // Backup Modal binds
        const navBackup = document.getElementById('nav-backup');
        if (navBackup) navBackup.addEventListener('click', () => this.openBackupModal());
        const closeBackupBtn = document.getElementById('btn-close-backup-modal');
        if (closeBackupBtn) closeBackupBtn.addEventListener('click', () => this.closeBackupModal());

        const exportJsonBtn = document.getElementById('btn-export-json');
        if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => this.exportJson());

        const exportCsvBtn = document.getElementById('btn-export-csv');
        if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportCsv());

        const triggerImportBtn = document.getElementById('btn-trigger-import');
        const inputImport = document.getElementById('input-import-json');
        if (triggerImportBtn && inputImport) {
            triggerImportBtn.addEventListener('click', () => inputImport.click());
            inputImport.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.importJsonFile(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }

        // Close modal on outside backdrop click
        window.addEventListener('click', (e) => {
            const backupModal = document.getElementById('backup-modal');
            if (e.target === backupModal) {
                this.closeBackupModal();
            }
        });

        // Random Song from Tier badge click
        document.querySelectorAll('.tier-badge').forEach(badge => {
            badge.addEventListener('click', () => {
                const tier = parseInt(badge.innerText);
                if (!isNaN(tier)) {
                    this.playRandomSongFromTier(tier);
                }
            });
        });

        // Transpose Controls
        const btnTransDown = document.getElementById('btn-transpose-down');
        if (btnTransDown) btnTransDown.addEventListener('click', () => this.transposeBy(-1));
        const btnTransUp = document.getElementById('btn-transpose-up');
        if (btnTransUp) btnTransUp.addEventListener('click', () => this.transposeBy(1));
        const btnTransReset = document.getElementById('btn-transpose-reset');
        if (btnTransReset) btnTransReset.addEventListener('click', () => this.resetTranspose());

        // Font Size Zoom Buttons
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.adjustFontSize(1));
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.adjustFontSize(-1));

        // Auto Scroll Toggle and Slider
        document.getElementById('btn-scroll-toggle').addEventListener('click', () => this.toggleAutoScroll());
        const speedSlider = document.getElementById('scroll-speed-slider');
        speedSlider.addEventListener('input', (e) => {
            this.scrollSpeed = parseInt(e.target.value);
            document.getElementById('scroll-speed-label').innerText = `${this.scrollSpeed}x`;
            if (this.isScrolling) {
                this.startAutoScroll(); // restart scroll with new speed
            }
        });

        // Resize listener to adjust lyrics columns dynamically
        window.addEventListener('resize', () => {
            if (this.currentView === 'song-viewer-view') {
                this.layoutLyrics();
            }
        });

        // Dashboard Artist dropdown filter
        const dbArtistSelect = document.getElementById('dashboard-filter-artist');
        if (dbArtistSelect) {
            dbArtistSelect.addEventListener('change', (e) => {
                this.dbFilterArtist = e.target.value;
                this.renderDashboard();
            });
        }

        // Dashboard Tutorial toggle filter
        const dbTutorialBtn = document.getElementById('dashboard-filter-tutorial');
        if (dbTutorialBtn) {
            dbTutorialBtn.addEventListener('click', (e) => {
                this.dbFilterTutorial = !this.dbFilterTutorial;
                if (this.dbFilterTutorial) {
                    dbTutorialBtn.classList.add('active');
                } else {
                    dbTutorialBtn.classList.remove('active');
                }
                this.renderDashboard();
            });
        }

        // Dashboard Lyrics buttons filter
        document.querySelectorAll('#dashboard-filter-group-lyrics .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = e.currentTarget.getAttribute('data-value');
                const wasActive = e.currentTarget.classList.contains('active');

                document.querySelectorAll('#dashboard-filter-group-lyrics .pill-btn').forEach(b => b.classList.remove('active'));

                if (wasActive) {
                    this.dbFilterLyrics = 'all';
                } else {
                    e.currentTarget.classList.add('active');
                    this.dbFilterLyrics = parseInt(val);
                }
                this.renderDashboard();
            });
        });

        // Dashboard Warning buttons filter
        document.querySelectorAll('#dashboard-filter-group-warning .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = e.currentTarget.getAttribute('data-value');
                const wasActive = e.currentTarget.classList.contains('active');

                document.querySelectorAll('#dashboard-filter-group-warning .pill-btn').forEach(b => b.classList.remove('active'));

                if (wasActive) {
                    this.dbFilterWarning = 'all';
                } else {
                    e.currentTarget.classList.add('active');
                    this.dbFilterWarning = val;
                }
                this.renderDashboard();
            });
        });

        // Dashboard Sort dropdown
        const dbSortSelect = document.getElementById('dashboard-sort-by');
        if (dbSortSelect) {
            dbSortSelect.addEventListener('change', (e) => {
                this.dbSortBy = e.target.value;
                this.renderDashboard();
            });
        }

        // Dashboard Clear button filter
        const dbClearBtn = document.getElementById('btn-clear-dashboard-filters');
        if (dbClearBtn) {
            dbClearBtn.addEventListener('click', () => {
                this.dbFilterArtist = 'all';
                this.dbFilterTutorial = false;
                this.dbFilterLyrics = 'all';
                this.dbFilterWarning = 'all';
                this.dbSortBy = 'days-desc';

                if (dbArtistSelect) dbArtistSelect.value = 'all';
                if (dbSortSelect) dbSortSelect.value = 'days-desc';
                if (dbTutorialBtn) dbTutorialBtn.classList.remove('active');
                document.querySelectorAll('#dashboard-filter-group-lyrics .pill-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#dashboard-filter-group-warning .pill-btn').forEach(b => b.classList.remove('active'));

                this.renderDashboard();
            });
        }

        // Chords Search & Filters
        const chordSearchInput = document.getElementById('chords-search-input');
        if (chordSearchInput) {
            chordSearchInput.addEventListener('input', (e) => {
                this.filterChordSearch = e.target.value;
                this.renderChords();
            });
        }

        document.querySelectorAll('#chords-filter-root .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#chords-filter-root .pill-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filterChordRoot = e.currentTarget.getAttribute('data-value');
                this.renderChords();
            });
        });

        document.querySelectorAll('#chords-filter-type .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#chords-filter-type .pill-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filterChordType = e.currentTarget.getAttribute('data-value');
                this.renderChords();
            });
        });

        const clearChordsBtn = document.getElementById('btn-clear-chords-filters');
        if (clearChordsBtn) {
            clearChordsBtn.addEventListener('click', () => {
                this.filterChordRoot = 'all';
                this.filterChordType = 'all';
                this.filterChordSearch = '';
                if (chordSearchInput) chordSearchInput.value = '';
                document.querySelectorAll('#chords-filter-root .pill-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#chords-filter-type .pill-btn').forEach(b => b.classList.remove('active'));
                const rootAll = document.querySelector('#chords-filter-root .pill-btn[data-value="all"]');
                const typeAll = document.querySelector('#chords-filter-type .pill-btn[data-value="all"]');
                if (rootAll) rootAll.classList.add('active');
                if (typeAll) typeAll.classList.add('active');
                this.renderChords();
            });
        }

        // Add Chord Button
        const addChordBtn = document.getElementById('btn-add-chord');
        if (addChordBtn) {
            addChordBtn.addEventListener('click', () => this.openChordEditor());
        }

        // Chord Modal Actions
        const closeChordModalBtn = document.getElementById('btn-close-chord-modal');
        if (closeChordModalBtn) closeChordModalBtn.addEventListener('click', () => this.closeChordEditor());
        const cancelChordBtn = document.getElementById('btn-cancel-chord');
        if (cancelChordBtn) cancelChordBtn.addEventListener('click', () => this.closeChordEditor());
        const saveChordBtn = document.getElementById('btn-save-chord');
        if (saveChordBtn) saveChordBtn.addEventListener('click', () => this.saveChord());
        const deleteChordBtn = document.getElementById('btn-delete-chord');
        if (deleteChordBtn) deleteChordBtn.addEventListener('click', () => this.deleteActiveChord());

        // Finger Picker Tool Buttons
        document.querySelectorAll('.finger-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.finger-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.editorActiveFinger = e.currentTarget.getAttribute('data-finger');
            });
        });

        // Form fields change live update
        ['chord-form-name', 'chord-form-root', 'chord-form-type', 'chord-form-base-fret'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updateLiveChordPreview());
                el.addEventListener('change', () => this.updateLiveChordPreview());
            }
        });

        // Close Chord Popover
        const closePopoverBtn = document.getElementById('btn-close-chord-popover');
        if (closePopoverBtn) {
            closePopoverBtn.addEventListener('click', () => this.hideChordPopover());
        }
        document.addEventListener('click', (e) => {
            const popover = document.getElementById('chord-preview-popover');
            if (popover && popover.classList.contains('open') && !popover.contains(e.target) && !e.target.closest('.chord-quick-tag')) {
                this.hideChordPopover();
            }
        });
    }

    showView(viewId) {
        // Stop scroll if leaving song viewer
        if (viewId !== 'song-viewer-view' && this.isScrolling) {
            this.stopAutoScroll();
        }

        // Hide all views
        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;

            // Keep history track
            if (this.history[this.history.length - 1] !== viewId) {
                this.history.push(viewId);
            }
        }

        // Update active class on nav
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-target') === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update headers based on view if they exist
        const titleElem = document.getElementById('view-title');
        const subtitleElem = document.getElementById('view-subtitle');

        if (titleElem && subtitleElem) {
            if (viewId === 'dashboard-view') {
                titleElem.innerText = 'Dashboard';
                subtitleElem.innerText = 'Manage and practice your guitar repertoire';
            } else if (viewId === 'directory-view') {
                titleElem.innerText = 'Song Directory';
                subtitleElem.innerText = 'Full database with advanced searching and filters';
            } else if (viewId === 'chords-view') {
                titleElem.innerText = 'Chords';
                subtitleElem.innerText = 'Guitar chord library and interactive fretboard';
            } else if (viewId === 'add-view') {
                titleElem.innerText = 'Add New Song';
                subtitleElem.innerText = 'Expand your customized song library';
            } else if (viewId === 'song-viewer-view') {
                titleElem.innerText = 'Practice Room';
                subtitleElem.innerText = 'View chords and play along with auto-scrolling lyrics';
            }
        }

        // Always render views when shown
        if (viewId === 'dashboard-view') {
            this.renderDashboard();
        } else if (viewId === 'directory-view') {
            this.renderDirectory();
        } else if (viewId === 'chords-view') {
            this.renderChords();
        }
    }

    goBack() {
        if (this.history.length > 1) {
            this.history.pop(); // remove current
            const prevView = this.history.pop(); // grab previous
            this.showView(prevView);
        } else {
            this.showView('dashboard-view');
        }
    }

    showToast(message, isSuccess = true) {
        const toast = document.getElementById('toast');
        toast.innerText = message;
        toast.style.backgroundColor = isSuccess ? 'var(--green)' : 'var(--red)';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // BACKUP & SYNC MODAL
    async openBackupModal() {
        const modal = document.getElementById('backup-modal');
        const countEl = document.getElementById('backup-songs-count');
        const dateEl = document.getElementById('backup-last-modified');

        if (countEl) countEl.innerText = `${this.songs.length} canciones`;

        if (modal) {
            modal.classList.add('open');
            modal.style.display = 'block';
        }

        try {
            const res = await fetch('/api/db-status');
            if (res.ok) {
                const data = await res.json();
                if (countEl && data.count !== undefined) countEl.innerText = `${data.count} canciones`;
                if (dateEl && data.last_modified) {
                    const d = new Date(data.last_modified.replace(' ', 'T'));
                    dateEl.innerText = isNaN(d) ? data.last_modified : d.toLocaleString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching db status:", err);
        }
    }

    closeBackupModal() {
        const modal = document.getElementById('backup-modal');
        if (modal) {
            modal.classList.remove('open');
            modal.style.display = 'none';
        }
    }

    exportJson() {
        const dataStr = JSON.stringify(this.songs, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `songs_db.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast("Base de datos exportada (songs_db.json)");
    }

    exportCsv() {
        window.location.href = '/api/export';
    }

    async importJsonFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    const res = await fetch('/api/db-import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(imported)
                    });
                    if (res.ok) {
                        await this.loadSongs();
                        this.closeBackupModal();
                        this.showToast(`¡Importadas ${imported.length} canciones con éxito!`);
                    } else {
                        this.showToast("Error al guardar en el servidor", false);
                    }
                } else {
                    this.showToast("Error: El archivo JSON debe ser una lista de canciones", false);
                }
            } catch (err) {
                console.error("Error parsing imported JSON:", err);
                this.showToast("Error al procesar el archivo JSON", false);
            }
        };
        reader.readAsText(file);
    }

    // SIDEBAR COLLAPSE / EXPAND
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const main = document.querySelector('.main-content');

        sidebar.classList.toggle('collapsed');
        main.classList.toggle('sidebar-hidden');

        // Re-layout lyrics after the transition finishes (300ms)
        setTimeout(() => this.layoutLyrics(), 320);
    }

    // STATE UPDATES & STATS
    updateGlobalStats() {
        const total = this.songs.length;

        let minDays = 0;
        if (total > 0) {
            minDays = Math.min(...this.songs.map(s => s.days));
        }

        const sidebarDays = document.getElementById('sidebar-days-without-playing');
        if (sidebarDays) sidebarDays.innerText = minDays;

        // Dashboard specific cards
        const statsSongs = document.getElementById('stat-card-songs');
        const statsMastery = document.getElementById('stat-card-mastery');
        const statsWarnings = document.getElementById('stat-card-warnings');

        if (statsSongs) statsSongs.innerText = total;

        // Mastery rate = percentage of songs with levels 3 (both guitar & lyrics)
        const masterySongs = this.songs.filter(s => s.guitar_level === 3 && s.lyrics_level === 3).length;
        const masteryRate = total > 0 ? Math.round((masterySongs / total) * 100) : 0;
        if (statsMastery) statsMastery.innerText = `${masteryRate}%`;

        // Warning count = songs with days > 90
        const warnings = this.songs.filter(s => s.days > 90).length;
        if (statsWarnings) statsWarnings.innerText = warnings;
    }

    populateDashboardArtists() {
        const select = document.getElementById('dashboard-filter-artist');
        if (!select) return;

        // Remember selection
        const selectedVal = this.dbFilterArtist;

        // Get unique artists from active dashboard songs (Tiers 1, 2, 3)
        const activeSongs = this.songs.filter(s => s.guitar_level >= 1);
        const artists = [...new Set(activeSongs.map(s => s.artist))].sort();

        // Rebuild select options
        select.innerHTML = '<option value="all">All Artists</option>';
        artists.forEach(artist => {
            const opt = document.createElement('option');
            opt.value = artist;
            opt.innerText = artist;
            select.appendChild(opt);
        });

        // Restore value
        select.value = selectedVal;
        if (select.value !== selectedVal) {
            this.dbFilterArtist = 'all';
            select.value = 'all';
        }
    }

    // RENDER: DASHBOARD VIEW
    renderDashboard() {
        this.updateGlobalStats();
        this.populateDashboardArtists();

        let totalFiltered = 0;

        // Loop over the 4 tiers (3, 2, 1, 0)
        for (let tier = 0; tier <= 3; tier++) {
            const listContainer = document.getElementById(`tier-list-${tier}`);
            if (!listContainer) continue;
            listContainer.innerHTML = '';

            // Filter songs in this tier
            let tierSongs = this.songs.filter(s => {
                if (s.guitar_level !== tier) return false;

                // Artist filter
                if (this.dbFilterArtist !== 'all' && s.artist !== this.dbFilterArtist) return false;

                // Tutorial filter
                if (this.dbFilterTutorial) {
                    if (s.tutorial !== 'Yes' && s.tutorial_link === '') return false;
                }

                // Lyrics level filter
                if (this.dbFilterLyrics !== 'all' && s.lyrics_level !== this.dbFilterLyrics) return false;

                // Warning filter
                if (this.dbFilterWarning !== 'all') {
                    const wStatus = getSongWarning(s);
                    if (wStatus !== this.dbFilterWarning) return false;
                }

                return true;
            });

            totalFiltered += tierSongs.length;

            // Calculate criticality counts for this tier
            let critZero = 0;
            let critLow = 0;
            let critHigh = 0;

            tierSongs.forEach(s => {
                if (s.last_played) {
                    if (s.days > 60) {
                        critHigh++;
                    } else if (s.days >= 25) {
                        critLow++;
                    } else {
                        critZero++;
                    }
                } else {
                    critHigh++;
                }
            });

            // Update criticality badge counters
            const elZero = document.getElementById(`tier-crit-zero-${tier}`);
            const elLow = document.getElementById(`tier-crit-low-${tier}`);
            const elHigh = document.getElementById(`tier-crit-high-${tier}`);
            if (elZero) elZero.innerText = critZero;
            if (elLow) elLow.innerText = critLow;
            if (elHigh) elHigh.innerText = critHigh;

            // Update the total count badge
            const countBadge = document.getElementById(`tier-count-${tier}`);
            if (countBadge) {
                countBadge.innerText = tierSongs.length;
            }

            // Apply sorting based on dashboard sort selection
            const sortBy = this.dbSortBy;
            tierSongs.sort((a, b) => {
                if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
                if (sortBy === 'artist-desc') return b.artist.localeCompare(a.artist);
                if (sortBy === 'title') return a.title.localeCompare(b.title);
                if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
                if (sortBy === 'days-desc') return b.days - a.days; // oldest played first
                if (sortBy === 'days-asc') return a.days - b.days;  // recent played first
                if (sortBy === 'progress-desc') {
                    const progA = (a.guitar_level + a.lyrics_level) / 6;
                    const progB = (b.guitar_level + b.lyrics_level) / 6;
                    return progB - progA;
                }
                if (sortBy === 'progress-asc') {
                    const progA = (a.guitar_level + a.lyrics_level) / 6;
                    const progB = (b.guitar_level + b.lyrics_level) / 6;
                    return progA - progB;
                }
                return 0;
            });

            if (tierSongs.length === 0) {
                listContainer.innerHTML = `<div class="helper-text" style="padding:15px; text-align:center;">No songs inside Tier ${tier}</div>`;
                continue;
            }

            tierSongs.forEach(song => {
                const card = document.createElement('div');
                card.className = 'song-card';
                card.addEventListener('click', () => this.viewSong(song.id));

                // Warning indicator label
                let tagClass = 'tag-empty';
                let tagText = 'Never Played';

                if (song.last_played) {
                    if (song.days > 60) {
                        tagClass = 'tag-high';
                        tagText = `${song.days} d ago`;
                    } else if (song.days >= 25) {
                        tagClass = 'tag-low';
                        tagText = `${song.days} d ago`;
                    } else {
                        tagClass = 'tag-zero';
                        tagText = song.days === 0 ? 'Today' : `${song.days} d ago`;
                    }
                }

                card.innerHTML = `
                    <div class="song-card-body">
                        <h4>${escapeHTML(song.title)}</h4>
                        <p>${escapeHTML(song.artist)}</p>
                    </div>
                    <div class="song-card-meta">
                        <span class="warning-tag ${tagClass}">${tagText}</span>
                        <span class="text-secondary">Lvl ${song.lyrics_level}</span>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        }

        // Update total songs count on dashboard
        const dbCountElem = document.getElementById('dashboard-songs-count');
        if (dbCountElem) {
            dbCountElem.innerText = `${totalFiltered} songs`;
        }
    }

    playRandomSongFromTier(tier) {
        const listContainer = document.getElementById(`tier-list-${tier}`);
        if (!listContainer) return;
        
        const cards = listContainer.querySelectorAll('.song-card');
        if (cards.length > 0) {
            const randomIndex = Math.floor(Math.random() * cards.length);
            const randomCard = cards[randomIndex];
            randomCard.click(); // Trigger the click event attached to the card
        } else {
            this.showToast(`No songs currently shown in Tier ${tier}.`, false);
        }
    }

    // RENDER: DIRECTORY VIEW
    renderDirectory() {
        const tbody = document.getElementById('directory-tbody');
        tbody.innerHTML = '';

        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        const filterGuitar = this.filterGuitar;
        const filterWarning = this.filterWarning;
        const filterTutorial = this.filterTutorial;
        const sortBy = document.getElementById('sort-by').value;

        // Apply filters
        let filtered = this.songs.filter(song => {
            // Search filter
            const matchSearch = song.title.toLowerCase().includes(searchQuery) ||
                song.artist.toLowerCase().includes(searchQuery);

            // Guitar level filter
            let matchGuitar = true;
            if (filterGuitar !== 'all') {
                matchGuitar = song.guitar_level === parseInt(filterGuitar);
            }

            // Warning filter (based on calculated progress + days logic)
            let matchWarning = true;
            if (filterWarning !== 'all') {
                const wStatus = getSongWarning(song);
                matchWarning = wStatus === filterWarning;
            }

            // Tutorial filter
            let matchTutorial = true;
            if (filterTutorial === 'Yes') {
                matchTutorial = song.tutorial === 'Yes' || song.tutorial_link !== '';
            } else if (filterTutorial === 'No') {
                matchTutorial = song.tutorial !== 'Yes' && song.tutorial_link === '';
            }

            // Backlog filter (guitar === 0 AND lyrics === 0)
            let matchBacklog = true;
            if (this.filterBacklog) {
                matchBacklog = song.guitar_level === 0 && song.lyrics_level === 0;
            }

            return matchSearch && matchGuitar && matchWarning && matchTutorial && matchBacklog;
        });

        // Apply sorting
        filtered.sort((a, b) => {
            if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
            if (sortBy === 'artist-desc') return b.artist.localeCompare(a.artist);
            if (sortBy === 'title') return a.title.localeCompare(b.title);
            if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
            if (sortBy === 'days-desc') return b.days - a.days; // oldest played first
            if (sortBy === 'days-asc') return a.days - b.days;  // recent played first
            if (sortBy === 'progress-desc') {
                const progA = (a.guitar_level + a.lyrics_level) / 6;
                const progB = (b.guitar_level + b.lyrics_level) / 6;
                return progB - progA;
            }
            if (sortBy === 'progress-asc') {
                const progA = (a.guitar_level + a.lyrics_level) / 6;
                const progB = (b.guitar_level + b.lyrics_level) / 6;
                return progA - progB;
            }
            return 0;
        });

        // Update songs count subheader
        const countElem = document.getElementById('songs-count');
        if (countElem) {
            countElem.innerText = `${filtered.length} songs`;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No songs found matching current criteria.</td></tr>`;
            return;
        }

        filtered.forEach(song => {
            const tr = document.createElement('tr');
            tr.addEventListener('click', () => this.viewSong(song.id));

            // Stars formatting
            const guitarStars = getStarHTML(song.guitar_level);
            const lyricsStars = getStarHTML(song.lyrics_level);

            // Progress column details
            const progressVal = (song.guitar_level + song.lyrics_level) / 6;
            const progressPct = Math.round(progressVal * 100);

            let progressBadge = 'ZERO';
            let badgeClass = 'badge-zero';
            if (progressVal < 0.25) {
                progressBadge = 'ZERO';
                badgeClass = 'badge-zero';
            } else if (progressVal < 0.50) {
                progressBadge = 'LOW';
                badgeClass = 'badge-low';
            } else if (progressVal < 0.75) {
                progressBadge = 'MEDIUM';
                badgeClass = 'badge-medium';
            } else {
                progressBadge = 'HIGH';
                badgeClass = 'badge-high';
            }

            // Days Ago column
            let daysText = '-';
            let daysClass = 'text-muted';
            if (song.last_played) {
                daysText = `${song.days}d`;
                if (song.days > 90 && progressBadge !== 'ZERO') {
                    daysClass = 'text-red font-weight-bold';
                } else if (song.days > 30 && progressBadge !== 'ZERO') {
                    daysClass = 'text-yellow font-weight-bold';
                } else if (song.days <= 30 && progressBadge !== 'ZERO') {
                    daysClass = 'text-dark-green font-weight-bold';
                } else {
                    daysClass = 'text-muted font-weight-bold';
                }
            }

            // Warning column status
            const warningStatus = getSongWarning(song);
            let warningHTML = '';
            if (warningStatus === 'High') {
                warningHTML = `<span class="warning-status text-secondary-muted"><span class="dot bg-red"></span>High</span>`;
            } else if (warningStatus === 'Low') {
                warningHTML = `<span class="warning-status text-secondary-muted"><span class="dot bg-yellow"></span>Low</span>`;
                // } else if (warningStatus === 'Medium') {
                //     warningHTML = `<span class="warning-status text-yellow"><span class="dot bg-yellow"></span>Medium</span>`;
            } else {
                warningHTML = `<span class="warning-status text-secondary-muted"><span class="dot bg-green"></span>Zero</span>`;
            }

            //  Tutorial column status
            let tutorialHTML = '-';
            if (song.tutorial === 'Yes' || song.tutorial_link) {
                tutorialHTML = `<span class="text-gold" style="display:inline-flex; align-items:center; gap:6px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:#d9a74a;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Yes</span>`;
            }

            // Backlog column: Yes only if guitar_level === 0 AND lyrics_level === 0
            const isBacklog = song.guitar_level === 0 && song.lyrics_level === 0;
            const backlogHTML = isBacklog
                ? `<span class="backlog-yes">Yes</span>`
                : `<span class="backlog-no">No</span>`;

            tr.innerHTML = `
                <td><div class="table-artist-name">${escapeHTML(song.artist)}</div></td>
                <td><div class="table-song-title">${escapeHTML(song.title)}</div></td>
                <td>${guitarStars}</td>
                <td>${lyricsStars}</td>
                <td>
                    <div class="progress-cell">
                        <div class="progress-mini-track">
                            <div class="progress-mini-fill" style="width: ${progressPct}%"></div>
                        </div>
                        <span class="progress-pct-text">${progressPct}%</span>
                    </div>
                </td>
                <td><span class="${daysClass}">${daysText}</span></td>
                <td>${warningHTML}</td>
                <td>${tutorialHTML}</td>
                <td>${backlogHTML}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // VIEW SINGLE SONG
    viewSong(songId) {
        const song = this.songs.find(s => s.id === songId);
        if (!song) return;

        this.currentSongId = songId;

        // Metadata fill
        document.getElementById('view-song-title').innerText = song.title;
        document.getElementById('view-song-artist').innerText = song.artist;
        
        // Reset transpose state
        this.currentTransposeOffset = 0;
        this.updateTransposeUI();
        this.renderSongChords(song);

        // Days & last played
        document.getElementById('view-song-days').innerText = song.last_played ? song.days : 'Never';
        document.getElementById('view-song-last-played').innerText = song.last_played ? `Last played: ${song.last_played}` : 'Not played yet';
        
        // Times Played specific to this song
        document.getElementById('view-song-times-played').innerText = song.play_count || 0;

        // Rating Stars Rendering
        this.renderRatingStars('view-guitar-rating', song.guitar_level, 'guitar');
        this.renderRatingStars('view-lyrics-rating', song.lyrics_level, 'lyrics');

        // Progress Bar
        const progressVal = (song.guitar_level + song.lyrics_level) / 6;
        const progressPct = Math.round(((song.guitar_level + song.lyrics_level) / 6) * 100);

        // Integration search links
        document.getElementById('btn-search-youtube').href = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.artist + ' ' + song.title + ' guitar tutorial')}`;
        document.getElementById('btn-search-chordify').href = `https://chordify.net/search/${encodeURIComponent(song.artist + ' ' + song.title)}`;

        // Tutorial quick-link button
        const tutorialLinkBtn = document.getElementById('btn-tutorial-link');
        if (song.tutorial_link) {
            tutorialLinkBtn.href = song.tutorial_link;
            tutorialLinkBtn.classList.remove('btn-disabled');
            tutorialLinkBtn.removeAttribute('aria-disabled');
        } else {
            tutorialLinkBtn.href = '#';
            tutorialLinkBtn.classList.add('btn-disabled');
            tutorialLinkBtn.setAttribute('aria-disabled', 'true');
        }

        // Lyrics display
        const colLeft = document.getElementById('lyrics-col-left');
        const colRight = document.getElementById('lyrics-col-right');
        const lyricsContent = document.getElementById('lyrics-content');
        const displayCard = document.getElementById('lyrics-display');

        // Reset scrolling state
        if (this.isScrolling) {
            this.stopAutoScroll();
        }

        if (song.lyrics) {
            // Show the view so the DOM is rendered and measurable
            this.showView('song-viewer-view');
            displayCard.scrollTop = 0;
            this.layoutLyrics();
        } else {
            colLeft.innerHTML = `<span style="color: var(--text-muted);">No lyrics defined. Click "Edit Song Chords/Lyrics" below to write chords &amp; lyrics!</span>`;
            colRight.innerText = '';
            lyricsContent.classList.remove('lyrics-two-col');
            this.showView('song-viewer-view');
            displayCard.scrollTop = 0;
        }
    }

    renderRatingStars(containerId, level, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        // Render 3 star ratings
        for (let i = 1; i <= 3; i++) {
            const btn = document.createElement('button');
            btn.className = `rating-star-btn ${i <= level ? 'active' : ''}`;
            btn.title = `Rate level ${i} / 3`;
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

            // On Click rating update
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // If clicking currently active rating star, set it to i - 1 (allows down-rating or zero)
                const newLevel = (i === level) ? i - 1 : i;
                this.updateSongLevel(this.currentSongId, type, newLevel);
            });
            container.appendChild(btn);
        }
    }

    // ACTIONS: LEVEL & PLAY STATE WRITES
    async updateSongLevel(songId, type, newLevel) {
        try {
            const payload = {};
            payload[`${type}_level`] = newLevel;

            const response = await fetch(`/api/songs/${songId}/levels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Update local model
                const song = this.songs.find(s => s.id === songId);
                if (song) {
                    song[`${type}_level`] = newLevel;
                    this.showToast(`Updated ${type} level to ${newLevel}!`);
                    this.viewSong(songId); // Re-render single song
                }
            } else {
                this.showToast("Failed to save levels", false);
            }
        } catch (err) {
            console.error("Error saving levels:", err);
            this.showToast("Network error saving levels", false);
        }
    }

    // =========================================================================
    // DYNAMIC TRANSPOSE CONTROLS
    // =========================================================================

    transposeBy(delta) {
        this.currentTransposeOffset += delta;
        if (this.currentTransposeOffset > 11) this.currentTransposeOffset -= 12;
        if (this.currentTransposeOffset < -11) this.currentTransposeOffset += 12;
        this.updateTransposeUI();
    }

    resetTranspose() {
        this.currentTransposeOffset = 0;
        this.updateTransposeUI();
    }

    updateTransposeUI() {
        const badge = document.getElementById('transpose-badge');
        if (badge) {
            if (this.currentTransposeOffset === 0) {
                badge.innerText = 'Original';
            } else if (this.currentTransposeOffset > 0) {
                badge.innerText = `+${this.currentTransposeOffset}`;
            } else {
                badge.innerText = `${this.currentTransposeOffset}`;
            }
            badge.style.color = 'var(--accent)';
        }

        const song = this.songs.find(s => s.id === this.currentSongId);
        if (song) {
            this.renderSongChords(song);
        }
    }

    renderSongChords(song) {
        const chordsContainer = document.getElementById('view-song-chords');
        if (!chordsContainer) return;
        if (!song || !song.chords) {
            chordsContainer.innerText = 'No chords defined';
            return;
        }

        const rawChords = song.chords;
        const transposedText = transposeChordsString(rawChords, this.currentTransposeOffset);

        // Split by tokens preserving delimiters (spaces, commas, hyphens, bars)
        const tokens = transposedText.split(/([\s,\-]+|\/|\|\||\|)/).filter(t => t && t.length > 0);

        chordsContainer.innerHTML = '';
        tokens.forEach(token => {
            const trimmed = token.trim();
            if (trimmed.length > 0 && /^[A-G][#b]?/.test(trimmed)) {
                const tag = document.createElement('span');
                tag.className = 'chord-quick-tag';
                tag.setAttribute('data-chord', trimmed);
                tag.innerText = trimmed;
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showChordPopover(trimmed, e.clientX, e.clientY);
                });
                chordsContainer.appendChild(tag);
            } else {
                const span = document.createElement('span');
                span.innerText = token;
                chordsContainer.appendChild(span);
            }
        });
    }

    async markCurrentSongPlayed() {
        if (!this.currentSongId) return;
        const songId = this.currentSongId;

        try {
            const response = await fetch(`/api/songs/${songId}/played`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();

                // Update local model
                const song = this.songs.find(s => s.id === songId);
                if (song) {
                    song.last_played = data.last_played;
                    song.days = 0;
                    if (data.play_count !== undefined) {
                        song.play_count = data.play_count;
                    }

                    this.showToast("Song marked as played today!");
                    this.updateGlobalStats(); // Update sidebar stats
                    this.viewSong(songId); // Re-render view
                }
            } else {
                this.showToast("Failed to mark played", false);
            }
        } catch (err) {
            console.error("Error writing played state:", err);
            this.showToast("Network error writing state", false);
        }
    }

    // ACTION: ADD NEW SONG
    async handleAddSongSubmit(e) {
        e.preventDefault();

        const title = document.getElementById('form-title').value;
        const artist = document.getElementById('form-artist').value;
        const guitarLevel = parseInt(document.getElementById('form-guitar-level').value);
        const lyricsLevel = parseInt(document.getElementById('form-lyrics-level').value);
        const tutorial = document.getElementById('form-tutorial').value;
        const tutorialLink = document.getElementById('form-tutorial-link').value;
        const lastPlayed = document.getElementById('form-last-played').value || null;
        const chords = document.getElementById('form-chords').value;
        const lyrics = document.getElementById('form-lyrics').value;

        const payload = {
            title, artist, guitar_level: guitarLevel, lyrics_level: lyricsLevel,
            tutorial, tutorial_link: tutorialLink, last_played: lastPlayed,
            chords, lyrics
        };

        try {
            const response = await fetch('/api/songs/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                this.showToast("New song created successfully!");
                document.getElementById('add-song-form').reset();

                await this.fetchSongs(); // Reload list
                this.viewSong(data.id); // View the new song
            } else {
                const err = await response.json();
                this.showToast(`Error: ${err.error || 'Failed to create song'}`, false);
            }
        } catch (err) {
            console.error("Error creating song:", err);
            this.showToast("Network error creating song", false);
        }
    }

    // ACTION: EDIT EXISTING SONG
    openEditModal() {
        const song = this.songs.find(s => s.id === this.currentSongId);
        if (!song) return;

        // Fill modal fields
        document.getElementById('edit-form-title').value = song.title;
        document.getElementById('edit-form-artist').value = song.artist;
        document.getElementById('edit-form-guitar-level').value = song.guitar_level;
        document.getElementById('edit-form-lyrics-level').value = song.lyrics_level;
        document.getElementById('edit-form-tutorial').value = song.tutorial || 'No';
        document.getElementById('edit-form-tutorial-link').value = song.tutorial_link || '';
        document.getElementById('edit-form-last-played').value = song.last_played || '';
        document.getElementById('edit-form-chords').value = song.chords || '';
        document.getElementById('edit-form-lyrics').value = song.lyrics || '';

        document.getElementById('edit-song-modal').style.display = 'block';
    }

    closeEditModal() {
        document.getElementById('edit-song-modal').style.display = 'none';
    }

    async handleEditSongSubmit(e) {
        e.preventDefault();
        const songId = this.currentSongId;

        const title = document.getElementById('edit-form-title').value;
        const artist = document.getElementById('edit-form-artist').value;
        const guitarLevel = parseInt(document.getElementById('edit-form-guitar-level').value);
        const lyricsLevel = parseInt(document.getElementById('edit-form-lyrics-level').value);
        const tutorial = document.getElementById('edit-form-tutorial').value;
        const tutorialLink = document.getElementById('edit-form-tutorial-link').value;
        const lastPlayed = document.getElementById('edit-form-last-played').value || null;
        const chords = document.getElementById('edit-form-chords').value;
        const lyrics = document.getElementById('edit-form-lyrics').value;

        const payload = {
            title, artist, guitar_level: guitarLevel, lyrics_level: lyricsLevel,
            tutorial, tutorial_link: tutorialLink, last_played: lastPlayed,
            chords, lyrics
        };

        try {
            const response = await fetch(`/api/songs/${songId}/edit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                this.showToast("Changes saved successfully!");
                this.closeEditModal();

                await this.fetchSongs(); // Reload list
                this.viewSong(songId); // Re-render view
            } else {
                this.showToast("Failed to save changes", false);
            }
        } catch (err) {
            console.error("Error editing song:", err);
            this.showToast("Network error saving changes", false);
        }
    }

    // ACTION: DELETE SONG
    async deleteCurrentSong() {
        if (!this.currentSongId) return;

        const confirmDelete = confirm("Are you sure you want to delete this song permanently?");
        if (!confirmDelete) return;

        const songId = this.currentSongId;
        try {
            const response = await fetch(`/api/songs/delete/${songId}`, {
                method: 'POST'
            });

            if (response.ok) {
                this.showToast("Song deleted.");
                this.closeEditModal();
                await this.fetchSongs(); // Reload list
                this.showView('dashboard-view'); // Redirect to home
            } else {
                this.showToast("Failed to delete song", false);
            }
        } catch (err) {
            console.error("Error deleting song:", err);
            this.showToast("Network error deleting song", false);
        }
    }

    // LAYOUT & DYNAMICALLY SPLIT LYRICS
    layoutLyrics() {
        const song = this.songs.find(s => s.id === this.currentSongId);
        if (!song || !song.lyrics) return;

        const colLeft = document.getElementById('lyrics-col-left');
        const colRight = document.getElementById('lyrics-col-right');
        const lyricsContent = document.getElementById('lyrics-content');
        const displayCard = document.getElementById('lyrics-display');

        const text = song.lyrics;

        // Apply current font size to columns immediately so height checks are accurate
        colLeft.style.fontSize = `${this.zoomLevel}px`;
        colRight.style.fontSize = `${this.zoomLevel}px`;

        // Start: all lyrics in left column, single-col mode
        colLeft.innerText = text;
        colRight.innerText = '';
        lyricsContent.classList.remove('lyrics-two-col');

        if (this._layoutFrameId) {
            cancelAnimationFrame(this._layoutFrameId);
        }

        // Allow DOM to render and measure
        this._layoutFrameId = requestAnimationFrame(() => {
            this._layoutFrameId = null;
            const cardStyle = getComputedStyle(displayCard);
            const availableHeight = displayCard.clientHeight
                - parseFloat(cardStyle.paddingTop)
                - parseFloat(cardStyle.paddingBottom);

            // If all lyrics fit in one column, we're done
            if (colLeft.scrollHeight <= availableHeight) {
                return;
            }

            // Content overflows: activate two-col grid, then find the split point
            // by filling col-left stanza by stanza until it would overflow.
            lyricsContent.classList.add('lyrics-two-col');

            // Split text into stanzas (separated by blank lines)
            const stanzas = text.split(/\n\n/);

            // Binary-search for how many stanzas fit in col-left
            let lo = 1, hi = stanzas.length - 1, bestFit = 0;
            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                colLeft.innerText = stanzas.slice(0, mid).join('\n\n').trimEnd();
                if (colLeft.scrollHeight <= availableHeight) {
                    bestFit = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }

            // If nothing fits even alone, put at least one stanza in left col
            if (bestFit === 0) bestFit = 1;

            colLeft.innerText = stanzas.slice(0, bestFit).join('\n\n').trimEnd();
            colRight.innerText = stanzas.slice(bestFit).join('\n\n').trimStart();
        });
    }

    // ZOOM IN / OUT LYRICS FONT
    adjustFontSize(delta) {
        this.zoomLevel = Math.max(10, Math.min(32, this.zoomLevel + delta));
        document.getElementById('zoom-level').innerText = `${this.zoomLevel}px`;
        this.layoutLyrics();
    }

    // AUTO SCROLLER SYSTEM
    toggleAutoScroll() {
        if (this.isScrolling) {
            this.stopAutoScroll();
        } else {
            this.startAutoScroll();
        }
    }

    startAutoScroll() {
        this.isScrolling = true;

        // Update UI states
        const btn = document.getElementById('btn-scroll-toggle');
        btn.classList.add('btn-accent');
        btn.classList.remove('btn-primary');
        document.querySelector('.icon-play').style.display = 'none';
        document.querySelector('.icon-pause').style.display = 'inline-block';
        document.getElementById('scroll-btn-text').innerText = 'Pause Scroll';

        const displayBox = document.getElementById('lyrics-display');

        if (this.scrollIntervalId) {
            clearInterval(this.scrollIntervalId);
        }

        // Map speed: speed slider goes from 1 to 10.
        // We will scroll 1 pixel at interval.
        // If speed is 1, scroll every 150ms. If speed is 10, scroll every 15ms.
        const intervalTime = 160 - (this.scrollSpeed * 14); // maps 1..10 to 146ms..20ms

        this.scrollIntervalId = setInterval(() => {
            displayBox.scrollTop += 1;

            // Stop scroll if reached bottom
            if (displayBox.scrollTop + displayBox.clientHeight >= displayBox.scrollHeight - 1) {
                this.stopAutoScroll();
            }
        }, intervalTime);
    }

    stopAutoScroll() {
        this.isScrolling = false;

        if (this.scrollIntervalId) {
            clearInterval(this.scrollIntervalId);
            this.scrollIntervalId = null;
        }

        // Update UI states
        const btn = document.getElementById('btn-scroll-toggle');
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-accent');
        document.querySelector('.icon-play').style.display = 'inline-block';
        document.querySelector('.icon-pause').style.display = 'none';
        document.getElementById('scroll-btn-text').innerText = 'Auto-Scroll';
    }

    // =========================================================================
    // CHORDS LIBRARY & INTERACTIVE FRETBOARD CONTROLLER
    // =========================================================================

    renderChords() {
        const grid = document.getElementById('chords-grid');
        const countElem = document.getElementById('chords-count');
        if (!grid) return;

        grid.innerHTML = '';

        let filtered = this.chords.filter(chord => {
            // Root filter
            if (this.filterChordRoot !== 'all' && chord.root !== this.filterChordRoot) {
                return false;
            }

            // Type filter
            if (this.filterChordType !== 'all' && chord.type !== this.filterChordType) {
                return false;
            }

            // Search query filter
            if (this.filterChordSearch) {
                const q = this.filterChordSearch.toLowerCase().trim();
                const nameMatch = (chord.name || '').toLowerCase().includes(q);
                const rootMatch = (chord.root || '').toLowerCase().includes(q);
                const typeMatch = (chord.type || '').toLowerCase().includes(q);
                if (!nameMatch && !rootMatch && !typeMatch) return false;
            }

            return true;
        });

        if (countElem) {
            countElem.innerText = `${filtered.length} chords`;
        }

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="helper-text" style="grid-column: 1 / -1; text-align: center; padding: 40px;">No chords match your current search or filters.</div>`;
            return;
        }

        // Sort alphabetically by chord name
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        filtered.forEach(chord => {
            const card = document.createElement('div');
            card.className = 'chord-card';
            card.title = `Click to edit ${chord.name}`;

            const svgHTML = ChordRenderer.renderSVG(chord, { width: 140, height: 170, showTitle: true });

            card.innerHTML = `
                <div class="chord-card-svg-container">
                    ${svgHTML}
                </div>
                <div class="chord-card-meta">
                    <span class="chord-type-pill">${escapeHTML(chord.type || 'Standard')}</span>
                </div>
            `;

            // Click card to open chord editor
            card.addEventListener('click', () => {
                this.openChordEditor(chord);
            });

            grid.appendChild(card);
        });
    }

    openChordEditor(chord = null) {
        const modal = document.getElementById('chord-editor-modal');
        const titleEl = document.getElementById('chord-modal-title');
        const deleteBtn = document.getElementById('btn-delete-chord');

        if (chord) {
            this.activeChordEditing = chord.id || chord.name;
            if (titleEl) titleEl.innerText = `Edit Chord: ${chord.name}`;
            if (deleteBtn) deleteBtn.style.display = 'inline-block';

            this.editorChordState = {
                id: chord.id || chord.name,
                name: chord.name || '',
                root: chord.root || 'C',
                type: chord.type || 'Major',
                base_fret: chord.base_fret || 1,
                frets: [...(chord.frets || [-1, -1, -1, -1, -1, -1])],
                fingers: [...(chord.fingers || [0, 0, 0, 0, 0, 0])],
                barres: chord.barres ? [...chord.barres] : []
            };
        } else {
            this.activeChordEditing = null;
            if (titleEl) titleEl.innerText = 'New Chord';
            if (deleteBtn) deleteBtn.style.display = 'none';

            this.editorChordState = {
                name: '',
                root: 'C',
                type: 'Major',
                base_fret: 1,
                frets: [0, 0, 0, 0, 0, 0],
                fingers: [0, 0, 0, 0, 0, 0],
                barres: []
            };
        }

        // Populate form inputs
        document.getElementById('chord-form-name').value = this.editorChordState.name;
        document.getElementById('chord-form-root').value = this.editorChordState.root;
        document.getElementById('chord-form-type').value = this.editorChordState.type;
        document.getElementById('chord-form-base-fret').value = this.editorChordState.base_fret;

        // Reset active finger tool
        this.editorActiveFinger = '1';
        document.querySelectorAll('.finger-btn').forEach(b => b.classList.remove('active'));
        const f1 = document.querySelector('.finger-btn[data-finger="1"]');
        if (f1) f1.classList.add('active');

        this.renderInteractiveFretboard();
        this.updateLiveChordPreview();

        if (modal) {
            modal.classList.add('open');
            modal.style.display = 'block';
        }
    }

    closeChordEditor() {
        const modal = document.getElementById('chord-editor-modal');
        if (modal) {
            modal.classList.remove('open');
            modal.style.display = 'none';
        }
    }

    renderInteractiveFretboard() {
        const nutRow = document.getElementById('fretboard-nut-row');
        const fretboard = document.getElementById('interactive-fretboard');
        if (!nutRow || !fretboard) return;

        nutRow.innerHTML = '';
        fretboard.innerHTML = '';

        const baseFret = this.editorChordState.base_fret || 1;
        if (baseFret === 1) {
            nutRow.style.borderBottom = '6px solid #f0f2f5';
        } else {
            nutRow.style.borderBottom = '2px solid #666a73';
        }

        const stringLabels = ['6 (E)', '5 (A)', '4 (D)', '3 (G)', '2 (B)', '1 (e)'];

        // 1. Nut Row (Strings 6 to 1)
        for (let s = 0; s < 6; s++) {
            const nutCell = document.createElement('div');
            nutCell.className = 'nut-cell';

            const fretVal = this.editorChordState.frets[s];
            if (fretVal === -1) {
                nutCell.classList.add('state-muted');
                nutCell.innerHTML = '✕';
                nutCell.title = `String ${stringLabels[s]}: Muted (Click to make open)`;
            } else if (fretVal === 0) {
                nutCell.classList.add('state-open');
                nutCell.innerHTML = '○';
                nutCell.title = `String ${stringLabels[s]}: Open (Click to mute)`;
            } else {
                nutCell.classList.add('state-fretted');
                nutCell.innerHTML = '';
                nutCell.title = `String ${stringLabels[s]}: Fretted at fret ${fretVal} (Click to open)`;
            }

            nutCell.addEventListener('click', () => {
                if (this.editorChordState.frets[s] === -1) {
                    this.editorChordState.frets[s] = 0;
                    this.editorChordState.fingers[s] = 0;
                } else if (this.editorChordState.frets[s] === 0) {
                    this.editorChordState.frets[s] = -1;
                    this.editorChordState.fingers[s] = 0;
                } else {
                    this.editorChordState.frets[s] = 0;
                    this.editorChordState.fingers[s] = 0;
                }
                this.renderInteractiveFretboard();
                this.updateLiveChordPreview();
            });

            nutRow.appendChild(nutCell);
        }

        // 2. Fret Rows (Frets 1 to 5)
        for (let f = 1; f <= 5; f++) {
            const fretRow = document.createElement('div');
            fretRow.className = 'fret-row';

            for (let s = 0; s < 6; s++) {
                const cell = document.createElement('div');
                cell.className = 'fret-cell';
                cell.title = `String ${stringLabels[s]}, Fret ${f}`;

                if (this.editorChordState.frets[s] === f) {
                    const finger = this.editorChordState.fingers[s] || '1';
                    const marker = document.createElement('div');
                    marker.className = 'fret-dot-marker';
                    marker.innerText = finger;
                    cell.appendChild(marker);
                }

                cell.addEventListener('click', () => {
                    if (this.editorActiveFinger === '0') {
                        // Erase mode
                        if (this.editorChordState.frets[s] === f) {
                            this.editorChordState.frets[s] = 0;
                            this.editorChordState.fingers[s] = 0;
                        }
                    } else {
                        // Toggle or set finger
                        if (this.editorChordState.frets[s] === f && this.editorChordState.fingers[s] === this.editorActiveFinger) {
                            // Clicking same finger again removes it
                            this.editorChordState.frets[s] = 0;
                            this.editorChordState.fingers[s] = 0;
                        } else {
                            this.editorChordState.frets[s] = f;
                            this.editorChordState.fingers[s] = this.editorActiveFinger;
                        }
                    }

                    this.renderInteractiveFretboard();
                    this.updateLiveChordPreview();
                });

                fretRow.appendChild(cell);
            }

            fretboard.appendChild(fretRow);
        }
    }

    updateLiveChordPreview() {
        this.editorChordState.name = document.getElementById('chord-form-name').value.trim();
        this.editorChordState.root = document.getElementById('chord-form-root').value;
        this.editorChordState.type = document.getElementById('chord-form-type').value;
        this.editorChordState.base_fret = parseInt(document.getElementById('chord-form-base-fret').value) || 1;

        const previewContainer = document.getElementById('chord-live-preview');
        if (previewContainer) {
            const svgHTML = ChordRenderer.renderSVG(this.editorChordState, { width: 170, height: 210, showTitle: true });
            previewContainer.innerHTML = svgHTML;
        }
    }

    async saveChord() {
        const name = document.getElementById('chord-form-name').value.trim();
        if (!name) {
            this.showToast("Please enter a chord name (e.g. D/F#)", false);
            return;
        }

        this.updateLiveChordPreview();

        const detectedBarres = ChordRenderer.detectBarres(this.editorChordState);

        const payload = {
            id: this.activeChordEditing || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            name: this.editorChordState.name,
            root: this.editorChordState.root,
            type: this.editorChordState.type,
            base_fret: this.editorChordState.base_fret,
            frets: this.editorChordState.frets,
            fingers: this.editorChordState.fingers,
            barres: detectedBarres.map(b => b.fret)
        };

        try {
            const response = await fetch('/api/chords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await this.fetchChords();
                this.renderChords();
                this.closeChordEditor();
                this.showToast(`Chord "${payload.name}" saved!`);
            } else {
                this.showToast("Failed to save chord", false);
            }
        } catch (err) {
            console.error("Error saving chord:", err);
            this.showToast("Connection error saving chord", false);
        }
    }

    async deleteActiveChord() {
        if (!this.activeChordEditing) return;
        await this.deleteChord(this.activeChordEditing);
        this.closeChordEditor();
    }

    async deleteChord(chordId) {
        if (!confirm(`Are you sure you want to delete this chord?`)) return;

        try {
            const response = await fetch(`/api/chords/${encodeURIComponent(chordId)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.fetchChords();
                this.renderChords();
                this.showToast("Chord deleted");
            } else {
                this.showToast("Failed to delete chord", false);
            }
        } catch (err) {
            console.error("Error deleting chord:", err);
            this.showToast("Connection error deleting chord", false);
        }
    }

    showChordPopover(chordName, clientX, clientY) {
        if (!chordName) return;
        const normalized = chordName.trim();
        const chord = this.chords.find(c => (c.name || '').toLowerCase() === normalized.toLowerCase() || (c.id || '') === normalized.toLowerCase());

        const popover = document.getElementById('chord-preview-popover');
        const titleEl = document.getElementById('chord-popover-title');
        const diagramEl = document.getElementById('chord-popover-diagram');

        if (!popover || !diagramEl) return;

        if (chord) {
            if (titleEl) titleEl.innerText = chord.name;
            diagramEl.innerHTML = ChordRenderer.renderSVG(chord, { width: 160, height: 190, showTitle: false });
        } else {
            if (titleEl) titleEl.innerText = normalized;
            diagramEl.innerHTML = `<div style="padding: 20px; font-size: 0.85rem; color: var(--text-muted); text-align:center;">Chord "${escapeHTML(normalized)}" not in library.<br><a href="#" id="btn-quick-create-chord" style="color:var(--accent); font-weight:600; text-decoration:underline; display:inline-block; margin-top:8px;">+ Add to Library</a></div>`;
            
            setTimeout(() => {
                const addBtn = document.getElementById('btn-quick-create-chord');
                if (addBtn) {
                    addBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.hideChordPopover();
                        this.openChordEditor({ name: normalized, root: normalized.charAt(0).toUpperCase() });
                    });
                }
            }, 50);
        }

        // Position popover
        const popoverWidth = 200;
        const popoverHeight = 240;
        let x = clientX + 12;
        let y = clientY - 40;

        if (x + popoverWidth > window.innerWidth) {
            x = clientX - popoverWidth - 12;
        }
        if (y + popoverHeight > window.innerHeight) {
            y = window.innerHeight - popoverHeight - 16;
        }
        if (y < 10) y = 10;
        if (x < 10) x = 10;

        popover.style.left = `${x}px`;
        popover.style.top = `${y}px`;
        popover.classList.add('open');
    }

    hideChordPopover() {
        const popover = document.getElementById('chord-preview-popover');
        if (popover) popover.classList.remove('open');
    }
}

// UTILITY FUNCTIONS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function formatDateString(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            // Convert YYYY-MM-DD to DD/MM/YYYY for Spanish format visual match
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

function getSongWarning(song) {
    const progressVal = (song.guitar_level + song.lyrics_level) / 6;
    // If progress is ZERO, warning is always Zero (Zero Warning, not active)
    if (progressVal < 0.25) {
        return "Zero";
    }
    if (song.days < 30) return "Zero";
    if (song.days < 60) return "Low";
    if (song.days < 90) return "Medium";
    return "High";
}

function getStarHTML(level) {
    let html = '<span class="star-rating">';
    for (let i = 1; i <= 3; i++) {
        if (i <= level) {
            html += '<span class="star filled">★</span>';
        } else {
            html += '<span class="star empty">☆</span>';
        }
    }
    html += '</span>';
    return html;
}

// CHORD TRANSPOSITION UTILITIES
const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_SEMITONES = {
    'C': 0, 'B#': 0,
    'C#': 1, 'Db': 1,
    'D': 2,
    'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5,
    'F#': 6, 'Gb': 6,
    'G': 7,
    'G#': 8, 'Ab': 8,
    'A': 9,
    'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11
};

function transposeNote(note, semitones) {
    if (!NOTE_SEMITONES.hasOwnProperty(note)) return note;
    let idx = (NOTE_SEMITONES[note] + semitones) % 12;
    if (idx < 0) idx += 12;
    return note.includes('b') ? CHROMATIC_FLATS[idx] : CHROMATIC_SHARPS[idx];
}

function transposeSingleChord(chord, semitones) {
    if (!chord || semitones === 0) return chord;
    if (chord.includes('/')) {
        const parts = chord.split('/');
        if (parts.length === 2) {
            const transposedMain = transposeSingleChord(parts[0], semitones);
            const bassMatch = parts[1].match(/^([A-G][#b]?)(.*)$/);
            if (bassMatch) {
                return `${transposedMain}/${transposeNote(bassMatch[1], semitones)}${bassMatch[2]}`;
            }
            return `${transposedMain}/${parts[1]}`;
        }
    }
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;
    return transposeNote(match[1], semitones) + match[2];
}

function transposeChordsString(chordsStr, semitones) {
    if (!chordsStr || semitones === 0) return chordsStr;
    return chordsStr.replace(/([A-G][#b]?(?:[a-zA-Z0-9#+°ø/]*))/g, (match) => {
        return transposeSingleChord(match, semitones);
    });
}

// Instantiate App
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new GuitarApp();
});
