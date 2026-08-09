/**
 * Learning Terminal — Letters (phonics) & Numbers practice
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

// track: home | letters | numbers-menu | counting | addition | compare
// mode: SHOW | QUIZ | PLAY | DONE
let track = 'home';
let mode = 'SHOW';
let index = 0;
let quizAnswer = null;
let quizOptions = [];
let quizKind = 'SOUND';
let coolingDown = false;
let sinceQuiz = 0;
let turnsLeft = 0;
let turnsTotal = 8;

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
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function speak(text, opts) {
    opts = opts || {};
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate != null ? opts.rate : 0.9;
    u.pitch = opts.pitch != null ? opts.pitch : 1.05;
    u.lang = 'en-US';
    const voice = pickVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
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
        mode = 'SHOW';
        sinceQuiz = 0;
        showLetter(true);
    };

    const numbers = el('button', 'big-btn secondary home-choice');
    numbers.type = 'button';
    numbers.innerHTML = '<span class="home-icon">123</span><span>Numbers</span>';
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
        return;
    }

    const item = LETTERS[index];
    const stage = el('button', 'letter-stage pulse');
    stage.type = 'button';
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
    if (autoPlay) setTimeout(function () { playLetter(LETTERS[index]); }, 280);
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

// ——— Counting practice ———
function startCounting() {
    track = 'counting';
    turnsTotal = 8;
    turnsLeft = 8;
    nextCountingRound();
}

function nextCountingRound() {
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
    stopSound();
    unlockAudio();
    // Speak each number in sequence, then the total once more
    var i = 1;
    function step() {
        if (i > n) {
            setTimeout(function () {
                speak(NUMBER_WORDS[n] || String(n), { rate: 0.85 });
            }, 200);
            return;
        }
        speak(NUMBER_WORDS[i] || String(i), { rate: 0.9 });
        // schedule next — speech length varies; fixed gap works ok for kids
        var delay = 550;
        setTimeout(function () {
            i++;
            step();
        }, delay);
    }
    step();
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
        wrongCooldown(function () {
            countOutLoud(countItems);
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
