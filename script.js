class PingPongScorekeeper {
    constructor() {
        this.initGame();
        this.initTelegram();
        this.bindEvents();
        this.render();
        this.initBotListener();
    }

    initGame() {
        this.gameState = {
            player1: {
                name: 'Игрок 1',
                score: 0,
                sets: [],
                color: '#3498db',
                totalPoints: 0
            },
            player2: {
                name: 'Игрок 2',
                score: 0,
                sets: [],
                color: '#e74c3c',
                totalPoints: 0
            },
            currentSet: 1,
            totalSets: 5,
            pointsToWin: 11,
            minLead: 2,
            history: [],
            matchWinner: null,
            botEnabled: true
        };
        this.gameHistory = [];
        this.matchStartTime = new Date();
    }

    initTelegram() {
        try {
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                
                // Расширяем на весь экран
                tg.expand();
                
                // Устанавливаем тему
                this.applyTelegramTheme(tg.themeParams);
                
                // Обработчик изменения темы
                tg.onEvent('themeChanged', () => {
                    this.applyTelegramTheme(tg.themeParams);
                });
                
                // Основная кнопка
                tg.MainButton.setText('Поделиться результатом');
                tg.MainButton.onClick(() => this.shareMatchResult());
                
                // Показываем кнопку, если матч завершен
                if (this.gameState.matchWinner) {
                    tg.MainButton.show();
                }
                
                console.log('Telegram Web App инициализирован');
            }
        } catch (e) {
            console.log('Telegram Web App не доступен');
            // Показываем тестовую панель для отладки
            this.showTestPanel();
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
            const header = document.querySelector('header');
            if (header) {
                header.style.color = themeParams.button_text_color;
            }
        }
    }

    initBotListener() {
        // Слушаем сообщения от родительского окна (для интеграции с ботом)
        window.addEventListener('message', (event) => {
            this.handleBotCommand(event.data);
        }, false);
        
        // Для отладки в браузере
        if (!window.Telegram?.WebApp) {
            // Эмулируем сообщения от бота
            setInterval(() => {
                this.checkForBotCommands();
            }, 1000);
        }
    }

    handleBotCommand(data) {
        if (!this.gameState.botEnabled) return;
        
        try {
            let command = '';
            
            // Обрабатываем разные форматы данных
            if (typeof data === 'string') {
                command = data.trim().toLowerCase();
            } else if (typeof data === 'object' && data !== null) {
                // Обрабатываем сообщения из Telegram
                if (data.message && data.message.text) {
                    command = data.message.text.trim().toLowerCase();
                } else if (data.command) {
                    command = data.command.trim().toLowerCase();
                } else if (data.text) {
                    command = data.text.trim().toLowerCase();
                } else if (data.data) {
                    command = data.data.trim().toLowerCase();
                }
            }
            
            console.log('Получена команда от бота:', command);
            
            this.processBotCommand(command);
            
        } catch (error) {
            console.error('Ошибка обработки команды бота:', error);
        }
    }

    processBotCommand(command) {
        if (!command) return;
        
        // Убираем упоминание бота, если есть
        command = command.replace(/@\w+\s*/g, '').trim();
        
        switch(command) {
            case 'один':
            case '1':
            case 'one':
            case 'player1':
            case 'игрок1':
            case '+1 игрок1':
            case '+1 первый':
                this.addPointFromBot(1);
                break;
                
            case 'два':
            case '2':
            case 'two':
            case 'player2':
            case 'игрок2':
            case '+1 игрок2':
            case '+1 второй':
                this.addPointFromBot(2);
                break;
                
            case 'сброс':
            case 'reset':
            case '0':
            case 'обнулить':
                this.resetPoints();
                break;
                
            case 'статус':
            case 'status':
            case 'счет':
            case 'score':
            case 'результат':
                this.sendStatusToBot();
                break;
                
            case 'новая игра':
            case 'new game':
            case 'начать заново':
                this.startNewMatch();
                break;
                
            case 'новый сет':
            case 'new set':
            case 'следующий сет':
                this.startNewSet();
                break;
                
            case 'отмена':
            case 'undo':
            case 'назад':
                this.undoLastAction();
                break;
                
            case 'поменять':
            case 'swap':
            case 'обмен':
                this.swapPlayers();
                break;
                
            case 'бот включить':
            case 'бот вкл':
            case 'enable bot':
                this.gameState.botEnabled = true;
                this.showNotification('🤖 Бот включен');
                this.render();
                break;
                
            case 'бот выключить':
            case 'бот выкл':
            case 'disable bot':
                this.gameState.botEnabled = false;
                this.showNotification('🤖 Бот выключен');
                this.render();
                break;
                
            default:
                // Проверяем, не содержит ли команда упоминание очков
                if (command.includes('+1') || command.includes('+ 1')) {
                    if (command.includes('1') || command.includes('перв') || command.includes('one')) {
                        this.addPointFromBot(1);
                    } else if (command.includes('2') || command.includes('втор') || command.includes('two')) {
                        this.addPointFromBot(2);
                    }
                }
                break;
        }
    }

    addPointFromBot(player) {
        if (!this.gameState.botEnabled) {
            this.showNotification('Бот выключен. Включите в настройках.');
            return;
        }
        
        if (this.gameState.matchWinner) {
            this.showNotification('Матч уже завершен!');
            return;
        }
        
        this.addPoint(player);
        
        const playerName = player === 1 ? this.gameState.player1.name : this.gameState.player2.name;
        this.showNotification(`🤖 +1 очко для ${playerName}`);
        
        // Визуальный эффект
        const scoreElement = document.getElementById(`score${player}`);
        scoreElement.classList.add('pulse');
        setTimeout(() => {
            scoreElement.classList.remove('pulse');
        }, 500);
    }

    addPoint(player) {
        if (this.gameState.matchWinner) return;

        // Сохраняем текущее состояние для возможности отмены
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));

        if (player === 1) {
            this.gameState.player1.score++;
            this.gameState.player1.totalPoints++;
        } else {
            this.gameState.player2.score++;
            this.gameState.player2.totalPoints++;
        }

        // Проверка на победу в сете
        this.checkSetWinner();
        
        this.addToHistory(`+1 очко для ${player === 1 ? this.gameState.player1.name : this.gameState.player2.name}`, 'bot');
        
        this.render();
        this.saveGameState();
    }

    removePoint(player) {
        if (this.gameState.matchWinner) return;

        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));

        if (player === 1 && this.gameState.player1.score > 0) {
            this.gameState.player1.score--;
            this.gameState.player1.totalPoints--;
        } else if (player === 2 && this.gameState.player2.score > 0) {
            this.gameState.player2.score--;
            this.gameState.player2.totalPoints--;
        }

        this.addToHistory(`-1 очко у ${player === 1 ? this.gameState.player1.name : this.gameState.player2.name}`);
        
        this.render();
        this.saveGameState();
    }

    resetPoints() {
        if (!this.gameState.botEnabled) {
            this.showNotification('Бот выключен');
            return;
        }
        
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));
        
        this.gameState.player1.score = 0;
        this.gameState.player2.score = 0;
        
        this.addToHistory('Очки сброшены', 'bot');
        this.showNotification('🤖 Очки сброшены');
        
        this.render();
        this.saveGameState();
    }

    swapPlayers() {
        if (!this.gameState.botEnabled) {
            this.showNotification('Бот выключен');
            return;
        }
        
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));
        
        // Меняем игроков местами
        const temp = { ...this.gameState.player1 };
        this.gameState.player1 = { ...this.gameState.player2 };
        this.gameState.player2 = temp;
        
        // Меняем цвета
        const tempColor = this.gameState.player1.color;
        this.gameState.player1.color = this.gameState.player2.color;
        this.gameState.player2.color = tempColor;
        
        this.addToHistory('Игроки поменялись местами', 'bot');
        this.showNotification('🤖 Игроки поменялись местами');
        
        this.render();
        this.saveGameState();
    }

    sendStatusToBot() {
        const status = `
🎾 СТАТУС МАТЧА 🎾

${this.gameState.player1.name}: ${this.gameState.player1.score} очков
${this.gameState.player2.name}: ${this.gameState.player2.score} очков

Счет: ${this.gameState.player1.score}-${this.gameState.player2.score}
Текущий сет: ${this.gameState.currentSet} из ${this.gameState.totalSets}

Сеты: ${this.gameState.player1.sets.filter(s => s === 'win').length}-${this.gameState.player2.sets.filter(s => s === 'win').length}
        `.trim();
        
        this.showNotification(status);
        
        // Отправляем в Telegram, если доступно
        if (window.Telegram?.WebApp) {
            try {
                window.Telegram.WebApp.sendData(JSON.stringify({
                    type: 'status',
                    message: status
                }));
            } catch (e) {
                console.log('Не удалось отправить статус');
            }
        }
    }

    bindEvents() {
        // Кнопки изменения счета
        document.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.currentTarget.dataset.player);
                this.addPoint(player);
            });
        });

        document.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.currentTarget.dataset.player);
                this.removePoint(player);
            });
        });

        // Быстрое добавление очков
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.currentTarget.dataset.player);
                const points = parseInt(e.currentTarget.dataset.points);
                
                for (let i = 0; i < points; i++) {
                    this.addPoint(player);
                }
            });
        });

        // Кнопки управления ботом
        document.querySelectorAll('.bot-command-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.currentTarget.dataset.command;
                this.processBotCommand(command);
            });
        });

        document.querySelectorAll('.bot-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.currentTarget.dataset.command;
                this.processBotCommand(command);
            });
        });

        // Кнопки тестирования (только для разработки)
        document.querySelectorAll('.test-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.currentTarget.dataset.command;
                this.processBotCommand(command);
            });
        });

        // Отправка тестовой команды
        document.getElementById('sendTestCommand')?.addEventListener('click', () => {
            const input = document.getElementById('testCommandInput');
            if (input.value.trim()) {
                this.processBotCommand(input.value);
                input.value = '';
            }
        });

        // Ввод команды по Enter
        document.getElementById('testCommandInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.processBotCommand(e.target.value);
                e.target.value = '';
            }
        });

        // Переключение бота
        const botToggle = document.getElementById('botToggle');
        const botEnabledToggle = document.getElementById('botEnabledToggle');
        
        [botToggle, botEnabledToggle].forEach(toggle => {
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.gameState.botEnabled = e.target.checked;
                    this.render();
                    this.showNotification(this.gameState.botEnabled ? '🤖 Бот включен' : '🤖 Бот выключен');
                });
            }
        });

        // Остальные кнопки
        document.getElementById('newSetBtn').addEventListener('click', () => this.startNewSet());
        document.getElementById('newMatchBtn').addEventListener('click', () => this.startNewMatch());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoLastAction());
        document.getElementById('swapPlayersBtn').addEventListener('click', () => this.swapPlayers());
        document.getElementById('resetPointsBtn').addEventListener('click', () => this.resetPoints());
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());

        // Имена игроков
        document.querySelectorAll('.player-name').forEach(input => {
            input.addEventListener('input', (e) => {
                const player = e.target.closest('.player').id.replace('player', '');
                this.updatePlayerName(parseInt(player), e.target.value);
            });
        });

        // Настройки
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        
        // Выбор цвета
        document.querySelectorAll('.color-picker-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = parseInt(e.currentTarget.dataset.player);
                this.openColorPicker(player);
            });
        });

        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                const player = this.selectedPlayerForColor;
                
                if (player && color) {
                    this.updatePlayerColor(player, color);
                    this.closeAllModals();
                }
            });
        });

        // Закрытие модальных окон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Переключение тестовой панели
        const testPanelToggle = document.querySelector('.test-panel-toggle');
        if (testPanelToggle) {
            testPanelToggle.addEventListener('click', () => {
                testPanelToggle.classList.toggle('active');
                document.querySelector('.test-panel-content').classList.toggle('show');
            });
        }
    }

    showTestPanel() {
        const testPanel = document.getElementById('testPanel');
        if (testPanel) {
            testPanel.classList.add('show');
        }
    }

    checkForBotCommands() {
        // Этот метод используется только для отладки в браузере
        // В реальном Telegram Web App команды приходят через message event
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Эмуляция получения команды для тестирования
            const testCommands = localStorage.getItem('testBotCommands');
            if (testCommands) {
                const commands = JSON.parse(testCommands);
                commands.forEach(cmd => {
                    this.processBotCommand(cmd);
                });
                localStorage.removeItem('testBotCommands');
            }
        }
    }

    showNotification(message) {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🤖</div>
                <div class="notification-text">${message}</div>
            </div>
        `;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 3s forwards;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(notification);
        
        // Удаляем через 3.5 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3500);
    }

    addToHistory(message, type = 'user') {
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit' 
        });
        
        this.gameState.history.unshift({
            time: timestamp,
            message: message,
            type: type
        });
        
        // Ограничиваем историю 50 записями
        if (this.gameState.history.length > 50) {
            this.gameState.history.pop();
        }
        
        this.renderHistory();
    }

    clearHistory() {
        if (confirm('Очистить историю игры?')) {
            this.gameState.history = [];
            this.renderHistory();
        }
    }

    render() {
        // Обновляем счета
        document.getElementById('score1').textContent = this.gameState.player1.score;
        document.getElementById('score2').textContent = this.gameState.player2.score;
        
        // Обновляем имена
        document.querySelectorAll('#player1 .player-name').forEach(el => {
            el.value = this.gameState.player1.name;
        });
        document.querySelectorAll('#player2 .player-name').forEach(el => {
            el.value = this.gameState.player2.name;
        });
        
        // Обновляем цвета
        document.getElementById('player1').style.borderTopColor = this.gameState.player1.color;
        document.getElementById('player2').style.borderTopColor = this.gameState.player2.color;
        document.getElementById('score1').style.color = this.gameState.player1.color;
        document.getElementById('score2').style.color = this.gameState.player2.color;
        
        const colorIndicators1 = document.querySelectorAll('#player1 .player-color-indicator');
        const colorIndicators2 = document.querySelectorAll('#player2 .player-color-indicator');
        const colorPreviews1 = document.querySelectorAll('#player1 .player-color-preview');
        const colorPreviews2 = document.querySelectorAll('#player2 .player-color-preview');
        
        colorIndicators1.forEach(el => el.style.backgroundColor = this.gameState.player1.color);
        colorIndicators2.forEach(el => el.style.backgroundColor = this.gameState.player2.color);
        colorPreviews1.forEach(el => el.style.backgroundColor = this.gameState.player1.color);
        colorPreviews2.forEach(el => el.style.backgroundColor = this.gameState.player2.color);
        
        // Обновляем информацию о матче
        document.getElementById('currentSet').textContent = this.gameState.currentSet;
        document.getElementById('totalSets').textContent = this.gameState.totalSets;
        document.getElementById('pointsToWin').textContent = this.gameState.pointsToWin;
        
        // Обновляем счет сетов
        const setsWon1 = this.gameState.player1.sets.filter(s => s === 'win').length;
        const setsWon2 = this.gameState.player2.sets.filter(s => s === 'win').length;
        document.getElementById('setsCount1').textContent = setsWon1;
        document.getElementById('setsCount2').textContent = setsWon2;
        
        // Обновляем сеты
        this.renderSets();
        
        // Обновляем статус бота
        this.updateBotStatus();
        
        // Обновляем настройки
        this.updateSettings();
    }

    updateBotStatus() {
        const botStatus = document.getElementById('botStatusIndicator');
        if (botStatus) {
            botStatus.innerHTML = `
                <i class="fas fa-robot"></i>
                <span>Бот: ${this.gameState.botEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
            `;
            botStatus.className = `bot-status ${this.gameState.botEnabled ? 'on' : 'off'}`;
            
            const toggles = document.querySelectorAll('#botToggle, #botEnabledToggle');
            toggles.forEach(toggle => {
                if (toggle) toggle.checked = this.gameState.botEnabled;
            });
        }
    }

    renderHistory() {
        const historyLog = document.getElementById('historyLog');
        if (!historyLog) return;
        
        historyLog.innerHTML = '';
        
        this.gameState.history.forEach(item => {
            const div = document.createElement('div');
            div.className = `history-item ${item.type === 'bot' ? 'bot-action' : ''}`;
            
            div.innerHTML = `
                <div class="history-item-header">
                    <div class="history-time">${item.time}</div>
                    <div class="history-type ${item.type}">${item.type === 'bot' ? '🤖 бот' : '👤 вы'}</div>
                </div>
                <div class="history-message">${item.message}</div>
            `;
            
            historyLog.appendChild(div);
        });
    }

    renderSets() {
        const sets1 = document.getElementById('sets1');
        const sets2 = document.getElementById('sets2');
        
        if (!sets1 || !sets2) return;
        
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

    updateSettings() {
        const totalSetsSelect = document.getElementById('totalSetsSelect');
        const pointsToWinSelect = document.getElementById('pointsToWinSelect');
        const minLeadSelect = document.getElementById('minLeadSelect');
        
        if (totalSetsSelect) totalSetsSelect.value = this.gameState.totalSets;
        if (pointsToWinSelect) pointsToWinSelect.value = this.gameState.pointsToWin;
        if (minLeadSelect) minLeadSelect.value = this.gameState.minLead;
        
        const player1Setting = document.getElementById('player1Setting');
        const player2Setting = document.getElementById('player2Setting');
        
        if (player1Setting) player1Setting.value = this.gameState.player1.name;
        if (player2Setting) player2Setting.value = this.gameState.player2.name;
        
        const botEnabledToggle = document.getElementById('botEnabledToggle');
        if (botEnabledToggle) botEnabledToggle.checked = this.gameState.botEnabled;
        
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) this.gameState.soundEnabled = soundToggle.checked;
    }

    checkSetWinner() {
        const p1Score = this.gameState.player1.score;
        const p2Score = this.gameState.player2.score;
        const pointsToWin = this.gameState.pointsToWin;
        const minLead = this.gameState.minLead;

        if ((p1Score >= pointsToWin || p2Score >= pointsToWin) && 
            Math.abs(p1Score - p2Score) >= minLead) {
            
            const setWinner = p1Score > p2Score ? 1 : 2;
            
            if (setWinner === 1) {
                this.gameState.player1.sets.push('win');
                this.gameState.player2.sets.push('loss');
                this.addToHistory(`${this.gameState.player1.name} выигрывает сет ${this.gameState.currentSet}!`, 'system');
                this.showNotification(`🏆 ${this.gameState.player1.name} выигрывает сет ${this.gameState.currentSet}!`);
            } else {
                this.gameState.player2.sets.push('win');
                this.gameState.player1.sets.push('loss');
                this.addToHistory(`${this.gameState.player2.name} выигрывает сет ${this.gameState.currentSet}!`, 'system');
                this.showNotification(`🏆 ${this.gameState.player2.name} выигрывает сет ${this.gameState.currentSet}!`);
            }

            this.checkMatchWinner();

            if (!this.gameState.matchWinner) {
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
            this.addToHistory(`🎉 ${this.gameState.player1.name} выигрывает матч!`, 'system');
            this.showMatchWinner(1);
        } else if (wins2 >= setsToWin) {
            this.gameState.matchWinner = 2;
            this.addToHistory(`🎉 ${this.gameState.player2.name} выигрывает матч!`, 'system');
            this.showMatchWinner(2);
        }
    }

    showMatchWinner(winner) {
        const winnerName = winner === 1 ? this.gameState.player1.name : this.gameState.player2.name;
        const message = `🎉 ПОБЕДА! ${winnerName} выигрывает матч!`;
        
        this.showNotification(message);
        
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.MainButton.show();
        }
    }

    startNewSet() {
        if (this.gameState.currentSet >= this.gameState.totalSets) {
            this.showNotification('Все сеты уже сыграны!');
            return;
        }

        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));

        this.gameState.currentSet++;
        this.gameState.player1.score = 0;
        this.gameState.player2.score = 0;

        this.addToHistory(`Начинается сет ${this.gameState.currentSet}`, 'system');
        this.showNotification(`🔄 Начинается сет ${this.gameState.currentSet}`);
        
        this.render();
        this.saveGameState();
    }

    startNewMatch() {
        if (!this.gameState.isMatchOver && this.gameState.currentSet > 1) {
            if (!confirm('Текущий матч не завершен. Начать новую игру?')) {
                return;
            }
        }

        this.initGame();
        this.matchStartTime = new Date();
        
        this.addToHistory('Новая игра начата', 'system');
        this.showNotification('🆕 Новая игра начата!');
        
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.MainButton.hide();
        }
        
        this.render();
        this.saveGameState();
    }

    undoLastAction() {
        if (this.gameHistory.length > 0) {
            this.gameState = this.gameHistory.pop();
            this.addToHistory('Отменено последнее действие', 'user');
            this.showNotification('↶ Отменено последнее действие');
            this.render();
            this.saveGameState();
        }
    }

    updatePlayerName(player, name) {
        if (player === 1) {
            this.gameState.player1.name = name || 'Игрок 1';
        } else {
            this.gameState.player2.name = name || 'Игрок 2';
        }
        this.saveGameState();
    }

    updatePlayerColor(player, color) {
        if (player === 1) {
            this.gameState.player1.color = color;
        } else {
            this.gameState.player2.color = color;
        }
        this.render();
        this.saveGameState();
    }

    openSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
    }

    openColorPicker(player) {
        this.selectedPlayerForColor = player;
        document.getElementById('colorModal').style.display = 'flex';
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
        
        const player1Name = document.getElementById('player1Setting')?.value;
        const player2Name = document.getElementById('player2Setting')?.value;
        
        if (player1Name) this.gameState.player1.name = player1Name;
        if (player2Name) this.gameState.player2.name = player2Name;
        
        const botEnabled = document.getElementById('botEnabledToggle')?.checked;
        if (botEnabled !== undefined) this.gameState.botEnabled = botEnabled;
        
        this.closeAllModals();
        this.addToHistory('Настройки обновлены', 'system');
        this.showNotification('⚙️ Настройки обновлены');
        this.render();
        this.saveGameState();
    }

    shareMatchResult() {
        const result = {
            player1: this.gameState.player1.name,
            player2: this.gameState.player2.name,
            score: `${this.gameState.player1.sets.filter(s => s === 'win').length}-${this.gameState.player2.sets.filter(s => s === 'win').length}`,
            winner: this.gameState.matchWinner === 1 ? this.gameState.player1.name : this.gameState.player2.name,
            points: `${this.gameState.player1.score}-${this.gameState.player2.score}`
        };
        
        const text = `🎾 Результат матча:\n${result.player1} ${result.score} ${result.player2}\nПобедитель: ${result.winner}`;
        
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.sendData(JSON.stringify(result));
        } else {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Результат скопирован в буфер обмена!');
            });
        }
    }

    saveGameState() {
        try {
            localStorage.setItem('pingPongGameState', JSON.stringify(this.gameState));
        } catch (e) {
            console.log('Не удалось сохранить состояние');
        }
    }

    loadGameState() {
        try {
            const saved = localStorage.getItem('pingPongGameState');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.log('Не удалось загрузить состояние');
        }
        return null;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new PingPongScorekeeper();
    window.pingPongApp = app;
    
    console.log('Счетчик настольного тенниса запущен!');
    console.log('Для тестирования команд бота используйте тестовую панель в правом нижнем углу.');
});

// Добавляем глобальную функцию для тестирования
window.sendBotCommand = function(command) {
    if (window.pingPongApp) {
        window.pingPongApp.processBotCommand(command);
    }
};
