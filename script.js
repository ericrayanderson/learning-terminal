/**
 * Learning Terminal — Letters, Words, and Numbers practice
 * Neon look, big simple choices.
 * Letter sounds: Buzzphonics (MIT)
 */

const STORAGE_KEY = 'lt-home-v2';
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

// track: home | letters | words | numbers-menu | counting | addition | compare
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

// math/count state
let countItems = 0;
let mathA = 0;
let mathB = 0;
let compareLeft = 0;
let compareRight = 0;

function load() {
    try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (typeof p.letterIndex === 'number') {
            index = Math.min(Math.max(0, p.letterIndex), LETTERS.length - 1);
        }
    } catch (e) { /* ignore */ }
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ letterIndex: index }));
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

function speak(text, opts) {
    opts = opts || {};
    if (!window.speechSynthesis || !text) return;
    // Only cancel if this is a fresh "interrupt" speak (default true)
    if (opts.cancel !== false) {
        window.speechSynthesis.cancel();
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate != null ? opts.rate : 0.9;
    u.pitch = opts.pitch != null ? opts.pitch : 1.05;
    u.lang = 'en-US';
    const voice = pickVoice();
    if (voice) u.voice = voice;
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
    a._unlocked = true;
    a.pause();
    try { a.currentTime = 0; } catch (e) { /* not seekable yet */ }
    currentAudio = a;
    return a.play().catch(function () {});
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
    a.muted = true;
    var finish = function () {
        if (a._primeToken !== token) return;
        try { a.pause(); } catch (e) {}
        try { a.currentTime = 0; } catch (e2) {}
        a.muted = false;
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

function homeLink(label, onClick) {
    const b = el('button', 'home-link', label || 'Home');
    b.type = 'button';
    b.onclick = onClick || goHome;
    return b;
}

function goHome() {
    stopSound();
    coolingDown = false;
    track = 'home';
    render();
}

function goNumbersMenu() {
    stopSound();
    coolingDown = false;
    track = 'numbers-menu';
    render();
}

// ——— Render ———
function render() {
    app.innerHTML = '';
    if (track === 'home') return renderHome();
    if (track === 'letters') return renderLetters();
    if (track === 'words') return renderWords();
    if (track === 'numbers-menu') return renderNumbersMenu();
    if (track === 'counting') return renderCounting();
    if (track === 'addition') return renderAddition();
    if (track === 'compare') return renderCompare();
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
        startLetterQuiz();
    };

    const words = el('button', 'big-btn home-words home-choice');
    words.type = 'button';
    words.innerHTML = '<span class="home-icon">Abc</span><span>Words</span>';
    words.onclick = function () {
        unlockAudio();
        startWords();
    };

    const numbers = el('button', 'big-btn home-numbers home-choice');
    numbers.type = 'button';
    numbers.innerHTML = '<span class="home-icon">123</span><span>Numbers</span>';
    numbers.onclick = function () {
        unlockAudio();
        goNumbersMenu();
    };

    const col = el('div', 'big-actions');
    col.appendChild(letters);
    col.appendChild(words);
    col.appendChild(numbers);
    screen.appendChild(col);
    app.appendChild(screen);
}

function renderNumbersMenu() {
    const screen = el('div', 'simple-screen');
    screen.appendChild(el('p', 'hint', 'Numbers'));

    const col = el('div', 'big-actions');

    const counting = el('button', 'big-btn primary home-choice');
    counting.type = 'button';
    counting.innerHTML = '<span class="home-icon">●●●</span><span>Counting</span>';
    counting.onclick = function () {
        unlockAudio();
        startCounting();
    };

    const addition = el('button', 'big-btn secondary home-choice');
    addition.type = 'button';
    addition.innerHTML = '<span class="home-icon">+</span><span>Adding</span>';
    addition.onclick = function () {
        unlockAudio();
        startAddition();
    };

    const compare = el('button', 'big-btn secondary home-choice');
    compare.type = 'button';
    compare.innerHTML = '<span class="home-icon">◇</span><span>Which more?</span>';
    compare.onclick = function () {
        unlockAudio();
        startCompare();
    };

    col.appendChild(counting);
    col.appendChild(addition);
    // Only two big buttons preferred — put compare as third? User said counting, addition, etc.
    // Keep three options for numbers practice but stacked big.
    col.appendChild(compare);
    screen.appendChild(col);
    screen.appendChild(homeLink('Home', goHome));
    app.appendChild(screen);
}

// ——— Letters ———
function renderLetters() {
    const screen = el('div', 'simple-screen');

    if (mode === 'DONE') {
        screen.appendChild(el('div', 'giant-emoji', '⭐'));
        screen.appendChild(el('p', 'hint', 'You finished letters!'));
        const again = el('button', 'big-btn primary', 'Again');
        again.type = 'button';
        again.onclick = function () {
            index = 0;
            save();
            startLetterQuiz();
        };
        screen.appendChild(again);
        screen.appendChild(homeLink());
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
    screen.appendChild(homeLink());
    app.appendChild(screen);
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
    startLetterQuiz();
}

function startLetterQuiz() {
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
    render();
    // No intro timer. A delayed play() sits outside the tap, which mobile
    // Safari blocks for the first clip. Later rounds were primed on the answer tap.
    playLetter(item);
}

function onLetterQuiz(letter) {
    if (coolingDown) return;
    const answer = LETTERS.find(function (L) { return L.letter === quizAnswer; });
    if (letter === quizAnswer) {
        stopSound();
        playYes();
        if (index + 1 < LETTERS.length) primeLetter(LETTERS[index + 1]);
        flashYes(function () {
            if (track !== 'letters') return;
            advanceLetter();
        });
    } else {
        wrongCooldown(function () {
            if (track !== 'letters') return;
            playLetter(answer);
        });
    }
}

// ——— Counting practice ———
function startCounting() {
    track = 'counting';
    turnsTotal = 8;
    turnsLeft = 8;
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
    // Auto-speak nothing yet; tap stage to count aloud
    setTimeout(function () {
        // gently say "how many?"
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
    turnsTotal = 8;
    turnsLeft = 8;
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
    render();
    setTimeout(function () {
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

// ——— Which has more? ———
function startCompare() {
    track = 'compare';
    turnsTotal = 8;
    turnsLeft = 8;
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
    setTimeout(function () {
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
    track = 'words';
    coolingDown = false;
    wordQueue = shuffle(WORDS).slice(0, 8);
    wordPos = 0;
    nextWordRound();
}

function nextWordRound() {
    stopSound();
    if (wordPos >= wordQueue.length) {
        mode = 'DONE';
        render();
        playYes();
        return;
    }
    wordTarget = wordQueue[wordPos];
    wordSpelling = [];
    wordTiles = tilesFor(wordTarget.word);
    mode = 'PLAY';
    render();
    // In the tap that opened the round when it is a tap, so speech can start.
    speakWord();
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
        screen.appendChild(homeLink());
        app.appendChild(screen);
        return;
    }

    const stage = el('div', 'letter-stage word-stage');
    const hear = el('button', 'word-hear');
    hear.type = 'button';
    hear.appendChild(el('span', 'stage-emoji', wordTarget.emoji));
    hear.appendChild(el('span', 'hint', 'Tap to hear'));
    hear.onclick = function () {
        if (coolingDown) return;
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
    screen.appendChild(homeLink());
    app.appendChild(screen);
}

function onWordTile(letter) {
    if (coolingDown) return;
    if (wordSpelling.length >= 3) return;
    if (wordSpelling.indexOf(letter) !== -1) return;
    wordSpelling.push(letter);
    render();
    playLetter(letterEntry(letter));
    if (wordSpelling.length === 3) checkWord();
}

function onWordSlot(i) {
    if (coolingDown) return;
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
        stopSound();
        playYes();
        speak(wordTarget.word, { rate: 0.85 });
        flashYes(function () {
            if (track !== 'words') return;
            wordPos++;
            nextWordRound();
        });
    } else {
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

// ——— Feedback ———
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
