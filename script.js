const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const finalScoreBox = document.getElementById('final-score-box');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');

// Estado do jogo
let isPlaying = false;
let score = 0;
let highScore = localStorage.getItem('neonBounceHighScore') || 0;
highScoreEl.textContent = highScore;

let animationId;
let particles = [];
let trail = [];

// Plataforma (Raquete)
const paddle = {
    width: 110,
    height: 14,
    x: canvas.width / 2 - 55,
    y: canvas.height - 32,
    speed: 9,
    color: '#00f3ff'
};

// Bolinha
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 6,
    dx: 4,
    dy: -4,
    color: '#ff007f'
};

// Controles de Teclado
const keys = {
    ArrowLeft: false,
    ArrowRight: false
};

document.addEventListener('keydown', (e) => {
    if (e.key in keys) keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key in keys) keys[e.key] = false;
});

// Controle pelo Mouse
canvas.addEventListener('mousemove', (e) => {
    if (!isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = mouseX - paddle.width / 2;
    clampPaddle();
});

// Controle por Toque (Mobile)
canvas.addEventListener('touchmove', (e) => {
    if (!isPlaying) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const touchX = (e.touches[0].clientX - rect.left) * scaleX;
    paddle.x = touchX - paddle.width / 2;
    clampPaddle();
}, { passive: false });

function clampPaddle() {
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

// Inicia ou reinicia o jogo
function startGame() {
    score = 0;
    scoreEl.textContent = score;
    isPlaying = true;
    particles = [];
    trail = [];

    // Reseta posição da plataforma
    paddle.width = 110;
    paddle.x = canvas.width / 2 - paddle.width / 2;

    // Reseta posição e direção aleatória da bola
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 3;
    ball.speed = 6.2;
    const angle = (Math.random() * Math.PI / 2) - (Math.PI / 4); // Entre -45° e 45°
    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = ball.speed * Math.cos(angle);

    overlay.classList.add('hidden');
    cancelAnimationFrame(animationId);
    gameLoop();
}

// Cria partículas de explosão ao bater
function createParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 3 + 1.5,
            alpha: 1,
            color: color
        });
    }
}

// Efeito de tremor na tela
function triggerShake() {
    container.style.transform = `translate(${(Math.random() - 0.5) * 8}px, ${(Math.random() - 0.5) * 8}px)`;
    setTimeout(() => {
        container.style.transform = 'translate(0, 0)';
    }, 60);
}

// Desenha grade de fundo estilo Cyber
function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
    ctx.lineWidth = 1;
    const step = 40;

    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Desenha a zona de perigo no fundo
function drawDangerZone() {
    const gradient = ctx.createLinearGradient(0, canvas.height - 25, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(255, 0, 127, 0)');
    gradient.addColorStop(1, 'rgba(255, 0, 127, 0.35)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 25, canvas.width, 25);
}

// Atualiza lógica e posições
function update() {
    // Movimento pelo teclado
    if (keys.ArrowLeft) paddle.x -= paddle.speed;
    if (keys.ArrowRight) paddle.x += paddle.speed;
    clampPaddle();

    // Guarda rastro da bola
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 12) trail.shift();

    // Move a bola
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Colisão com paredes laterais
    if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.dx *= -1;
        createParticles(ball.x, ball.y, '#00f3ff', 8);
    } else if (ball.x + ball.radius >= canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.dx *= -1;
        createParticles(ball.x, ball.y, '#00f3ff', 8);
    }

    // Colisão com o teto
    if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.dy *= -1;
        createParticles(ball.x, ball.y, '#00f3ff', 8);
    }

    // Colisão com a plataforma
    if (
        ball.dy > 0 &&
        ball.y + ball.radius >= paddle.y &&
        ball.y - ball.radius <= paddle.y + paddle.height &&
        ball.x + ball.radius >= paddle.x &&
        ball.x - ball.radius <= paddle.x + paddle.width
    ) {
        // Calcula onde a bola bateu na barra (-1 na esquerda, 0 no meio, 1 na direita)
        let collidePoint = ball.x - (paddle.x + paddle.width / 2);
        collidePoint = collidePoint / (paddle.width / 2);

        // Ângulo máximo de rebote (60 graus)
        const maxAngle = Math.PI / 3;
        const bounceAngle = collidePoint * maxAngle;

        // Aumenta a velocidade gradualmente para deixar mais difícil
        ball.speed = Math.min(ball.speed + 0.25, 14);

        ball.dx = ball.speed * Math.sin(bounceAngle);
        ball.dy = -ball.speed * Math.cos(bounceAngle);
        ball.y = paddle.y - ball.radius;

        // Atualiza pontuação
        score++;
        scoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('neonBounceHighScore', highScore);
        }

        // Diminui levemente a barra a cada 5 pontos (até o mínimo de 65px)
        if (score % 5 === 0 && paddle.width > 65) {
            paddle.width -= 4;
        }

        createParticles(ball.x, paddle.y, '#ff007f', 18);
        triggerShake();
    }

    // Verifica se a bola caiu (Game Over)
    if (ball.y - ball.radius > canvas.height) {
        gameOver();
    }

    // Atualiza partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Renderiza tudo no Canvas
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawDangerZone();

    // Desenha o rastro da bola
    for (let i = 0; i < trail.length; i++) {
        const ratio = i / trail.length;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, ball.radius * ratio * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 127, ${ratio * 0.35})`;
        ctx.fill();
    }

    // Desenha a plataforma com brilho
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = paddle.color;
    ctx.fillStyle = paddle.color;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 7);
    ctx.fill();
    ctx.restore();

    // Desenha a bola com brilho
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = ball.color;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = ball.color;
    ctx.stroke();
    ctx.restore();

    // Desenha partículas
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Loop principal
function gameLoop() {
    if (!isPlaying) return;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// Fim de jogo
function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);

    overlayTitle.textContent = 'FIM DE JOGO';
    overlaySubtitle.textContent = 'A bolinha caiu! Tente bater seu recorde.';
    finalScoreEl.textContent = score;
    finalScoreBox.classList.remove('hidden');
    startBtn.textContent = 'JOGAR NOVAMENTE';
    overlay.classList.remove('hidden');
}

startBtn.addEventListener('click', startGame);

// Desenha o fundo inicial antes de apertar Play
drawGrid();
drawDangerZone();
