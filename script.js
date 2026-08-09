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
    set.letters.forEach(L => {
        tiles.appendChild(el('div', 'letter-tile', L));
    });
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
