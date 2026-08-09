/**
 * Letter Sounds — simple phonics for ~age 4
 * 80s neon look, kid-simple interaction.
 * Sounds: Buzzphonics (MIT) https://github.com/hellodeborahuk/buzzphonics
 */

const STORAGE_KEY = 'lt-simple-v3';

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

const WRONG_MS = 1600;

let mode = 'SHOW'; // SHOW | QUIZ | DONE
let index = 0;
let quizAnswer = '';
let quizOptions = [];
let quizKind = 'SOUND';
let coolingDown = false;
let sinceQuiz = 0;

function load() {
    try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (typeof p.index === 'number' && p.index >= 0 && p.index < LETTERS.length) {
            index = p.index;
        }
    } catch (e) { /* ignore */ }
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ index: index }));
}

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

function render() {
    app.innerHTML = '';
    const screen = el('div', 'simple-screen');

    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'You finished!'));
        const again = el('button', 'big-btn primary', 'Again');
        again.type = 'button';
        again.onclick = function () {
            index = 0;
            sinceQuiz = 0;
            mode = 'SHOW';
            save();
            showLetter(true);
        };
        screen.appendChild(again);
        app.appendChild(screen);
        return;
    }

    if (mode === 'QUIZ') {
        const answer = LETTERS.find(function (L) { return L.letter === quizAnswer; });

        // Whole prompt is "tap to hear again" — auto-played on enter
        const prompt = el('button', 'letter-stage');
        prompt.type = 'button';
        prompt.setAttribute('aria-label', 'Hear the sound again');
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
            btn.onclick = function () { onQuizPick(L); };
            row.appendChild(btn);
        });
        screen.appendChild(row);
        app.appendChild(screen);
        return;
    }

    // SHOW — letter is the sound button; Next advances
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
    next.onclick = onNext;
    screen.appendChild(next);

    app.appendChild(screen);
}

function showLetter(autoPlay) {
    mode = 'SHOW';
    render();
    if (autoPlay) {
        setTimeout(function () {
            playLetter(LETTERS[index]);
        }, 280);
    }
}

function onNext() {
    unlockAudio();
    // First letter: always just advance so they learn the pattern
    // Then quiz every other letter
    sinceQuiz++;
    if (index >= 1 && sinceQuiz >= 2) {
        startQuiz();
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
    sinceQuiz = sinceQuiz; // keep
    showLetter(true);
}

function startQuiz() {
    sinceQuiz = 0;
    const item = LETTERS[index];
    quizAnswer = item.letter;
    // Pictures are more intuitive for 4yos — weight them
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

function onQuizPick(letter) {
    if (coolingDown) return;
    const answer = LETTERS.find(function (L) { return L.letter === quizAnswer; });
    if (letter === quizAnswer) {
        stopSound();
        playYes();
        yesOverlay.classList.remove('hidden');
        setTimeout(function () {
            yesOverlay.classList.add('hidden');
            advanceLetter();
        }, 700);
    } else {
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
            playLetter(answer);
        }, WRONG_MS);
    }
}

// First tap anywhere unlocks audio on mobile, then auto-plays current letter
function boot() {
    load();
    LETTERS.slice(0, 8).forEach(function (L) {
        const url = './sounds/' + L.file + '.m4a';
        if (!audioCache.has(url)) {
            const a = new Audio(url);
            a.preload = 'auto';
            audioCache.set(url, a);
        }
    });
    render();

    // Auto-play after first user gesture (required on iOS)
    var started = false;
    function firstGesture() {
        if (started) return;
        started = true;
        unlockAudio();
        if (mode === 'SHOW') playLetter(LETTERS[index]);
        document.removeEventListener('pointerdown', firstGesture, true);
    }
    document.addEventListener('pointerdown', firstGesture, true);
}

boot();
