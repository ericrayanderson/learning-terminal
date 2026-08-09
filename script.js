        const prompt = el('button', 'prompt-big');
        prompt.type = 'button';
        if (quizKind === 'PIC') {
            prompt.innerHTML = `<span class="prompt-big-emoji">${answer.emoji}</span>`;
        } else {
            prompt.innerHTML = `<span class="prompt-big-icon">🔊</span>`;
        }
        prompt.onclick = () => {
            if (!coolingDown) playLetter(answer);
        };
        screen.appendChild(prompt);
