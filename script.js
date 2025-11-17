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
const scoreList = document.querySelector('#scoreList');

const cardDisplay = document.querySelector('#cardDisplay');
const drawCardButton = document.querySelector('#drawCardButton');
const nextRoundButton = document.querySelector('#nextRoundButton');

const roundText = document.querySelector('#roundText');

const pkValue = document.querySelector('#pkValue');
const pmValue = document.querySelector('#pmValue');
const pdValue = document.querySelector('#pdValue');
const fpValue = document.querySelector('#fpValue');
const totalFpValue = document.querySelector('#totalFpValue');

const stationCells = new Map();

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

let currentPlayerName = '';

let lineOrder = [];
let currentRoundIndex = 0;
let cardsDrawnThisRound = 0;

const lineScores = new Map();
let totalFp = 0;

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

function resetGameState() {
    deck = [];
    currentCard = null;
    segments = [];
    visitedStations = [];
    endpoints = [];
    currentStartStation = null;
    lineOrder = [];
    currentRoundIndex = 0;
    cardsDrawnThisRound = 0;
    lineScores.clear();
    totalFp = 0;

    if (boardOverlay) boardOverlay.innerHTML = '';
    if (board) board.innerHTML = '';
    stationCells.clear();

    if (pkValue) pkValue.textContent = '0';
    if (pmValue) pmValue.textContent = '0';
    if (pdValue) pdValue.textContent = '0';
    if (fpValue) fpValue.textContent = '0';
    if (totalFpValue) totalFpValue.textContent = '0';
    if (roundText) roundText.textContent = '1 / 4';

    if (cardDisplay) {
        cardDisplay.className = '';
        cardDisplay.id = 'cardDisplay';
        cardDisplay.textContent = '-';
    }

    drawCardButton.disabled = false;
    nextRoundButton.disabled = true;
}

async function showGameScreen(playerName) {
    menuScreen.classList.remove('active');
    menuScreen.classList.add('hidden');

    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');

    currentPlayerName = playerName;
    displayName.textContent = playerName;

    if (!stations.length || !lines.length) {
        await loadData();
    }

    resetGameState();
    initLineOrder();
    startTimer();
    startNewRound();
}

function backToMenuScreen() {
    gameScreen.classList.remove('active');
    gameScreen.classList.add('hidden');

    menuScreen.classList.remove('hidden');
    menuScreen.classList.add('active');

    stopTimer();
    resetGameState();
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
        { letter: 'J', platform: 'center', type: 'joker' }
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

    const isJoker = card.letter === 'J';
    const label = card.letter;
    const meta = `${isJoker ? 'Joker' : card.letter} - ${card.platform}`;

    if (card.platform === 'side') {
        cardDisplay.classList.add('card-side');
    } else {
        cardDisplay.classList.add('card-center');
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

function canConnectStations(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    if (dx === 0 && dy === 0) return false;

    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) {
        return false;
    }

    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 1; i < steps; i++) {
        const x = a.x + stepX * i;
        const y = a.y + stepY * i;
        if (stations.some(s => s.x === x && s.y === y)) {
            return false;
        }
    }

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

const JOKER_STATION_ID = 30;

function hasSegmentBetween(aId, bId) {
    return segments.some(seg =>
        (seg.from === aId && seg.to === bId) ||
        (seg.from === bId && seg.to === aId)
    );
}

function segmentsIntersectPoints(a1, a2, b1, b2) {
    function cross(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }
    function onSegment(o, a, b) {
        return Math.min(o.x, b.x) <= a.x && a.x <= Math.max(o.x, b.x) &&
               Math.min(o.y, b.y) <= a.y && a.y <= Math.max(o.y, b.y);
    }

    const d1 = cross(a1, a2, b1);
    const d2 = cross(a1, a2, b2);
    const d3 = cross(b1, b2, a1);
    const d4 = cross(b1, b2, a2);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
    }

    if (d1 === 0 && onSegment(a1, b1, a2)) return true;
    if (d2 === 0 && onSegment(a1, b2, a2)) return true;
    if (d3 === 0 && onSegment(b1, a1, b2)) return true;
    if (d4 === 0 && onSegment(b1, a2, b2)) return true;

    return false;
}

function wouldCrossExisting(fromStation, toStation) {
    return segments.some(seg => {
        const a = getStationById(seg.from);
        const b = getStationById(seg.to);
        if (!a || !b) return false;

        if (a.id === fromStation.id || a.id === toStation.id ||
            b.id === fromStation.id || b.id === toStation.id) {
            return false;
        }

        return segmentsIntersectPoints(
            { x: fromStation.x, y: fromStation.y },
            { x: toStation.x, y: toStation.y },
            { x: a.x, y: a.y },
            { x: b.x, y: b.y }
        );
    });
}


function handleStationClick(station) {
    if (!currentCard) {
        showMessage('draw a card first');
        return;
    }

    const isJokerCard = currentCard.letter === 'J';
    const isJokerStation = station.id === JOKER_STATION_ID || station.type === '?';

    if (!isJokerCard && !isJokerStation && station.type !== currentCard.letter) {
        showMessage('this station does not match the card');
        return;
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
        if (!canConnectStations(currentStartStation, station)) {
            showMessage('first segment must be straight/diagonal without passing another station');
            return;
        }
        if (station.id === currentStartStation.id) {
            showMessage('choose a different station');
            return;
        }
        if (hasSegmentBetween(currentStartStation.id, station.id)) {
            showMessage('there is already a segment between these stations');
            return;
        }
        if (wouldCrossExisting(currentStartStation, station)) {
            showMessage('segments cannot cross each other');
            return;
        }

        drawSegment(currentStartStation, station);
        segments.push({ from: currentStartStation.id, to: station.id });
        visitedStations.push(station.id);
        endpoints = [currentStartStation.id, station.id];
        refreshEndpointStyles();

        currentCard = null;
        updateCardDisplay(null);
        showMessage('first segment drawn');
        return;
    }


    let fromEndpointId = null;
    for (let i = endpoints.length - 1; i >= 0; i--) {
        const id = endpoints[i];
        const ep = getStationById(id);
        if (ep && canConnectStations(ep, station)) {
            fromEndpointId = id;
            break;
        }
    }

    if (!fromEndpointId) {
        showMessage('you must connect from a line endpoint in a straight/45° path');
        return;
    }

    const fromStation = getStationById(fromEndpointId);
    if (!fromStation) return;

    if (hasSegmentBetween(fromStation.id, station.id)) {
        showMessage('there is already a segment between these stations');
        return;
    }
    if (wouldCrossExisting(fromStation, station)) {
        showMessage('segments cannot cross each other');
        return;
    }

    drawSegment(fromStation, station);
    segments.push({ from: fromStation.id, to: station.id });
    visitedStations.push(station.id);

    endpoints = endpoints.filter(id => id !== fromStation.id);
    endpoints.push(station.id);
    refreshEndpointStyles();

    currentCard = null;
    updateCardDisplay(null);
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

function computeRoundScore() {
    if (!currentLine) return;
    if (!visitedStations.length) return;

    const uniqueDistricts = new Set();
    const districtCounts = new Map();

    visitedStations.forEach(id => {
        const st = getStationById(id);
        if (!st) return;
        uniqueDistricts.add(st.district);
        const prev = districtCounts.get(st.district) || 0;
        districtCounts.set(st.district, prev + 1);
    });

    const PK = uniqueDistricts.size;

    let PM = 0;
    districtCounts.forEach(count => {
        if (count > PM) PM = count;
    });

    let PD = 0;
    segments.forEach(seg => {
        const a = getStationById(seg.from);
        const b = getStationById(seg.to);
        if (!a || !b) return;
        if (a.side && b.side && a.side !== b.side) {
            PD++;
        }
    });

    const FP = PK * PM + PD;

    if (pkValue) pkValue.textContent = PK;
    if (pmValue) pmValue.textContent = PM;
    if (pdValue) pdValue.textContent = PD;
    if (fpValue) fpValue.textContent = FP;

    lineScores.set(currentLine.id, { PK, PM, PD, FP });

    totalFp = 0;
    lineScores.forEach(v => totalFp += v.FP);
    if (totalFpValue) totalFpValue.textContent = totalFp;
}

function saveFinalScore() {
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    const timeText = `${minutes}:${seconds}`;

    const record = {
        name: currentPlayerName || 'Player',
        score: totalFp,
        seconds: elapsedSeconds,
        timeText,
        date: new Date().toISOString()
    };

    const key = 'budapest-scores';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(record);

    existing.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.seconds - b.seconds;
    });

    localStorage.setItem(key, JSON.stringify(existing));
}

function renderScoreboard() {
    if (!scoreList) return;
    const key = 'budapest-scores';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');

    scoreList.innerHTML = '';
    existing.forEach((rec, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${rec.name} — ${rec.score} pts (${rec.timeText})`;
        scoreList.appendChild(li);
    });
}

function startNewRound() {
    if (!lines.length) return;

    if (!lineOrder.length) {
        initLineOrder();
    }

    if (currentRoundIndex >= lineOrder.length) {
        saveFinalScore();
        renderScoreboard();
        showMessage(`Game over. Total FP: ${totalFp}`);
        drawCardButton.disabled = true;
        nextRoundButton.disabled = true;
        backToMenuScreen();
        return;
    }

    currentLine = lineOrder[currentRoundIndex];
    lineName.textContent = `${currentLine.name} (${currentLine.color})`;

    segments = [];
    visitedStations = [];
    endpoints = [];
    stationCells.clear();
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

function renderDanube() {
    if (!boardOverlay || !stations.length) return;

    const old = document.querySelector('#danube');
    if (old) old.remove();

    const budaXs = stations.filter(s => s.side === 'Buda').map(s => s.x);
    const pestXs = stations.filter(s => s.side === 'Pest').map(s => s.x);
    if (!budaXs.length || !pestXs.length) return;

    const maxBudaX = Math.max(...budaXs);
    const minPestX = Math.min(...pestXs);

    const gridSize = 10;
    const overlayWidth = boardOverlay.offsetWidth || board.offsetWidth;
    if (!overlayWidth) return;

    const cellWidth = overlayWidth / gridSize;

    const leftCol = maxBudaX + 0.5;
    const rightCol = minPestX + 0.5;
    const centerCol = (leftCol + rightCol) / 2;

    const riverWidth = cellWidth * 1.2;   // nice thick band
    const leftPx = centerCol * cellWidth - riverWidth / 2;

    const river = document.createElement('div');
    river.id = 'danube';
    river.style.left = `${leftPx}px`;
    river.style.width = `${riverWidth}px`;

    boardOverlay.appendChild(river);
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

                if (currentLine && station.id === currentLine.start) {
                    cell.classList.add('start-station');
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

    renderDanube();
}



startBtn.addEventListener('click', () => {
    const name = playerInput.value.trim();

    if (name === '') {
        nameError.textContent = 'please enter your name before starting the game';
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
    renderScoreboard();
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
    computeRoundScore();
    currentRoundIndex++;
    startNewRound();
});

loadData();
