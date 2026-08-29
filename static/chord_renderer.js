// SVG Chord Diagram Renderer for Guitar Tracker & Song Viewer
// International Notation (C, D, E, F, G, A, B)

class ChordRenderer {
    /**
     * Auto-detect barre fingerings from frets and fingers arrays.
     */
    static detectBarres(chord) {
        if (!chord || !Array.isArray(chord.frets)) return [];

        // If chord already has explicit barres array with valid numbers/objects
        if (Array.isArray(chord.barres) && chord.barres.length > 0) {
            return chord.barres.map(b => {
                if (typeof b === 'object' && b !== null) return b;
                const bFret = Number(b);
                let minStr = -1;
                let maxStr = -1;
                for (let s = 0; s < 6; s++) {
                    if (chord.frets[s] === bFret) {
                        if (minStr === -1) minStr = s;
                        maxStr = s;
                    }
                }
                return {
                    fret: bFret,
                    from: minStr !== -1 ? minStr : 0,
                    to: maxStr !== -1 ? maxStr : 5,
                    finger: (chord.fingers && minStr !== -1) ? String(chord.fingers[minStr] || '1') : '1'
                };
            });
        }

        // Auto-detect barres
        const barres = [];
        const frets = chord.frets;
        const fingers = chord.fingers || [];

        for (let f = 1; f <= 5; f++) {
            const stringIndices = [];
            for (let s = 0; s < 6; s++) {
                if (frets[s] === f) {
                    stringIndices.push(s);
                }
            }

            if (stringIndices.length >= 2) {
                const minStr = stringIndices[0];
                const maxStr = stringIndices[stringIndices.length - 1];

                const fingerFirst = String(fingers[minStr] || '');
                const fingerLast = String(fingers[maxStr] || '');
                const isFinger1 = (fingerFirst === '1' && fingerLast === '1') || (fingerFirst === 'T' && fingerLast === 'T');
                const isSameFinger = stringIndices.every(s => String(fingers[s]) === fingerFirst && fingerFirst !== '0');

                if (!isFinger1 && !isSameFinger) continue;

                let validBarre = true;
                for (let s = minStr; s <= maxStr; s++) {
                    if (frets[s] < f && frets[s] !== -1) {
                        validBarre = false;
                        break;
                    }
                    if (frets[s] === 0) {
                        validBarre = false;
                        break;
                    }
                }

                if (validBarre) {
                    barres.push({
                        fret: f,
                        from: minStr,
                        to: maxStr,
                        finger: fingerFirst || '1'
                    });
                }
            }
        }

        return barres;
    }

    /**
     * Generate an SVG string for a given chord object.
     * @param {Object} chord - Chord data { name, root, type, base_fret, frets, fingers, barres }
     * @param {Object} options - Rendering options { width, height, showTitle, interactive }
     * @returns {string} SVG HTML string
     */
    static renderSVG(chord, options = {}) {
        if (!chord || !Array.isArray(chord.frets)) return '';

        const width = options.width || 150;
        const height = options.height || 180;
        const showTitle = options.showTitle !== false;
        const baseFret = chord.base_fret || 1;

        const stringX = [25, 45, 65, 85, 105, 125];
        const fretY = [42, 67, 92, 117, 142, 167]; // fret lines: 0(nut), 1, 2, 3, 4, 5

        let svg = `<svg class="chord-diagram-svg" viewBox="0 0 150 180" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

        // 1. Chord Name Header
        if (showTitle && chord.name) {
            svg += `<text x="75" y="18" class="chord-title-text" text-anchor="middle">${ChordRenderer.escapeXML(chord.name)}</text>`;
        }

        // 2. Nut or Fret Number Indicator
        if (baseFret === 1) {
            // Nut (thick bar)
            svg += `<line x1="25" y1="42" x2="125" y2="42" stroke="var(--text-primary, #fff)" stroke-width="4.5" stroke-linecap="round" />`;
        } else {
            // Thin top fret line + base fret number text on left
            svg += `<line x1="25" y1="42" x2="125" y2="42" stroke="var(--border-color, #333)" stroke-width="1.5" />`;
            svg += `<text x="12" y="58" class="chord-base-fret" text-anchor="middle">${baseFret}fr</text>`;
        }

        // 3. Fret Lines (horizontal)
        for (let f = 1; f <= 5; f++) {
            svg += `<line x1="25" y1="${fretY[f]}" x2="125" y2="${fretY[f]}" stroke="var(--border-color, #444)" stroke-width="1.2" />`;
        }

        // 4. String Lines (vertical)
        const stringWidths = [2.2, 1.8, 1.5, 1.2, 1.0, 0.8]; // Low E to High E
        for (let s = 0; s < 6; s++) {
            svg += `<line x1="${stringX[s]}" y1="42" x2="${stringX[s]}" y2="167" stroke="var(--border-color, #777)" stroke-width="${stringWidths[s]}" />`;
        }

        // 5. Open / Muted Indicators above the Nut
        for (let s = 0; s < 6; s++) {
            const fretVal = chord.frets[s];
            if (fretVal === -1) {
                // Muted string 'X'
                svg += `<text x="${stringX[s]}" y="34" class="chord-sym-muted" text-anchor="middle">✕</text>`;
            } else if (fretVal === 0) {
                // Open string 'O'
                svg += `<circle cx="${stringX[s]}" cy="30" r="3.5" class="chord-sym-open" fill="none" stroke="var(--text-secondary, #aaa)" stroke-width="1.4" />`;
            }
        }

        // 6. Barre chords (auto-detected or explicit)
        const barres = ChordRenderer.detectBarres(chord);
        barres.forEach(b => {
            const bFret = b.fret;
            const fromStr = b.from !== undefined ? b.from : 0;
            const toStr = b.to !== undefined ? b.to : 5;
            if (bFret >= 1 && bFret <= 5) {
                const cy = 42 + (bFret - 0.5) * 25;
                const x1 = stringX[fromStr];
                const x2 = stringX[toStr];
                const minX = Math.min(x1, x2) - 7.5;
                const barWidth = Math.abs(x2 - x1) + 15;
                svg += `<rect x="${minX}" y="${cy - 7.5}" width="${barWidth}" height="15" rx="7.5" class="chord-barre-pill" fill="var(--accent, #d9a74a)" />`;
                
                if (b.finger) {
                    const fingerX = stringX[fromStr];
                    svg += `<text x="${fingerX}" y="${cy + 3.5}" class="chord-finger-text" text-anchor="middle" font-size="9" font-weight="700" fill="#000">${b.finger}</text>`;
                }
            }
        });

        // 7. Finger Dots on Strings & Frets
        for (let s = 0; s < 6; s++) {
            const fretVal = chord.frets[s];
            if (fretVal > 0 && fretVal <= 5) {
                const cx = stringX[s];
                const cy = 42 + (fretVal - 0.5) * 25;
                const finger = chord.fingers && chord.fingers[s] ? chord.fingers[s] : '';

                // Don't duplicate dot if this string is already covered by the left endpoint of a barre where finger was drawn
                const isBarreFirstString = barres.some(b => b.fret === fretVal && b.from === s);
                if (!isBarreFirstString) {
                    svg += `<circle cx="${cx}" cy="${cy}" r="7.5" class="chord-dot" fill="var(--accent, #d9a74a)" />`;
                    if (finger) {
                        svg += `<text x="${cx}" y="${cy + 3.5}" class="chord-finger-text" text-anchor="middle" font-size="9" font-weight="700" fill="#000">${finger}</text>`;
                    }
                }
            }
        }

        svg += `</svg>`;
        return svg;
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

// Export for browser and node/commonjs environments
if (typeof window !== 'undefined') {
    window.ChordRenderer = ChordRenderer;
}
