const video = document.getElementById('webcam');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const missedSpan = document.getElementById('missed');
const highScoreSpan = document.getElementById('highScore');
const gameOverDiv = document.getElementById('gameOver');
const finalScoreP = document.getElementById('finalScore');
const finalHighScoreP = document.getElementById('finalHighScore');
const cameraOverlay = document.getElementById('cameraOverlay');

let handLandmarks = [];
let fruits = [];
let score = 0;
let missed = 0;
let highScore = 0;
let gameOver = false;
let mediapipeReady = false;
let fruitSpeed = 2.2; // Added for dynamic speed

function loadHighScore() {
  const hs = localStorage.getItem('fruitCatcherHighScore');
  highScore = hs ? parseInt(hs) : 0;
  highScoreSpan.textContent = 'High Score: ' + highScore;
}
function saveHighScore(newScore) {
  if (newScore > highScore) {
    highScore = newScore;
    localStorage.setItem('fruitCatcherHighScore', highScore);
    highScoreSpan.textContent = 'High Score: ' + highScore;
  }
}

function spawnFruit() {
  const x = Math.random() * (canvas.width - 40) + 20;
  fruits.push({ x, y: -20, radius: 28, caught: false });
}

function updateFruits() {
  let missedNow = 0;
  for (let fruit of fruits) {
    fruit.y += fruitSpeed; // Use dynamic speed
    if (!fruit.caught && handLandmarks.length > 0) {
      for (const hand of handLandmarks) {
        for (const pt of hand) {
          // Mirror hand x for collision
          const handX = (1 - pt.x) * canvas.width;
          const handY = pt.y * canvas.height;
          const dx = fruit.x - handX;
          const dy = fruit.y - handY;
          if (Math.sqrt(dx*dx + dy*dy) < (fruit.radius + 20)) {
            fruit.caught = true;
            score++;
            scoreSpan.textContent = 'Score: ' + score;
            saveHighScore(score);
            // Increase speed every 25 points
            if (score % 25 === 0) {
              fruitSpeed += 0.7;
            }
            break;
          }
        }
      }
    }
  }
  // Remove caught or out-of-bounds fruits and count only missed
  let newFruits = [];
  for (let fruit of fruits) {
    if (fruit.caught) continue; // popped, not missed
    if (fruit.y >= canvas.height + 40) {
      missedNow++;
    } else {
      newFruits.push(fruit);
    }
  }
  fruits = newFruits;
  if (missedNow > 0) {
    missed += missedNow;
    missedSpan.textContent = 'Missed: ' + missed;
    if (missed >= 5 && !gameOver) {
      gameOver = true;
      showGameOver();
    }
  }
  // Keep only 4 fruits at a time
  while (!gameOver && fruits.length < 4) spawnFruit();
}

function drawFruits() {
  for (let fruit of fruits) {
    ctx.beginPath();
    ctx.arc(fruit.x, fruit.y, fruit.radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'orange';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(fruit.x + 10, fruit.y - fruit.radius + 8, 8, 4, Math.PI / 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'green';
    ctx.fill();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Mirror the webcam feed
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  updateFruits();
  drawFruits();

  // Draw hand landmarks (mirrored)
  ctx.save();
  ctx.strokeStyle = 'cyan';
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(0,255,255,0.7)';
  for (const hand of handLandmarks) {
    for (const pt of hand) {
      ctx.beginPath();
      ctx.arc((1 - pt.x) * canvas.width, pt.y * canvas.height, 10, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
  if (!gameOver) requestAnimationFrame(draw);
}

function showGameOver() {
  finalScoreP.textContent = 'Your Score: ' + score;
  finalHighScoreP.textContent = 'High Score: ' + highScore;
  gameOverDiv.style.display = 'flex';
  // Reset fruit speed for next game
  fruitSpeed = 2.2;
}

function onResults(results) {
  handLandmarks = results.multiHandLandmarks || [];
  if (!mediapipeReady) {
    mediapipeReady = true;
    cameraOverlay.style.display = 'none';
    if (!gameOver) requestAnimationFrame(draw);
  }
}

async function main() {
  loadHighScore();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await new Promise(r => video.onloadedmetadata = r);
    video.play();
    // Do NOT hide overlay or start draw() here
  } catch (e) {
    cameraOverlay.textContent = 'Camera access denied. Please allow camera to play the game.';
    return;
  }
  const hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });
  hands.onResults(onResults);
  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({image: video});
    },
    width: 800,
    height: 600
  });
  camera.start();
  // Do NOT call draw() here
}
main();
