const menuScreen = document.querySelector('#menu-screen');
const gameScreen = document.querySelector('#game-screen');

const startBtn = document.querySelector('#startButton');
const playerInput = document.querySelector('#playerName');
const displayName = document.querySelector('#displayName');
const backToMenu = document.querySelector('#backToMenu');

const board = document.querySelector('#board');
const boardOverlay = document.querySelector('#boardOverlay');
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

const stationCells = new Map();
const roundText = document.querySelector('#roundText');
const nextRoundButton = document.querySelector('#nextRoundButton');

let lineOrder = [];
let currentRoundIndex = 0;
let cardsDrawnThisRound = 0;


let stations = [];
let lines = [];
let timerInterval = null;
let elapsedSeconds = 0;
let currentLine = null;

let deck = [];
let currentCard = null;

let segments = [];
let visitedStations = [];
let endpoints = [];
let currentStartStation = null;

async function loadData() {
    try {
        const stationsRes = await fetch('data/stations.json');
        const linesRes = await fetch('data/lines.json');

        stations = await stationsRes.json();
        lines = await linesRes.json();

        console.log('Stations loaded:', stations.length);
        console.log('Lines loaded:', lines.length);
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
    if (!lineOrder.length) {
    initLineOrder();
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
    cardsDrawnThisRound = 0;
    drawCardButton.disabled = false;
    nextRoundButton.disabled = true;
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

function getStationById(id) {
    return stations.find(s => s.id === id);
}

function areAdjacent(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (dx === 0 && dy === 0) return false;
    if (!(dx === 0 || dy === 0 || dx === dy)) return false;
    if (dx > 1 || dy > 1) return false;
    return true;
}

function refreshEndpointStyles() {
    stationCells.forEach(cell => {
        cell.classList.remove('endpoint-station');
    });
    endpoints.forEach(id => {
        const cell = stationCells.get(id);
        if (cell) {
            cell.classList.add('endpoint-station');
        }
    });
}

function drawSegment(fromStation, toStation) {
    if (!boardOverlay) return;

    const fromCell = stationCells.get(fromStation.id);
    const toCell = stationCells.get(toStation.id);
    if (!fromCell || !toCell) return;

    const boardRect = boardOverlay.getBoundingClientRect();
    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();

    const x1 = fromRect.left + fromRect.width / 2 - boardRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - boardRect.top;
    const x2 = toRect.left + toRect.width / 2 - boardRect.left;
    const y2 = toRect.top + toRect.height / 2 - boardRect.top;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    const line = document.createElement('div');
    line.classList.add('segment-line');
    line.style.width = `${length}px`;
    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    line.style.transform = `translateY(-50%) rotate(${angle}deg)`;
    line.style.backgroundColor = currentLine.color;

    boardOverlay.appendChild(line);
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

    if (!currentStartStation) {
        showMessage('no start station for this line');
        return;
    }

    if (visitedStations.includes(station.id)) {
        showMessage('this station is already used by this line');
        return;
    }

    if (segments.length === 0) {
        if (!areAdjacent(currentStartStation, station)) {
            showMessage('first segment must be next to the start station');
            return;
        }
        if (station.id === currentStartStation.id) {
            showMessage('choose a different station');
            return;
        }

        drawSegment(currentStartStation, station);
        segments.push({ from: currentStartStation.id, to: station.id });
        visitedStations.push(station.id);
        endpoints = [currentStartStation.id, station.id];
        refreshEndpointStyles();
        showMessage('first segment drawn');
        return;
    }

    const fromEndpointId = endpoints.find(id => {
        const ep = getStationById(id);
        return ep && areAdjacent(ep, station);
    });

    if (!fromEndpointId) {
        showMessage('you must connect from an endpoint of this line');
        return;
    }

    const fromStation = getStationById(fromEndpointId);
    if (!fromStation) return;

    drawSegment(fromStation, station);
    segments.push({ from: fromStation.id, to: station.id });
    visitedStations.push(station.id);

    endpoints = endpoints.filter(id => id !== fromStation.id);
    endpoints.push(station.id);
    refreshEndpointStyles();

    showMessage('segment drawn');
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function initLineOrder() {
    lineOrder = [...lines];
    shuffleArray(lineOrder);
    currentRoundIndex = 0;
}

function updateRoundLabel() {
    if (!roundText) return;
    const total = lineOrder.length || 4;
    roundText.textContent = `${currentRoundIndex + 1} / ${total}`;
}


function startNewRound() {
    if (!lines.length) return;

    if (!lineOrder.length) {
        initLineOrder();
    }

    if (currentRoundIndex >= lineOrder.length) {
        showMessage('Game over — all 4 rounds played.');
        drawCardButton.disabled = true;
        nextRoundButton.disabled = true;
        return;
    }

    currentLine = lineOrder[currentRoundIndex];
    lineName.textContent = `${currentLine.name} (${currentLine.color})`;

    segments = [];
    visitedStations = [];
    endpoints = [];
    stationCells.clear();
    if (boardOverlay) boardOverlay.innerHTML = '';

    currentStartStation = stations.find(s => s.id === currentLine.start) || null;
    if (currentStartStation) {
        visitedStations.push(currentStartStation.id);
        endpoints.push(currentStartStation.id);
    }

    generateBoard();
    refreshEndpointStyles();
    resetDeckForRound();
    updateRoundLabel();
}


function generateBoard() {
    board.innerHTML = '';
    stationCells.clear();
    const gridSize = 10;

    for (let y = 0; y < gridSize; y++) {
        const row = document.createElement('tr');

        for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement('td');

            const station = stations.find(s => s.x === x && s.y === y);
            if (station) {
                const label = document.createElement('span');
                label.textContent = station.type;
                label.classList.add('station-label');
                cell.appendChild(label);
                cell.classList.add('station');

                if (currentLine && station.id === currentLine.start) {
                    cell.classList.add('start-station');
                    cell.style.color = 'white';
                    label.style.backgroundColor = currentLine.color;
                    label.style.borderColor = '#111';
                }

                stationCells.set(station.id, cell);

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

    if (cardsDrawnThisRound >= 8) {
        showMessage('This round already has 8 cards. Go to the next round.');
        drawCardButton.disabled = true;
        nextRoundButton.disabled = false;
        return;
    }

    currentCard = deck.pop();
    cardsDrawnThisRound++;
    updateCardDisplay(currentCard);

    if (cardsDrawnThisRound === 8) {
        showMessage('This is the last card of this round.');
        drawCardButton.disabled = true;
        nextRoundButton.disabled = false;
    }
});

nextRoundButton.addEventListener('click', () => {
    currentRoundIndex++;
    startNewRound();
});



loadData();
