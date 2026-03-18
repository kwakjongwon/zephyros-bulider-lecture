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
const partnershipForm = document.getElementById('partnership-form');
const formStatus = document.getElementById('form-status');
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

async function submitPartnershipForm(event) {
    event.preventDefault();

    const submitButton = partnershipForm.querySelector('.submit-button');
    const formData = new FormData(partnershipForm);

    submitButton.disabled = true;
    formStatus.textContent = '문의 전송 중입니다...';
    formStatus.className = 'form-status';

    try {
        const response = await fetch(partnershipForm.action, {
            method: 'POST',
            body: formData,
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Form submission failed');
        }

        partnershipForm.reset();
        formStatus.textContent = '문의가 전송되었습니다. 확인 후 회신드릴게요.';
        formStatus.className = 'form-status is-success';
    } catch (error) {
        formStatus.textContent = '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        formStatus.className = 'form-status is-error';
    } finally {
        submitButton.disabled = false;
    }
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

themeToggleButton.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(storageKey, nextTheme);
});

generateButton.addEventListener('click', generateNumbers);
partnershipForm.addEventListener('submit', submitPartnershipForm);
