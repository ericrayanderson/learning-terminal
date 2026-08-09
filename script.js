/**
 * Learning Terminal — phonics-first for ~age 4
 *
 * Letter sounds: human recordings from Buzzphonics (MIT)
 *   https://github.com/hellodeborahuk/buzzphonics
 * Instructional phrases: best available browser voice (optional, soft)
 */

const STORAGE_KEY = 'lt-phonics-progress-v1';

// Phase 2 style sets (Letters and Sounds order)
const SETS = [
    {
        id: 'set1',
        title: 'Set 1',
        subtitle: 's · a · t · p',
        letters: ['S', 'A', 'T', 'P']
    },
    {
        id: 'set2',
        title: 'Set 2',
        subtitle: 'i · n · m · d',
        letters: ['I', 'N', 'M', 'D']
    },
    {
        id: 'set3',
        title: 'Set 3',
        subtitle: 'g · o · c · k',
        letters: ['G', 'O', 'C', 'K']
    },
    {
        id: 'set4',
        title: 'Set 4',
        subtitle: 'e · u · r',
        letters: ['E', 'U', 'R']
    },
    {
        id: 'set5',
        title: 'Set 5',
        subtitle: 'h · b · f · l',
        letters: ['H', 'B', 'F', 'L']
    }
];

// Picture words for teaching beginning sounds
const LETTERS = {
    S: { file: 's', word: 'sun', emoji: '☀️', tip: 'snake sound' },
    A: { file: 'a', word: 'apple', emoji: '🍎', tip: 'short a' },
    T: { file: 't', word: 'tree', emoji: '🌳', tip: 'tap tongue' },
    P: { file: 'p', word: 'pig', emoji: '🐷', tip: 'popping sound' },
    I: { file: 'i', word: 'igloo', emoji: '🧊', tip: 'short i' },
    N: { file: 'n', word: 'nest', emoji: '🪺', tip: 'nnn' },
    M: { file: 'm', word: 'moon', emoji: '🌙', tip: 'mmm' },
    D: { file: 'd', word: 'dog', emoji: '🐶', tip: 'duh' },
    G: { file: 'g', word: 'goat', emoji: '🐐', tip: 'hard g' },
    O: { file: 'o', word: 'octopus', emoji: '🐙', tip: 'short o' },
    C: { file: 'c', word: 'cat', emoji: '🐱', tip: 'hard c' },
    // k sound recording is same as c in many schemes; Buzzphonics has c, not k
    K: { file: 'c', word: 'kite', emoji: '🪁', tip: 'same sound as c' },
    E: { file: 'e', word: 'egg', emoji: '🥚', tip: 'short e' },
    U: { file: 'u', word: 'umbrella', emoji: '☂️', tip: 'short u' },
    R: { file: 'r', word: 'rabbit', emoji: '🐰', tip: 'rrr' },
    H: { file: 'h', word: 'hat', emoji: '🎩', tip: 'breath sound' },
    B: { file: 'b', word: 'bus', emoji: '🚌', tip: 'buh' },
    F: { file: 'f', word: 'fish', emoji: '🐟', tip: 'fff' },
    L: { file: 'l', word: 'lion', emoji: '🦁', tip: 'lll' }
};

const EXTRA_GAMES = [
    { key: 'COUNTING', name: 'Counting', blurb: 'How many dots?', icon: '🔴' },
    { key: 'BIGGER_SMALLER', name: 'Most dots', blurb: 'Which has more?', icon: '⚖️' },
    { key: 'SHAPES', name: 'Shapes', blurb: 'Name the shape', icon: '⭐' },
    { key: 'ADDITION', name: 'Addition', blurb: 'Add the groups', icon: '➕' },
    { key: 'SPELLING', name: 'Spelling', blurb: 'Build CVC words', icon: '✏️' }
];

const WORDS = ['CAT', 'DOG', 'BOX', 'SUN', 'CUP', 'HAT', 'PIG', 'BED'];
const WORD_EMOJI = {
    CAT: '🐱', DOG: '🐶', BOX: '📦', SUN: '☀️',
    CUP: '☕', HAT: '🎩', PIG: '🐷', BED: '🛏️'
};
const SHAPES = [
    { name: 'CIRCLE', draw: '●' },
    { name: 'SQUARE', draw: '■' },
    { name: 'TRIANGLE', draw: '▲' },
    { name: 'DIAMOND', draw: '◆' },
    { name: 'STAR', draw: '★' },
    { name: 'HEART', draw: '♥' }
];

const TOTAL_TURNS = 8;
const WRONG_MS = 2200;

// ——— Progress ———
function loadProgress() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveProgress(p) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function isSetComplete(setId) {
    const p = loadProgress();
    return !!(p.sets && p.sets[setId] && p.sets[setId].practiced);
}

function markLetterMet(letter) {
    const p = loadProgress();
    p.met = p.met || {};
    p.met[letter] = true;
    saveProgress(p);
}

function markSetPracticed(setId) {
    const p = loadProgress();
    p.sets = p.sets || {};
    p.sets[setId] = { practiced: true, at: Date.now() };
    saveProgress(p);
}

function lettersMetInSet(set) {
    const p = loadProgress();
    const met = p.met || {};
    return set.letters.filter(l => met[l]).length;
}

function isSetUnlocked(index) {
    if (index === 0) return true;
    return isSetComplete(SETS[index - 1].id);
}

function allKnownLetters() {
    const p = loadProgress();
    const met = p.met || {};
    // Always include set 1 letters once user starts; include all met + current unlocked sets
    const known = new Set();
    SETS.forEach((set, i) => {
        if (i === 0 || isSetComplete(SETS[i - 1].id) || isSetComplete(set.id)) {
            set.letters.forEach(l => known.add(l));
        }
    });
    Object.keys(met).forEach(l => known.add(l));
    // Fallback: at least set 1
    SETS[0].letters.forEach(l => known.add(l));
    return [...known];
}

// ——— Audio: human phonemes + soft TTS for phrases only ———
let audioCtx = null;
let currentAudio = null;
const audioCache = new Map();

function getAudioCtx() {
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

function soundUrl(letter) {
    const info = LETTERS[letter];
    return `./sounds/${info.file}.m4a`;
}

function preloadSounds(letters) {
    letters.forEach(letter => {
        const url = soundUrl(letter);
        if (audioCache.has(url)) return;
        const a = new Audio(url);
        a.preload = 'auto';
        audioCache.set(url, a);
    });
}

function stopSound() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}

/** Play pure letter sound (human recording). Returns a Promise that resolves when done. */
function playLetterSound(letter) {
    stopSound();
    getAudioCtx();
    const url = soundUrl(letter);
    let a = audioCache.get(url);
    if (!a) {
        a = new Audio(url);
        audioCache.set(url, a);
    }
    // Clone-ish: reset and play
    a.pause();
    a.currentTime = 0;
    currentAudio = a;
    return a.play().catch(() => {
        // Fallback: soft TTS pure-ish sound if file fails
        speakPhrase(LETTERS[letter].tip || letter.toLowerCase(), { rate: 0.7 });
    });
}

/** Pick the friendliest available system voice (still TTS — used only for short phrases). */
function pickVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!voices.length) return null;
    const prefer = [
        /google us english/i,
        /google uk english female/i,
        /microsoft (aria|jenny|guy|sara)/i,
        /samantha/i,
        /karen/i,
        /moira/i,
        /female/i,
        /en-us/i,
        /en_us/i,
        /en-gb/i
    ];
    for (const re of prefer) {
        const v = voices.find(x => re.test(x.name) || re.test(x.lang));
        if (v) return v;
    }
    return voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) || voices[0];
}

let voicesReady = false;
function ensureVoices() {
    if (!window.speechSynthesis) return;
    const mark = () => { voicesReady = true; };
    const v = window.speechSynthesis.getVoices();
    if (v && v.length) mark();
    window.speechSynthesis.onvoiceschanged = mark;
}

ensureVoices();

/**
 * Short instructional phrases only — letter SOUNDS always use recordings.
 * Computer voice is optional scaffolding; kids learn from the human phonemes.
 */
function speakPhrase(text, opts = {}) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 0.92;
    u.pitch = opts.pitch ?? 1.05;
    u.lang = 'en-US';
    const voice = pickVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
}

function playTone(ctx, freq, startTime, duration, type = 'sine', gain = 0.1) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function playCorrect() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    playTone(ctx, 523, t, 0.1);
    playTone(ctx, 659, t + 0.08, 0.12);
    playTone(ctx, 784, t + 0.16, 0.14);
}

function playWrong() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    playTone(ctx, 280, t, 0.16, 'triangle', 0.07);
    playTone(ctx, 220, t + 0.1, 0.18, 'triangle', 0.06);
}

function playSuccess() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => playTone(ctx, f, t + 0.1 + i * 0.09, 0.14));
}

// ——— State ———
let mode = 'HOME'; // HOME | PATH | MEET | PRACTICE | BOARD | COUNTING | ...
let activeSetIndex = 0;
let meetQueue = [];
let meetIndex = 0;
let practiceKind = 'SOUND'; // SOUND | BEGINNING
let practiceAnswer = '';
let practiceEntry = null;
let turnsLeft = 0;
let turnsTotal = TOTAL_TURNS;
let currentOptions = [];
let coolingDown = false;

// mini-game state
let countItems = 0;
let mathProblem = { a: 0, b: 0, result: 0 };
let currentShape = null;
let biggerSmallerProblem = { left: 0, right: 0, answer: '' };
let currentWord = '';
let spellingIndex = 0;
let spellingOptions = [];

const appContainer = document.getElementById('app-container');
const successOverlay = document.getElementById('success-overlay');
const wrongOverlay = document.getElementById('wrong-overlay');
const wrongProgressBar = document.getElementById('wrong-progress-bar');

// ——— DOM helpers ———
function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function goHome() {
    stopSound();
    coolingDown = false;
    mode = 'HOME';
    render();
}

function goPath() {
    stopSound();
    coolingDown = false;
    mode = 'PATH';
    render();
}

function turnsDone() {
    return turnsTotal - turnsLeft;
}

// ——— Render ———
function render() {
    appContainer.innerHTML = '';

    if (mode === 'HOME') renderHome();
    else if (mode === 'PATH') renderPath();
    else if (mode === 'MEET') renderMeet();
    else if (mode === 'PRACTICE') renderPractice();
    else if (mode === 'BOARD') renderBoard();
    else if (mode === 'THE_END') renderEnd();
    else if (mode === 'COUNTING') renderCounting();
    else if (mode === 'BIGGER_SMALLER') renderBigger();
    else if (mode === 'SHAPES') renderShapes();
    else if (mode === 'ADDITION') renderAddition();
    else if (mode === 'SPELLING') renderSpelling();
}

function renderHome() {
    const home = el('div', 'home');

    const brand = el('div', 'brand');
    brand.appendChild(el('div', 'brand-badge', 'Learning Terminal'));
    brand.appendChild(el('h1', null, 'Learn to read'));
    brand.appendChild(el('p', null, 'Letter sounds first — the building blocks of words'));
    home.appendChild(brand);

    // Main CTA — phonics path
    const hero = el('button', 'hero-card');
    hero.type = 'button';
    hero.onclick = () => {
        getAudioCtx();
        goPath();
    };
    const heroIcon = el('div', 'hero-icon', '🔤');
    hero.appendChild(heroIcon);
    const heroText = el('div', 'hero-text');
    heroText.appendChild(el('h2', null, 'Phonics path'));
    heroText.appendChild(el('p', null, 'Meet each letter · hear the sound · practice'));
    hero.appendChild(heroText);
    hero.appendChild(el('span', 'hero-go', 'Start →'));
    home.appendChild(hero);

    // Free play board
    const boardBtn = el('button', 'secondary-row');
    boardBtn.type = 'button';
    boardBtn.onclick = () => {
        getAudioCtx();
        mode = 'BOARD';
        preloadSounds(Object.keys(LETTERS));
        render();
    };
    boardBtn.appendChild(el('span', 'secondary-icon', '🎹'));
    const boardMeta = el('div', 'secondary-meta');
    boardMeta.appendChild(el('strong', null, 'Sound board'));
    boardMeta.appendChild(el('span', null, 'Tap any letter to hear its sound'));
    boardBtn.appendChild(boardMeta);
    home.appendChild(boardBtn);

    // Extra games (collapsed list)
    const more = el('div', 'more-block');
    more.appendChild(el('h3', null, 'More play'));
    EXTRA_GAMES.forEach(g => {
        const btn = el('button', 'game-card compact');
        btn.type = 'button';
        btn.onclick = () => startMiniGame(g.key);
        btn.appendChild(el('div', 'game-icon', g.icon));
        const meta = el('div', 'game-meta');
        meta.appendChild(el('h2', null, g.name));
        meta.appendChild(el('p', null, g.blurb));
        btn.appendChild(meta);
        more.appendChild(btn);
    });
    home.appendChild(more);

    const credit = el('p', 'credit-line', 'Letter sounds: Buzzphonics (MIT) · human recordings');
    home.appendChild(credit);

    appContainer.appendChild(home);
}

function renderPath() {
    const wrap = el('div', 'path-screen');
    const top = el('div', 'top-bar');
    const back = el('button', 'chip-btn', '← Home');
    back.type = 'button';
    back.onclick = goHome;
    top.appendChild(back);
    top.appendChild(el('div', 'top-title', 'Your path'));
    wrap.appendChild(top);

    wrap.appendChild(el('p', 'path-intro', 'Learn one set at a time. First meet the letters, then practice.'));

    SETS.forEach((set, index) => {
        const unlocked = isSetUnlocked(index);
        const complete = isSetComplete(set.id);
        const met = lettersMetInSet(set);

        const card = el('div', 'set-card' + (unlocked ? '' : ' locked') + (complete ? ' complete' : ''));

        const head = el('div', 'set-head');
        head.appendChild(el('div', 'set-num', complete ? '✓' : String(index + 1)));
        const titles = el('div', 'set-titles');
        titles.appendChild(el('h2', null, set.title));
        titles.appendChild(el('p', null, set.subtitle));
        head.appendChild(titles);
        if (!unlocked) head.appendChild(el('span', 'lock-pill', 'Locked'));
        else if (complete) head.appendChild(el('span', 'done-pill', 'Practiced'));
        else head.appendChild(el('span', 'prog-pill', `${met}/${set.letters.length} met`));
        card.appendChild(head);

        const lettersRow = el('div', 'set-letters');
        set.letters.forEach(L => {
            const chip = el('button', 'letter-chip');
            chip.type = 'button';
            chip.textContent = L;
            chip.disabled = !unlocked;
            chip.onclick = () => {
                if (!unlocked) return;
                getAudioCtx();
                playLetterSound(L);
            };
            lettersRow.appendChild(chip);
        });
        card.appendChild(lettersRow);

        if (unlocked) {
            const actions = el('div', 'set-actions');
            const meetBtn = el('button', 'primary-btn small', met < set.letters.length ? 'Meet letters' : 'Review letters');
            meetBtn.type = 'button';
            meetBtn.onclick = () => startMeet(index);
            actions.appendChild(meetBtn);

            const pracBtn = el('button', 'secondary-btn small', 'Practice');
            pracBtn.type = 'button';
            pracBtn.onclick = () => startPractice(index);
            actions.appendChild(pracBtn);
            card.appendChild(actions);
        } else {
            card.appendChild(el('p', 'lock-hint', 'Finish the set above to unlock'));
        }

        wrap.appendChild(card);
    });

    appContainer.appendChild(wrap);
}

function renderMeet() {
    const letter = meetQueue[meetIndex];
    const info = LETTERS[letter];
    const screen = el('div', 'game-screen');

    const top = el('div', 'top-bar');
    const back = el('button', 'chip-btn', '← Path');
    back.type = 'button';
    back.onclick = () => { stopSound(); goPath(); };
    top.appendChild(back);
    top.appendChild(el('div', 'top-title', `Letter ${meetIndex + 1} of ${meetQueue.length}`));
    screen.appendChild(top);

    const card = el('div', 'prompt-card meet-card');
    card.appendChild(el('p', 'prompt-kicker', 'Meet the letter'));
    card.appendChild(el('div', 'giant-letter', letter));

    const hear = el('button', 'sound-orb pulse');
    hear.type = 'button';
    hear.setAttribute('aria-label', 'Play letter sound');
    hear.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    hear.onclick = () => playLetterSound(letter);
    card.appendChild(hear);

    card.appendChild(el('p', 'sound-caption', `${letter} says this sound`));

    const pic = el('div', 'meet-picture');
    pic.appendChild(el('div', 'prompt-emoji', info.emoji));
    pic.appendChild(el('div', 'meet-word', info.word));
    card.appendChild(pic);
    card.appendChild(el('p', 'meet-hint', `${info.word} starts with ${letter}`));

    screen.appendChild(card);

    const actions = el('div', 'meet-actions');
    const again = el('button', 'listen-btn', '▶  Hear sound again');
    again.type = 'button';
    again.onclick = () => playLetterSound(letter);
    actions.appendChild(again);

    const next = el('button', 'primary-btn', meetIndex + 1 < meetQueue.length ? 'Next letter →' : 'Practice this set →');
    next.type = 'button';
    next.onclick = () => {
        markLetterMet(letter);
        stopSound();
        if (meetIndex + 1 < meetQueue.length) {
            meetIndex++;
            render();
            setTimeout(() => playLetterSound(meetQueue[meetIndex]), 350);
        } else {
            startPractice(activeSetIndex);
        }
    };
    actions.appendChild(next);
    screen.appendChild(actions);

    appContainer.appendChild(screen);
}

function renderPractice() {
    const screen = el('div', 'game-screen');
    const top = el('div', 'top-bar');
    const back = el('button', 'chip-btn', '← Path');
    back.type = 'button';
    back.onclick = () => { stopSound(); goPath(); };
    top.appendChild(back);

    const pips = el('div', 'turn-pips');
    for (let i = 0; i < turnsTotal; i++) {
        pips.appendChild(el('span', 'pip' + (i < turnsDone() ? ' on' : '')));
    }
    top.appendChild(pips);
    screen.appendChild(top);

    const card = el('div', 'prompt-card');
    if (practiceKind === 'BEGINNING') {
        card.appendChild(el('p', 'prompt-kicker', 'Starts with'));
        card.appendChild(el('div', 'prompt-emoji', practiceEntry.emoji));
        card.appendChild(el('h2', 'prompt-title', 'What letter?'));
        card.appendChild(el('p', 'soft-word', practiceEntry.word));
    } else {
        card.appendChild(el('p', 'prompt-kicker', 'Listen to the sound'));
        const orb = el('button', 'sound-orb pulse');
        orb.type = 'button';
        orb.setAttribute('aria-label', 'Play sound');
        orb.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
        orb.onclick = () => {
            if (!coolingDown) playLetterSound(practiceAnswer);
        };
        card.appendChild(orb);
        card.appendChild(el('h2', 'prompt-title', 'Which letter?'));
    }
    screen.appendChild(card);

    const listen = el('button', 'listen-btn', '▶  Listen again');
    listen.type = 'button';
    listen.onclick = () => {
        if (coolingDown) return;
        if (practiceKind === 'BEGINNING') {
            // Play the target letter sound (what they should match)
            playLetterSound(practiceAnswer);
        } else {
            playLetterSound(practiceAnswer);
        }
    };
    screen.appendChild(listen);

    const choices = el('div', 'choices');
    currentOptions.forEach(opt => {
        const btn = el('button', 'choice-btn', opt);
        btn.type = 'button';
        btn.onclick = () => handlePracticeClick(opt);
        choices.appendChild(btn);
    });
    screen.appendChild(choices);

    appContainer.appendChild(screen);
}

function renderBoard() {
    const screen = el('div', 'path-screen');
    const top = el('div', 'top-bar');
    const back = el('button', 'chip-btn', '← Home');
    back.type = 'button';
    back.onclick = goHome;
    top.appendChild(back);
    top.appendChild(el('div', 'top-title', 'Sound board'));
    screen.appendChild(top);

    screen.appendChild(el('p', 'path-intro', 'Tap a letter to hear its pure sound. No quiz — just listen and copy.'));

    const grid = el('div', 'board-grid');
    Object.keys(LETTERS).forEach(L => {
        const btn = el('button', 'board-key');
        btn.type = 'button';
        const info = LETTERS[L];
        btn.innerHTML = `<span class="board-letter">${L}</span><span class="board-emoji">${info.emoji}</span>`;
        btn.onclick = () => {
            getAudioCtx();
            playLetterSound(L);
            markLetterMet(L);
        };
        grid.appendChild(btn);
    });
    screen.appendChild(grid);
    appContainer.appendChild(screen);
}

function renderEnd() {
    const card = el('div', 'end-card');
    card.appendChild(el('div', 'prompt-emoji', '⭐'));
    card.appendChild(el('h1', null, 'Great practice!'));
    card.appendChild(el('p', null, 'You listened and matched letter sounds'));
    const again = el('button', 'primary-btn', 'Back to path');
    again.type = 'button';
    again.onclick = goPath;
    card.appendChild(again);
    appContainer.appendChild(card);
}

function topBarMini(title) {
    const top = el('div', 'top-bar');
    const back = el('button', 'chip-btn', '← Home');
    back.type = 'button';
    back.onclick = goHome;
    top.appendChild(back);
    const pips = el('div', 'turn-pips');
    for (let i = 0; i < turnsTotal; i++) {
        pips.appendChild(el('span', 'pip' + (i < turnsDone() ? ' on' : '')));
    }
    top.appendChild(pips);
    return top;
}

function makeChoices(options, onPick, wide) {
    const wrap = el('div', 'choices');
    if (wide) wrap.style.gridTemplateColumns = `repeat(${Math.min(options.length, 2)}, 1fr)`;
    options.forEach(opt => {
        const btn = el('button', 'choice-btn' + (wide ? ' wide' : ''), String(opt));
        btn.type = 'button';
        btn.onclick = () => onPick(opt);
        wrap.appendChild(btn);
    });
    return wrap;
}

function renderCounting() {
    const screen = el('div', 'game-screen');
    screen.appendChild(topBarMini());
    const card = el('div', 'prompt-card');
    card.appendChild(el('p', 'prompt-kicker', 'Count'));
    const board = el('div', 'dots-board');
    for (let i = 0; i < countItems; i++) board.appendChild(el('span', 'dot'));
    card.appendChild(board);
    card.appendChild(el('h2', 'prompt-title', 'How many?'));
    screen.appendChild(card);
    screen.appendChild(makeChoices(currentOptions, (n) => {
        if (coolingDown) return;
        if (n === countItems) { playCorrect(); triggerSuccess(nextMiniRound); }
        else handleWrong();
    }));
    appContainer.appendChild(screen);
}

function renderBigger() {
    const screen = el('div', 'game-screen');
    screen.appendChild(topBarMini());
    const card = el('div', 'prompt-card');
    card.appendChild(el('p', 'prompt-kicker', 'Compare'));
    const row = el('div', 'compare-row');
    const left = el('div', 'compare-side');
    for (let i = 0; i < biggerSmallerProblem.left; i++) left.appendChild(el('span', 'dot'));
    const right = el('div', 'compare-side');
    for (let i = 0; i < biggerSmallerProblem.right; i++) right.appendChild(el('span', 'dot'));
    row.appendChild(left);
    row.appendChild(el('div', 'compare-or', 'or'));
    row.appendChild(right);
    card.appendChild(row);
    card.appendChild(el('h2', 'prompt-title', 'Which has more?'));
    screen.appendChild(card);
    screen.appendChild(makeChoices(['LEFT', 'RIGHT'], (side) => {
        if (coolingDown) return;
        if (side === biggerSmallerProblem.answer) { playCorrect(); triggerSuccess(nextMiniRound); }
        else handleWrong();
    }, true));
    const btns = screen.querySelectorAll('.choice-btn');
    if (btns[0]) btns[0].textContent = '← Left';
    if (btns[1]) btns[1].textContent = 'Right →';
    appContainer.appendChild(screen);
}

function renderShapes() {
    const screen = el('div', 'game-screen');
    screen.appendChild(topBarMini());
    const card = el('div', 'prompt-card');
    card.appendChild(el('p', 'prompt-kicker', 'Shapes'));
    card.appendChild(el('div', 'shape-glyph', currentShape.draw));
    card.appendChild(el('h2', 'prompt-title', 'What shape?'));
    screen.appendChild(card);
    const wrap = el('div', 'choices');
    wrap.style.gridTemplateColumns = '1fr';
    currentOptions.forEach(opt => {
        const btn = el('button', 'choice-btn wide', opt);
        btn.type = 'button';
        btn.onclick = () => {
            if (coolingDown) return;
            if (opt === currentShape.name) { playCorrect(); triggerSuccess(nextMiniRound); }
            else handleWrong();
        };
        wrap.appendChild(btn);
    });
    screen.appendChild(wrap);
    appContainer.appendChild(screen);
}

function renderAddition() {
    const screen = el('div', 'game-screen');
    screen.appendChild(topBarMini());
    const card = el('div', 'prompt-card');
    card.appendChild(el('p', 'prompt-kicker', 'Add'));
    const row = el('div', 'math-row');
    [mathProblem.a, mathProblem.b].forEach((num, idx) => {
        const g = el('div', 'addend');
        g.appendChild(el('div', 'addend-num', String(num)));
        const dots = el('div', 'dots-board');
        dots.style.maxWidth = '100px';
        for (let i = 0; i < num; i++) {
            const d = el('span', 'dot');
            d.style.width = '16px';
            d.style.height = '16px';
            dots.appendChild(d);
        }
        g.appendChild(dots);
        row.appendChild(g);
        if (idx === 0) row.appendChild(el('div', 'op', '+'));
    });
    row.appendChild(el('div', 'op', '= ?'));
    card.appendChild(row);
    screen.appendChild(card);
    screen.appendChild(makeChoices(currentOptions, (n) => {
        if (coolingDown) return;
        if (n === mathProblem.result) { playCorrect(); triggerSuccess(nextMiniRound); }
        else handleWrong();
    }));
    appContainer.appendChild(screen);
}

function renderSpelling() {
    const screen = el('div', 'game-screen');
    screen.appendChild(topBarMini());
    const card = el('div', 'prompt-card');
    card.appendChild(el('p', 'prompt-kicker', 'Spell'));
    card.appendChild(el('div', 'prompt-emoji', WORD_EMOJI[currentWord]));
    const word = el('div', 'spell-word');
    currentWord.split('').forEach((char, i) => {
        let cls = 'spell-letter';
        let text = '·';
        if (i < spellingIndex) { cls += ' done'; text = char; }
        else if (i === spellingIndex) { cls += ' current'; text = '?'; }
        word.appendChild(el('span', cls, text));
    });
    card.appendChild(word);
    card.appendChild(el('h2', 'prompt-title', 'Next letter?'));
    screen.appendChild(card);
    screen.appendChild(makeChoices(spellingOptions, (letter) => {
        if (coolingDown) return;
        if (letter === currentWord[spellingIndex]) {
            playCorrect();
            if (spellingIndex + 1 === currentWord.length) triggerSuccess(nextMiniRound);
            else { spellingIndex++; render(); }
        } else handleWrong();
    }));
    appContainer.appendChild(screen);
}

// ——— Phonics flow ———
function startMeet(setIndex) {
    activeSetIndex = setIndex;
    meetQueue = SETS[setIndex].letters.slice();
    meetIndex = 0;
    mode = 'MEET';
    preloadSounds(meetQueue);
    render();
    setTimeout(() => playLetterSound(meetQueue[0]), 400);
}

function startPractice(setIndex) {
    activeSetIndex = setIndex;
    // Ensure letters marked met if they jump to practice
    SETS[setIndex].letters.forEach(markLetterMet);
    turnsTotal = TOTAL_TURNS;
    turnsLeft = TOTAL_TURNS;
    mode = 'PRACTICE';
    preloadSounds(SETS[setIndex].letters.concat(allKnownLetters()));
    nextPracticeRound();
}

function nextPracticeRound() {
    const set = SETS[activeSetIndex];
    // 70% current set, 30% review from known
    const known = allKnownLetters();
    let pool = set.letters;
    if (known.length > set.letters.length && Math.random() < 0.3) {
        pool = known;
    }
    const letter = pool[Math.floor(Math.random() * pool.length)];
    const entry = { letter, ...LETTERS[letter] };

    practiceKind = Math.random() < 0.55 ? 'SOUND' : 'BEGINNING';
    practiceAnswer = letter;
    practiceEntry = entry;

    // Distractors from known letters, different files when possible
    const opts = new Set([letter]);
    const distractorPool = shuffle(known.filter(l => l !== letter));
    for (const d of distractorPool) {
        if (opts.size >= 3) break;
        // Avoid C vs K as only distractor pair when same sound
        if ((letter === 'C' && d === 'K') || (letter === 'K' && d === 'C')) continue;
        opts.add(d);
    }
    // pad from set
    for (const d of shuffle(set.letters)) {
        if (opts.size >= 3) break;
        if (d !== letter) opts.add(d);
    }
    currentOptions = shuffle([...opts]);

    render();
    setTimeout(() => {
        if (practiceKind === 'SOUND') playLetterSound(letter);
        else playLetterSound(letter); // still cue the sound after showing picture
    }, 400);
}

function handlePracticeClick(letter) {
    if (coolingDown) return;
    if (letter === practiceAnswer) {
        stopSound();
        playCorrect();
        setTimeout(() => playLetterSound(practiceAnswer), 120);
        triggerSuccess(() => {
            turnsLeft--;
            if (turnsLeft <= 0) {
                markSetPracticed(SETS[activeSetIndex].id);
                mode = 'THE_END';
                render();
                playSuccess();
                return;
            }
            nextPracticeRound();
        });
    } else {
        stopSound();
        handleWrong(() => {
            // Replay correct sound after cooldown
            playLetterSound(practiceAnswer);
        });
    }
}

// ——— Feedback ———
function handleWrong(after) {
    playWrong();
    coolingDown = true;
    appContainer.querySelectorAll('.choice-btn').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('cooldown');
    });
    wrongOverlay.classList.remove('hidden');
    wrongProgressBar.style.transition = 'none';
    wrongProgressBar.style.width = '0%';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            wrongProgressBar.style.transition = `width ${WRONG_MS}ms linear`;
            wrongProgressBar.style.width = '100%';
        });
    });
    setTimeout(() => {
        coolingDown = false;
        wrongOverlay.classList.add('hidden');
        appContainer.querySelectorAll('.choice-btn').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('cooldown');
        });
        if (after) after();
    }, WRONG_MS);
}

function triggerSuccess(nextFn) {
    playSuccess();
    successOverlay.classList.remove('hidden');
    setTimeout(() => {
        successOverlay.classList.add('hidden');
        nextFn();
    }, 850);
}

// ——— Mini games ———
let miniGame = '';

function startMiniGame(key) {
    getAudioCtx();
    miniGame = key;
    turnsTotal = TOTAL_TURNS;
    turnsLeft = TOTAL_TURNS;
    nextMiniRound(true);
}

function nextMiniRound(isStart) {
    if (!isStart) {
        turnsLeft--;
        if (turnsLeft <= 0) {
            mode = 'THE_END';
            // reuse end but go home
            const card = el('div', 'end-card');
            appContainer.innerHTML = '';
            card.appendChild(el('div', 'prompt-emoji', '🎉'));
            card.appendChild(el('h1', null, 'You did it!'));
            card.appendChild(el('p', null, 'Nice playing'));
            const btn = el('button', 'primary-btn', 'Back to menu');
            btn.type = 'button';
            btn.onclick = goHome;
            card.appendChild(btn);
            appContainer.appendChild(card);
            playSuccess();
            return;
        }
    }
    if (miniGame === 'COUNTING') {
        countItems = Math.floor(Math.random() * 9) + 1;
        const opts = new Set([countItems]);
        while (opts.size < 3) opts.add(Math.floor(Math.random() * 9) + 1);
        currentOptions = [...opts].sort((a, b) => a - b);
        mode = 'COUNTING';
    } else if (miniGame === 'BIGGER_SMALLER') {
        let left, right;
        do {
            left = Math.floor(Math.random() * 9) + 1;
            right = Math.floor(Math.random() * 9) + 1;
        } while (left === right);
        biggerSmallerProblem = { left, right, answer: left > right ? 'LEFT' : 'RIGHT' };
        mode = 'BIGGER_SMALLER';
    } else if (miniGame === 'SHAPES') {
        currentShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const opts = new Set([currentShape.name]);
        while (opts.size < 3) opts.add(SHAPES[Math.floor(Math.random() * SHAPES.length)].name);
        currentOptions = shuffle([...opts]);
        mode = 'SHAPES';
    } else if (miniGame === 'ADDITION') {
        const a = Math.floor(Math.random() * 3) + 1;
        const b = Math.floor(Math.random() * 3) + 1;
        mathProblem = { a, b, result: a + b };
        const opts = new Set([a + b]);
        while (opts.size < 3) opts.add(Math.floor(Math.random() * 6) + 1);
        currentOptions = [...opts].sort((a, b) => a - b);
        mode = 'ADDITION';
    } else if (miniGame === 'SPELLING') {
        currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        spellingIndex = 0;
        const letters = [...new Set(currentWord.split(''))];
        const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !letters.includes(c));
        spellingOptions = shuffle([...letters, ...shuffle(pool).slice(0, Math.max(0, 4 - letters.length))]);
        mode = 'SPELLING';
    }
    render();
}

// Preload set 1
preloadSounds(SETS[0].letters);
render();
