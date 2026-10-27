/**
 * Learning Terminal. Letters (Phonics) and Numbers practice.
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

const NUMBER_WORDS = {
    1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
    16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty'
};

const LETTERS = [
    { letter: 'S', file: 's' },
    { letter: 'A', file: 'a' },
    { letter: 'T', file: 't' },
    { letter: 'P', file: 'p' },
    { letter: 'I', file: 'i' },
    { letter: 'N', file: 'n' },
    { letter: 'M', file: 'm' },
    { letter: 'D', file: 'd' },
    { letter: 'G', file: 'g' },
    { letter: 'O', file: 'o' },
    { letter: 'C', file: 'c' },
    { letter: 'K', file: 'c' },
    { letter: 'E', file: 'e' },
    { letter: 'U', file: 'u' },
    { letter: 'R', file: 'r' },
    { letter: 'H', file: 'h' },
    { letter: 'B', file: 'b' },
    { letter: 'F', file: 'f' },
    { letter: 'L', file: 'l' }
];

// track: home | letters-menu | sounds | numbers-menu | counting | addition | compare
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
// Phonics star level. 1 Easy, 2 Medium, 3 Harder.
let levels = { sounds: 1 };
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
    return { sounds: 1 };
}

function sanitizeLevels(raw) {
    var next = defaultLevels();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return next;
    var v = clampLevel(raw.sounds);
    if (v) next.sounds = v;
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

// Letter Match and Words are gone. An old screen id opens the Letters menu.
function isRemovedLetterScreen(s) {
    return s === 'letters' || s === 'letter-match' || s === 'letterMatch' ||
        s === 'words' || s === 'word' || s === 'spelling';
}

// Type it and See it, type it are gone. An old screen id opens the Letters menu.
function isRemovedTypeScreen(s) {
    return s === 'see' || s === 'type' || s === 'see-it' || s === 'type-it' ||
        s === 'seeIt' || s === 'typeIt';
}

function menuFromSave(p) {
    if (!p || typeof p !== 'object') return 'home';
    if (isRemovedLetterScreen(p.screen) || isRemovedTypeScreen(p.screen)) return 'letters-menu';
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
            levels: { sounds: levels.sounds }
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
        var levelBag = p.levels && typeof p.levels === 'object' && !Array.isArray(p.levels);
        var stale = ('letterCorrect' in p) || ('letterIncorrect' in p) ||
            ('letterIndex' in p) || isRemovedLetterScreen(p.screen) ||
            isRemovedTypeScreen(p.screen) ||
            (levelBag && ('letters' in p.levels || 'words' in p.levels));
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
let speechUnlocked = false;
// Bumped on every speak so a cancelled utterance cannot mark the new one finished.
var speechGen = 0;
var speakDone = true;

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
    // A tap that unlocks sound also unlocks speech, so a later prompt can play on iOS.
    primeSpeech();
    return audioCtx;
}

function voiceScore(v) {
    var name = (v.name || '').toLowerCase();
    var lang = (v.lang || '').toLowerCase();
    if (lang.indexOf('en') !== 0) return -1;
    var score = 0;
    if (lang === 'en-us') score += 20;
    else score += 8;
    // iOS labels the clearer downloads Enhanced or Premium. Compact is the thin one.
    if (/enhanced|premium/.test(name) && name.indexOf('compact') === -1) score += 40;
    if (name.indexOf('samantha') !== -1) score += 30;
    else if (/ava|allison|nicky|susan|zoe|karen|moira/.test(name)) score += 24;
    else if (name.indexOf('google us english') !== -1) score += 18;
    else if (/aria|jenny|sara/.test(name)) score += 16;
    else if (name.indexOf('female') !== -1) score += 6;
    if (v.localService) score += 4;
    return score;
}

function pickVoice() {
    if (!window.speechSynthesis) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return preferredVoice;
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < voices.length; i++) {
        var score = voiceScore(voices[i]);
        if (score > bestScore) {
            bestScore = score;
            best = voices[i];
        }
    }
    preferredVoice = best || voices[0];
    return preferredVoice;
}

if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function () { pickVoice(); };
    pickVoice();
}

// Called from a user tap. A silent utterance lets the real prompt speak later on iOS.
function primeSpeech() {
    if (!window.speechSynthesis || speechUnlocked) return;
    speechUnlocked = true;
    try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        var u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        u.rate = 2;
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
    } catch (e) {
        speechUnlocked = false;
    }
}

function stopSound() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    // Drop a prompt that has not started, and one that is still talking.
    speechSeq++;
    speechTimers.forEach(function (id) { clearTimeout(id); });
    speechTimers = [];
    if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        window.speechSynthesis.cancel();
        // cancel() outside a tap blocks the next speak on iOS, so the next tap primes again.
        speechUnlocked = false;
    }
}

function speak(text, opts) {
    opts = opts || {};
    if (!window.speechSynthesis || !text) return;
    if (window.speechSynthesis.paused) {
        try { window.speechSynthesis.resume(); } catch (e) {}
    }
    // Cancelling and then speaking outside the original tap is dropped on iOS.
    if (opts.cancel !== false && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        window.speechSynthesis.cancel();
    }
    var u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate != null ? opts.rate : 0.9;
    u.pitch = opts.pitch != null ? opts.pitch : 1.05;
    u.lang = 'en-US';
    var voice = pickVoice();
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
    var id = setTimeout(fn, delay);
    speechTimers.push(id);
    return id;
}

// The question is on screen before this speaks. An answer tap clears the timer
// first, so the prompt never talks over the Yes chime.
function queuePrompt(trackName, text, opts, delay) {
    primeSpeech();
    scheduleSpeech(function () {
        if (track !== trackName || mode !== 'PLAY' || coolingDown) return;
        // Queue behind the silent unlock. Cancelling here would drop this line on iOS.
        var next = {};
        if (opts) {
            next.rate = opts.rate;
            next.pitch = opts.pitch;
        }
        next.cancel = false;
        speak(text, next);
    }, delay);
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
    stopSound();
    coolingDown = false;
    mode = 'PLAY';
    savedScreen = 'home';
    track = 'home';
    save();
    render();
}

function goLettersMenu() {
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
    if (mode === 'READY' && (track === 'sounds' || track === 'counting' || track === 'addition' || track === 'compare')) {
        return renderGameStart();
    }
    if (track === 'home') return renderHome();
    if (track === 'letters-menu') return renderLettersMenu();
    if (track === 'sounds') return renderLetterPractice();
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
    letters.innerHTML = '<span class="home-icon case-keep">Aa</span><span>Letters</span><span class="home-level">1 game</span>';
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

    col.appendChild(phonics);
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

// ——— Phonics: hear the letter sound, pick the letter ———
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

function currentLevel() {
    return levels.sounds || 1;
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
    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'Great job!'));
        screen.appendChild(settingsCard(false, 'sounds'));
        const againBtn = el('button', 'big-btn primary', 'Again');
        againBtn.type = 'button';
        againBtn.onclick = function () {
            unlockAudio();
            startSounds();
        };
        screen.appendChild(againBtn);
        screen.appendChild(homeLink('Back', goLettersMenu));
        app.appendChild(screen);
        return;
    }

    var entry = letterEntry(quizAnswer);
    var prompt = el('button', 'letter-stage pulse');
    prompt.type = 'button';
    prompt.innerHTML =
        '<span class="stage-speaker">🔊</span>' +
        '<span class="hint tap-hear">Tap to hear</span>' +
        '<span class="hint">Which letter?</span>';
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
    if (track !== 'sounds') return;
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
        stopSound();
        playYes();
        flashYes(function () {
            if (track !== 'sounds') return;
            roundIndex++;
            nextLetterRound(true);
        });
    } else {
        missedThis[quizAnswer] = true;
        fadeWrong(btn, function () {
            if (track !== 'sounds' || mode !== 'PLAY') return;
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
    // Held so an answer tap cancels it before it can speak over the Yes chime.
    queuePrompt('counting', 'how many?', { rate: 0.95 }, 250);
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
    stopSound();
    unlockAudio();
    var mySeq = speechSeq;
    var i = 1;

    function sayWord(word, done) {
        if (mySeq !== speechSeq) return;
        if (!window.speechSynthesis) {
            done();
            return;
        }
        if (window.speechSynthesis.paused) {
            try { window.speechSynthesis.resume(); } catch (e) {}
        }
        var u = new SpeechSynthesisUtterance(word);
        u.rate = 0.88;
        u.pitch = 1.08;
        u.lang = 'en-US';
        var voice = pickVoice();
        if (voice) u.voice = voice;
        u.onend = function () {
            if (mySeq !== speechSeq) return;
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

function sayCorrectCount(n) {
    stopSound();
    unlockAudio();
    speak('there are ' + (NUMBER_WORDS[n] || String(n)), { rate: 0.88 });
}

function onCountPick(n) {
    if (coolingDown) return;
    if (n === quizAnswer) {
        stopSound();
        playYes();
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
        wrongCooldown(function () {
            if (track !== 'counting') return;
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
    stopSound();
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
    queuePrompt('addition', NUMBER_WORDS[mathA] + ' plus ' + NUMBER_WORDS[mathB], { rate: 0.88 }, 280);
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
            if (track !== 'addition') return;
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
    stopSound();
    do {
        compareLeft = Math.floor(Math.random() * 8) + 1;
        compareRight = Math.floor(Math.random() * 8) + 1;
    } while (compareLeft === compareRight);
    quizAnswer = compareLeft > compareRight ? 'LEFT' : 'RIGHT';
    mode = 'PLAY';
    render();
    queuePrompt('compare', 'which is bigger?', { rate: 0.95 }, 250);
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
            if (track !== 'compare') return;
            speak('which is bigger?', { rate: 0.95 });
        });
    }
}

function letterEntry(ch) {
    var up = String(ch).toUpperCase();
    for (var i = 0; i < LETTERS.length; i++) {
        if (LETTERS[i].letter === up) return LETTERS[i];
    }
    return { letter: up, file: up.toLowerCase() };
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
// The same Yes card for every game. It stays 700ms, then the next question.
var YES_MS = 700;

function flashYes(nextFn) {
    coolingDown = true;
    yesOverlay.classList.remove('hidden');
    setTimeout(function () {
        yesOverlay.classList.add('hidden');
        coolingDown = false;
        afterPaint(function () {
            if (nextFn) nextFn();
        });
    }, YES_MS);
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
