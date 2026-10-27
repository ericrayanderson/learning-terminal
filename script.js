/**
 * Learning Terminal. Letters (Phonics, Letter Match, Words) and Numbers practice.
 * Neon look, big simple choices.
 * Letter sounds: Buzzphonics (MIT)
 */

const STORAGE_KEY = 'lt-home-v2';
const WRONG_MS = 1600;
const LETTER_WRONG_MS = 800;
const STARTER = ['S', 'A', 'T', 'P', 'I', 'N'];
// Letters that look alike. Never offer both as choices in one question.
const CONFUSABLE_PAIRS = [
    ['B', 'D'], ['M', 'N'], ['P', 'B'], ['O', 'C'],
    ['C', 'G'], ['E', 'F'], ['I', 'L'], ['P', 'R']
];

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
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
    16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty'
};

// track: home | letters-menu | sounds | letters | words | numbers-menu | counting | addition | compare
// mode: PLAY | DONE | READY (start screen, not saved)
let track = 'home';
let mode = 'PLAY';
let quizAnswer = null;
let quizOptions = [];
let coolingDown = false;
let turnsLeft = 0;
let turnsTotal = 10;
// How many questions the next session plays. 5–25, remembered on the device.
let questionCount = 10;
// Biggest sum Adding will ask. 8 is the original 1-4 plus 1-4 cap.
let addMax = 8;
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
    { word: 'pin', emoji: '📌' },
    { word: 'sat', emoji: '🪑' },
    { word: 'tap', emoji: '🚰' },
    { word: 'tin', emoji: '🥫' },
    { word: 'nap', emoji: '😴' },
    { word: 'pat', emoji: '👏' },
    { word: 'pit', emoji: '🕳️' },
    { word: 'sip', emoji: '🧃' },
    { word: 'ant', emoji: '🐜' },
    { word: 'sit', emoji: '🧘' }
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
// Last menu to reopen after a reload. Never a mid-question screen.
let savedScreen = 'home';
// Letters answered correctly at least once. The practice set grows from SATPIN.
let mastered = {};
// Most recently practiced letters, newest first. Preferred as distractors.
let recent = [];
// Star level for each letter game. 1 Easy, 2 Medium, 3 Harder.
let levels = { sounds: 1, letters: 2, words: 3 };
// Missed letters to ask again soon, within this session only.
let bringBack = [];
let missedThis = {};
let roundIndex = 0;
let lastAsked = '';
let queuedLetter = '';

function clampQuestions(n) {
    var v = parseInt(n, 10);
    if (v >= 5 && v <= 25) return v;
    return 10;
}

function clampAddMax(n) {
    var v = parseInt(n, 10);
    if (v >= 5 && v <= 20) return v;
    return 8;
}

function clampLevel(n) {
    var v = parseInt(n, 10);
    if (v === 1 || v === 2 || v === 3) return v;
    return 0;
}

function defaultLevels() {
    return { sounds: 1, letters: 2, words: 3 };
}

function sanitizeLevels(raw) {
    var next = defaultLevels();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return next;
    ['sounds', 'letters', 'words'].forEach(function (key) {
        var v = clampLevel(raw[key]);
        if (v) next[key] = v;
    });
    return next;
}

function sanitizeLetterList(raw) {
    var known = {};
    LETTERS.forEach(function (L) { known[L.letter] = true; });
    var list = [];
    if (!Array.isArray(raw)) return list;
    raw.forEach(function (ch) {
        if (typeof ch !== 'string') return;
        var up = ch.toUpperCase();
        if (known[up] && list.indexOf(up) === -1) list.push(up);
    });
    return list;
}

function listToMap(list) {
    var map = {};
    list.forEach(function (letter) { map[letter] = true; });
    return map;
}

function readStore() {
    try {
        var p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
        return p;
    } catch (e) {
        return null;
    }
}

function isMenuScreen(s) {
    return s === 'home' || s === 'letters-menu' || s === 'numbers-menu';
}

// Letter Match used to save its place as letterIndex, or as a screen id.
// Those opens land on the Letters menu. letterIndex is not kept.
function isLetterMatchScreen(s) {
    return s === 'letters' || s === 'letter-match' || s === 'letterMatch';
}

// Type it and See it, type it are gone. An old screen id opens the Letters menu.
function isRemovedTypeScreen(s) {
    return s === 'see' || s === 'type' || s === 'see-it' || s === 'type-it' ||
        s === 'seeIt' || s === 'typeIt';
}

function menuFromSave(p) {
    if (!p || typeof p !== 'object') return 'home';
    if (isLetterMatchScreen(p.screen) || isRemovedTypeScreen(p.screen)) return 'letters-menu';
    if (isMenuScreen(p.screen)) return p.screen;
    if (typeof p.letterIndex === 'number') return 'letters-menu';
    return 'home';
}

function applyStore(p) {
    questionCount = clampQuestions(p && p.questionCount);
    addMax = clampAddMax(p && p.addMax);
    savedScreen = menuFromSave(p);
    var masteredList = sanitizeLetterList(p && p.phonicsMastered);
    if (!masteredList.length && p && typeof p.letterIndex === 'number' && isFinite(p.letterIndex)) {
        var n = Math.max(0, Math.min(LETTERS.length, Math.floor(p.letterIndex)));
        for (var i = 0; i < n; i++) masteredList.push(LETTERS[i].letter);
    }
    mastered = listToMap(masteredList);
    recent = sanitizeLetterList(p && p.phonicsRecent).slice(0, 8);
    levels = sanitizeLevels(p && p.levels);
}

function load() {
    var p = readStore();
    if (!p) return;
    applyStore(p);
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            questionCount: questionCount,
            addMax: addMax,
            screen: savedScreen,
            phonicsMastered: Object.keys(mastered),
            phonicsRecent: recent.slice(0, 8),
            levels: {
                sounds: levels.sounds,
                letters: levels.letters,
                words: levels.words
            }
        }));
    } catch (e) { /* ignore a full or blocked store */ }
}

// Scores lived in lt-scores-v1. Letter Match also stored letterIndex, and
// briefly letterCorrect / letterIncorrect. Drop those once.
function clearStaleScores() {
    try { localStorage.removeItem('lt-scores-v1'); } catch (e) { /* ignore */ }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (!p || typeof p !== 'object' || Array.isArray(p)) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }
        var stale = ('letterCorrect' in p) || ('letterIncorrect' in p) ||
            ('letterIndex' in p) || isLetterMatchScreen(p.screen) ||
            isRemovedTypeScreen(p.screen);
        if (!stale) return;
        applyStore(p);
        save();
    } catch (e) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e2) { /* ignore */ }
    }
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

function playSoftNo() {
    const t = unlockAudio().currentTime;
    tone(494, t, 0.1, 'sine', 0.035);
    tone(392, t + 0.09, 0.14, 'sine', 0.03);
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
    var i = 0;
    while (i < n) {
        html += '<span class="dot-row">';
        var end = Math.min(i + 5, n);
        while (i < end) {
            html += '<span class="dot"></span>';
            i++;
        }
        html += '</span>';
    }
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

// Enough rounds for a session. Past the end of a list, start another
// shuffle, and don't ask the same item twice in a row.
function takeRounds(list, n) {
    var out = [];
    var guard = 0;
    while (out.length < n && guard < 8) {
        var batch = shuffle(list);
        if (out.length && batch.length > 1 && batch[0] === out[out.length - 1]) {
            batch.push(batch.shift());
        }
        for (var i = 0; i < batch.length && out.length < n; i++) out.push(batch[i]);
        guard++;
    }
    return out;
}

function selectWrap(sel) {
    const wrap = el('div', 'select-wrap');
    wrap.appendChild(sel);
    wrap.appendChild(el('span', 'select-chevron'));
    return wrap;
}

function questionsControl() {
    const row = el('div', 'question-row');
    row.appendChild(el('span', 'question-label', 'Questions'));
    const sel = el('select', 'question-select');
    sel.setAttribute('aria-label', 'Questions');
    for (var n = 5; n <= 25; n++) {
        const opt = el('option', '', String(n));
        opt.value = String(n);
        sel.appendChild(opt);
    }
    sel.value = String(questionCount);
    sel.onchange = function () {
        questionCount = clampQuestions(sel.value);
        sel.value = String(questionCount);
        save();
    };
    row.appendChild(selectWrap(sel));
    return row;
}

function addMaxControl() {
    const row = el('div', 'question-row');
    row.appendChild(el('span', 'question-label', 'Adding up to'));
    const sel = el('select', 'question-select add-max-select');
    sel.setAttribute('aria-label', 'Adding up to');
    for (var n = 5; n <= 20; n++) {
        const opt = el('option', '', String(n));
        opt.value = String(n);
        sel.appendChild(opt);
    }
    sel.value = String(addMax);
    sel.onchange = function () {
        addMax = clampAddMax(sel.value);
        sel.value = String(addMax);
        save();
    };
    row.appendChild(selectWrap(sel));
    return row;
}

function levelControl(levelKey) {
    const row = el('div', 'question-row');
    row.appendChild(el('span', 'question-label', 'Level'));
    const sel = el('select', 'question-select level-select');
    sel.setAttribute('aria-label', 'Level');
    ['Easy', 'Medium', 'Harder'].forEach(function (name, i) {
        const opt = el('option', '', name);
        opt.value = String(i + 1);
        sel.appendChild(opt);
    });
    sel.value = String(levels[levelKey] || 1);
    sel.onchange = function () {
        var v = clampLevel(sel.value);
        if (!v) v = 1;
        levels[levelKey] = v;
        sel.value = String(v);
        save();
    };
    row.appendChild(selectWrap(sel));
    return row;
}

function settingsCard(withAddMax, levelKey) {
    const card = el('div', 'settings-card');
    card.appendChild(questionsControl());
    if (levelKey) card.appendChild(levelControl(levelKey));
    if (withAddMax) card.appendChild(addMaxControl());
    return card;
}

function goHome() {
    letterWaitGen++;
    wordLocked = false;
    stopSound();
    coolingDown = false;
    mode = 'PLAY';
    savedScreen = 'home';
    track = 'home';
    save();
    render();
}

function goLettersMenu() {
    letterWaitGen++;
    wordLocked = false;
    stopSound();
    coolingDown = false;
    mode = 'PLAY';
    savedScreen = 'letters-menu';
    track = 'letters-menu';
    save();
    render();
}

function goNumbersMenu() {
    stopSound();
    coolingDown = false;
    mode = 'PLAY';
    savedScreen = 'numbers-menu';
    track = 'numbers-menu';
    save();
    render();
}

// ——— Render ———
let startTitle = '';
let startBegin = null;
let startBack = null;
let startWithAdd = false;
let startLevelKey = '';

function showGameStart(trackId, title, begin, back, withAddMax, levelKey) {
    track = trackId;
    mode = 'READY';
    startTitle = title;
    startBegin = begin;
    startBack = back;
    startWithAdd = !!withAddMax;
    startLevelKey = levelKey || '';
    stopSound();
    coolingDown = false;
    render();
}

function renderGameStart() {
    const screen = el('div', 'simple-screen menu-screen');
    screen.appendChild(el('p', 'hint', startTitle));
    screen.appendChild(settingsCard(startWithAdd, startLevelKey));
    const start = el('button', 'big-btn primary', 'Start');
    start.type = 'button';
    start.onclick = function () {
        unlockAudio();
        startBegin();
    };
    screen.appendChild(start);
    screen.appendChild(homeLink('Back', startBack));
    app.appendChild(screen);
}

function render() {
    app.innerHTML = '';
    if (mode === 'READY' && (track === 'sounds' || track === 'letters' || track === 'words' || track === 'counting' || track === 'addition' || track === 'compare')) {
        return renderGameStart();
    }
    if (track === 'home') return renderHome();
    if (track === 'letters-menu') return renderLettersMenu();
    if (track === 'sounds' || track === 'letters') return renderLetterPractice();
    if (track === 'words') return renderWords();
    if (track === 'numbers-menu') return renderNumbersMenu();
    if (track === 'counting') return renderCounting();
    if (track === 'addition') return renderAddition();
    if (track === 'compare') return renderCompare();
}

function renderHome() {
    const screen = el('div', 'simple-screen home-screen');
    const intro = el('div', 'site-intro wide-only');
    intro.appendChild(el('h1', 'site-title', 'Letter and number games'));
    intro.appendChild(el('p', 'site-sub', 'For little kids'));
    screen.appendChild(intro);
    screen.appendChild(el('p', 'hint', 'Pick one'));

    const letters = el('button', 'big-btn home-letters home-choice');
    letters.type = 'button';
    letters.innerHTML = '<span class="home-icon case-keep">Aa</span><span>Letters</span><span class="home-level">3 games</span>';
    letters.onclick = function () {
        unlockAudio();
        goLettersMenu();
    };

    const numbers = el('button', 'big-btn home-numbers home-choice');
    numbers.type = 'button';
    numbers.innerHTML = '<span class="home-icon">123</span><span>Numbers</span><span class="home-level">3 games</span>';
    numbers.onclick = function () {
        unlockAudio();
        goNumbersMenu();
    };

    const col = el('div', 'big-actions');
    col.appendChild(letters);
    col.appendChild(numbers);
    screen.appendChild(col);
    const credit = el('a', 'credit-link wide-only', 'Made by Eric');
    credit.href = 'https://ericrayanderson.com';
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
    screen.appendChild(credit);
    app.appendChild(screen);
}

function renderLettersMenu() {
    const screen = el('div', 'simple-screen menu-screen');
    screen.appendChild(el('p', 'hint', 'Letters'));

    const col = el('div', 'big-actions');

    const phonics = el('button', 'big-btn primary home-choice');
    phonics.type = 'button';
    phonics.innerHTML = '<span class="home-icon">🔊</span><span>Phonics</span>' + levelHtml(levels.sounds);
    phonics.onclick = function () {
        showGameStart('sounds', 'Phonics', startSounds, goLettersMenu, false, 'sounds');
    };

    const match = el('button', 'big-btn home-letters home-choice');
    match.type = 'button';
    match.innerHTML = '<span class="home-icon case-keep">Aa</span><span>Letter Match</span>' + levelHtml(levels.letters);
    match.onclick = function () {
        showGameStart('letters', 'Letter Match', startMatch, goLettersMenu, false, 'letters');
    };

    const words = el('button', 'big-btn home-words home-choice');
    words.type = 'button';
    words.innerHTML = '<span class="home-icon">Abc</span><span>Words</span>' + levelHtml(levels.words);
    words.onclick = function () {
        showGameStart('words', 'Words', startWords, goLettersMenu, false, 'words');
    };

    col.appendChild(phonics);
    col.appendChild(match);
    col.appendChild(words);
    screen.appendChild(col);
    screen.appendChild(homeLink('Back', goHome));
    app.appendChild(screen);
}

function renderNumbersMenu() {
    const screen = el('div', 'simple-screen menu-screen');
    screen.appendChild(el('p', 'hint', 'Numbers'));

    const col = el('div', 'big-actions');

    const counting = el('button', 'big-btn primary home-choice');
    counting.type = 'button';
    counting.innerHTML = '<span class="home-icon">●●●</span><span>Counting</span>' + levelHtml(1);
    counting.onclick = function () {
        showGameStart('counting', 'Counting', startCounting, goNumbersMenu, false);
    };

    const addition = el('button', 'big-btn secondary home-choice');
    addition.type = 'button';
    addition.innerHTML = '<span class="home-icon">+</span><span>Adding</span>' + levelHtml(3);
    addition.onclick = function () {
        showGameStart('addition', 'Adding', startAddition, goNumbersMenu, true);
    };

    const compare = el('button', 'big-btn secondary home-choice');
    compare.type = 'button';
    compare.innerHTML = '<span class="home-icon">◇</span><span>Which bigger?</span>' + levelHtml(2);
    compare.onclick = function () {
        showGameStart('compare', 'Which bigger?', startCompare, goNumbersMenu, false);
    };

    col.appendChild(counting);
    col.appendChild(compare);
    col.appendChild(addition);
    screen.appendChild(col);
    screen.appendChild(homeLink('Back', goHome));
    app.appendChild(screen);
}

// ——— Phonics and Letter Match: pick the letter ———
function sameSoundFile(a, b) {
    var ea = null;
    var eb = null;
    for (var i = 0; i < LETTERS.length; i++) {
        if (LETTERS[i].letter === a) ea = LETTERS[i];
        if (LETTERS[i].letter === b) eb = LETTERS[i];
    }
    return !!(ea && eb && ea.file === eb.file);
}

function isConfusable(a, b) {
    for (var i = 0; i < CONFUSABLE_PAIRS.length; i++) {
        var pair = CONFUSABLE_PAIRS[i];
        if ((pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)) return true;
    }
    return false;
}

function letterOrder() {
    return LETTERS.map(function (L) { return L.letter; });
}

function choiceCount(level) {
    if (level >= 3) return 4;
    if (level === 2) return 3;
    return 2;
}

// SATPIN first. Two new letters join only after every current one has been correct.
function growingSet(known) {
    var order = letterOrder();
    var avail = STARTER.slice();
    var i = STARTER.length;
    while (i < order.length) {
        var ready = true;
        for (var k = 0; k < avail.length; k++) {
            if (!known[avail[k]]) { ready = false; break; }
        }
        if (!ready) break;
        avail.push(order[i]);
        if (i + 1 < order.length) avail.push(order[i + 1]);
        i += 2;
    }
    return avail;
}

function poolFor(level, known) {
    var growing = growingSet(known);
    if (level >= 3) return letterOrder();
    if (level === 2) {
        var order = letterOrder();
        var set = growing.slice();
        var goal = Math.max(growing.length + 4, 10);
        for (var i = 0; i < order.length && set.length < goal; i++) {
            if (set.indexOf(order[i]) === -1) set.push(order[i]);
        }
        return set;
    }
    return growing;
}

function levelKeyFor(which) {
    if (which === 'letters') return 'letters';
    if (which === 'words') return 'words';
    return 'sounds';
}

function currentLevel() {
    return levels[levelKeyFor(track)] || 1;
}

function pickPracticeLetter(pool) {
    var i;
    for (i = 0; i < bringBack.length; i++) {
        if (bringBack[i].wait > 0) bringBack[i].wait -= 1;
    }
    for (i = 0; i < bringBack.length; i++) {
        var item = bringBack[i];
        if (pool.indexOf(item.letter) === -1) {
            bringBack.splice(i, 1);
            i--;
            continue;
        }
        if (item.wait <= 0 && item.letter !== lastAsked) {
            bringBack.splice(i, 1);
            return item.letter;
        }
    }
    var fresh = pool.filter(function (letter) { return !mastered[letter] && letter !== lastAsked; });
    var rest = pool.filter(function (letter) { return letter !== lastAsked; });
    var bag = fresh.length ? fresh : (rest.length ? rest : pool);
    return bag[Math.floor(Math.random() * bag.length)];
}

function pickDistractors(answer, pool, count, recentList) {
    var chosen = [];
    function ok(letter) {
        if (!letter || letter === answer || chosen.indexOf(letter) !== -1) return false;
        if (sameSoundFile(answer, letter)) return false;
        if (isConfusable(answer, letter)) return false;
        for (var i = 0; i < chosen.length; i++) {
            if (isConfusable(chosen[i], letter) || sameSoundFile(chosen[i], letter)) return false;
        }
        return true;
    }
    function take(list) {
        for (var i = 0; i < list.length && chosen.length < count; i++) {
            if (ok(list[i])) chosen.push(list[i]);
        }
    }
    var preferred = [];
    recentList.forEach(function (letter) {
        if (pool.indexOf(letter) !== -1 && preferred.indexOf(letter) === -1) preferred.push(letter);
    });
    take(preferred);
    take(shuffle(pool.filter(function (letter) { return preferred.indexOf(letter) === -1; })));
    take(shuffle(letterOrder()));
    return chosen;
}

function choiceRow(letters, onPick) {
    var row = el('div', 'big-actions' + (letters.length > 2 ? ' choices' : ' row'));
    letters.forEach(function (letter) {
        var btn = el('button', 'big-btn letter-choice', letter);
        btn.type = 'button';
        btn.onclick = function () { onPick(letter, btn); };
        row.appendChild(btn);
    });
    return row;
}

function fadeWrong(button, after) {
    stopSound();
    playSoftNo();
    coolingDown = true;
    if (button) button.classList.add('choice-fade');
    setTimeout(function () {
        coolingDown = false;
        if (button && button.classList) button.classList.remove('choice-fade');
        if (after) after();
    }, LETTER_WRONG_MS);
}

function showTie(entry, nextFn) {
    coolingDown = true;
    var stage = app.querySelector('.letter-stage');
    if (stage) {
        stage.classList.remove('pulse');
        stage.onclick = null;
        stage.innerHTML =
            '<span class="stage-emoji">' + entry.emoji + '</span>' +
            '<span class="tie-letter">' + entry.letter + '</span>' +
            '<span class="tie-word">' + entry.word + '</span>';
    }
    var choices = app.querySelector('.big-actions');
    if (choices) choices.classList.add('hidden');
    playYes();
    playLetter(entry);
    setTimeout(function () {
        coolingDown = false;
        if (nextFn) nextFn();
    }, 1200);
}

function startLetterPractice(which) {
    track = which;
    coolingDown = false;
    roundIndex = 0;
    bringBack = [];
    missedThis = {};
    lastAsked = '';
    queuedLetter = '';
    nextLetterRound(false);
}

function startSounds() {
    startLetterPractice('sounds');
}

function startMatch() {
    startLetterPractice('letters');
}

function nextLetterRound(deferSound) {
    stopSound();
    if (roundIndex >= questionCount) {
        mode = 'DONE';
        render();
        playYes();
        return;
    }
    var letter = queuedLetter;
    queuedLetter = '';
    if (!letter) letter = pickPracticeLetter(poolFor(currentLevel(), mastered));
    lastAsked = letter;
    beginLetterQuestion(letter, deferSound);
}

function beginLetterQuestion(letter, deferSound) {
    var entry = letterEntry(letter);
    quizAnswer = letter;
    var wrongs = pickDistractors(letter, poolFor(currentLevel(), mastered), choiceCount(currentLevel()) - 1, recent);
    quizOptions = shuffle([letter].concat(wrongs));
    mode = 'PLAY';
    render();
    if (track !== 'sounds') return;
    if (deferSound) {
        afterPaint(function () {
            if (track !== 'sounds' || mode !== 'PLAY' || quizAnswer !== letter) return;
            playLetter(entry);
        });
    } else {
        playLetter(entry);
    }
}

function renderLetterPractice() {
    const screen = el('div', 'simple-screen' + (mode === 'DONE' ? '' : ' play-screen'));
    var again = track === 'letters' ? startMatch : startSounds;
    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'Great job!'));
        screen.appendChild(settingsCard(false, levelKeyFor(track)));
        const againBtn = el('button', 'big-btn primary', 'Again');
        againBtn.type = 'button';
        againBtn.onclick = function () {
            unlockAudio();
            again();
        };
        screen.appendChild(againBtn);
        screen.appendChild(homeLink('Back', goLettersMenu));
        app.appendChild(screen);
        return;
    }

    var entry = letterEntry(quizAnswer);
    var prompt = el('button', 'letter-stage' + (track === 'sounds' ? ' pulse' : ''));
    prompt.type = 'button';
    if (track === 'letters') {
        prompt.innerHTML =
            '<span class="stage-emoji">' + entry.emoji + '</span>' +
            '<span class="hint">Which letter?</span>';
    } else {
        prompt.innerHTML =
            '<span class="stage-speaker">🔊</span>' +
            '<span class="hint tap-hear">Tap to hear</span>' +
            '<span class="hint">Which letter?</span>';
    }
    prompt.onclick = function () {
        if (!coolingDown) playLetter(entry);
    };
    screen.appendChild(prompt);
    screen.appendChild(choiceRow(quizOptions, onLetterPick));
    screen.appendChild(homeLink('Back', goLettersMenu));
    app.appendChild(screen);
}

function onLetterPick(letter, btn) {
    if (coolingDown || mode !== 'PLAY') return;
    if (track !== 'sounds' && track !== 'letters') return;
    var entry = letterEntry(quizAnswer);
    if (letter === quizAnswer) {
        var wasMiss = !!missedThis[letter];
        delete missedThis[letter];
        mastered[letter] = true;
        recent = [letter].concat(recent.filter(function (item) { return item !== letter; })).slice(0, 8);
        save();
        if (wasMiss) {
            var listed = false;
            for (var i = 0; i < bringBack.length; i++) {
                if (bringBack[i].letter === letter) listed = true;
            }
            if (!listed) bringBack.push({ letter: letter, wait: 2 });
        }
        var upcoming = '';
        if (roundIndex + 1 < questionCount) {
            upcoming = pickPracticeLetter(poolFor(currentLevel(), mastered));
            if (track === 'sounds') primeLetter(letterEntry(upcoming));
        }
        queuedLetter = upcoming;
        showTie(entry, function () {
            if (track !== 'sounds' && track !== 'letters') return;
            roundIndex++;
            nextLetterRound(true);
        });
    } else {
        missedThis[quizAnswer] = true;
        fadeWrong(btn, function () {
            if ((track !== 'sounds' && track !== 'letters') || mode !== 'PLAY') return;
            playLetter(entry);
        });
    }
}

// ——— Counting practice ———
function startCounting() {
    track = 'counting';
    turnsTotal = questionCount;
    turnsLeft = questionCount;
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
    render();
    // Held in speechTimers so an answer tap cancels it. Otherwise this
    // prompt speaks over the Yes / Try again card when the kid answers fast.
    scheduleSpeech(function () {
        if (track !== 'counting' || mode !== 'PLAY' || coolingDown) return;
        speak('how many?', { rate: 0.95 });
    }, 250);
}

function renderCounting() {
    const screen = el('div', 'simple-screen' + (mode === 'DONE' ? '' : ' play-screen'));

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
        const btn = el('button', 'big-btn letter-choice numeral', String(opt));
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
        stopSound();
        playYes();
        speak(NUMBER_WORDS[n] || String(n), { rate: 0.9 });
        flashYes(function () {
            turnsLeft--;
            if (turnsLeft <= 0) {
                mode = 'DONE';
                render();
                playYes();
                return;
            }
            nextCountingRound();
        });
    } else {
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
    turnsTotal = questionCount;
    turnsLeft = questionCount;
    nextAdditionRound();
}

function pickAddends(maxSum) {
    // The original game rolls two numbers from 1 to 4. Their sum is at most 8.
    if (maxSum === 8) {
        return [
            Math.floor(Math.random() * 4) + 1,
            Math.floor(Math.random() * 4) + 1
        ];
    }
    var sum = Math.floor(Math.random() * (maxSum - 1)) + 2;
    var a = Math.floor(Math.random() * (sum - 1)) + 1;
    return [a, sum - a];
}

function nextAdditionRound() {
    var pair = pickAddends(addMax);
    mathA = pair[0];
    mathB = pair[1];
    quizAnswer = mathA + mathB;
    const opts = new Set([quizAnswer]);
    while (opts.size < 2) {
        opts.add(Math.floor(Math.random() * addMax) + 1);
    }
    quizOptions = shuffle(Array.from(opts));
    mode = 'PLAY';
    render();
    // Held in speechTimers so an answer tap cancels it before feedback.
    scheduleSpeech(function () {
        if (track !== 'addition' || mode !== 'PLAY' || coolingDown) return;
        speak(NUMBER_WORDS[mathA] + ' plus ' + NUMBER_WORDS[mathB], { rate: 0.88 });
    }, 280);
}

function renderAddition() {
    const screen = el('div', 'simple-screen' + (mode === 'DONE' ? '' : ' play-screen'));
    if (mode === 'DONE') {
        return renderNumDone(screen, 'Adding', startAddition);
    }

    const stage = el('button', 'letter-stage');
    stage.type = 'button';
    stage.innerHTML =
        '<div class="math-row">' +
        '<div class="math-group">' + dotsHtml(mathA) + '<span class="math-num numeral">' + mathA + '</span></div>' +
        '<span class="math-op">+</span>' +
        '<div class="math-group">' + dotsHtml(mathB) + '<span class="math-num numeral">' + mathB + '</span></div>' +
        '</div>' +
        '<span class="hint">Tap to hear</span>';
    stage.onclick = function () {
        if (coolingDown) return;
        speak(NUMBER_WORDS[mathA] + ' plus ' + NUMBER_WORDS[mathB], { rate: 0.88 });
    };
    screen.appendChild(stage);

    const row = el('div', 'big-actions row');
    quizOptions.forEach(function (opt) {
        const btn = el('button', 'big-btn letter-choice numeral', String(opt));
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
        stopSound();
        playYes();
        speak(NUMBER_WORDS[n] || String(n), { rate: 0.9 });
        flashYes(function () {
            turnsLeft--;
            if (turnsLeft <= 0) {
                mode = 'DONE';
                render();
                playYes();
                return;
            }
            nextAdditionRound();
        });
    } else {
        wrongCooldown(function () {
            speak(NUMBER_WORDS[mathA] + ' plus ' + NUMBER_WORDS[mathB], { rate: 0.88 });
        });
    }
}

// ——— Which is bigger? ———
function startCompare() {
    track = 'compare';
    turnsTotal = questionCount;
    turnsLeft = questionCount;
    nextCompareRound();
}

function nextCompareRound() {
    do {
        compareLeft = Math.floor(Math.random() * 8) + 1;
        compareRight = Math.floor(Math.random() * 8) + 1;
    } while (compareLeft === compareRight);
    quizAnswer = compareLeft > compareRight ? 'LEFT' : 'RIGHT';
    mode = 'PLAY';
    render();
    // Held in speechTimers so an answer tap cancels it before feedback.
    scheduleSpeech(function () {
        if (track !== 'compare' || mode !== 'PLAY' || coolingDown) return;
        speak('which is bigger?', { rate: 0.95 });
    }, 250);
}

function renderCompare() {
    const screen = el('div', 'simple-screen' + (mode === 'DONE' ? '' : ' play-screen'));
    if (mode === 'DONE') {
        return renderNumDone(screen, 'Which bigger?', startCompare);
    }

    const stage = el('div', 'letter-stage compare-stage');
    stage.innerHTML =
        '<div class="compare-row">' +
        '<div class="compare-side">' + dotsHtml(compareLeft) + '</div>' +
        '<div class="compare-vs">or</div>' +
        '<div class="compare-side">' + dotsHtml(compareRight) + '</div>' +
        '</div>' +
        '<span class="hint">Which is bigger?</span>';
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
        stopSound();
        playYes();
        var n = side === 'LEFT' ? compareLeft : compareRight;
        speak(NUMBER_WORDS[n] || String(n), { rate: 0.9 });
        flashYes(function () {
            turnsLeft--;
            if (turnsLeft <= 0) {
                mode = 'DONE';
                render();
                playYes();
                return;
            }
            nextCompareRound();
        });
    } else {
        wrongCooldown(function () {
            speak('which is bigger?', { rate: 0.95 });
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

function wordsForLevel(level) {
    var pool = poolFor(level, mastered);
    var list = WORDS.filter(function (item) {
        if (level >= 3) return true;
        var chars = item.word.toUpperCase().split('');
        for (var i = 0; i < chars.length; i++) {
            if (pool.indexOf(chars[i]) === -1) return false;
        }
        return true;
    });
    if (list.length >= 4) return list;
    return WORDS.filter(function (item) {
        var chars = item.word.toUpperCase().split('');
        for (var i = 0; i < chars.length; i++) {
            if (STARTER.indexOf(chars[i]) === -1) return false;
        }
        return true;
    });
}

function tilesFor(word, level) {
    var need = word.toUpperCase().split('');
    var extraN = level >= 2 ? 3 : 1;
    function allowed(letter, relaxLook) {
        if (need.indexOf(letter) !== -1) return false;
        for (var i = 0; i < need.length; i++) {
            if (sameSoundFile(need[i], letter)) return false;
            if (!relaxLook && isConfusable(need[i], letter)) return false;
        }
        return true;
    }
    var source = level >= 3 ? WORD_LETTERS : poolFor(level, mastered);
    var extras = shuffle(source.filter(function (letter) { return allowed(letter, false); })).slice(0, extraN);
    if (extras.length < extraN) {
        var more = shuffle(WORD_LETTERS.filter(function (letter) {
            return allowed(letter, true) && extras.indexOf(letter) === -1;
        }));
        while (extras.length < extraN && more.length) extras.push(more.pop());
    }
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
    wordQueue = takeRounds(wordsForLevel(levels.words), questionCount);
    wordPos = 0;
    nextWordRound();
}

function nextWordRound(deferSound) {
    letterWaitGen++;
    wordLocked = false;
    stopSound();
    if (wordPos >= wordQueue.length) {
        mode = 'DONE';
        render();
        playYes();
        return;
    }
    wordTarget = wordQueue[wordPos];
    wordSpelling = [];
    wordTiles = tilesFor(wordTarget.word, levels.words);
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
    const screen = el('div', 'simple-screen word-screen' + (mode === 'DONE' ? '' : ' play-screen'));

    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'Great job!'));
        screen.appendChild(settingsCard(false, 'words'));
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
        playYes();
        speak(wordTarget.word, { rate: 0.85, cancel: false });
        coolingDown = true;
        setTimeout(function () {
            coolingDown = false;
            if (track !== 'words') return;
            wordPos++;
            nextWordRound(true);
        }, 1100);
        return;
    }
    stopSound();
    playSoftNo();
    coolingDown = true;
    var letters = target.split('');
    app.querySelectorAll('.word-slot').forEach(function (slot, i) {
        if (wordSpelling[i] && wordSpelling[i] !== letters[i]) slot.classList.add('choice-fade');
    });
    app.querySelectorAll('.word-tile').forEach(function (btn) {
        if (btn.disabled) btn.classList.add('choice-fade');
    });
    setTimeout(function () {
        coolingDown = false;
        wordLocked = false;
        if (track !== 'words' || mode !== 'PLAY') return;
        wordSpelling = [];
        render();
        speakWord();
    }, LETTER_WRONG_MS);
}

function renderNumDone(screen, title, againFn) {
    screen.appendChild(el('div', 'giant-emoji', '⭐'));
    screen.appendChild(el('p', 'hint', 'Great job!'));
    screen.appendChild(settingsCard(title === 'Adding'));
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
    clearStaleScores();
    load();
    track = savedScreen;
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
