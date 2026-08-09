/**
 * Learning Terminal — phonics-first for ~age 4
 * Big, simple screens: a couple of large buttons each.
 *
 * Letter sounds: human recordings from Buzzphonics (MIT)
 *   https://github.com/hellodeborahuk/buzzphonics
 */

const STORAGE_KEY = 'lt-phonics-progress-v1';

const SETS = [
    { id: 'set1', title: 'Set 1', subtitle: 's a t p', letters: ['S', 'A', 'T', 'P'] },
    { id: 'set2', title: 'Set 2', subtitle: 'i n m d', letters: ['I', 'N', 'M', 'D'] },
    { id: 'set3', title: 'Set 3', subtitle: 'g o c k', letters: ['G', 'O', 'C', 'K'] },
    { id: 'set4', title: 'Set 4', subtitle: 'e u r', letters: ['E', 'U', 'R'] },
    { id: 'set5', title: 'Set 5', subtitle: 'h b f l', letters: ['H', 'B', 'F', 'L'] }
];

const LETTERS = {
    S: { file: 's', word: 'sun', emoji: '☀️' },
    A: { file: 'a', word: 'apple', emoji: '🍎' },
    T: { file: 't', word: 'tree', emoji: '🌳' },
    P: { file: 'p', word: 'pig', emoji: '🐷' },
    I: { file: 'i', word: 'igloo', emoji: '🧊' },
    N: { file: 'n', word: 'nest', emoji: '🪺' },
    M: { file: 'm', word: 'moon', emoji: '🌙' },
    D: { file: 'd', word: 'dog', emoji: '🐶' },
    G: { file: 'g', word: 'goat', emoji: '🐐' },
    O: { file: 'o', word: 'octopus', emoji: '🐙' },
    C: { file: 'c', word: 'cat', emoji: '🐱' },
    K: { file: 'c', word: 'kite', emoji: '🪁' },
    E: { file: 'e', word: 'egg', emoji: '🥚' },
    U: { file: 'u', word: 'umbrella', emoji: '☂️' },
    R: { file: 'r', word: 'rabbit', emoji: '🐰' },
    H: { file: 'h', word: 'hat', emoji: '🎩' },
    B: { file: 'b', word: 'bus', emoji: '🚌' },
    F: { file: 'f', word: 'fish', emoji: '🐟' },
    L: { file: 'l', word: 'lion', emoji: '🦁' }
};

const TOTAL_TURNS = 6;
const WRONG_MS = 2000;

function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
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
function isSetUnlocked(index) {
    if (index === 0) return true;
    return isSetComplete(SETS[index - 1].id);
}
function currentSetIndex() {
    for (let i = 0; i < SETS.length; i++) {
        if (isSetUnlocked(i) && !isSetComplete(SETS[i].id)) return i;
    }
    return SETS.length - 1;
}
function allKnownLetters() {
    const known = new Set();
    SETS.forEach((set, i) => {
        if (isSetUnlocked(i)) set.letters.forEach(l => known.add(l));
    });
    SETS[0].letters.forEach(l => known.add(l));
    return [...known];
}

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
    return `./sounds/${LETTERS[letter].file}.m4a`;
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
}
function playLetterSound(letter) {
    stopSound();
    getAudioCtx();
    const url = soundUrl(letter);
    let a = audioCache.get(url);
    if (!a) {
        a = new Audio(url);
        audioCache.set(url, a);
    }
    a.pause();
    a.currentTime = 0;
    currentAudio = a;
    return a.play().catch(() => {});
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

let mode = 'HOME';
let activeSetIndex = 0;
let meetQueue = [];
let meetIndex = 0;
let practiceKind = 'SOUND';
let practiceAnswer = '';
let practiceEntry = null;
let turnsLeft = 0;
let turnsTotal = TOTAL_TURNS;
let currentOptions = [];
let coolingDown = false;
let boardPage = 0;
let boardLetters = [];

const appContainer = document.getElementById('app-container');
const successOverlay = document.getElementById('success-overlay');
const wrongOverlay = document.getElementById('wrong-overlay');
const wrongProgressBar = document.getElementById('wrong-progress-bar');

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
function goSet() {
    stopSound();
    coolingDown = false;
    activeSetIndex = currentSetIndex();
    mode = 'SET';
    render();
}
function turnsDone() {
    return turnsTotal - turnsLeft;
}

function bigActions(buttons) {
    const wrap = el('div', 'big-actions');
    buttons.forEach((b, i) => {
        const btn = el(
            'button',
            'big-btn' + (i === 0 ? ' primary' : ' secondary') + (b.extraClass ? ' ' + b.extraClass : ''),
            b.label
        );
        btn.type = 'button';
        if (b.disabled) btn.disabled = true;
        btn.onclick = b.onClick;
        wrap.appendChild(btn);
    });
    return wrap;
}

function screenShell(opts = {}) {
    const screen = el('div', 'simple-screen');
    if (opts.kicker) screen.appendChild(el('p', 'screen-kicker', opts.kicker));
    if (opts.title) screen.appendChild(el('h1', 'screen-title', opts.title));
    if (opts.sub) screen.appendChild(el('p', 'screen-sub', opts.sub));
    return screen;
}

function render() {
    appContainer.innerHTML = '';
    if (mode === 'HOME') renderHome();
    else if (mode === 'SET') renderSet();
    else if (mode === 'MEET') renderMeet();
    else if (mode === 'PRACTICE') renderPractice();
    else if (mode === 'BOARD') renderBoard();
    else if (mode === 'THE_END') renderEnd();
}

function renderHome() {
    const screen = screenShell({
        kicker: 'Learning Terminal',
        title: 'Letter sounds',
        sub: 'Tap one big button'
    });
    screen.appendChild(bigActions([
        {
            label: 'Learn',
            onClick: () => {
                getAudioCtx();
                goSet();
            }
        },
        {
            label: 'Play sounds',
            onClick: () => {
                getAudioCtx();
                boardLetters = SETS[currentSetIndex()].letters.slice();
                boardPage = 0;
                preloadSounds(boardLetters);
                mode = 'BOARD';
                render();
            }
        }
    ]));
    appContainer.appendChild(screen);
}

function renderSet() {
    const set = SETS[activeSetIndex];
    const done = isSetComplete(set.id);
    const canNext = done && activeSetIndex < SETS.length - 1;

    const screen = screenShell({
        kicker: set.title,
        title: set.subtitle.toUpperCase(),
        sub: done ? 'You practiced this set!' : 'Learn the letters, then practice'
    });

    const tiles = el('div', 'letter-tiles');
    set.letters.forEach(L => tiles.appendChild(el('div', 'letter-tile', L)));
    screen.appendChild(tiles);

    if (canNext) {
        screen.appendChild(bigActions([
            {
                label: 'Next set',
                onClick: () => {
                    activeSetIndex = activeSetIndex + 1;
                    render();
                }
            },
            {
                label: 'Practice again',
                onClick: () => startPractice(activeSetIndex)
            }
        ]));
    } else {
        screen.appendChild(bigActions([
            {
                label: 'Learn letters',
                onClick: () => startMeet(activeSetIndex)
            },
            {
                label: done ? 'Practice again' : 'Practice',
                onClick: () => startPractice(activeSetIndex)
            }
        ]));
    }

    const homeLink = el('button', 'text-link', 'Home');
    homeLink.type = 'button';
    homeLink.onclick = goHome;
    screen.appendChild(homeLink);
    appContainer.appendChild(screen);
}

function renderMeet() {
    const letter = meetQueue[meetIndex];
    const info = LETTERS[letter];
    const screen = screenShell({
        kicker: `Letter ${meetIndex + 1} of ${meetQueue.length}`,
        title: letter,
        sub: `${info.word}  ${info.emoji}`
    });

    const show = el('div', 'giant-show');
    show.appendChild(el('div', 'giant-letter', letter));
    show.appendChild(el('div', 'giant-emoji', info.emoji));
    screen.appendChild(show);

    screen.appendChild(bigActions([
        {
            label: 'Hear sound',
            onClick: () => playLetterSound(letter)
        },
        {
            label: meetIndex + 1 < meetQueue.length ? 'Next' : 'Practice',
            onClick: () => {
                markLetterMet(letter);
                stopSound();
                if (meetIndex + 1 < meetQueue.length) {
                    meetIndex++;
                    render();
                    setTimeout(() => playLetterSound(meetQueue[meetIndex]), 300);
                } else {
                    startPractice(activeSetIndex);
                }
            }
        }
    ]));
    appContainer.appendChild(screen);
}

function renderPractice() {
    const screen = screenShell({
        kicker: `Round ${turnsDone() + 1} of ${turnsTotal}`,
        title: practiceKind === 'BEGINNING' ? 'Starts with?' : 'Which letter?',
        sub: practiceKind === 'BEGINNING' ? practiceEntry.word : 'Listen, then pick'
    });

    const prompt = el('button', 'prompt-big');
    prompt.type = 'button';
    if (practiceKind === 'BEGINNING') {
        prompt.innerHTML = `<span class="prompt-big-emoji">${practiceEntry.emoji}</span>`;
    } else {
        prompt.innerHTML = `<span class="prompt-big-icon">🔊</span><span class="prompt-big-label">Tap to hear</span>`;
    }
    prompt.onclick = () => {
        if (!coolingDown) playLetterSound(practiceAnswer);
    };
    screen.appendChild(prompt);

    const choices = el('div', 'big-actions row');
    currentOptions.forEach(opt => {
        const btn = el('button', 'big-btn letter-choice', opt);
        btn.type = 'button';
        btn.onclick = () => handlePracticeClick(opt);
        choices.appendChild(btn);
    });
    screen.appendChild(choices);
    appContainer.appendChild(screen);
}

function renderBoard() {
    const pair = boardLetters.slice(boardPage * 2, boardPage * 2 + 2);
    const totalPages = Math.ceil(boardLetters.length / 2) || 1;

    const screen = screenShell({
        kicker: 'Play sounds',
        title: 'Tap a letter',
        sub: `Page ${boardPage + 1} of ${totalPages}`
    });

    const choices = el('div', 'big-actions row');
    pair.forEach(L => {
        const info = LETTERS[L];
        const btn = el('button', 'big-btn letter-choice board-letter-btn');
        btn.type = 'button';
        btn.innerHTML = `<span class="bl">${L}</span><span class="be">${info.emoji}</span>`;
        btn.onclick = () => {
            getAudioCtx();
            playLetterSound(L);
            markLetterMet(L);
        };
        choices.appendChild(btn);
    });
    screen.appendChild(choices);

    const nav = [];
    if (boardPage + 1 < totalPages) {
        nav.push({
            label: 'More letters',
            onClick: () => {
                boardPage++;
                render();
            }
        });
    } else if (totalPages > 1) {
        nav.push({
            label: 'Start over',
            onClick: () => {
                boardPage = 0;
                render();
            }
        });
    }
    nav.push({ label: 'Home', onClick: goHome });
    if (nav.length === 1) {
        nav.unshift({ label: 'Learn', onClick: goSet });
    }
    screen.appendChild(bigActions(nav.slice(0, 2)));
    appContainer.appendChild(screen);
}

function renderEnd() {
    const screen = screenShell({
        kicker: 'All done',
        title: 'Great job!',
        sub: 'You matched the letter sounds'
    });
    screen.appendChild(el('div', 'end-star', '⭐'));

    const moreSets = activeSetIndex < SETS.length - 1;
    screen.appendChild(bigActions([
        moreSets
            ? {
                label: 'Next set',
                onClick: () => {
                    activeSetIndex = activeSetIndex + 1;
                    mode = 'SET';
                    render();
                }
            }
            : {
                label: 'Practice again',
                onClick: () => startPractice(activeSetIndex)
            },
        { label: 'Home', onClick: goHome }
    ]));
    appContainer.appendChild(screen);
}

function startMeet(setIndex) {
    activeSetIndex = setIndex;
    meetQueue = SETS[setIndex].letters.slice();
    meetIndex = 0;
    mode = 'MEET';
    preloadSounds(meetQueue);
    render();
    setTimeout(() => playLetterSound(meetQueue[0]), 350);
}

function startPractice(setIndex) {
    activeSetIndex = setIndex;
    SETS[setIndex].letters.forEach(markLetterMet);
    turnsTotal = TOTAL_TURNS;
    turnsLeft = TOTAL_TURNS;
    mode = 'PRACTICE';
    preloadSounds(SETS[setIndex].letters.concat(allKnownLetters()));
    nextPracticeRound();
}

function nextPracticeRound() {
    const set = SETS[activeSetIndex];
    const known = allKnownLetters();
    let pool = set.letters;
    if (known.length > set.letters.length && Math.random() < 0.25) pool = known;

    const letter = pool[Math.floor(Math.random() * pool.length)];
    practiceKind = Math.random() < 0.55 ? 'SOUND' : 'BEGINNING';
    practiceAnswer = letter;
    practiceEntry = { letter, ...LETTERS[letter] };

    const opts = new Set([letter]);
    const distractors = shuffle(known.filter(l => {
        if (l === letter) return false;
        if ((letter === 'C' && l === 'K') || (letter === 'K' && l === 'C')) return false;
        return true;
    }));
    if (distractors[0]) opts.add(distractors[0]);
    while (opts.size < 2) {
        const d = set.letters[Math.floor(Math.random() * set.letters.length)];
        if (d !== letter) opts.add(d);
    }
    currentOptions = shuffle([...opts]);

    render();
    setTimeout(() => playLetterSound(letter), 350);
}

function handlePracticeClick(letter) {
    if (coolingDown) return;
    if (letter === practiceAnswer) {
        stopSound();
        playCorrect();
        setTimeout(() => playLetterSound(practiceAnswer), 100);
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
        handleWrong(() => playLetterSound(practiceAnswer));
    }
}

function handleWrong(after) {
    playWrong();
    coolingDown = true;
    appContainer.querySelectorAll('.big-btn').forEach(btn => {
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
        appContainer.querySelectorAll('.big-btn').forEach(btn => {
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
    }, 800);
}

preloadSounds(SETS[0].letters);
render();
