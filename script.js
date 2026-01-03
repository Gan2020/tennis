class MobilePingPongScorekeeper {
    constructor() {
        this.gameState = this.loadGameState() || this.getInitialState();
        this.gameHistory = [];
        this.matchHistory = this.loadMatchHistory() || [];
        this.matchStartTime = new Date();
        this.selectedPlayerForColor = null;
        this.currentPlayerColors = {
            1: '#3498db',
            2: '#e74c3c'
        };
        
        this.initTelegram();
        this.bindEvents();
        this.initColorPicker();
        this.render();
        this.startMatchTimer();
    }

    getInitialState() {
        return {
            player1: {
                name: 'Игрок 1',
                score: 0,
                setsWon: 0,
                totalPoints: 0
            },
            player2: {
                name: 'Игрок 2',
                score: 0,
                setsWon: 0,
                totalPoints: 0
            },
            currentSet: 1,
            totalSets: 5,
            pointsToWin: 11,
            minLead: 2,
            sets: [],
            isMatchOver: false,
            matchWinner: null,
            history: []
        };
    }

    initTelegram() {
        try {
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                
                // Расширяем на весь экран
                tg.expand();
                
                // Устанавливаем тему Telegram
                this.applyTelegramTheme(tg.themeParams);
                
                // Обработчик изменения темы
                tg.onEvent('themeChanged', () => {
                    this.applyTelegramTheme(tg.themeParams);
                });
                
                // Основная кнопка
                tg.MainButton.setText('Поделиться результатом');
                tg.MainButton.onClick(() => this.shareMatchResult());
                
                // Включаем кнопку, если матч завершен
                if (this.gameState.isMatchOver) {
                    tg.MainButton.show();
                }
                
                // Вибрация
                if (tg.isVersionAtLeast('6.1')) {
                    this.supportsVibration = true;
                }
            }
        } catch (e) {
            console.log('Telegram Web App недоступен, работаем в браузере');
        }
    }

    applyTelegramTheme(themeParams) {
        if (!themeParams) return;
        
        const root = document.documentElement;
        
        if (themeParams.bg_color) {
            root.style.setProperty('--light-color', themeParams.bg_color);
        }
        
        if (themeParams.text_color) {
            root.style.setProperty('--dark-color', themeParams.text_color);
        }
        
        if (themeParams.button_color) {
            root.style.setProperty('--primary-color', themeParams.button_color);
        }
        
        if (themeParams.button_text_color) {
            root.style.setProperty('--light-color', themeParams.button_text_color);
        }
        
        // Обновляем фон
        document.body.style.background = themeParams.bg_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    bindEvents() {
        // Навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                this.switchScreen(screen);
            });
        });

        // Кнопки назад
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                this.switchScreen(screen);
            });
        });

        // Кнопки очков
        document.querySelectorAll('.plus-btn, .minus-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.currentTarget.dataset.player);
                const isPlus = e.currentTarget.classList.contains('plus-btn');
                
                if (isPlus) {
                    this.addPoint(player);
                } else {
                    this.removePoint(player);
                }
            });
        });

        // Быстрое добавление очков
        document.querySelectorAll('.quick-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.currentTarget.dataset.player);
                const points = parseInt(e.currentTarget.dataset.points);
                
                for (let i = 0; i < points; i++) {
                    this.addPoint(player);
                }
            });
        });

        // Смена игроков
        document.getElementById('swapPlayersBtn').addEventListener('click', () => this.swapPlayers());
        
        // Сброс очков
        document.getElementById('resetPointsBtn').addEventListener('click', () => this.resetPoints());

        // Новый сет
        document.getElementById('newSetBtnMobile').addEventListener('click', () => this.startNewSet());
        
        // Новая игра
        document.getElementById('newMatchBtnMobile').addEventListener('click', () => this.startNewMatch());

        // История
        document.getElementById('historyBtn').addEventListener('click', () => this.openHistorySheet());
        document.getElementById('closeHistorySheet').addEventListener('click', () => this.closeHistorySheet());

        // Настройки
        document.getElementById('saveSettingsMobile').addEventListener('click', () => this.saveSettings());

        // Выбор цвета
        document.querySelectorAll('.color-picker-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.currentTarget.dataset.player);
                this.openColorPicker(player);
            });
        });

        document.querySelector('.close-color-picker').addEventListener('click', () => this.closeColorPicker());

        // Закрытие по overlay
        document.getElementById('overlay').addEventListener('click', () => {
            this.closeHistorySheet();
            this.closeColorPicker();
        });

        // Имена игроков
        document.getElementById('player1Name').addEventListener('input', (e) => {
            this.updatePlayerName(1, e.target.value);
        });

        document.getElementById('player2Name').addEventListener('input', (e) => {
            this.updatePlayerName(2, e.target.value);
        });

        document.getElementById('player1SettingsName').addEventListener('input', (e) => {
            this.updatePlayerName(1, e.target.value);
        });

        document.getElementById('player2SettingsName').addEventListener('input', (e) => {
            this.updatePlayerName(2, e.target.value);
        });

        // Swipe для смены экранов (опционально)
        this.initSwipeSupport();
    }

    initSwipeSupport() {
        let startX = 0;
        let startY = 0;
        const threshold = 50;
        const restraint = 100;
        const allowedTime = 300;
        let startTime = 0;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX;
            startY = e.touches[0].pageY;
            startTime = new Date().getTime();
        }, false);

        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].pageX;
            const endY = e.changedTouches[0].pageY;
            const endTime = new Date().getTime();
            
            const distX = endX - startX;
            const distY = endY - startY;
            const elapsedTime = endTime - startTime;
            
            if (elapsedTime <= allowedTime) {
                if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
                    if (distX > 0) {
                        // Swipe right
                        this.switchScreen('main');
                    } else {
                        // Swipe left
                        const currentScreen = this.getCurrentScreen();
                        if (currentScreen === 'main') {
                            this.switchScreen('stats');
                        }
                    }
                }
            }
        }, false);
    }

    getCurrentScreen() {
        const screens = document.querySelectorAll('.screen');
        for (const screen of screens) {
            if (screen.classList.contains('active')) {
                return screen.id.replace('Screen', '').toLowerCase();
            }
        }
        return 'main';
    }

    switchScreen(screenName) {
        // Скрыть все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Показать выбранный экран
        document.getElementById(`${screenName}Screen`).classList.add('active');
        
        // Обновить активную кнопку навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.screen === screenName) {
                btn.classList.add('active');
            }
        });
        
        // Обновить контент на экране
        if (screenName === 'stats') {
            this.updateStatsScreen();
        }
        
        // Закрыть все модальные окна
        this.closeHistorySheet();
        this.closeColorPicker();
    }

    addPoint(player) {
        if (this.gameState.isMatchOver) return;
        
        // Сохраняем для отмены
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));
        
        // Обновляем счет
        if (player === 1) {
            this.gameState.player1.score++;
            this.gameState.player1.totalPoints++;
        } else {
            this.gameState.player2.score++;
            this.gameState.player2.totalPoints++;
        }
        
        // Добавляем в историю
        this.addHistoryEvent(`${player === 1 ? this.gameState.player1.name : this.gameState.player2.name} получает очко`);
        
        // Проверяем победу в сете
        this.checkSetWinner();
        
        // Эффекты
        this.playSound('point');
        this.vibrate(50);
        
        this.render();
        this.saveGameState();
    }

    removePoint(player) {
        if (this.gameState.isMatchOver) return;
        
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));
        
        if (player === 1 && this.gameState.player1.score > 0) {
            this.gameState.player1.score--;
            this.gameState.player1.totalPoints--;
        } else if (player === 2 && this.gameState.player2.score > 0) {
            this.gameState.player2.score--;
            this.gameState.player2.totalPoints--;
        }
        
        this.addHistoryEvent(`Удалено очко у ${player === 1 ? this.gameState.player1.name : this.gameState.player2.name}`);
        
        this.render();
        this.saveGameState();
    }

    checkSetWinner() {
        const p1Score = this.gameState.player1.score;
        const p2Score = this.gameState.player2.score;
        const pointsToWin = this.gameState.pointsToWin;
        const minLead = this.gameState.minLead;
        
        if ((p1Score >= pointsToWin || p2Score >= pointsToWin) && 
            Math.abs(p1Score - p2Score) >= minLead) {
            
            const setWinner = p1Score > p2Score ? 1 : 2;
            const setResult = {
                winner: setWinner,
                score: `${p1Score}-${p2Score}`,
                setNumber: this.gameState.currentSet
            };
            
            this.gameState.sets.push(setResult);
            
            if (setWinner === 1) {
                this.gameState.player1.setsWon++;
            } else {
                this.gameState.player2.setsWon++;
            }
            
            this.addHistoryEvent(`${setWinner === 1 ? this.gameState.player1.name : this.gameState.player2.name} выигрывает сет ${this.gameState.currentSet}`);
            
            // Показываем уведомление
            this.showSetWinNotification(setWinner);
            
            // Проверяем победу в матче
            this.checkMatchWinner();
            
            // Автоматически начинаем новый сет
            if (!this.gameState.isMatchOver && document.getElementById('autoNewSetToggle').checked) {
                setTimeout(() => {
                    this.startNewSet();
                }, 2000);
            }
        }
    }

    checkMatchWinner() {
        const setsToWin = Math.ceil(this.gameState.totalSets / 2);
        
        if (this.gameState.player1.setsWon >= setsToWin) {
            this.gameState.isMatchOver = true;
            this.gameState.matchWinner = 1;
            this.endMatch();
        } else if (this.gameState.player2.setsWon >= setsToWin) {
            this.gameState.isMatchOver = true;
            this.gameState.matchWinner = 2;
            this.endMatch();
        }
    }

    endMatch() {
        const winner = this.gameState.matchWinner;
        const winnerName = winner === 1 ? this.gameState.player1.name : this.gameState.player2.name;
        
        this.addHistoryEvent(`🎉 ${winnerName} выигрывает матч!`);
        
        // Сохраняем матч в историю
        this.saveMatchToHistory();
        
        // Показываем уведомление
        this.showMatchWinNotification(winner);
        
        // Показываем кнопку Telegram для отправки результата
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.MainButton.show();
        }
        
        this.playSound('win');
        this.vibrate([100, 50, 100]);
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
        
        this.addHistoryEvent(`Начинается сет ${this.gameState.currentSet}`);
        
        this.render();
        this.saveGameState();
    }

    startNewMatch() {
        if (!this.gameState.isMatchOver && this.gameState.currentSet > 1) {
            if (!confirm('Текущий матч не завершен. Начать новую игру?')) {
                return;
            }
        }
        
        this.gameHistory = [];
        this.gameState = this.getInitialState();
        this.matchStartTime = new Date();
        
        this.addHistoryEvent('Новая игра начата');
        
        // Скрываем кнопку Telegram
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.MainButton.hide();
        }
        
        this.render();
        this.saveGameState();
    }

    swapPlayers() {
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));
        
        // Меняем игроков местами
        const temp = { ...this.gameState.player1 };
        this.gameState.player1 = { ...this.gameState.player2 };
        this.gameState.player2 = temp;
        
        // Меняем цвета
        const tempColor = this.currentPlayerColors[1];
        this.currentPlayerColors[1] = this.currentPlayerColors[2];
        this.currentPlayerColors[2] = tempColor;
        
        this.addHistoryEvent('Игроки поменялись местами');
        
        this.render();
        this.saveGameState();
        
        this.vibrate(100);
    }

    resetPoints() {
        if (this.gameState.player1.score === 0 && this.gameState.player2.score === 0) return;
        
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));
        
        this.gameState.player1.score = 0;
        this.gameState.player2.score = 0;
        
        this.addHistoryEvent('Очки сброшены');
        
        this.render();
        this.saveGameState();
        
        this.vibrate(100);
    }

    updatePlayerName(player, name) {
        if (player === 1) {
            this.gameState.player1.name = name || 'Игрок 1';
        } else {
            this.gameState.player2.name = name || 'Игрок 2';
        }
        
        // Обновляем оба поля ввода
        document.getElementById('player1Name').value = this.gameState.player1.name;
        document.getElementById('player1SettingsName').value = this.gameState.player1.name;
        document.getElementById('player2Name').value = this.gameState.player2.name;
        document.getElementById('player2SettingsName').value = this.gameState.player2.name;
        
        this.saveGameState();
    }

    updatePlayerColor(player, color) {
        this.currentPlayerColors[player] = color;
        
        // Применяем цвет к карточке игрока
        const playerCard = document.getElementById(`player${player}Card`);
        if (playerCard) {
            playerCard.style.borderLeftColor = color;
        }
        
        // Обновляем индикатор цвета
        const colorIndicator = playerCard.querySelector('.player-color-indicator');
        if (colorIndicator) {
            colorIndicator.style.backgroundColor = color;
        }
        
        // Обновляем цвет счета
        const scoreDisplay = document.getElementById(`score${player}Mobile`);
        if (scoreDisplay) {
            scoreDisplay.style.color = color;
        }
        
        this.saveGameState();
    }

    initColorPicker() {
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c',
            '#34495e', '#e67e22', '#16a085', '#8e44ad', '#27ae60', '#d35400',
            '#2980b9', '#c0392b', '#f1c40f', '#7f8c8d', '#2c3e50', '#e84393'
        ];
        
        const grid = document.querySelector('.color-picker-grid');
        grid.innerHTML = '';
        
        colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option-mobile';
            colorOption.style.backgroundColor = color;
            colorOption.dataset.color = color;
            
            colorOption.addEventListener('click', () => {
                if (this.selectedPlayerForColor) {
                    this.updatePlayerColor(this.selectedPlayerForColor, color);
                    this.closeColorPicker();
                }
            });
            
            grid.appendChild(colorOption);
        });
    }

    openColorPicker(player) {
        this.selectedPlayerForColor = player;
        
        // Показываем overlay
        document.getElementById('overlay').classList.add('show');
        
        // Показываем color picker
        document.getElementById('colorPicker').classList.add('open');
        
        // Отмечаем текущий цвет как выбранный
        const currentColor = this.currentPlayerColors[player];
        document.querySelectorAll('.color-option-mobile').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.color === currentColor) {
                option.classList.add('selected');
            }
        });
    }

    closeColorPicker() {
        this.selectedPlayerForColor = null;
        document.getElementById('overlay').classList.remove('show');
        document.getElementById('colorPicker').classList.remove('open');
    }

    openHistorySheet() {
        document.getElementById('overlay').classList.add('show');
        document.getElementById('historySheet').classList.add('open');
    }

    closeHistorySheet() {
        document.getElementById('overlay').classList.remove('show');
        document.getElementById('historySheet').classList.remove('open');
    }

    showSetWinNotification(winner) {
        const notification = document.getElementById('setWinNotification');
        const title = document.getElementById('setWinTitle');
        const subtitle = document.getElementById('setWinSubtitle');
        
        const winnerName = winner === 1 ? this.gameState.player1.name : this.gameState.player2.name;
        const score = `${this.gameState.player1.score}-${this.gameState.player2.score}`;
        
        title.textContent = `${winnerName} выиграл сет!`;
        subtitle.textContent = `Счет: ${score}`;
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
        
        this.playSound('set');
        this.vibrate([100, 50, 100]);
    }

    showMatchWinNotification(winner) {
        const notification = document.getElementById('setWinNotification');
        const title = document.getElementById('setWinTitle');
        const subtitle = document.getElementById('setWinSubtitle');
        
        const winnerName = winner === 1 ? this.gameState.player1.name : this.gameState.player2.name;
        const setsScore = `${this.gameState.player1.setsWon}-${this.gameState.player2.setsWon}`;
        
        title.textContent = `🎉 ${winnerName} победил!`;
        subtitle.textContent = `Сетов: ${setsScore}`;
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    addHistoryEvent(message) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        this.gameState.history.unshift({
            time: timestamp,
            message: message
        });
        
        // Ограничиваем историю 20 записями
        if (this.gameState.history.length > 20) {
            this.gameState.history.pop();
        }
        
        this.updateHistoryList();
    }

    updateHistoryList() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        this.gameState.history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item-mobile';
            
            // Выбираем иконку в зависимости от типа события
            let icon = 'fas fa-circle';
            if (item.message.includes('получает')) icon = 'fas fa-plus-circle';
            if (item.message.includes('выигрывает')) icon = 'fas fa-trophy';
            if (item.message.includes('Начинается')) icon = 'fas fa-play-circle';
            if (item.message.includes('удалено')) icon = 'fas fa-undo';
            
            historyItem.innerHTML = `
                <i class="${icon}"></i>
                <div class="history-text">${item.message}</div>
                <div class="history-time">${item.time}</div>
            `;
            
            historyList.appendChild(historyItem);
        });
    }

    saveSettings() {
        // Правила игры
        const setsToWin = parseInt(document.getElementById('setsToWinSelect').value);
        this.gameState.totalSets = setsToWin * 2 - 1; // 3, 5 или 7 сетов
        
        this.gameState.pointsToWin = parseInt(document.getElementById('pointsPerSetSelect').value);
        this.gameState.minLead = parseInt(document.getElementById('minLeadSelectMobile').value);
        
        // Имена игроков
        this.updatePlayerName(1, document.getElementById('player1SettingsName').value);
        this.updatePlayerName(2, document.getElementById('player2SettingsName').value);
        
        // Возвращаемся на главный экран
        this.switchScreen('main');
        
        this.addHistoryEvent('Настройки обновлены');
        this.saveGameState();
        
        this.vibrate(100);
    }

    updateStatsScreen() {
        // Общее количество очков
        const totalPoints = this.gameState.player1.totalPoints + this.gameState.player2.totalPoints;
        document.getElementById('totalPoints').textContent = totalPoints;
        
        // Количество сыгранных сетов
        document.getElementById('totalSets').textContent = this.gameState.sets.length;
        
        // Время игры
        const duration = this.getMatchDuration();
        document.getElementById('matchDuration').textContent = duration;
        
        // Распределение очков
        const p1Percent = totalPoints > 0 ? Math.round((this.gameState.player1.totalPoints / totalPoints) * 100) : 50;
        const p2Percent = totalPoints > 0 ? 100 - p1Percent : 50;
        
        document.querySelector('.player-1-fill').style.width = `${p1Percent}%`;
        document.querySelector('.player-2-fill').style.width = `${p2Percent}%`;
        document.querySelectorAll('.distribution-percent')[0].textContent = `${p1Percent}%`;
        document.querySelectorAll('.distribution-percent')[1].textContent = `${p2Percent}%`;
        
        // История матчей
        this.updateMatchesHistory();
    }

    getMatchDuration() {
        const now = new Date();
        const diff = Math.floor((now - this.matchStartTime) / 1000);
        
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateMatchesHistory() {
        const container = document.getElementById('matchesHistory');
        container.innerHTML = '';
        
        if (this.matchHistory.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #95a5a6;">История матчей пуста</div>';
            return;
        }
        
        // Показываем только последние 5 матчей
        const recentMatches = this.matchHistory.slice(-5).reverse();
        
        recentMatches.forEach(match => {
            const matchElement = document.createElement('div');
            matchElement.className = 'match-history-item';
            
            const date = new Date(match.timestamp).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            matchElement.innerHTML = `
                <div class="match-result">${match.player1} ${match.score} ${match.player2}</div>
                <div class="match-date">${date}</div>
            `;
            
            container.appendChild(matchElement);
        });
    }

    saveMatchToHistory() {
        const match = {
            player1: this.gameState.player1.name,
            player2: this.gameState.player2.name,
            score: `${this.gameState.player1.setsWon}-${this.gameState.player2.setsWon}`,
            winner: this.gameState.matchWinner === 1 ? this.gameState.player1.name : this.gameState.player2.name,
            timestamp: new Date().toISOString(),
            sets: this.gameState.sets
        };
        
        this.matchHistory.push(match);
        
        // Сохраняем в localStorage
        this.saveMatchHistory();
    }

    startMatchTimer() {
        setInterval(() => {
            if (!this.gameState.isMatchOver) {
                const durationElement = document.getElementById('matchDuration');
                if (durationElement) {
                    durationElement.textContent = this.getMatchDuration();
                }
            }
        }, 1000);
    }

    playSound(type) {
        if (!document.getElementById('soundToggle').checked) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            let frequency = 440;
            let duration = 0.1;
            
            switch(type) {
                case 'point':
                    frequency = 523.25; // C5
                    duration = 0.05;
                    break;
                case 'set':
                    frequency = 659.25; // E5
                    duration = 0.2;
                    break;
                case 'win':
                    frequency = 784; // G5
                    duration = 0.3;
                    break;
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
            
        } catch (e) {
            console.log('Аудио недоступно');
        }
    }

    vibrate(pattern) {
        if (!document.getElementById('vibrationToggle').checked) return;
        if (!navigator.vibrate) return;
        
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.log('Вибрация недоступна');
        }
    }

    shareMatchResult() {
        const result = {
            player1: this.gameState.player1.name,
            player2: this.gameState.player2.name,
            score: `${this.gameState.player1.setsWon}-${this.gameState.player2.setsWon}`,
            winner: this.gameState.matchWinner === 1 ? this.gameState.player1.name : this.gameState.player2.name,
            sets: this.gameState.sets
        };
        
        const text = `🎾 Результат матча по настольному теннису:\n\n${result.player1} ${result.score} ${result.player2}\nПобедитель: ${result.winner}`;
        
        // Пытаемся отправить через Telegram
        try {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.sendData(JSON.stringify(result));
            } else {
                // Копируем в буфер обмена
                navigator.clipboard.writeText(text).then(() => {
                    alert('Результат скопирован в буфер обмена!');
                });
            }
        } catch (e) {
            // Показываем текст для копирования
            prompt('Скопируйте результат:', text);
        }
    }

    saveGameState() {
        try {
            const stateToSave = {
                ...this.gameState,
                currentPlayerColors: this.currentPlayerColors
            };
            localStorage.setItem('pingPongGameState', JSON.stringify(stateToSave));
        } catch (e) {
            console.log('Не удалось сохранить состояние');
        }
    }

    loadGameState() {
        try {
            const saved = localStorage.getItem('pingPongGameState');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.currentPlayerColors = parsed.currentPlayerColors || this.currentPlayerColors;
                delete parsed.currentPlayerColors;
                return parsed;
            }
        } catch (e) {
            console.log('Не удалось загрузить состояние');
        }
        return null;
    }

    saveMatchHistory() {
        try {
            localStorage.setItem('pingPongMatchHistory', JSON.stringify(this.matchHistory));
        } catch (e) {
            console.log('Не удалось сохранить историю матчей');
        }
    }

    loadMatchHistory() {
        try {
            const saved = localStorage.getItem('pingPongMatchHistory');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.log('Не удалось загрузить историю матчей');
        }
        return null;
    }

    render() {
        // Обновляем счета
        document.getElementById('score1Mobile').textContent = this.gameState.player1.score;
        document.getElementById('score2Mobile').textContent = this.gameState.player2.score;
        
        // Обновляем имена
        document.getElementById('player1Name').value = this.gameState.player1.name;
        document.getElementById('player2Name').value = this.gameState.player2.name;
        document.getElementById('player1SettingsName').value = this.gameState.player1.name;
        document.getElementById('player2SettingsName').value = this.gameState.player2.name;
        
        // Обновляем цвета
        this.updatePlayerColor(1, this.currentPlayerColors[1]);
        this.updatePlayerColor(2, this.currentPlayerColors[2]);
        
        // Обновляем информацию о матче
        document.getElementById('currentSetMobile').textContent = this.gameState.currentSet;
        document.getElementById('totalSetsMobile').textContent = this.gameState.totalSets;
        document.getElementById('pointsToWinMobile').textContent = this.gameState.pointsToWin;
        
        // Обновляем счет сетов
        document.getElementById('setsCount1').textContent = this.gameState.player1.setsWon;
        document.getElementById('setsCount2').textContent = this.gameState.player2.setsWon;
        
        // Обновляем индикаторы сетов
        this.renderSets();
        
        // Обновляем историю
        this.updateHistoryList();
        
        // Обновляем активного игрока
        this.updateActivePlayer();
        
        // Обновляем настройки
        this.updateSettingsValues();
    }

    renderSets() {
        const container = document.getElementById('setsMobile');
        container.innerHTML = '';
        
        for (let i = 0; i < this.gameState.totalSets; i++) {
            const setElement = document.createElement('div');
            setElement.className = 'set-indicator-mobile';
            
            if (i < this.gameState.sets.length) {
                const set = this.gameState.sets[i];
                if (set.winner === 1) {
                    setElement.classList.add('won');
                    setElement.textContent = 'W';
                } else {
                    setElement.classList.add('lost');
                    setElement.textContent = 'L';
                }
            }
            
            if (i + 1 === this.gameState.currentSet && !this.gameState.isMatchOver) {
                setElement.classList.add('current');
                setElement.textContent = setElement.textContent || (i + 1).toString();
            }
            
            container.appendChild(setElement);
        }
    }

    updateActivePlayer() {
        // Подсвечиваем карточку игрока с большим счетом
        const player1Card = document.getElementById('player1Card');
        const player2Card = document.getElementById('player2Card');
        
        if (this.gameState.player1.score > this.gameState.player2.score) {
            player1Card.classList.add('active-player');
            player2Card.classList.remove('active-player');
        } else if (this.gameState.player2.score > this.gameState.player1.score) {
            player2Card.classList.add('active-player');
            player1Card.classList.remove('active-player');
        } else {
            player1Card.classList.remove('active-player');
            player2Card.classList.remove('active-player');
        }
    }

    updateSettingsValues() {
        // Обновляем значения в настройках
        const setsToWin = Math.ceil(this.gameState.totalSets / 2);
        document.getElementById('setsToWinSelect').value = setsToWin;
        document.getElementById('pointsPerSetSelect').value = this.gameState.pointsToWin;
        document.getElementById('minLeadSelectMobile').value = this.gameState.minLead;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new MobilePingPongScorekeeper();
    
    // Сохраняем ссылку для отладки
    window.pingPongApp = app;
    
    console.log('Мобильное приложение счетчика тенниса запущено!');
});

// Предотвращаем масштабирование при двойном тапе
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Предотвращаем контекстное меню
document.addEventListener('contextmenu', (e) => e.preventDefault());
