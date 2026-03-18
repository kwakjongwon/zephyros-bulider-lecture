class LottoBall extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const number = Number(this.getAttribute('number'));
        const color = this.getColorForNumber(number);
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                }
                .ball {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 24px;
                    font-weight: bold;
                    color: white;
                    background-color: ${color};
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    animation: bounce-in 0.5s ease;
                }
                @keyframes bounce-in {
                    0% {
                        transform: scale(0.5);
                        opacity: 0;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
            </style>
            <div class="ball">${number}</div>
        `;
    }

    getColorForNumber(number) {
        const colors = ['#f5a623', '#4a90e2', '#7ed321', '#d0021b', '#bd10e0'];
        return colors[(number - 1) % colors.length];
    }
}

customElements.define('lotto-ball', LottoBall);

const themeToggleButton = document.getElementById('theme-toggle');
const generateButton = document.getElementById('generate-btn');
const numbersContainer = document.getElementById('numbers-container');
const storageKey = 'lotto-theme';

function applyTheme(theme) {
    const isDarkMode = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDarkMode);
    themeToggleButton.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    themeToggleButton.setAttribute('aria-pressed', String(isDarkMode));
}

function getInitialTheme() {
    const savedTheme = localStorage.getItem(storageKey);
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function generateNumbers() {
    numbersContainer.innerHTML = '';
    const numbers = new Set();

    while (numbers.size < 6) {
        numbers.add(Math.floor(Math.random() * 45) + 1);
    }

    [...numbers].sort((a, b) => a - b).forEach((number) => {
        const lottoBall = document.createElement('lotto-ball');
        lottoBall.setAttribute('number', number);
        numbersContainer.appendChild(lottoBall);
    });
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

themeToggleButton.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(storageKey, nextTheme);
});

generateButton.addEventListener('click', generateNumbers);
