/**
 * Learning Terminal — Letters (Phonics, Letter Match, Words) and Numbers practice
 * Neon look, big simple choices.
 * Letter sounds: Buzzphonics (MIT)
 */

const STORAGE_KEY = 'lt-home-v2';
const SCORES_KEY = 'lt-scores-v1';
const WRONG_MS = 1600;

const LETTERS = [
    { letter: 'S', file: 's', word: 'sun', emoji: '☀️' },
    { letter: 'A', file: 'a', word: 'apple', emoji: '🍎' },
    { letter: 'T', file: 't', word: 'tree', emoji: '🌳' },
    { letter: 'P', file: 'p', word: 'pig', emoji: '🐷' },
    { letter: 'I', file: 'i', word: 'igloo', emoji: '🧊' },
    { letter: 'N', file: 'n', word: 'nest', emoji: '🪺' },
    { letter: 'M', file: 'm', word: 'moon', emoji: '🌙' },
    { letter: 'D', file: 'd', word: 'dog', emoji: '🐶' },
    { letter: 'G', file: 'g', word: 'goat', emoji: '🐐' },
    { letter: 'O', file: 'o', word: 'octopus', emoji: '🐙' },
    { letter: 'C', file: 'c', word: 'cat', emoji: '🐱' },
    { letter: 'K', file: 'c', word: 'kite', emoji: '🪁' },
    { letter: 'E', file: 'e', word: 'egg', emoji: '🥚' },
    { letter: 'U', file: 'u', word: 'umbrella', emoji: '☂️' },
    { letter: 'R', file: 'r', word: 'rabbit', emoji: '🐰' },
    { letter: 'H', file: 'h', word: 'hat', emoji: '🎩' },
    { letter: 'B', file: 'b', word: 'bus', emoji: '🚌' },
    { letter: 'F', file: 'f', word: 'fish', emoji: '🐟' },
    { letter: 'L', file: 'l', word: 'lion', emoji: '🦁' }
];

const NUMBER_WORDS = {
    1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten'
};

// track: home | letters-menu | letters | sounds | words | numbers-menu | counting | addition | compare | history
// mode: QUIZ | PLAY | DONE
let track = 'home';
let mode = 'QUIZ';
let index = 0;
let quizAnswer = null;
let quizOptions = [];
let quizKind = 'SOUND';
let coolingDown = false;
let turnsLeft = 0;
let turnsTotal = 8;
let soundQueue = [];
let soundPos = 0;

// 3-letter words a young kid knows. Letters stay inside the phonics sound set.
const WORDS = [
    { word: 'cat', emoji: '🐱' },
    { word: 'dog', emoji: '🐶' },
    { word: 'sun', emoji: '☀️' },
    { word: 'bed', emoji: '🛏️' },
    { word: 'pig', emoji: '🐷' },
    { word: 'hat', emoji: '🎩' },
    { word: 'bus', emoji: '🚌' },
    { word: 'cup', emoji: '🥤' },
    { word: 'bug', emoji: '🐛' },
    { word: 'hen', emoji: '🐔' },
    { word: 'log', emoji: '🪵' },
    { word: 'map', emoji: '🗺️' },
    { word: 'net', emoji: '🥅' },
    { word: 'pot', emoji: '🍲' },
    { word: 'rat', emoji: '🐀' },
    { word: 'bat', emoji: '🦇' },
    { word: 'nut', emoji: '🥜' },
    { word: 'pan', emoji: '🍳' },
    { word: 'pen', emoji: '✏️' },
    { word: 'bag', emoji: '👜' },
    { word: 'cap', emoji: '🧢' },
    { word: 'mop', emoji: '🧹' },
    { word: 'leg', emoji: '🦵' },
    { word: 'pin', emoji: '📌' }
];

const WORD_LETTERS = ['S', 'A', 'T', 'P', 'I', 'N', 'M', 'D', 'G', 'O', 'C', 'E', 'U', 'R', 'H', 'B', 'F', 'L'];

let wordQueue = [];
let wordPos = 0;
let wordTarget = null;
let wordSpelling = [];
let wordTiles = [];
// True while the third letter's phoneme is still playing, so a slot tap
// can't change the word before it is judged.
let wordLocked = false;
// Bumped to ignore a letter-end callback after the kid has left the round.
let letterWaitGen = 0;
// Seconds from the start of each Buzzphonics clip where the phoneme has
// finished, plus a short breath. The files pad a silent tail (~0.4–0.8s);
// waiting for `ended` would leave a dead pause before the feedback.
const LETTER_HEARD_AT = {
    a: 0.54, b: 0.89, c: 1.01, d: 0.90, e: 0.87, f: 0.81, g: 1.14,
    h: 0.83, i: 0.90, j: 0.57, l: 1.16, m: 1.47, n: 1.16, o: 0.87,
    p: 0.92, qu: 0.73, r: 0.79, s: 0.97, t: 0.80, u: 0.60, v: 0.67,
    w: 0.94, x: 0.84, y: 0.68, z: 0.69
};

// math/count state
let countItems = 0;
let mathA = 0;
let mathB = 0;
let compareLeft = 0;
let compareRight = 0;

// Running totals for the current 8-round (or word) session. Dropped if the
// kid leaves before the done screen. Letter Match keeps its own tallies in
// the progress save, because that set can be finished on a later visit.
let roundCorrect = 0;
let roundIncorrect = 0;
let roundScored = false;
let letterCorrect = 0;
let letterIncorrect = 0;
let historyConfirm = false;
let historyExportText = '';
let historyExportName = '';

function countOrZero(n) {
    return typeof n === 'number' && isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function load() {
    try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (typeof p.letterIndex === 'number') {
            index = Math.min(Math.max(0, p.letterIndex), LETTERS.length - 1);
        }
        letterCorrect = countOrZero(p.letterCorrect);
        letterIncorrect = countOrZero(p.letterIncorrect);
    } catch (e) { /* ignore */ }
}

function save() {
    // letterIndex is the saved Letter Match place. The extra fields are only
    // the in-progress tallies for that same set.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        letterIndex: index,
        letterCorrect: letterCorrect,
        letterIncorrect: letterIncorrect
    }));
}

function beginSession() {
    roundCorrect = 0;
    roundIncorrect = 0;
    roundScored = false;
}

function markRoundStart() {
    roundScored = false;
}

// A finished round counts once as correct, even after retries.
// Each wrong try counts as incorrect. Leaving before the done screen
// does not write a score.
function markCorrect() {
    if (roundScored) return;
    roundScored = true;
    roundCorrect++;
}

function markIncorrect() {
    roundIncorrect++;
}

function loadScores() {
    try {
        const raw = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
        if (!Array.isArray(raw)) return [];
        return raw.filter(function (r) {
            return r && typeof r.game === 'string' && typeof r.endedAt === 'string';
        });
    } catch (e) {
        return [];
    }
}

function finishSession(game, correct, incorrect, total) {
    try {
        correct = countOrZero(correct);
        incorrect = countOrZero(incorrect);
        total = countOrZero(total);
        if (!game || total <= 0) return;
        const now = new Date();
        const all = loadScores();
        all.push({
            endedAt: now.toISOString(),
            endedLocal: now.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            }),
            game: game,
            correct: correct,
            incorrect: incorrect,
            total: total
        });
        localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch (e) { /* storage full or blocked */ }
}

function localDay(d) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
}

function anchorDownload(filename, json) {
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        a.remove();
        URL.revokeObjectURL(url);
    }, 1500);
}

function isStandalone() {
    try {
        if (window.navigator.standalone) return true;
        return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    } catch (e) {
        return false;
    }
}

function showExportText(filename, json) {
    historyExportName = filename;
    historyExportText = json;
    historyConfirm = false;
    if (track !== 'history') track = 'history';
    render();
}

// Home-screen iOS has no tab UI. A blob download replaces the app with a
// page that cannot be closed, so that path is only used in a normal tab.
function fallbackExport(filename, json) {
    if (!isStandalone()) {
        try {
            anchorDownload(filename, json);
            return;
        } catch (e) { /* show the text instead */ }
    }
    showExportText(filename, json);
}

// Share sheet first (Save to Files on iPhone). Then a download link.
// Then the JSON itself, so it can be copied.
function exportScores() {
    var records = loadScores().slice().reverse();
    var json = JSON.stringify(records, null, 2);
    var filename = 'learning-terminal-scores-' + localDay(new Date()) + '.json';
    var types = ['application/json', 'text/plain'];
    for (var i = 0; i < types.length; i++) {
        try {
            var file = new File([json], filename, { type: types[i] });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file] }).catch(function (err) {
                    if (err && err.name === 'AbortError') return;
                    fallbackExport(filename, json);
                });
                return;
            }
        } catch (e) { /* this type cannot be shared */ }
    }
    fallbackExport(filename, json);
}

function clearScores() {
    try { localStorage.removeItem(SCORES_KEY); } catch (e) { /* ignore */ }
    historyConfirm = false;
    render();
}

// ——— Audio ———
let audioCtx = null;
let currentAudio = null;
const audioCache = new Map();
let preferredVoice = null;
let speechSeq = 0;
let speechTimers = [];

function unlockAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = audioCtx.createBuffer(1, 1, 22050);
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtx.destination);
        src.start(0);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function pickVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return preferredVoice;
    const prefer = [
        /google us english/i,
        /google uk english female/i,
        /microsoft (aria|jenny|sara)/i,
        /samantha/i,
        /karen/i,
        /moira/i,
        /female/i,
        /en-us/i,
        /en-gb/i
    ];
    for (var i = 0; i < prefer.length; i++) {
        var v = voices.find(function (x) {
            return prefer[i].test(x.name) || prefer[i].test(x.lang);
        });
        if (v) {
            preferredVoice = v;
            return v;
        }
    }
    preferredVoice = voices.find(function (v) {
        return v.lang && v.lang.toLowerCase().indexOf('en') === 0;
    }) || voices[0];
    return preferredVoice;
}

if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function () { pickVoice(); };
    pickVoice();
}

function stopSound() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    // Cancel any staged count-out-loud timers so they can't overlap
    speechSeq++;
    speechTimers.forEach(function (id) { clearTimeout(id); });
    speechTimers = [];
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// Bumped on every speak so a cancelled utterance cannot mark the new one finished.
var speechGen = 0;
var speakDone = true;

function speak(text, opts) {
    opts = opts || {};
    if (!window.speechSynthesis || !text) return;
    // Only cancel if this is a fresh "interrupt" speak (default true).
    // Cancelling and then speaking outside the original tap is dropped on iOS.
    if (opts.cancel !== false) {
        window.speechSynthesis.cancel();
    } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate != null ? opts.rate : 0.9;
    u.pitch = opts.pitch != null ? opts.pitch : 1.05;
    u.lang = 'en-US';
    const voice = pickVoice();
    if (voice) u.voice = voice;
    var gen = ++speechGen;
    speakDone = false;
    function finish() {
        if (gen === speechGen) speakDone = true;
    }
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
}

function scheduleSpeech(fn, delay) {
    const id = setTimeout(fn, delay);
    speechTimers.push(id);
    return id;
}

function getLetterAudio(entry) {
    const url = './sounds/' + entry.file + '.m4a';
    let a = audioCache.get(url);
    if (!a) {
        a = new Audio(url);
        a.preload = 'auto';
        a._letterUrl = url;
        audioCache.set(url, a);
    }
    return a;
}

function letterHeardTarget(audio) {
    var src = (audio && (audio._letterUrl || audio.currentSrc || audio.src)) || '';
    var file = src.split('/').pop().replace(/\.m4a.*$/, '');
    return LETTER_HEARD_AT[file] || 0;
}

function playLetter(entry) {
    stopSound();
    unlockAudio();
    const a = getLetterAudio(entry);
    // Ignore a muted unlock that is still resolving so it cannot pause this clip.
    a._primeToken = (a._primeToken || 0) + 1;
    a.muted = false;
    a.volume = 1;
    a._unlocked = true;
    a.pause();
    try { a.currentTime = 0; } catch (e) { /* not seekable yet */ }
    currentAudio = a;
    var pending = a.play();
    a._lastPlay = pending;
    if (pending && typeof pending.catch === 'function') pending.catch(function () {});
    return a;
}

// Call fn after this clip's phoneme has been heard. Does not pause the clip
// or cancel speech — the caller decides that once the sound has finished.
function whenLetterHeard(audio, fn) {
    if (!audio) { fn(); return; }
    var token = audio._primeToken;
    var gen = ++letterWaitGen;
    var finished = false;
    var started = Date.now();
    function cleanup() {
        clearInterval(poll);
        audio.removeEventListener('ended', tick);
        audio.removeEventListener('timeupdate', tick);
    }
    function finish() {
        if (finished || gen !== letterWaitGen) return;
        if (audio._primeToken !== token) return;
        finished = true;
        cleanup();
        letterWaitGen++;
        fn();
    }
    function tick() {
        if (finished) return;
        if (gen !== letterWaitGen || audio._primeToken !== token) {
            finished = true;
            cleanup();
            return;
        }
        var target = letterHeardTarget(audio);
        if (audio.ended || (target && audio.currentTime >= target)) {
            finish();
            return;
        }
        // Give up only if playback is stuck. A clip that is still advancing
        // keeps playing — this must not pause it early.
        if (Date.now() - started > 4000) {
            var dur = audio.duration;
            var stillPlaying = !audio.paused && !audio.ended &&
                !(isFinite(dur) && dur > 0 && audio.currentTime >= dur - 0.05);
            if (!stillPlaying || Date.now() - started > 8000) finish();
        }
    }
    var poll = setInterval(tick, 40);
    audio.addEventListener('ended', tick);
    audio.addEventListener('timeupdate', tick);
    if (audio._lastPlay && typeof audio._lastPlay.then === 'function') {
        audio._lastPlay.catch(function () { finish(); });
    }
}

// iOS Safari only allows a clip's first play() inside a tap. Call this from the
// answer tap so the next round can start its sound with no intro screen.
function primeLetter(entry) {
    if (!entry) return;
    const a = getLetterAudio(entry);
    if (a._unlocked) return;
    a._unlocked = true;
    a._primeToken = (a._primeToken || 0) + 1;
    var token = a._primeToken;
    // Stay silent. Unmuting here used to leak the next letter under the Yes card.
    a.muted = true;
    a.volume = 0;
    var finish = function () {
        if (a._primeToken !== token) return;
        try { a.pause(); } catch (e) {}
        try { a.currentTime = 0; } catch (e2) {}
    };
    var p = a.play();
    if (p && typeof p.then === 'function') {
        p.then(finish).catch(function () {
            if (a._primeToken === token) a._unlocked = false;
        });
    } else {
        finish();
    }
}

function tone(freq, when, dur, type, gain) {
    type = type || 'sine';
    gain = gain == null ? 0.1 : gain;
    const ctx = unlockAudio();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.start(when);
    osc.stop(when + dur);
}

function playYes() {
    const t = unlockAudio().currentTime;
    tone(523, t, 0.1);
    tone(659, t + 0.08, 0.12);
    tone(784, t + 0.16, 0.14);
}

function playNo() {
    const t = unlockAudio().currentTime;
    tone(280, t, 0.16, 'triangle', 0.07);
    tone(220, t + 0.1, 0.18, 'triangle', 0.06);
}

/** Speak the number word; soft count beeps after for counting practice */
function playNumberVoice(n, withBeeps) {
    stopSound();
    unlockAudio();
    const word = NUMBER_WORDS[n] || String(n);
    speak(word, { rate: 0.85, pitch: 1.08 });
    if (withBeeps) {
        // light beeps after the word so kids can count along
        const ctx = unlockAudio();
        const t0 = ctx.currentTime + 0.55;
        for (var i = 0; i < n; i++) {
            tone(500 + i * 15, t0 + i * 0.22, 0.12, 'sine', 0.07);
        }
    }
}

// ——— DOM ———
const app = document.getElementById('app-container');
const yesOverlay = document.getElementById('success-overlay');
const noOverlay = document.getElementById('wrong-overlay');
const noBar = document.getElementById('wrong-progress-bar');

function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
}

function shuffle(a) {
    const x = a.slice();
    for (var i = x.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = x[i];
        x[i] = x[j];
        x[j] = tmp;
    }
    return x;
}

function dotsHtml(n) {
    var html = '<span class="dots">';
    for (var i = 0; i < n; i++) html += '<span class="dot"></span>';
    html += '</span>';
    return html;
}

// 1 Easy, 2 Medium, 3 Harder. Stars stay in a font that actually draws them.
function levelHtml(n) {
    var names = { 1: 'Easy', 2: 'Medium', 3: 'Harder' };
    var on = '';
    var off = '';
    for (var i = 1; i <= 3; i++) {
        if (i <= n) on += '★';
        else off += '☆';
    }
    return '<span class="home-level"><span class="stars-on">' + on + '</span><span class="stars-off">' + off + '</span> ' + names[n] + '</span>';
}

function homeLink(label, onClick) {
    const b = el('button', 'home-link', label || 'Home');
    b.type = 'button';
    b.onclick = onClick || goHome;
    return b;
}

function goHome() {
    letterWaitGen++;
    wordLocked = false;
    stopSound();
    coolingDown = false;
    track = 'home';
    render();
}

function goLettersMenu() {
    letterWaitGen++;
    wordLocked = false;
    stopSound();
    coolingDown = false;
    track = 'letters-menu';
    render();
}

function goNumbersMenu() {
    stopSound();
    coolingDown = false;
    track = 'numbers-menu';
    render();
}

// ——— Render ———
function goHistory() {
    stopSound();
    coolingDown = false;
    historyConfirm = false;
    historyExportText = '';
    track = 'history';
    render();
}

function renderHistory() {
    const screen = el('div', 'simple-screen history-screen');

    if (historyExportText) {
        screen.appendChild(el('p', 'hint', 'Scores'));
        screen.appendChild(el('p', 'history-when', historyExportName));
        const box = el('textarea', 'score-json');
        box.readOnly = true;
        box.value = historyExportText;
        box.setAttribute('aria-label', 'Score JSON');
        screen.appendChild(box);
        const copy = el('button', 'big-btn primary history-btn', 'Copy');
        copy.type = 'button';
        copy.onclick = function () {
            var done = function () { copy.textContent = 'Copied'; };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(historyExportText).then(done).catch(function () {
                    box.focus();
                    box.select();
                });
                return;
            }
            box.focus();
            box.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
        };
        screen.appendChild(copy);
        screen.appendChild(homeLink('Back', function () {
            historyExportText = '';
            render();
        }));
        app.appendChild(screen);
        return;
    }

    screen.appendChild(el('p', 'hint', 'History'));
    const list = el('div', 'history-list');
    const records = loadScores().slice().reverse();
    if (!records.length) {
        list.appendChild(el('p', 'history-empty', 'No scores yet'));
    } else {
        records.forEach(function (rec) {
            const row = el('div', 'history-row');
            row.appendChild(el('p', 'history-when', rec.endedLocal || rec.endedAt));
            row.appendChild(el('p', 'history-game', rec.game));
            row.appendChild(el('p', 'history-score', rec.correct + ' correct · ' + rec.incorrect + ' incorrect'));
            var rounds = countOrZero(rec.total);
            row.appendChild(el('p', 'history-rounds', rounds + (rounds === 1 ? ' round' : ' rounds')));
            list.appendChild(row);
        });
    }
    screen.appendChild(list);

    const actions = el('div', 'history-actions');
    const exp = el('button', 'big-btn primary history-btn', 'Export');
    exp.type = 'button';
    exp.onclick = exportScores;
    actions.appendChild(exp);

    if (records.length && historyConfirm) {
        actions.appendChild(el('p', 'history-ask', 'Clear all scores?'));
        const keep = el('button', 'big-btn primary history-btn', 'Keep');
        keep.type = 'button';
        keep.onclick = function () {
            historyConfirm = false;
            render();
        };
        const wipe = el('button', 'home-link', 'Clear scores');
        wipe.type = 'button';
        wipe.onclick = clearScores;
        actions.appendChild(keep);
        actions.appendChild(wipe);
    } else if (records.length) {
        const clearBtn = el('button', 'home-link', 'Clear history');
        clearBtn.type = 'button';
        clearBtn.onclick = function () {
            historyConfirm = true;
            render();
        };
        actions.appendChild(clearBtn);
    }
    screen.appendChild(actions);
    screen.appendChild(homeLink('Back', goHome));
    app.appendChild(screen);
}

function render() {
    app.innerHTML = '';
    app.classList.toggle('showing-history', track === 'history');
    if (track === 'home') return renderHome();
    if (track === 'history') return renderHistory();
    if (track === 'letters-menu') return renderLettersMenu();
    if (track === 'letters') return renderLetters();
    if (track === 'sounds') return renderSounds();
    if (track === 'words') return renderWords();
    if (track === 'numbers-menu') return renderNumbersMenu();
    if (track === 'counting') return renderCounting();
    if (track === 'addition') return renderAddition();
    if (track === 'compare') return renderCompare();
}

function renderHome() {
    const screen = el('div', 'simple-screen');
    screen.appendChild(el('p', 'hint', 'Pick one'));

    const letters = el('button', 'big-btn home-letters home-choice');
    letters.type = 'button';
    letters.innerHTML = '<span class="home-icon">Aa</span><span>Letters</span><span class="home-level">Easy – Harder</span>';
    letters.onclick = function () {
        unlockAudio();
        goLettersMenu();
    };

    const numbers = el('button', 'big-btn home-numbers home-choice');
    numbers.type = 'button';
    numbers.innerHTML = '<span class="home-icon">123</span><span>Numbers</span><span class="home-level">Easy – Harder</span>';
    numbers.onclick = function () {
        unlockAudio();
        goNumbersMenu();
    };

    const col = el('div', 'big-actions');
    col.appendChild(letters);
    col.appendChild(numbers);
    screen.appendChild(col);
    const history = homeLink('History', goHistory);
    history.classList.add('history-link');
    screen.appendChild(history);
    app.appendChild(screen);
}

function renderLettersMenu() {
    const screen = el('div', 'simple-screen');
    screen.appendChild(el('p', 'hint', 'Letters'));

    const col = el('div', 'big-actions');

    const phonics = el('button', 'big-btn primary home-choice');
    phonics.type = 'button';
    phonics.innerHTML = '<span class="home-icon">🔊</span><span>Phonics</span>' + levelHtml(1);
    phonics.onclick = function () {
        unlockAudio();
        startSounds();
    };

    const match = el('button', 'big-btn home-letters home-choice');
    match.type = 'button';
    match.innerHTML = '<span class="home-icon">Aa</span><span>Letter Match</span>' + levelHtml(2);
    match.onclick = function () {
        unlockAudio();
        track = 'letters';
        startLetterQuiz();
    };

    const words = el('button', 'big-btn home-words home-choice');
    words.type = 'button';
    words.innerHTML = '<span class="home-icon">Abc</span><span>Words</span>' + levelHtml(3);
    words.onclick = function () {
        unlockAudio();
        startWords();
    };

    col.appendChild(phonics);
    col.appendChild(match);
    col.appendChild(words);
    screen.appendChild(col);
    screen.appendChild(homeLink('Back', goHome));
    app.appendChild(screen);
}

function renderNumbersMenu() {
    const screen = el('div', 'simple-screen');
    screen.appendChild(el('p', 'hint', 'Numbers'));

    const col = el('div', 'big-actions');

    const counting = el('button', 'big-btn primary home-choice');
    counting.type = 'button';
    counting.innerHTML = '<span class="home-icon">●●●</span><span>Counting</span>' + levelHtml(1);
    counting.onclick = function () {
        unlockAudio();
        startCounting();
    };

    const addition = el('button', 'big-btn secondary home-choice');
    addition.type = 'button';
    addition.innerHTML = '<span class="home-icon">+</span><span>Adding</span>' + levelHtml(3);
    addition.onclick = function () {
        unlockAudio();
        startAddition();
    };

    const compare = el('button', 'big-btn secondary home-choice');
    compare.type = 'button';
    compare.innerHTML = '<span class="home-icon">◇</span><span>Which more?</span>' + levelHtml(2);
    compare.onclick = function () {
        unlockAudio();
        startCompare();
    };

    col.appendChild(counting);
    col.appendChild(compare);
    col.appendChild(addition);
    screen.appendChild(col);
    screen.appendChild(homeLink('Back', goHome));
    app.appendChild(screen);
}

// ——— Letters ———
function renderLetters() {
    const screen = el('div', 'simple-screen');

    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'You finished!'));
        const again = el('button', 'big-btn primary', 'Again');
        again.type = 'button';
        again.onclick = function () {
            index = 0;
            letterCorrect = 0;
            letterIncorrect = 0;
            save();
            startLetterQuiz();
        };
        screen.appendChild(again);
        screen.appendChild(homeLink('Back', goLettersMenu));
        app.appendChild(screen);
        return;
    }

    const answer = LETTERS.find(function (L) { return L.letter === quizAnswer; });
    const prompt = el('button', 'letter-stage');
    prompt.type = 'button';
    if (quizKind === 'PIC') {
        prompt.innerHTML =
            '<span class="stage-emoji">' + answer.emoji + '</span>' +
            '<span class="hint">Which letter?</span>';
    } else {
        prompt.innerHTML =
            '<span class="stage-speaker">🔊</span>' +
            '<span class="hint">Which letter?</span>';
    }
    prompt.onclick = function () {
        if (!coolingDown) playLetter(answer);
    };
    screen.appendChild(prompt);
    const row = el('div', 'big-actions row');
    quizOptions.forEach(function (L) {
        const btn = el('button', 'big-btn letter-choice', L);
        btn.type = 'button';
        btn.onclick = function () { onLetterQuiz(L); };
        row.appendChild(btn);
    });
    screen.appendChild(row);
    screen.appendChild(homeLink('Back', goLettersMenu));
    app.appendChild(screen);
}

function advanceLetter(deferSound) {
    stopSound();
    if (index + 1 >= LETTERS.length) {
        finishSession('Letter Match', letterCorrect, letterIncorrect, letterCorrect);
        letterCorrect = 0;
        letterIncorrect = 0;
        save();
        mode = 'DONE';
        render();
        playYes();
        return;
    }
    index++;
    save();
    startLetterQuiz(deferSound);
}

function startLetterQuiz(deferSound) {
    const item = LETTERS[index];
    quizAnswer = item.letter;
    quizKind = Math.random() < 0.65 ? 'PIC' : 'SOUND';
    // First round is letter 0, so the pool still needs a second choice.
    var pool = Math.min(Math.max(index, 1) + 1, LETTERS.length);
    var wrong = item.letter;
    var guard = 0;
    while (
        (wrong === item.letter ||
            (item.letter === 'C' && wrong === 'K') ||
            (item.letter === 'K' && wrong === 'C')) &&
        guard < 40
    ) {
        wrong = LETTERS[Math.floor(Math.random() * pool)].letter;
        guard++;
    }
    quizOptions = shuffle([quizAnswer, wrong]);
    mode = 'QUIZ';
    markRoundStart();
    render();
    // No intro timer. A delayed play() sits outside the tap, which mobile
    // Safari blocks for the first clip. Later rounds were primed on the answer tap.
    // After a Yes card, wait until that card is painted away and this question
    // is on screen, then play. The first round still plays inside the tap.
    if (deferSound) {
        afterPaint(function () {
            if (track !== 'letters' || mode !== 'QUIZ') return;
            playLetter(item);
        });
    } else {
        playLetter(item);
    }
}

function onLetterQuiz(letter) {
    if (coolingDown) return;
    const answer = LETTERS.find(function (L) { return L.letter === quizAnswer; });
    if (letter === quizAnswer) {
        if (!roundScored) {
            roundScored = true;
            letterCorrect++;
            save();
        }
        stopSound();
        playYes();
        if (index + 1 < LETTERS.length) primeLetter(LETTERS[index + 1]);
        flashYes(function () {
            if (track !== 'letters') return;
            advanceLetter(true);
        });
    } else {
        letterIncorrect++;
        save();
        wrongCooldown(function () {
            if (track !== 'letters') return;
            playLetter(answer);
        });
    }
}

// ——— Sounds: hear the phonics sound, pick the letter ———
function sameSoundFile(a, b) {
    var ea = null;
    var eb = null;
    for (var i = 0; i < LETTERS.length; i++) {
        if (LETTERS[i].letter === a) ea = LETTERS[i];
        if (LETTERS[i].letter === b) eb = LETTERS[i];
    }
    return !!(ea && eb && ea.file === eb.file);
}

function startSounds() {
    track = 'sounds';
    coolingDown = false;
    beginSession();
    soundQueue = shuffle(LETTERS).slice(0, 8);
    soundPos = 0;
    nextSoundRound();
}

function nextSoundRound(deferSound) {
    stopSound();
    if (soundPos >= soundQueue.length) {
        finishSession('Phonics', roundCorrect, roundIncorrect, roundCorrect);
        mode = 'DONE';
        render();
        playYes();
        return;
    }
    markRoundStart();
    var item = soundQueue[soundPos];
    quizAnswer = item.letter;
    quizKind = 'SOUND';
    var wrong = item.letter;
    var guard = 0;
    while ((wrong === item.letter || sameSoundFile(item.letter, wrong)) && guard < 80) {
        wrong = LETTERS[Math.floor(Math.random() * LETTERS.length)].letter;
        guard++;
    }
    quizOptions = shuffle([quizAnswer, wrong]);
    mode = 'PLAY';
    render();
    // Inside the tap on the first round. Later rounds were primed on the answer tap.
    // After a Yes card, the new question is painted before this clip starts.
    if (deferSound) {
        afterPaint(function () {
            if (track !== 'sounds' || mode !== 'PLAY') return;
            playLetter(item);
        });
    } else {
        playLetter(item);
    }
}

function renderSounds() {
    const screen = el('div', 'simple-screen');

    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'Great job!'));
        const again = el('button', 'big-btn primary', 'Again');
        again.type = 'button';
        again.onclick = function () {
            unlockAudio();
            startSounds();
        };
        screen.appendChild(again);
        screen.appendChild(homeLink('Back', goLettersMenu));
        app.appendChild(screen);
        return;
    }

    const answer = soundQueue[soundPos];
    const prompt = el('button', 'letter-stage');
    prompt.type = 'button';
    prompt.innerHTML =
        '<span class="stage-speaker">🔊</span>' +
        '<span class="hint">Which letter?</span>';
    prompt.onclick = function () {
        if (!coolingDown) playLetter(answer);
    };
    screen.appendChild(prompt);

    const row = el('div', 'big-actions row');
    quizOptions.forEach(function (L) {
        const btn = el('button', 'big-btn letter-choice', L);
        btn.type = 'button';
        btn.onclick = function () { onSoundPick(L); };
        row.appendChild(btn);
    });
    screen.appendChild(row);
    screen.appendChild(homeLink('Back', goLettersMenu));
    app.appendChild(screen);
}

function onSoundPick(letter) {
    if (coolingDown) return;
    var answer = soundQueue[soundPos];
    if (letter === quizAnswer) {
        markCorrect();
        stopSound();
        playYes();
        if (soundPos + 1 < soundQueue.length) primeLetter(soundQueue[soundPos + 1]);
        flashYes(function () {
            if (track !== 'sounds') return;
            soundPos++;
            nextSoundRound(true);
        });
    } else {
        markIncorrect();
        wrongCooldown(function () {
            if (track !== 'sounds') return;
            playLetter(answer);
        });
    }
}

// ——— Counting practice ———
function startCounting() {
    track = 'counting';
    turnsTotal = 8;
    turnsLeft = 8;
    beginSession();
    nextCountingRound();
}

function nextCountingRound() {
    stopSound();
    // 1–8 dots — counting practice
    countItems = Math.floor(Math.random() * 8) + 1;
    const opts = new Set([countItems]);
    while (opts.size < 2) {
        opts.add(Math.floor(Math.random() * 8) + 1);
    }
    quizOptions = shuffle(Array.from(opts));
    quizAnswer = countItems;
    mode = 'PLAY';
    markRoundStart();
    render();
    // Held in speechTimers so an answer tap cancels it. Otherwise this
    // prompt speaks over the Yes / Try again card when the kid answers fast.
    scheduleSpeech(function () {
        if (track !== 'counting' || mode !== 'PLAY' || coolingDown) return;
        speak('how many?', { rate: 0.95 });
    }, 250);
}

function renderCounting() {
    const screen = el('div', 'simple-screen');

    if (mode === 'DONE') {
        return renderNumDone(screen, 'Counting', startCounting);
    }

    const stage = el('button', 'letter-stage');
    stage.type = 'button';
    stage.innerHTML =
        dotsHtml(countItems) +
        '<span class="hint">How many? Tap to count</span>';
    stage.onclick = function () {
        if (coolingDown) return;
        // Count out loud: "one… two… three…" then total
        countOutLoud(countItems);
    };
    screen.appendChild(stage);

    const row = el('div', 'big-actions row');
    quizOptions.forEach(function (opt) {
        const btn = el('button', 'big-btn letter-choice', String(opt));
        btn.type = 'button';
        btn.onclick = function () { onCountPick(opt); };
        row.appendChild(btn);
    });
    screen.appendChild(row);
    screen.appendChild(homeLink('Back', goNumbersMenu));
    app.appendChild(screen);
}

function countOutLoud(n) {
    // Bump sequence so any older chain dies
    stopSound();
    unlockAudio();
    const mySeq = speechSeq;
    var i = 1;

    function sayWord(word, done) {
        if (mySeq !== speechSeq) return;
        if (!window.speechSynthesis) {
            done();
            return;
        }
        const u = new SpeechSynthesisUtterance(word);
        u.rate = 0.88;
        u.pitch = 1.08;
        u.lang = 'en-US';
        const voice = pickVoice();
        if (voice) u.voice = voice;
        u.onend = function () {
            if (mySeq !== speechSeq) return;
            // small pause between numbers
            scheduleSpeech(done, 120);
        };
        u.onerror = function () {
            if (mySeq !== speechSeq) return;
            scheduleSpeech(done, 120);
        };
        window.speechSynthesis.speak(u);
    }

    function step() {
        if (mySeq !== speechSeq) return;
        if (i > n) {
            // Finish with the total once: "five"
            scheduleSpeech(function () {
                if (mySeq !== speechSeq) return;
                sayWord(NUMBER_WORDS[n] || String(n), function () {});
            }, 180);
            return;
        }
        sayWord(NUMBER_WORDS[i] || String(i), function () {
            i++;
            step();
        });
    }
    step();
}

/** After a wrong answer: clearly say the correct count once */
function sayCorrectCount(n) {
    stopSound();
    unlockAudio();
    const word = NUMBER_WORDS[n] || String(n);
    speak('there are ' + word, { rate: 0.88 });
}

function onCountPick(n) {
    if (coolingDown) return;
    if (n === quizAnswer) {
        markCorrect();
        stopSound();
        playYes();
        speak(NUMBER_WORDS[n] || String(n), { rate: 0.9 });
        flashYes(function () {
            turnsLeft--;
            if (turnsLeft <= 0) {
                finishSession('Counting', roundCorrect, roundIncorrect, roundCorrect);
                mode = 'DONE';
                render();
                playYes();
                return;
            }
            nextCountingRound();
        });
    } else {
        markIncorrect();
        // Don't re-run a full count-out (timers used to stack and sound random).
        // Say the correct total clearly, once.
        wrongCooldown(function () {
            sayCorrectCount(countItems);
        });
    }
}

// ——— Addition ———
function startAddition() {
    track = 'addition';
    turnsTotal = 8;
    turnsLeft = 8;
    beginSession();
    nextAdditionRound();
}

function nextAdditionRound() {
    // Small addends for age 4: 1–4 + 1–4, sum ≤ 8
    mathA = Math.floor(Math.random() * 4) + 1;
    mathB = Math.floor(Math.random() * 4) + 1;
    while (mathA + mathB > 8) {
        mathA = Math.floor(Math.random() * 4) + 1;
        mathB = Math.floor(Math.random() * 4) + 1;
    }
    quizAnswer = mathA + mathB;
    const opts = new Set([quizAnswer]);
    while (opts.size < 2) {
        var r = Math.floor(Math.random() * 8) + 1;
        opts.add(r);
    }
    quizOptions = shuffle(Array.from(opts));
    mode = 'PLAY';
    markRoundStart();
    render();
    // Held in speechTimers so an answer tap cancels it before feedback.
    scheduleSpeech(function () {
        if (track !== 'addition' || mode !== 'PLAY' || coolingDown) return;
        speak(NUMBER_WORDS[mathA] + ' plus ' + NUMBER_WORDS[mathB], { rate: 0.88 });
    }, 280);
}

function renderAddition() {
    const screen = el('div', 'simple-screen');
    if (mode === 'DONE') {
        return renderNumDone(screen, 'Adding', startAddition);
    }

    const stage = el('button', 'letter-stage');
    stage.type = 'button';
    stage.innerHTML =
        '<div class="math-row">' +
        '<div class="math-group">' + dotsHtml(mathA) + '<span class="math-num">' + mathA + '</span></div>' +
        '<span class="math-op">+</span>' +
        '<div class="math-group">' + dotsHtml(mathB) + '<span class="math-num">' + mathB + '</span></div>' +
        '</div>' +
        '<span class="hint">Tap to hear</span>';
    stage.onclick = function () {
        if (coolingDown) return;
        speak(NUMBER_WORDS[mathA] + ' plus ' + NUMBER_WORDS[mathB], { rate: 0.88 });
    };
    screen.appendChild(stage);

    const row = el('div', 'big-actions row');
    quizOptions.forEach(function (opt) {
        const btn = el('button', 'big-btn letter-choice', String(opt));
        btn.type = 'button';
        btn.onclick = function () { onAddPick(opt); };
        row.appendChild(btn);
    });
    screen.appendChild(row);
    screen.appendChild(homeLink('Back', goNumbersMenu));
    app.appendChild(screen);
}

function onAddPick(n) {
    if (coolingDown) return;
    if (n === quizAnswer) {
        markCorrect();
        stopSound();
        playYes();
        speak(NUMBER_WORDS[n] || String(n), { rate: 0.9 });
        flashYes(function () {
            turnsLeft--;
            if (turnsLeft <= 0) {
                finishSession('Adding', roundCorrect, roundIncorrect, roundCorrect);
                mode = 'DONE';
                render();
                playYes();
                return;
            }
            nextAdditionRound();
        });
    } else {
        markIncorrect();
        wrongCooldown(function () {
            speak(NUMBER_WORDS[mathA] + ' plus ' + NUMBER_WORDS[mathB], { rate: 0.88 });
        });
    }
}

// ——— Which has more? ———
function startCompare() {
    track = 'compare';
    turnsTotal = 8;
    turnsLeft = 8;
    beginSession();
    nextCompareRound();
}

function nextCompareRound() {
    do {
        compareLeft = Math.floor(Math.random() * 8) + 1;
        compareRight = Math.floor(Math.random() * 8) + 1;
    } while (compareLeft === compareRight);
    quizAnswer = compareLeft > compareRight ? 'LEFT' : 'RIGHT';
    mode = 'PLAY';
    markRoundStart();
    render();
    // Held in speechTimers so an answer tap cancels it before feedback.
    scheduleSpeech(function () {
        if (track !== 'compare' || mode !== 'PLAY' || coolingDown) return;
        speak('which has more?', { rate: 0.95 });
    }, 250);
}

function renderCompare() {
    const screen = el('div', 'simple-screen');
    if (mode === 'DONE') {
        return renderNumDone(screen, 'Which more?', startCompare);
    }

    const stage = el('div', 'letter-stage compare-stage');
    stage.innerHTML =
        '<div class="compare-row">' +
        '<div class="compare-side">' + dotsHtml(compareLeft) + '</div>' +
        '<div class="compare-vs">or</div>' +
        '<div class="compare-side">' + dotsHtml(compareRight) + '</div>' +
        '</div>' +
        '<span class="hint">Which has more?</span>';
    screen.appendChild(stage);

    const row = el('div', 'big-actions row');
    const left = el('button', 'big-btn letter-choice wide-label', 'Left');
    left.type = 'button';
    left.onclick = function () { onComparePick('LEFT'); };
    const right = el('button', 'big-btn letter-choice wide-label', 'Right');
    right.type = 'button';
    right.onclick = function () { onComparePick('RIGHT'); };
    row.appendChild(left);
    row.appendChild(right);
    screen.appendChild(row);
    screen.appendChild(homeLink('Back', goNumbersMenu));
    app.appendChild(screen);
}

function onComparePick(side) {
    if (coolingDown) return;
    if (side === quizAnswer) {
        markCorrect();
        stopSound();
        playYes();
        var n = side === 'LEFT' ? compareLeft : compareRight;
        speak(NUMBER_WORDS[n] || String(n), { rate: 0.9 });
        flashYes(function () {
            turnsLeft--;
            if (turnsLeft <= 0) {
                finishSession('Which more?', roundCorrect, roundIncorrect, roundCorrect);
                mode = 'DONE';
                render();
                playYes();
                return;
            }
            nextCompareRound();
        });
    } else {
        markIncorrect();
        wrongCooldown(function () {
            speak('which has more?', { rate: 0.95 });
        });
    }
}

// ——— Words (spell a 3-letter word) ———
function letterEntry(ch) {
    var up = String(ch).toUpperCase();
    for (var i = 0; i < LETTERS.length; i++) {
        if (LETTERS[i].letter === up) return LETTERS[i];
    }
    return { letter: up, file: up.toLowerCase() };
}

function tilesFor(word) {
    var need = word.toUpperCase().split('');
    var extras = shuffle(WORD_LETTERS.filter(function (L) {
        return need.indexOf(L) === -1;
    })).slice(0, 3);
    return shuffle(need.concat(extras));
}

function speakWord() {
    if (!wordTarget) return;
    stopSound();
    unlockAudio();
    speak(wordTarget.word, { rate: 0.82, pitch: 1.05 });
}

function startWords() {
    letterWaitGen++;
    wordLocked = false;
    track = 'words';
    coolingDown = false;
    beginSession();
    wordQueue = shuffle(WORDS).slice(0, 8);
    wordPos = 0;
    nextWordRound();
}

function nextWordRound(deferSound) {
    letterWaitGen++;
    wordLocked = false;
    stopSound();
    if (wordPos >= wordQueue.length) {
        finishSession('Words', roundCorrect, roundIncorrect, roundCorrect);
        mode = 'DONE';
        render();
        playYes();
        return;
    }
    markRoundStart();
    wordTarget = wordQueue[wordPos];
    wordSpelling = [];
    wordTiles = tilesFor(wordTarget.word);
    mode = 'PLAY';
    render();
    // In the tap that opened the round when it is a tap, so speech can start.
    // After a Yes card, the new word is on screen before it is spoken.
    if (deferSound) {
        afterPaint(function () {
            if (track !== 'words' || mode !== 'PLAY') return;
            speakWord();
        });
    } else {
        speakWord();
    }
}

function renderWords() {
    const screen = el('div', 'simple-screen word-screen');

    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'Great job!'));
        const again = el('button', 'big-btn primary', 'Again');
        again.type = 'button';
        again.onclick = function () {
            unlockAudio();
            startWords();
        };
        screen.appendChild(again);
        screen.appendChild(homeLink('Back', goLettersMenu));
        app.appendChild(screen);
        return;
    }

    const stage = el('div', 'letter-stage word-stage');
    const hear = el('button', 'word-hear');
    hear.type = 'button';
    hear.appendChild(el('span', 'stage-emoji', wordTarget.emoji));
    hear.appendChild(el('span', 'hint', 'Tap to hear'));
    hear.onclick = function () {
        if (coolingDown || wordLocked) return;
        speakWord();
    };
    stage.appendChild(hear);

    const slots = el('div', 'word-slots');
    for (var i = 0; i < 3; i++) {
        var filled = wordSpelling[i];
        var slot = el('button', 'word-slot' + (filled ? ' filled' : ' empty'), filled || '');
        slot.type = 'button';
        slot.setAttribute('aria-label', filled ? 'Remove ' + filled : 'Empty');
        (function (n) {
            slot.onclick = function () { onWordSlot(n); };
        })(i);
        slots.appendChild(slot);
    }
    stage.appendChild(slots);
    screen.appendChild(stage);

    const grid = el('div', 'word-tiles');
    wordTiles.forEach(function (letter) {
        const btn = el('button', 'big-btn word-tile', letter);
        btn.type = 'button';
        if (wordSpelling.indexOf(letter) !== -1) btn.disabled = true;
        btn.onclick = function () { onWordTile(letter); };
        grid.appendChild(btn);
    });
    screen.appendChild(grid);
    screen.appendChild(homeLink('Back', goLettersMenu));
    app.appendChild(screen);
}

function onWordTile(letter) {
    if (coolingDown || wordLocked) return;
    if (wordSpelling.length >= 3) return;
    if (wordSpelling.indexOf(letter) !== -1) return;
    wordSpelling.push(letter);
    render();
    var clip = playLetter(letterEntry(letter));
    if (wordSpelling.length < 3) return;
    // checkWord() used to run in this tap and stopSound() killed the clip
    // before it could be heard. Wait until the phoneme finishes, then judge.
    wordLocked = true;
    whenLetterHeard(clip, function () {
        wordLocked = false;
        if (track !== 'words' || mode !== 'PLAY') return;
        // Drop the silent tail so the feedback speech isn't ducked, without
        // cancelling the synthesizer (that would swallow the word on iOS).
        if (currentAudio === clip) {
            try { clip.pause(); } catch (e) {}
            currentAudio = null;
        }
        checkWord();
    });
}

function onWordSlot(i) {
    if (coolingDown || wordLocked) return;
    if (i >= wordSpelling.length) return;
    var letter = wordSpelling[i];
    wordSpelling.splice(i, 1);
    render();
    playLetter(letterEntry(letter));
}

function checkWord() {
    var spelled = wordSpelling.join('');
    var target = wordTarget.word.toUpperCase();
    if (spelled === target) {
        markCorrect();
        playYes();
        speak(wordTarget.word, { rate: 0.85, cancel: false });
        flashYes(function () {
            if (track !== 'words') return;
            wordPos++;
            nextWordRound(true);
        });
    } else {
        markIncorrect();
        wrongCooldown(function () {
            if (track !== 'words') return;
            wordSpelling = [];
            render();
            speakWord();
        });
    }
}

function renderNumDone(screen, title, againFn) {
    screen.appendChild(el('div', 'giant-emoji', '⭐'));
    screen.appendChild(el('p', 'hint', 'Great job!'));
    const again = el('button', 'big-btn primary', 'Again');
    again.type = 'button';
    again.onclick = againFn;
    screen.appendChild(again);
    const back = el('button', 'big-btn secondary', 'Numbers');
    back.type = 'button';
    back.onclick = goNumbersMenu;
    screen.appendChild(back);
    app.appendChild(screen);
}

// Run after the browser has painted the current DOM.
function afterPaint(fn) {
    requestAnimationFrame(function () {
        requestAnimationFrame(fn);
    });
}

// ——— Feedback ———
// Yes card stays up at least 700ms, and until its speech ends. Then the card
// is painted away, and only then does nextFn show the following question.
var YES_MS = 700;
var YES_CAP = 2200;

function flashYes(nextFn) {
    yesOverlay.classList.remove('hidden');
    var since = Date.now();
    var gen = speechGen;
    var waitSpeech = !speakDone;
    function tick() {
        var elapsed = Date.now() - since;
        var speaking = waitSpeech && gen === speechGen && !speakDone && elapsed < YES_CAP;
        if (elapsed >= YES_MS && !speaking) {
            yesOverlay.classList.add('hidden');
            afterPaint(function () {
                if (nextFn) nextFn();
            });
            return;
        }
        setTimeout(tick, 40);
    }
    setTimeout(tick, 40);
}

function wrongCooldown(after) {
    stopSound();
    playNo();
    coolingDown = true;
    app.querySelectorAll('.big-btn').forEach(function (b) {
        b.disabled = true;
        b.classList.add('cooldown');
    });
    noOverlay.classList.remove('hidden');
    noBar.style.transition = 'none';
    noBar.style.width = '0%';
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            noBar.style.transition = 'width ' + WRONG_MS + 'ms linear';
            noBar.style.width = '100%';
        });
    });
    setTimeout(function () {
        coolingDown = false;
        noOverlay.classList.add('hidden');
        app.querySelectorAll('.big-btn').forEach(function (b) {
            b.disabled = false;
            b.classList.remove('cooldown');
        });
        if (after) after();
    }, WRONG_MS);
}

// Double-tap and a slightly dragged tap can select a button's label (a text node
// or a span) and that gesture never becomes a press. Cancel it without touching
// real text fields, and without preventDefault on touchend (that would swallow the tap).
function isTextField(node) {
    var el = node && node.nodeType === 1 ? node : (node && node.parentElement);
    return !!(el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]'));
}

function blockTextGesture(e) {
    if (isTextField(e.target)) return;
    e.preventDefault();
}

(function () {
    var opts = { capture: true, passive: false };
    ['selectstart', 'dragstart', 'contextmenu', 'gesturestart', 'dblclick'].forEach(function (type) {
        document.addEventListener(type, blockTextGesture, opts);
    });
})();

function boot() {
    load();
    track = 'home';
    LETTERS.slice(0, 8).forEach(function (L) {
        const url = './sounds/' + L.file + '.m4a';
        if (!audioCache.has(url)) {
            const a = new Audio(url);
            a.preload = 'auto';
            audioCache.set(url, a);
        }
    });
    render();
}

boot();
