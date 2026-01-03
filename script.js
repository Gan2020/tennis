class PingPongScorekeeper {
    constructor() {
        this.initGame();
        this.initTelegram();
        this.bindEvents();
        this.render();
        this.setupBotListener(); // Добавляем слушатель для бота
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
            matchWinner: null,
            botEnabled: true // Флаг включения обработки сообщений бота
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
                
                console.log('Telegram Web App инициализирован');
            }
        } catch (e) {
            console.log('Telegram Web App не доступен');
        }
    }

    // НОВЫЙ МЕТОД: Настройка слушателя для сообщений бота
    setupBotListener() {
        // Слушаем сообщения от родительского окна (если встроено в iframe)
        window.addEventListener('message', (event) => {
            this.handleBotMessage(event.data);
        }, false);

        // Также слушаем события от Telegram Web App
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.onEvent('message', (data) => {
                this.handleBotMessage(data);
            });
        }

        // Для отладки: создаем кнопку для тестирования
        this.createTestButtons();
    }

    // НОВЫЙ МЕТОД: Обработка сообщений от бота
    handleBotMessage(message) {
        if (!this.gameState.botEnabled || this.gameState.matchWinner) return;
        
        console.log('Получено сообщение от бота:', message);
        
        // Проверяем текстовые команды
        if (typeof message === 'string') {
            const msg = message.toLowerCase().trim();
            
            if (msg === 'один' || msg === '1' || msg === 'one' || msg === 'player1' || msg === 'игрок1') {
                this.addPointFromBot(1, 'бота');
            }
            else if (msg === 'два' || msg === '2' || msg === 'two' || msg === 'player2' || msg === 'игрок2') {
                this.addPointFromBot(2, 'бота');
            }
            else if (msg === 'сброс' || msg === 'reset' || msg === 'новый сет') {
                this.startNewSet();
            }
            else if (msg === 'новая игра' || msg === 'new game') {
                this.startNewMatch();
            }
            else if (msg === 'отмена' || msg === 'undo') {
                this.undoLastAction();
            }
            else if (msg === 'статус' || msg === 'status') {
                this.sendStatusToBot();
            }
        }
        // Проверяем JSON команды
        else if (typeof message === 'object' && message !== null) {
            if (message.command === 'add_point') {
                const player = message.player || 1;
                this.addPointFromBot(player, 'бота');
            }
            else if (message.command === 'reset') {
                this.resetPoints();
            }
            else if (message.command === 'new_set') {
                this.startNewSet();
            }
            else if (message.command === 'toggle_bot') {
                this.gameState.botEnabled = !this.gameState.botEnabled;
                this.addToHistory(`Обработка команд бота: ${this.gameState.botEnabled ? 'включена' : 'выключена'}`);
                this.render();
            }
        }
    }

    // НОВЫЙ МЕТОД: Добавление очка от бота
    addPointFromBot(player, source = 'бота') {
        if (this.gameState.matchWinner) {
            this.sendMessageToBot(`Матч уже завершен! Победитель: ${this.gameState.matchWinner === 1 ? this.gameState.player1.name : this.gameState.player2.name}`);
            return;
        }

        this.addPoint(player);
        this.addToHistory(`Очко добавлено ${source} для ${player === 1 ? this.gameState.player1.name : this.gameState.player2.name}`);
        
        // Отправляем подтверждение боту
        this.sendMessageToBot(`✅ Добавлено очко для ${player === 1 ? this.gameState.player1.name : this.gameState.player2.name}. Текущий счет: ${this.gameState.player1.score}-${this.gameState.player2.score}`);
        
        // Визуальная обратная связь
        this.showBotNotification(`+1 для ${player === 1 ? this.gameState.player1.name : this.gameState.player2.name}`);
        
        this.render();
    }

    // НОВЫЙ МЕТОД: Отправка статуса боту
    sendStatusToBot() {
        const status = {
            player1: {
                name: this.gameState.player1.name,
                score: this.gameState.player1.score,
                sets: this.gameState.player1.sets.filter(s => s === 'win').length
            },
            player2: {
                name: this.gameState.player2.name,
                score: this.gameState.player2.score,
                sets: this.gameState.player2.sets.filter(s => s === 'win').length
            },
            currentSet: this.gameState.currentSet,
            matchWinner: this.gameState.matchWinner,
            score: `${this.gameState.player1.score}-${this.gameState.player2.score}`,
            setsScore: `${this.gameState.player1.sets.filter(s => s === 'win').length}-${this.gameState.player2.sets.filter(s => s === 'win').length}`
        };
        
        this.sendMessageToBot(`📊 Статус матча:
${status.player1.name}: ${status.player1.score} очков (${status.player1.sets} сетов)
${status.player2.name}: ${status.player2.score} очков (${status.player2.sets} сетов)
Текущий сет: ${status.currentSet}
Счет: ${status.score}`);
    }

    // НОВЫЙ МЕТОД: Отправка сообщения обратно боту
    sendMessageToBot(message) {
        console.log('Отправка боту:', message);
        
        // Отправляем через родительское окно
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'pingpong_response',
                message: message,
                timestamp: new Date().toISOString()
            }, '*');
        }
        
        // Отправляем через Telegram Web App
        if (window.Telegram?.WebApp) {
            try {
                window.Telegram.WebApp.sendData(JSON.stringify({
                    type: 'status',
                    message: message
                }));
            } catch (e) {
                console.log('Не удалось отправить сообщение через Telegram');
            }
        }
    }

    // НОВЫЙ МЕТОД: Визуальное уведомление о действии бота
    showBotNotification(message) {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.className = 'bot-notification';
        notification.innerHTML = `
            <div class="bot-notification-content">
                <span class="bot-icon">🤖</span>
                <span class="bot-message">${message}</span>
            </div>
        `;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2s forwards;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Удаляем через 2.5 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2500);
    }

    // НОВЫЙ МЕТОД: Создание кнопок для тестирования (для отладки)
    createTestButtons() {
        // Создаем панель тестирования только в режиме отладки
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const testPanel = document.createElement('div');
            testPanel.className = 'test-panel';
            testPanel.innerHTML = `
                <div style="position: fixed; bottom: 100px; right: 20px; z-index: 9999;">
                    <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                        <h4 style="margin-bottom: 10px; color: #333;">Тест команд бота</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            <button class="test-btn" data-command="один">+1 Игрок 1</button>
                            <button class="test-btn" data-command="два">+1 Игрок 2</button>
                            <button class="test-btn" data-command="сброс">Сброс</button>
                            <button class="test-btn" data-command="статус">Статус</button>
                            <button id="toggleBotBtn" style="background: #f39c12;">Бот: ВКЛ</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(testPanel);
            
            // Обработчики для тестовых кнопок
            document.querySelectorAll('.test-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const command = e.target.dataset.command;
                    this.handleBotMessage(command);
                });
            });
            
            // Кнопка включения/выключения бота
            document.getElementById('toggleBotBtn').addEventListener('click', () => {
                this.gameState.botEnabled = !this.gameState.botEnabled;
                const btn = document.getElementById('toggleBotBtn');
                btn.textContent = `Бот: ${this.gameState.botEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
                btn.style.background = this.gameState.botEnabled ? '#2ecc71' : '#e74c3c';
                
                this.addToHistory(`Обработка команд бота: ${this.gameState.botEnabled ? 'включена' : 'выключена'}`);
                this.render();
            });
        }
    }

    // Остальные методы остаются без изменений, но добавляем новый метод для resetPoints
    resetPoints() {
        this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));
        
        this.gameState.player1.score = 0;
        this.gameState.player2.score = 0;
        
        this.addToHistory('Очки сброшены');
        this.sendMessageToBot('✅ Очки сброшены. Счет: 0-0');
        
        this.render();
    }

    // Модифицируем метод addPoint для поддержки бота
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
        
        this.render();
    }

    // Модифицируем метод addToHistory для лучшего форматирования
    addToHistory(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.gameState.history.unshift({
            time: timestamp,
            message: message,
            type: message.includes('бот') ? 'bot' : 'user'
        });
        
        // Ограничиваем историю 50 последними записями
        if (this.gameState.history.length > 50) {
            this.gameState.history.pop();
        }
    }

    // Модифицируем render для отображения истории с иконками
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
        
        // Обновляем статус бота в интерфейсе
        this.updateBotStatusIndicator();
    }

    // НОВЫЙ МЕТОД: Индикатор статуса бота
    updateBotStatusIndicator() {
        let indicator = document.getElementById('botStatusIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'botStatusIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: ${this.gameState.botEnabled ? '#2ecc71' : '#e74c3c'};
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 5px;
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <span>🤖</span>
            <span>Бот: ${this.gameState.botEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
        `;
        indicator.style.background = this.gameState.botEnabled ? '#2ecc71' : '#e74c3c';
    }

    // Модифицируем renderHistory для отображения иконок
    renderHistory() {
        const historyLog = document.getElementById('historyLog');
        historyLog.innerHTML = '';
        
        this.gameState.history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            // Добавляем иконку для действий бота
            const icon = item.type === 'bot' ? '🤖 ' : '';
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${item.time}</strong> - ${icon}${item.message}
                    </div>
                    ${item.type === 'bot' ? '<span style="font-size: 12px; color: #666; background: #f0f0f0; padding: 2px 6px; border-radius: 10px;">бот</span>' : ''}
                </div>
            `;
            historyLog.appendChild(div);
        });
    }

    // Остальные методы остаются без изменений из первого варианта
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
                this.sendMessageToBot(`🎉 ${this.gameState.player1.name} выигрывает сет ${this.gameState.currentSet}!`);
            } else {
                this.gameState.player2.sets.push('win');
                this.gameState.player1.sets.push('loss');
                this.addToHistory(`${this.gameState.player2.name} выигрывает сет ${this.gameState.currentSet}!`);
                this.sendMessageToBot(`🎉 ${this.gameState.player2.name} выигрывает сет ${this.gameState.currentSet}!`);
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
            this.sendMessageToBot(`🏆 ${this.gameState.player1.name} ВЫИГРЫВАЕТ МАТЧ! Поздравляем!`);
            this.showMatchWinner(1);
        } else if (wins2 >= setsToWin) {
            this.gameState.matchWinner = 2;
            this.addToHistory(`🎉 ${this.gameState.player2.name} выигрывает матч!`);
            this.sendMessageToBot(`🏆 ${this.gameState.player2.name} ВЫИГРЫВАЕТ МАТЧ! Поздравляем!`);
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
        this.sendMessageToBot(`🔄 Начинается сет ${this.gameState.currentSet}`);
        
        this.render();
    }

    startNewMatch() {
        if (confirm('Начать новую игру? Текущий прогресс будет потерян.')) {
            this.initGame();
            this.addToHistory('Новая игра начата');
            this.sendMessageToBot('🆕 Новая игра начата!');
            this.render();
        }
    }

    undoLastAction() {
        if (this.gameHistory.length > 0) {
            this.gameState = this.gameHistory.pop();
            this.addToHistory('Отменено последнее действие');
            this.sendMessageToBot('↶ Отменено последнее действие');
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
        this.sendMessageToBot('⚙️ Настройки игры обновлены');
        this.render();
    }

    saveMatchResult() {
        try {
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                const result = {
                    player1: this.gameState.player1.name,
                    player2: this.gameState.player2.name,
                    score: `${this.gameState.player1.sets.filter(s => s === 'win').length}-${this.gameState.player2.sets.filter(s => s === 'win').length}`,
                    winner: this.gameState.matchWinner === 1 ? this.gameState.player1.name : this.gameState.player2.name,
                    points: `${this.gameState.player1.score}-${this.gameState.player2.score}`
                };
                
                tg.sendData(JSON.stringify(result));
                tg.close();
            }
        } catch (e) {
            console.log('Не удалось отправить результат в Telegram');
        }
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
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new PingPongScorekeeper();
    
    // Для отладки
    window.app = app;
    
    console.log('Счетчик настольного тенниса запущен! Поддержка бота включена.');
    
    // Добавляем стили для анимаций
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .bot-notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .bot-icon {
            font-size: 20px;
        }
        
        .bot-message {
            font-size: 14px;
        }
        
        .test-btn {
            padding: 8px 12px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .test-btn:hover {
            background: #2980b9;
        }
        
        .history-item.bot-action {
            background: #f8f9fa;
            border-left-color: #9b59b6;
        }
    `;
    document.head.appendChild(style);
});
