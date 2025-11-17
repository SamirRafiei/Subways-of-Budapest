const menuScreen = document.querySelector('#menu-screen');
const gameScreen = document.querySelector('#game-screen');

const startBtn = document.querySelector('#startButton');
const playerInput = document.querySelector('#playerName');
const displayName = document.querySelector('#displayName');
const backToMenu = document.querySelector('#backToMenu');

const board = document.querySelector('#board');
const lineName = document.querySelector('#lineName');
const timerElement = document.querySelector('#timer');

let stations = [];
let lines = [];
let timerInterval = null;
let elapsedSeconds = 0;
let currentLine = null;


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


function showGameScreen(playerName) {
    menuScreen.classList.remove("active");
    menuScreen.classList.add("hidden");

    gameScreen.classList.remove("hidden");
    gameScreen.classList.add("active");

    displayName.textContent = playerName;

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


function startNewRound() {
    const randomIndex = Math.floor(Math.random() * lines.length);
    currentLine = lines[randomIndex];
    lineName.textContent = `${currentLine.name} (${currentLine.color})`;

    generateBoard();
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
            }

            row.appendChild(cell);
        }

        board.appendChild(row);
    }
}


startBtn.addEventListener('click', () => {
    const name = playerInput.value.trim();
    if (name === '') return alert('Please enter your name!');
    showGameScreen(name);
});

backToMenu.addEventListener('click', backToMenuScreen);


loadData();
