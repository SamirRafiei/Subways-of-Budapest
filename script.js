const menuScreen = document.querySelector('#menu-screen');
const gameScreen = document.querySelector('#game-screen');

const startBtn = document.querySelector('#startButton');
const playerInput = document.querySelector('#playerName');
const displayName = document.querySelector('#displayName');
const backToMenu = document.querySelector('#backToMenu');

const board = document.querySelector('#board');
const lineName = document.querySelector('#lineName');
const timerElement = document.querySelector('#timer');
const nameError = document.querySelector('#nameError');

const rulesButton = document.querySelector('#rulesButton');
const rulesPanel = document.querySelector('#rules');
const colseRulesBtn = document.querySelector('#closeRules');

const scoresButton = document.querySelector('#scoresButton');
const scoreboard = document.querySelector('#scoreboard');
const closeScores = document.querySelector('#closeScores');

const cardDisplay = document.querySelector('#cardDisplay');
const drawCardButton = document.querySelector('#drawCardButton');

let stations = [];
let lines = [];
let timerInterval = null;
let elapsedSeconds = 0;
let currentLine = null;
let deck = [];
let currentCard = null;

async function loadData() {
    try {
        const stationsRes = await fetch('data/stations.json');
        const linesRes = await fetch('data/lines.json');

        stations = await stationsRes.json();
        lines = await linesRes.json();

        console.log("Stations loaded:", stations.length);
        console.log("Lines loaded:", lines.length);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function showGameScreen(playerName) {
    menuScreen.classList.remove('active');
    menuScreen.classList.add('hidden');

    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');

    displayName.textContent = playerName;

    if (!stations.length || !lines.length) {
        await loadData();
    }

    startTimer();
    startNewRound();
}

function backToMenuScreen() {
    gameScreen.classList.remove('active');
    gameScreen.classList.add('hidden');

    menuScreen.classList.remove('hidden');
    menuScreen.classList.add('active');

    stopTimer();
}

function startTimer() {
    elapsedSeconds = 0;
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
        const seconds = String(elapsedSeconds % 60).padStart(2, '0');
        timerElement.textContent = `time: ${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerElement.textContent = 'time: 00:00';
}

function createDeck() {
    const cards = [
        { letter: 'A', platform: 'side',   type: 'normal' },
        { letter: 'B', platform: 'side',   type: 'normal' },
        { letter: 'C', platform: 'side',   type: 'normal' },
        { letter: 'D', platform: 'side',   type: 'normal' },
        { letter: 'J', platform: 'side',   type: 'joker' },

        { letter: 'A', platform: 'center', type: 'normal' },
        { letter: 'B', platform: 'center', type: 'normal' },
        { letter: 'C', platform: 'center', type: 'normal' },
        { letter: 'D', platform: 'center', type: 'normal' },
        { letter: 'J', platform: 'center', type: 'joker' },

        { letter: '',  platform: 'center', type: 'switch' }
    ];

    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
}

function resetDeckForRound() {
    deck = createDeck();
    currentCard = null;
    drawCardButton.disabled = false;
    updateCardDisplay(null);
}

function updateCardDisplay(card) {
    cardDisplay.classList.remove('card-side', 'card-center', 'card-switch');

    if (!card) {
        cardDisplay.textContent = '-';
        return;
    }

    let label = card.letter;
    let meta = '';

    if (card.type === 'switch') {
        label = '<->';
        meta = 'Switch - center';
        cardDisplay.classList.add('card-switch');
    } else {
        meta = `${card.letter === 'J' ? 'Joker' : card.letter} - ${card.platform}`;
        if (card.platform === 'side') {
            cardDisplay.classList.add('card-side');
        } else {
            cardDisplay.classList.add('card-center');
        }
    }

    cardDisplay.innerHTML = `
        <div class="card-letter">${label}</div>
        <div class="card-meta">${meta}</div>
    `;
}

function showMessage(text) {
    const msg = document.querySelector('#messageBox');
    if (!msg) return;
    msg.textContent = text;
    setTimeout(() => {
        if (msg.textContent === text) {
            msg.textContent = '';
        }
    }, 2000);
}

function handleStationClick(station) {
    if (!currentCard) {
        showMessage('draw a card first');
        return;
    }

    if (currentCard.type === 'switch') {
        showMessage('switch active: station matching will be handled later');
        return;
    }

    if (currentCard.type !== 'switch') {
        if (currentCard.letter !== 'J' && station.type !== currentCard.letter) {
            showMessage('this station does not match the card');
            return;
        }
    }

    showMessage('station selected');
}

function startNewRound() {
    if (!lines.length) return;

    const randomIndex = Math.floor(Math.random() * lines.length);
    currentLine = lines[randomIndex];
    lineName.textContent = `${currentLine.name} (${currentLine.color})`;

    generateBoard();
    resetDeckForRound();
}

function generateBoard() {
    board.innerHTML = '';
    const gridSize = 10;

    for (let y = 0; y < gridSize; y++) {
        const row = document.createElement('tr');

        for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement('td');

            const station = stations.find(s => s.x === x && s.y === y);
            if (station) {
                cell.textContent = station.type;
                cell.classList.add('station');

                if (station.id === currentLine.start) {
                    cell.style.backgroundColor = currentLine.color;
                    cell.style.color = 'white';
                    cell.classList.add('start-station');
                }

                cell.addEventListener('click', () => {
                    handleStationClick(station);
                });
            }

            row.appendChild(cell);
        }

        board.appendChild(row);
    }
}

startBtn.addEventListener('click', () => {
    const name = playerInput.value.trim();

    if (name === '') {
        nameError.textContent = 'please enter your name before staring the game';
        nameError.classList.remove('hidden');
        playerInput.focus();
        return;
    }

    nameError.textContent = '';
    nameError.classList.add('hidden');
    showGameScreen(name);
});

rulesButton.addEventListener('click', () => {
    rulesPanel.classList.remove('hidden');
    scoreboard.classList.add('hidden');
});

colseRulesBtn.addEventListener('click', () => {
    rulesPanel.classList.add('hidden');
});

scoresButton.addEventListener('click', () => {
    scoreboard.classList.remove('hidden');
    rulesPanel.classList.add('hidden');
});

closeScores.addEventListener('click', () => {
    scoreboard.classList.add('hidden');
});

backToMenu.addEventListener('click', backToMenuScreen);

drawCardButton.addEventListener('click', () => {
    if (deck.length === 0) {
        drawCardButton.disabled = true;
        return;
    }

    currentCard = deck.pop();
    updateCardDisplay(currentCard);
});

loadData();
