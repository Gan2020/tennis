class PingPongScorekeeper {
    constructor() {
        this.initGame();
        this.initTelegram();
        this.bindEvents();
        this.render();
    }

    initGame() {
        this.gameState = {
            player1: {
                name: 'Игрок 1',
                score: 0,
                sets: [],
                color: '#3498db'
            },
            player2: {
                name: 'Игрок 2',
                score: 0,
                sets: [],
                color: '#e74c3c'
            },
            currentSet: 1,
            totalSets: 5,
            pointsToWin: 11,
            minLead: 2,
            history: [],
            matchWinner: null
        };
        this.gameHistory = [];
    }

    initTelegram() {
        try {
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.expand();
                tg.MainButton.setText('Счетчик тенниса').show();
                
                // Цвета из Telegram
                tg.setHeaderColor('#667eea');
                tg.setBackgroundColor('#667eea');
                
                // Обработка кнопки Telegram
                tg.MainButton.onClick(() => {
                    this.saveMatchResult();
                });
            }
        } catch (e) {
            console.log('Telegram Web App не доступен');
        }
    }

    bindEvents() {
        // Кнопки изменения счета
        document.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                this.addPoint(parseInt(player));
            });
        });

        document.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                this.removePoint(parseInt(player));
            });
        });

        // Имена игроков
        document.querySelectorAll('.player-name').forEach(input => {
            input.addEventListener('input', (e) => {
                const player = e.target.closest('.player').id.replace('player', '');
                this.updatePlayerName(parseInt(player), e.target.value);
            });
        });

        // Кнопки управления матчем
        document.getElementById('newSetBtn').addEventListener('click', () => this.startNewSet());
        document.getElementById('newMatchBtn').addEventListener('click', () => this.startNewMatch());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoLastAction());

        // Кнопки выбора цвета
        document.querySelectorAll('.player-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.target.dataset.player);
                this.openColorPicker(player);
            });
        });

        // Модальные окна
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const colorModal = document.getElementById('colorModal');
        const closeButtons = document.querySelectorAll('.close-modal');

        settingsBtn.addEventListener('click', () => this.openModal(settingsModal));
        
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // Закрытие модальных окон при клике вне окна
        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.closeModal(settingsModal);
            }
            if (e.target === colorModal) {
                this.closeModal(colorModal);
            }
        });

        // Выбор цвета
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                const player = e.target.dataset.player;
                
                if (player) {
                    this.updatePlayerColor(parseInt(player), color);
                    this.closeAllModals();
                } else if (this.selectedPlayerForColor) {
                    this.updatePlayerColor(this.selectedPlayerForColor, color);
                    this.closeAllModals();
                }
            });
        });
    }

    addPoint(player) {
        if (this.gameState.matchWinner) return;

        // Сохраняем текущее состояние для возможности отмены
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));

        if (player === 1) {
            this.gameState.player1.score++;
        } else {
            this.gameState.player2.score++;
        }

        // Проверка на победу в сете
        this.checkSetWinner();
        
        // Добавляем в историю
        this.addToHistory(`Игрок ${player === 1 ? this.gameState.player1.name : this.gameState.player2.name} получает очко`);
        
        this.render();
    }

    removePoint(player) {
        if (this.gameState.matchWinner) return;

        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));

        if (player === 1 && this.gameState.player1.score > 0) {
            this.gameState.player1.score--;
        } else if (player === 2 && this.gameState.player2.score > 0) {
            this.gameState.player2.score--;
        }

        this.addToHistory(`Удалено очко у игрока ${player === 1 ? this.gameState.player1.name : this.gameState.player2.name}`);
        this.render();
    }

    checkSetWinner() {
        const p1Score = this.gameState.player1.score;
        const p2Score = this.gameState.player2.score;
        const pointsToWin = this.gameState.pointsToWin;
        const minLead = this.gameState.minLead;

        // Проверка условий победы
        if ((p1Score >= pointsToWin || p2Score >= pointsToWin) && Math.abs(p1Score - p2Score) >= minLead) {
            let setWinner = p1Score > p2Score ? 1 : 2;
            
            if (setWinner === 1) {
                this.gameState.player1.sets.push('win');
                this.gameState.player2.sets.push('loss');
                this.addToHistory(`${this.gameState.player1.name} выигрывает сет ${this.gameState.currentSet}!`);
            } else {
                this.gameState.player2.sets.push('win');
                this.gameState.player1.sets.push('loss');
                this.addToHistory(`${this.gameState.player2.name} выигрывает сет ${this.gameState.currentSet}!`);
            }

            // Проверка на победу в матче
            this.checkMatchWinner();

            if (!this.gameState.matchWinner) {
                // Автоматически начинаем новый сет через 2 секунды
                setTimeout(() => {
                    this.startNewSet();
                }, 2000);
            }
        }
    }

    checkMatchWinner() {
        const wins1 = this.gameState.player1.sets.filter(s => s === 'win').length;
        const wins2 = this.gameState.player2.sets.filter(s => s === 'win').length;
        const setsToWin = Math.ceil(this.gameState.totalSets / 2);

        if (wins1 >= setsToWin) {
            this.gameState.matchWinner = 1;
            this.addToHistory(`🎉 ${this.gameState.player1.name} выигрывает матч!`);
            this.showMatchWinner(1);
        } else if (wins2 >= setsToWin) {
            this.gameState.matchWinner = 2;
            this.addToHistory(`🎉 ${this.gameState.player2.name} выигрывает матч!`);
            this.showMatchWinner(2);
        }
    }

    showMatchWinner(winner) {
        alert(`🎉 Поздравляем! ${winner === 1 ? this.gameState.player1.name : this.gameState.player2.name} выигрывает матч!`);
        
        // Сохраняем результат в Telegram
        this.saveMatchResult();
    }

    startNewSet() {
        if (this.gameState.currentSet >= this.gameState.totalSets) {
            alert('Все сеты уже сыграны!');
            return;
        }

        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));

        this.gameState.currentSet++;
        this.gameState.player1.score = 0;
        this.gameState.player2.score = 0;

        this.addToHistory(`Начинается сет ${this.gameState.currentSet}`);
        this.render();
    }

    startNewMatch() {
        if (confirm('Начать новую игру? Текущий прогресс будет потерян.')) {
            this.initGame();
            this.addToHistory('Новая игра начата');
            this.render();
        }
    }

    undoLastAction() {
        if (this.gameHistory.length > 0) {
            this.gameState = this.gameHistory.pop();
            this.addToHistory('Отменено последнее действие');
            this.render();
        }
    }

    updatePlayerName(player, name) {
        if (player === 1) {
            this.gameState.player1.name = name || 'Игрок 1';
        } else {
            this.gameState.player2.name = name || 'Игрок 2';
        }
        this.render();
    }

    updatePlayerColor(player, color) {
        if (player === 1) {
            this.gameState.player1.color = color;
        } else {
            this.gameState.player2.color = color;
        }
        this.render();
    }

    openColorPicker(player) {
        this.selectedPlayerForColor = player;
        const modal = document.getElementById('colorModal');
        this.openModal(modal);
    }

    openModal(modal) {
        modal.style.display = 'flex';
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.selectedPlayerForColor = null;
    }

    saveSettings() {
        this.gameState.totalSets = parseInt(document.getElementById('totalSetsSelect').value);
        this.gameState.pointsToWin = parseInt(document.getElementById('pointsToWinSelect').value);
        this.gameState.minLead = parseInt(document.getElementById('minLeadSelect').value);
        
        this.closeAllModals();
        this.addToHistory('Настройки обновлены');
        this.render();
    }

    addToHistory(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.gameState.history.unshift({
            time: timestamp,
            message: message
        });
        
        // Ограничиваем историю 50 последними записями
        if (this.gameState.history.length > 50) {
            this.gameState.history.pop();
        }
    }

    saveMatchResult() {
        try {
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                const result = {
                    player1: this.gameState.player1.name,
                    player2: this.gameState.player2.name,
                    score: `${this.gameState.player1.sets.filter(s => s === 'win').length}-${this.gameState.player2.sets.filter(s => s === 'win').length}`,
                    winner: this.gameState.matchWinner === 1 ? this.gameState.player1.name : this.gameState.player2.name
                };
                
                tg.sendData(JSON.stringify(result));
                tg.close();
            }
        } catch (e) {
            console.log('Не удалось отправить результат в Telegram');
        }
    }

    render() {
        // Обновляем счета
        document.getElementById('score1').textContent = this.gameState.player1.score;
        document.getElementById('score2').textContent = this.gameState.player2.score;

        // Обновляем цвета
        document.getElementById('player1').style.borderLeft = `6px solid ${this.gameState.player1.color}`;
        document.getElementById('player2').style.borderLeft = `6px solid ${this.gameState.player2.color}`;
        document.getElementById('score1').style.color = this.gameState.player1.color;
        document.getElementById('score2').style.color = this.gameState.player2.color;

        // Обновляем имена
        document.querySelector('#player1 .player-name').value = this.gameState.player1.name;
        document.querySelector('#player2 .player-name').value = this.gameState.player2.name;

        // Обновляем информацию о матче
        document.getElementById('currentSet').textContent = this.gameState.currentSet;
        document.getElementById('totalSets').textContent = this.gameState.totalSets;
        document.getElementById('pointsToWin').textContent = this.gameState.pointsToWin;

        // Обновляем сеты
        this.renderSets();

        // Обновляем историю
        this.renderHistory();

        // Обновляем настройки в модальном окне
        document.getElementById('totalSetsSelect').value = this.gameState.totalSets;
        document.getElementById('pointsToWinSelect').value = this.gameState.pointsToWin;
        document.getElementById('minLeadSelect').value = this.gameState.minLead;

        // Обновляем состояние кнопки отмены
        document.getElementById('undoBtn').disabled = this.gameHistory.length === 0;
    }

    renderSets() {
        const sets1 = document.getElementById('sets1');
        const sets2 = document.getElementById('sets2');
        
        sets1.innerHTML = '';
        sets2.innerHTML = '';

        for (let i = 0; i < this.gameState.totalSets; i++) {
            const set1 = document.createElement('div');
            const set2 = document.createElement('div');
            
            set1.className = 'set-indicator';
            set2.className = 'set-indicator';
            
            if (i < this.gameState.player1.sets.length) {
                set1.classList.add(this.gameState.player1.sets[i] === 'win' ? 'won' : 'lost');
                set1.textContent = this.gameState.player1.sets[i] === 'win' ? 'W' : 'L';
            }
            
            if (i < this.gameState.player2.sets.length) {
                set2.classList.add(this.gameState.player2.sets[i] === 'win' ? 'won' : 'lost');
                set2.textContent = this.gameState.player2.sets[i] === 'win' ? 'W' : 'L';
            }
            
            if (i + 1 === this.gameState.currentSet && !this.gameState.matchWinner) {
                set1.classList.add('current');
                set2.classList.add('current');
            }
            
            sets1.appendChild(set1);
            sets2.appendChild(set2);
        }
    }

    renderHistory() {
        const historyLog = document.getElementById('historyLog');
        historyLog.innerHTML = '';
        
        this.gameState.history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `<strong>${item.time}</strong> - ${item.message}`;
            historyLog.appendChild(div);
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new PingPongScorekeeper();
    
    // Для отладки
    window.app = app;
    
    console.log('Счетчик настольного тенниса запущен!');
});
