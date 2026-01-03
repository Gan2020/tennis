class PingPongGame {
    constructor() {
        this.gameId = null;
        this.player1 = 'Игрок 1';
        this.player2 = 'Игрок 2';
        this.score1 = 0;
        this.score2 = 0;
        this.maxScore = 21;
        this.winner = null;
        this.history = [];
        this.apiBase = 'https://your-server.com/api'; // Замените на ваш URL
        
        this.init();
    }
    
    init() {
        this.initTelegramWebApp();
        this.bindEvents();
        this.checkForGameId();
        this.setupScreen();
    }
    
    initTelegramWebApp() {
        // Инициализация Telegram Web App
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            
            document.getElementById('connection-status').textContent = 'Подключено';
            document.getElementById('connection-status').className = 'status online';
            
            // Устанавливаем цвет фона Web App
            Telegram.WebApp.setHeaderColor('#667eea');
            Telegram.WebApp.setBackgroundColor('#f3f4f6');
        }
    }
    
    bindEvents() {
        // Кнопка начала игры
        document.getElementById('startGame').addEventListener('click', () => this.startGame());
        
        // Кнопки добавления очков
        document.querySelectorAll('.btn-add-point').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                this.addPoint(parseInt(player));
            });
        });
        
        // Кнопка сброса счета
        document.getElementById('resetScore').addEventListener('click', () => this.resetScore());
        
        // Кнопка новой игры
        document.getElementById('newGame').addEventListener('click', () => this.showSetupScreen());
        document.getElementById('newGameFromWin').addEventListener('click', () => this.showSetupScreen());
        
        // Кнопка "Играть снова"
        document.getElementById('playAgain').addEventListener('click', () => this.playAgain());
        
        // Кнопка поделиться
        document.getElementById('shareScore').addEventListener('click', () => this.shareScore());
    }
    
    checkForGameId() {
        // Проверяем URL параметры для game_id
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game_id');
        
        if (gameId) {
            this.loadGame(gameId);
        }
    }
    
    async loadGame(gameId) {
        try {
            const response = await fetch(`${this.apiBase}/game/${gameId}`);
            if (response.ok) {
                const gameData = await response.json();
                this.gameId = gameData.game_id;
                this.player1 = gameData.player1;
                this.player2 = gameData.player2;
                this.score1 = gameData.score1;
                this.score2 = gameData.score2;
                this.maxScore = gameData.max_score;
                this.winner = gameData.winner;
                this.showGameScreen();
            }
        } catch (error) {
            console.error('Ошибка загрузки игры:', error);
            this.showSetupScreen();
        }
    }
    
    async createGame() {
        const player1 = document.getElementById('player1').value || 'Игрок 1';
        const player2 = document.getElementById('player2').value || 'Игрок 2';
        const maxScore = parseInt(document.getElementById('maxScore').value);
        
        try {
            const response = await fetch(`${this.apiBase}/create_game`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    player1,
                    player2,
                    maxScore
                })
            });
            
            if (response.ok) {
                const gameData = await response.json();
                this.gameId = gameData.game_id;
                this.player1 = gameData.player1;
                this.player2 = gameData.player2;
                this.maxScore = gameData.max_score;
                return true;
            }
        } catch (error) {
            console.error('Ошибка создания игры:', error);
        }
        
        // Если API не доступно, создаем локальную игру
        this.gameId = `local_${Date.now()}`;
        this.player1 = player1;
        this.player2 = player2;
        this.maxScore = maxScore;
        return true;
    }
    
    async startGame() {
        const success = await this.createGame();
        if (success) {
            this.showGameScreen();
            
            // Обновляем URL с game_id
            if (window.history && this.gameId) {
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('game_id', this.gameId);
                window.history.replaceState({}, '', newUrl);
            }
        }
    }
    
    async addPoint(player) {
        if (this.winner) return;
        
        if (player === 1) {
            this.score1++;
        } else if (player === 2) {
            this.score2++;
        }
        
        // Добавляем в историю
        this.history.push({
            time: new Date().toLocaleTimeString(),
            player: player,
            score: `${this.score1} - ${this.score2}`
        });
        
        // Проверка на победу
        if (this.score1 >= this.maxScore && this.score1 - this.score2 >= 2) {
            this.winner = 1;
        } else if (this.score2 >= this.maxScore && this.score2 - this.score1 >= 2) {
            this.winner = 2;
        }
        
        // Обновляем UI
        this.updateGameScreen();
        
        // Отправляем на сервер, если есть подключение
        if (this.gameId && !this.gameId.startsWith('local_')) {
            try {
                await fetch(`${this.apiBase}/game/${this.gameId}/point/${player}`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('Ошибка обновления счета:', error);
            }
        }
        
        // Если есть победитель, показываем экран победы
        if (this.winner) {
            setTimeout(() => this.showWinnerScreen(), 500);
        }
    }
    
    async resetScore() {
        this.score1 = 0;
        this.score2 = 0;
        this.winner = null;
        this.history = [];
        
        this.updateGameScreen();
        
        // Отправляем на сервер, если есть подключение
        if (this.gameId && !this.gameId.startsWith('local_')) {
            try {
                await fetch(`${this.apiBase}/game/${this.gameId}/reset`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('Ошибка сброса счета:', error);
            }
        }
    }
    
    playAgain() {
        this.resetScore();
        this.showGameScreen();
    }
    
    shareScore() {
        const scoreText = `${this.player1}: ${this.score1} - ${this.player2}: ${this.score2}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Результат игры в настольный теннис',
                text: scoreText,
                url: window.location.href
            });
        } else if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.shareUrl(
                window.location.href,
                scoreText
            );
        } else {
            // Копирование в буфер обмена
            navigator.clipboard.writeText(`${scoreText}\n${window.location.href}`);
            alert('Счет скопирован в буфер обмена!');
        }
    }
    
    // Методы для управления экранами
    setupScreen() {
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('winner-screen').classList.add('hidden');
    }
    
    showSetupScreen() {
        this.resetScore();
        this.gameId = null;
        this.setupScreen();
        
        // Очищаем URL параметры
        if (window.history) {
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('game_id');
            window.history.replaceState({}, '', newUrl);
        }
    }
    
    showGameScreen() {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        document.getElementById('winner-screen').classList.add('hidden');
        
        this.updateGameScreen();
    }
    
    showWinnerScreen() {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('winner-screen').classList.remove('hidden');
        
        const winnerName = this.winner === 1 ? this.player1 : this.player2;
        document.getElementById('winner-name').textContent = `🏆 ${winnerName} победил!`;
        document.getElementById('final-score1').textContent = this.score1;
        document.getElementById('final-score2').textContent = this.score2;
    }
    
    updateGameScreen() {
        // Обновляем имена игроков
        document.getElementById('player1-name').textContent = this.player1;
        document.getElementById('player2-name').textContent = this.player2;
        
        // Обновляем счет
        document.getElementById('score1').textContent = this.score1;
        document.getElementById('score2').textContent = this.score2;
        
        // Обновляем максимальный счет
        document.getElementById('max-score-display').textContent = this.maxScore;
        
        // Обновляем разницу
        const difference = Math.abs(this.score1 - this.score2);
        document.getElementById('score-difference').textContent = difference;
        
        // Обновляем историю
        const historyElement = document.getElementById('score-history');
        historyElement.innerHTML = this.history.map(item => `
            <div class="history-item">
                ${item.time} - ${item.player === 1 ? this.player1 : this.player2} +1 (${item.score})
            </div>
        `).reverse().join('');
        
        // Обновляем активного игрока
        document.querySelectorAll('.player-score').forEach(el => el.classList.remove('active'));
        
        if (!this.winner) {
            if (this.score1 >= this.score2) {
                document.getElementById('player1-score').classList.add('active');
            } else {
                document.getElementById('player2-score').classList.add('active');
            }
        }
        
        // Обновляем кнопки добавления очков
        document.querySelectorAll('.btn-add-point').forEach(btn => {
            const player = parseInt(btn.dataset.player);
            btn.textContent = `+1 ${player === 1 ? this.player1 : this.player2}`;
        });
    }
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.game = new PingPongGame();
});
