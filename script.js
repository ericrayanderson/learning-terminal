const WORDS = ['CAT', 'DOG', 'BOX', 'SUN', 'CUP', 'HAT', 'PIG', 'BED'];
const WORD_EMOJI = {
    CAT: '🐱', DOG: '🐶', BOX: '📦', SUN: '☀️',
    CUP: '☕', HAT: '🎩', PIG: '🐷', BED: '🛏️'
};
let mode = 'HOME';
let pendingGame = '';
let turnsLeft = 0;

// --- Audio ---
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // Play a silent buffer immediately to unlock audio on iOS
        const buf = audioCtx.createBuffer(1, 1, 22050);
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtx.destination);
        src.start(0);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(ctx, freq, startTime, duration, type = 'square', gain = 0.15) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function playCorrect() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    playTone(ctx, 440, t, 0.1);
    playTone(ctx, 660, t + 0.08, 0.12);
}

function playWrong() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    playTone(ctx, 220, t, 0.15, 'sawtooth', 0.1);
    playTone(ctx, 180, t + 0.1, 0.15, 'sawtooth', 0.1);
}

function playSuccess() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
        playTone(ctx, freq, t + 0.15 + i * 0.1, 0.15);
    });
}

function playTheEnd() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    [784, 659, 523, 392, 330].forEach((freq, i) => {
        playTone(ctx, freq, t + i * 0.25, 0.3, 'square', 0.18);
    });
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance('The End');
        utterance.rate = 0.7;
        utterance.pitch = 0.8;
        window.speechSynthesis.speak(utterance);
    }, 1500);
}
// --- End Audio ---

let currentWord = '';
let spellingIndex = 0;
let countItems = 0;
let mathProblem = { a: 0, b: 0, result: 0 };
let currentOptions = [];
let spellingOptions = [];

const appContainer = document.getElementById('app-container');
const successOverlay = document.getElementById('success-overlay');

function render() {
    appContainer.innerHTML = '';

    if (mode === 'HOME') {
        const menu = document.createElement('div');
        menu.className = 'menu';

        const h1 = document.createElement('h1');
        h1.innerText = 'LEARNING TERMINAL';
        menu.appendChild(h1);

        const line = document.createElement('div');
        line.className = 'line';
        line.innerText = '══════════════════════════════';
        menu.appendChild(line);

        const btnSpelling = document.createElement('button');
        btnSpelling.innerText = '[ SPELLING ]';
        btnSpelling.onclick = () => selectGame('SPELLING');
        menu.appendChild(btnSpelling);

        const btnCounting = document.createElement('button');
        btnCounting.innerText = '[ COUNTING ]';
        btnCounting.onclick = () => selectGame('COUNTING');
        menu.appendChild(btnCounting);

        const btnAddition = document.createElement('button');
        btnAddition.innerText = '[ ADDITION ]';
        btnAddition.onclick = () => selectGame('ADDITION');
        menu.appendChild(btnAddition);

        appContainer.appendChild(menu);

    } else if (mode === 'TURN_SELECT') {
        const menu = document.createElement('div');
        menu.className = 'menu';

        const h1 = document.createElement('h1');
        h1.innerText = 'HOW MANY TURNS?';
        menu.appendChild(h1);

        const line = document.createElement('div');
        line.className = 'line';
        line.innerText = '══════════════════════════════';
        menu.appendChild(line);

        [10, 20].forEach(n => {
            const btn = document.createElement('button');
            btn.innerText = `[ ${n} TURNS ]`;
            btn.onclick = () => startGameWithTurns(n);
            menu.appendChild(btn);
        });

        const backBtn = document.createElement('button');
        backBtn.className = 'back-btn';
        backBtn.innerText = 'RETURN TO MENU';
        backBtn.onclick = () => { mode = 'HOME'; render(); };
        menu.appendChild(backBtn);

        appContainer.appendChild(menu);

    } else if (mode === 'SPELLING') {
        const screen = document.createElement('div');
        screen.className = 'game-screen';

        const box = document.createElement('div');
        box.className = 'box-border';
        const h2 = document.createElement('h2');
        h2.innerText = 'SPELL THE WORD';
        box.appendChild(h2);

        const emoji = document.createElement('div');
        emoji.className = 'word-emoji';
        emoji.innerText = WORD_EMOJI[currentWord];
        box.appendChild(emoji);

        const h1 = document.createElement('h1');
        h1.className = 'display-text';
        currentWord.split('').forEach((char, i) => {
            const span = document.createElement('span');
            span.innerText = char;
            if (i < spellingIndex) {
                span.style.color = 'var(--green)';
                span.style.textDecoration = 'none';
            } else if (i === spellingIndex) {
                span.style.color = '#114411';
                span.style.textDecoration = 'underline';
            } else {
                span.style.color = '#114411';
                span.style.textDecoration = 'none';
            }
            h1.appendChild(span);
        });
        box.appendChild(h1);
        screen.appendChild(box);

        const controls = document.createElement('div');
        controls.className = 'controls';
        spellingOptions.forEach(l => {
            const btn = document.createElement('button');
            btn.className = 'big-letter-btn';
            btn.innerText = l;
            btn.onclick = () => handleLetterClick(l);
            controls.appendChild(btn);
        });
        screen.appendChild(controls);

        const backBtn = document.createElement('button');
        backBtn.className = 'back-btn';
        backBtn.innerText = 'RETURN TO MENU';
        backBtn.onclick = () => { mode = 'HOME'; render(); };
        screen.appendChild(backBtn);

        appContainer.appendChild(screen);

    } else if (mode === 'COUNTING') {
        const screen = document.createElement('div');
        screen.className = 'game-screen';

        const box = document.createElement('div');
        box.className = 'box-border';
        const h2 = document.createElement('h2');
        h2.innerText = 'HOW MANY?';
        box.appendChild(h2);

        const items = document.createElement('div');
        items.className = 'items-display';
        for (let i = 0; i < countItems; i++) {
            const span = document.createElement('span');
            span.className = 'item-icon';
            span.innerText = '●';
            items.appendChild(span);
        }
        box.appendChild(items);
        screen.appendChild(box);

        const controls = document.createElement('div');
        controls.className = 'controls';
        currentOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.onclick = () => handleCountClick(opt);
            controls.appendChild(btn);
        });
        screen.appendChild(controls);

        const backBtn = document.createElement('button');
        backBtn.className = 'back-btn';
        backBtn.innerText = 'RETURN TO MENU';
        backBtn.onclick = () => { mode = 'HOME'; render(); };
        screen.appendChild(backBtn);

        appContainer.appendChild(screen);

    } else if (mode === 'ADDITION') {
        const screen = document.createElement('div');
        screen.className = 'game-screen';

        const box = document.createElement('div');
        box.className = 'box-border';
        const h2 = document.createElement('h2');
        h2.innerText = 'SOLVE THE PROBLEM';
        box.appendChild(h2);

        const mathVisual = document.createElement('div');
        mathVisual.className = 'math-visual';

        [mathProblem.a, mathProblem.b].forEach((num, idx) => {
            const group = document.createElement('div');
            group.className = 'addend-group';

            const numEl = document.createElement('div');
            numEl.className = 'addend-number';
            numEl.innerText = num;
            group.appendChild(numEl);

            const circles = document.createElement('div');
            circles.className = 'addend-circles';
            for (let i = 0; i < num; i++) {
                const span = document.createElement('span');
                span.className = 'item-icon';
                span.innerText = '●';
                circles.appendChild(span);
            }
            group.appendChild(circles);
            mathVisual.appendChild(group);

            if (idx === 0) {
                const plus = document.createElement('div');
                plus.className = 'math-operator';
                plus.innerText = '+';
                mathVisual.appendChild(plus);
            }
        });

        const eq = document.createElement('div');
        eq.className = 'math-operator';
        eq.innerText = '= ?';
        mathVisual.appendChild(eq);

        box.appendChild(mathVisual);
        screen.appendChild(box);

        const controls = document.createElement('div');
        controls.className = 'controls';
        currentOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.onclick = () => handleAdditionClick(opt);
            controls.appendChild(btn);
        });
        screen.appendChild(controls);

        const backBtn = document.createElement('button');
        backBtn.className = 'back-btn';
        backBtn.innerText = 'RETURN TO MENU';
        backBtn.onclick = () => { mode = 'HOME'; render(); };
        screen.appendChild(backBtn);

        appContainer.appendChild(screen);

    } else if (mode === 'THE_END') {
        const screen = document.createElement('div');
        screen.className = 'game-screen';

        const box = document.createElement('div');
        box.className = 'box-border';

        const h1 = document.createElement('h1');
        h1.className = 'display-text';
        h1.innerText = 'THE END';
        box.appendChild(h1);

        screen.appendChild(box);

        const backBtn = document.createElement('button');
        backBtn.innerText = 'RETURN TO MENU';
        backBtn.onclick = () => { mode = 'HOME'; render(); };
        screen.appendChild(backBtn);

        appContainer.appendChild(screen);
    }
}

function triggerSuccess(nextFn) {
    playSuccess();
    successOverlay.classList.remove('hidden');
    setTimeout(() => {
        successOverlay.classList.add('hidden');
        nextFn();
    }, 1000);
}

function selectGame(game) {
    pendingGame = game;
    mode = 'TURN_SELECT';
    render();
}

function startGameWithTurns(turns) {
    turnsLeft = turns;
    if (pendingGame === 'SPELLING') startSpelling();
    else if (pendingGame === 'COUNTING') startCounting();
    else if (pendingGame === 'ADDITION') startAddition();
}

function nextRound() {
    turnsLeft--;
    if (turnsLeft <= 0) {
        mode = 'THE_END';
        render();
        playTheEnd();
        return;
    }
    if (pendingGame === 'SPELLING') startSpelling();
    else if (pendingGame === 'COUNTING') startCounting();
    else if (pendingGame === 'ADDITION') startAddition();
}

function generateSpellingOptions(word) {
    const letters = [...new Set(word.split(''))];
    const distractors = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        .split('').filter(c => !letters.includes(c))
        .sort(() => 0.5 - Math.random())
        .slice(0, 4 - letters.length);
    spellingOptions = [...letters, ...distractors].sort(() => 0.5 - Math.random());
}

function startSpelling() {
    currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    spellingIndex = 0;
    generateSpellingOptions(currentWord);
    mode = 'SPELLING';
    render();
}

function handleLetterClick(letter) {
    if (letter === currentWord[spellingIndex]) {
        playCorrect();
        if (spellingIndex + 1 === currentWord.length) {
            triggerSuccess(() => nextRound());
        } else {
            spellingIndex++;
            render();
        }
    } else {
        playWrong();
    }
}

function startCounting() {
    countItems = Math.floor(Math.random() * 9) + 1;
    let opts = [countItems];
    while (opts.length < 3) {
        let r = Math.floor(Math.random() * 9) + 1;
        if (!opts.includes(r)) opts.push(r);
    }
    currentOptions = opts.sort((a, b) => a - b);
    mode = 'COUNTING';
    render();
}

function handleCountClick(num) {
    if (num === countItems) {
        playCorrect();
        triggerSuccess(() => nextRound());
    } else {
        playWrong();
    }
}

function startAddition() {
    const a = Math.floor(Math.random() * 3) + 1;
    const b = Math.floor(Math.random() * 3) + 1;
    const res = a + b;
    mathProblem = { a, b, result: res };

    let opts = [res];
    while (opts.length < 3) {
        let r = Math.floor(Math.random() * 6) + 1;
        if (!opts.includes(r)) opts.push(r);
    }
    currentOptions = opts.sort((a, b) => a - b);
    mode = 'ADDITION';
    render();
}

function handleAdditionClick(num) {
    if (num === mathProblem.result) {
        playCorrect();
        triggerSuccess(() => nextRound());
    } else {
        playWrong();
    }
}

// Initial render
render();
