/**
 * Learning Terminal — Letters (phonics) & Numbers
 * Neon look, ultra-simple: home picks a path, then big taps.
 * Letter sounds: Buzzphonics (MIT)
 */

const STORAGE_KEY = 'lt-home-v1';
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

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const MAX_NUM = 10;

// track: 'home' | 'letters' | 'numbers'
// mode: 'SHOW' | 'QUIZ' | 'DONE' (for tracks)
let track = 'home';
let mode = 'SHOW';
let index = 0;           // letter index OR number value 1..10 for numbers (as index 0..9 for n-1)
let quizAnswer = null;
let quizOptions = [];
let quizKind = 'SOUND';
let coolingDown = false;
let sinceQuiz = 0;
let numValue = 1;        // current number 1-10

function load() {
    try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (typeof p.letterIndex === 'number') index = Math.min(Math.max(0, p.letterIndex), LETTERS.length - 1);
        if (typeof p.numValue === 'number') numValue = Math.min(Math.max(1, p.numValue), MAX_NUM);
    } catch (e) { /* ignore */ }
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        letterIndex: index,
        numValue: numValue
    }));
}

// ——— Audio ———
let audioCtx = null;
let currentAudio = null;
const audioCache = new Map();

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

function stopSound() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function playLetter(entry) {
    stopSound();
    unlockAudio();
    const url = './sounds/' + entry.file + '.m4a';
    let a = audioCache.get(url);
    if (!a) {
        a = new Audio(url);
        audioCache.set(url, a);
    }
    a.pause();
    a.currentTime = 0;
    currentAudio = a;
    return a.play().catch(function () {});
}

function tone(freq, when, dur, type, gain) {
    type = type || 'sine';
    gain = gain == null ? 0.12 : gain;
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

/** Count beeps for the number — clear for kids, no robot voice needed */
function playNumber(n) {
    stopSound();
    const ctx = unlockAudio();
    const t0 = ctx.currentTime + 0.05;
    for (let i = 0; i < n; i++) {
        tone(520 + i * 20, t0 + i * 0.28, 0.16, 'square', 0.1);
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
    for (let i = x.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = x[i];
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

function homeLink() {
    const b = el('button', 'home-link', 'Home');
    b.type = 'button';
    b.onclick = function () {
        stopSound();
        coolingDown = false;
        track = 'home';
        render();
    };
    return b;
}

// ——— Render ———
function render() {
    app.innerHTML = '';
    if (track === 'home') return renderHome();
    if (track === 'letters') return renderLetters();
    if (track === 'numbers') return renderNumbers();
}

function renderHome() {
    const screen = el('div', 'simple-screen');
    screen.appendChild(el('p', 'hint', 'Pick one'));

    const letters = el('button', 'big-btn primary home-choice');
    letters.type = 'button';
    letters.innerHTML = '<span class="home-icon">Aa</span><span>Letters</span>';
    letters.onclick = function () {
        unlockAudio();
        track = 'letters';
        mode = 'SHOW';
        sinceQuiz = 0;
        showLetter(true);
    };

    const numbers = el('button', 'big-btn secondary home-choice');
    numbers.type = 'button';
    numbers.innerHTML = '<span class="home-icon">123</span><span>Numbers</span>';
    numbers.onclick = function () {
        unlockAudio();
        track = 'numbers';
        mode = 'SHOW';
        sinceQuiz = 0;
        showNumber(true);
    };

    const col = el('div', 'big-actions');
    col.appendChild(letters);
    col.appendChild(numbers);
    screen.appendChild(col);
    app.appendChild(screen);
}

// ——— Letters (phonics) ———
function renderLetters() {
    const screen = el('div', 'simple-screen');

    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'You finished letters!'));
        const again = el('button', 'big-btn primary', 'Again');
        again.type = 'button';
        again.onclick = function () {
            index = 0;
            sinceQuiz = 0;
            save();
            showLetter(true);
        };
        screen.appendChild(again);
        screen.appendChild(homeLink());
        app.appendChild(screen);
        return;
    }

    if (mode === 'QUIZ') {
        const answer = LETTERS.find(function (L) { return L.letter === quizAnswer; });
        const prompt = el('button', 'letter-stage');
        prompt.type = 'button';
        prompt.setAttribute('aria-label', 'Hear again');
        if (quizKind === 'PIC') {
            prompt.innerHTML =
                '<span class="stage-emoji">' + answer.emoji + '</span>' +
                '<span class="hint">Which letter?</span>';
        } else {
            prompt.innerHTML =
                '<span class="stage-speaker" aria-hidden="true">🔊</span>' +
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
        screen.appendChild(homeLink());
        app.appendChild(screen);
        return;
    }

    // SHOW
    const item = LETTERS[index];
    const stage = el('button', 'letter-stage pulse');
    stage.type = 'button';
    stage.setAttribute('aria-label', 'Hear the sound');
    stage.innerHTML =
        '<span class="giant-letter">' + item.letter + '</span>' +
        '<span class="stage-emoji">' + item.emoji + '</span>' +
        '<span class="hint">Tap to hear</span>';
    stage.onclick = function () {
        unlockAudio();
        playLetter(item);
        stage.classList.remove('pulse');
    };
    screen.appendChild(stage);

    const next = el('button', 'big-btn primary', 'Next');
    next.type = 'button';
    next.onclick = onLetterNext;
    screen.appendChild(next);
    screen.appendChild(homeLink());
    app.appendChild(screen);
}

function showLetter(autoPlay) {
    mode = 'SHOW';
    render();
    if (autoPlay) {
        setTimeout(function () { playLetter(LETTERS[index]); }, 280);
    }
}

function onLetterNext() {
    unlockAudio();
    sinceQuiz++;
    if (index >= 1 && sinceQuiz >= 2) {
        startLetterQuiz();
        return;
    }
    advanceLetter();
}

function advanceLetter() {
    stopSound();
    if (index + 1 >= LETTERS.length) {
        mode = 'DONE';
        render();
        playYes();
        return;
    }
    index++;
    save();
    showLetter(true);
}

function startLetterQuiz() {
    sinceQuiz = 0;
    const item = LETTERS[index];
    quizAnswer = item.letter;
    quizKind = Math.random() < 0.65 ? 'PIC' : 'SOUND';
    var wrong = item.letter;
    var guard = 0;
    while (
        (wrong === item.letter ||
            (item.letter === 'C' && wrong === 'K') ||
            (item.letter === 'K' && wrong === 'C')) &&
        guard < 40
    ) {
        wrong = LETTERS[Math.floor(Math.random() * Math.min(index + 1, LETTERS.length))].letter;
        guard++;
    }
    quizOptions = shuffle([quizAnswer, wrong]);
    mode = 'QUIZ';
    render();
    setTimeout(function () { playLetter(item); }, 300);
}

function onLetterQuiz(letter) {
    if (coolingDown) return;
    const answer = LETTERS.find(function (L) { return L.letter === quizAnswer; });
    if (letter === quizAnswer) {
        stopSound();
        playYes();
        flashYes(function () { advanceLetter(); });
    } else {
        wrongCooldown(function () { playLetter(answer); });
    }
}

// ——— Numbers ———
function renderNumbers() {
    const screen = el('div', 'simple-screen');

    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'You finished numbers!'));
        const again = el('button', 'big-btn primary', 'Again');
        again.type = 'button';
        again.onclick = function () {
            numValue = 1;
            sinceQuiz = 0;
            save();
            showNumber(true);
        };
        screen.appendChild(again);
        screen.appendChild(homeLink());
        app.appendChild(screen);
        return;
    }

    if (mode === 'QUIZ') {
        const n = quizAnswer;
        const prompt = el('button', 'letter-stage');
        prompt.type = 'button';
        prompt.setAttribute('aria-label', 'Hear again');
        prompt.innerHTML =
            dotsHtml(n) +
            '<span class="hint">How many?</span>';
        prompt.onclick = function () {
            if (!coolingDown) playNumber(n);
        };
        screen.appendChild(prompt);

        const row = el('div', 'big-actions row');
        quizOptions.forEach(function (opt) {
            const btn = el('button', 'big-btn letter-choice', String(opt));
            btn.type = 'button';
            btn.onclick = function () { onNumberQuiz(opt); };
            row.appendChild(btn);
        });
        screen.appendChild(row);
        screen.appendChild(homeLink());
        app.appendChild(screen);
        return;
    }

    // SHOW number
    const n = numValue;
    const stage = el('button', 'letter-stage pulse');
    stage.type = 'button';
    stage.setAttribute('aria-label', 'Hear the number');
    stage.innerHTML =
        '<span class="giant-letter">' + n + '</span>' +
        dotsHtml(n) +
        '<span class="hint">Tap to hear</span>';
    stage.onclick = function () {
        unlockAudio();
        playNumber(n);
        stage.classList.remove('pulse');
    };
    screen.appendChild(stage);

    const next = el('button', 'big-btn primary', 'Next');
    next.type = 'button';
    next.onclick = onNumberNext;
    screen.appendChild(next);
    screen.appendChild(homeLink());
    app.appendChild(screen);
}

function showNumber(autoPlay) {
    mode = 'SHOW';
    render();
    if (autoPlay) {
        setTimeout(function () { playNumber(numValue); }, 280);
    }
}

function onNumberNext() {
    unlockAudio();
    sinceQuiz++;
    if (numValue >= 2 && sinceQuiz >= 2) {
        startNumberQuiz();
        return;
    }
    advanceNumber();
}

function advanceNumber() {
    stopSound();
    if (numValue >= MAX_NUM) {
        mode = 'DONE';
        render();
        playYes();
        return;
    }
    numValue++;
    save();
    showNumber(true);
}

function startNumberQuiz() {
    sinceQuiz = 0;
    const n = numValue;
    quizAnswer = n;
    var wrong = n;
    var guard = 0;
    while (wrong === n && guard < 20) {
        // nearby numbers for age 4
        const delta = Math.random() < 0.5 ? -1 : 1;
        wrong = Math.min(MAX_NUM, Math.max(1, n + delta));
        if (wrong === n) wrong = n >= MAX_NUM ? n - 1 : n + 1;
        guard++;
    }
    quizOptions = shuffle([n, wrong]);
    mode = 'QUIZ';
    render();
    setTimeout(function () { playNumber(n); }, 300);
}

function onNumberQuiz(pick) {
    if (coolingDown) return;
    if (pick === quizAnswer) {
        stopSound();
        playYes();
        flashYes(function () { advanceNumber(); });
    } else {
        wrongCooldown(function () { playNumber(quizAnswer); });
    }
}

// ——— Feedback helpers ———
function flashYes(nextFn) {
    yesOverlay.classList.remove('hidden');
    setTimeout(function () {
        yesOverlay.classList.add('hidden');
        nextFn();
    }, 700);
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

// ——— Boot ———
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
