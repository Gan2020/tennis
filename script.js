* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
}

header {
    text-align: center;
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h1 {
    color: #2c3e50;
    font-size: 1.8rem;
    margin-bottom: 10px;
}

.match-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.1rem;
    color: #7f8c8d;
}

.sets-info {
    display: flex;
    gap: 15px;
}

.settings-btn {
    font-size: 1.5rem;
    cursor: pointer;
    padding: 5px 10px;
    border-radius: 5px;
    transition: background-color 0.3s;
}

.settings-btn:hover {
    background-color: #f0f0f0;
}

.scoreboard {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
}

.player {
    flex: 1;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s, box-shadow 0.3s;
}

.player:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.player-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.player-name {
    flex: 1;
    font-size: 1.3rem;
    font-weight: bold;
    border: none;
    background: transparent;
    text-align: center;
    color: #2c3e50;
    padding: 5px;
    border-radius: 5px;
    transition: background-color 0.3s;
}

.player-name:focus {
    outline: none;
    background-color: #f8f9fa;
}

.player-color-btn {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 5px;
    border-radius: 5px;
    transition: background-color 0.3s;
}

.player-color-btn:hover {
    background-color: #f0f0f0;
}

.score-display {
    margin: 20px 0;
}

.current-score {
    font-size: 5rem;
    font-weight: bold;
    color: #3498db;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.sets-display {
    margin: 15px 0;
}

.sets-container {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
}

.set-indicator {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: #ecf0f1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.9rem;
}

.set-indicator.won {
    background-color: #2ecc71;
    color: white;
}

.set-indicator.lost {
    background-color: #e74c3c;
    color: white;
}

.set-indicator.current {
    border: 3px solid #3498db;
}

.score-controls {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 20px;
}

.btn-plus, .btn-minus {
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 50%;
    font-size: 2rem;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.btn-plus {
    background-color: #2ecc71;
    color: white;
}

.btn-minus {
    background-color: #e74c3c;
    color: white;
}

.btn-plus:hover, .btn-minus:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn-plus:active, .btn-minus:active {
    transform: scale(0.95);
}

.vs {
    font-size: 2.5rem;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    padding: 0 10px;
}

.match-controls {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin: 30px 0;
    flex-wrap: wrap;
}

button {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-primary {
    background-color: #3498db;
    color: white;
}

.btn-secondary {
    background-color: #95a5a6;
    color: white;
}

.btn-danger {
    background-color: #e74c3c;
    color: white;
}

button:hover {
    opacity: 0.9;
    transform: translateY(-2px);
}

.history {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.history h3 {
    color: #2c3e50;
    margin-bottom: 15px;
}

#historyLog {
    max-height: 200px;
    overflow-y: auto;
}

.history-item {
    padding: 10px;
    margin: 5px 0;
    background: #f8f9fa;
    border-radius: 5px;
    border-left: 4px solid #3498db;
    font-size: 0.9rem;
}

/* Модальные окна */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: white;
    border-radius: 15px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-content.small {
    max-width: 350px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
}

.modal-header h2, .modal-header h3 {
    color: #2c3e50;
    margin: 0;
}

.close-modal {
    font-size: 2rem;
    cursor: pointer;
    color: #7f8c8d;
    transition: color 0.3s;
}

.close-modal:hover {
    color: #e74c3c;
}

.modal-body {
    padding: 20px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    color: #2c3e50;
    font-weight: bold;
}

.form-group select {
    width: 100%;
    padding: 10px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s;
}

.form-group select:focus {
    outline: none;
    border-color: #3498db;
}

.color-picker {
    margin-top: 20px;
}

.color-options, .color-options-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
}

.color-options-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
}

.color-option {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.3s, box-shadow 0.3s;
    border: 3px solid transparent;
}

.color-option:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.color-option.selected {
    border-color: #2c3e50;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid #eee;
    text-align: right;
}

/* Адаптивность */
@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    .scoreboard {
        flex-direction: column;
        gap: 15px;
    }
    
    .player {
        width: 100%;
    }
    
    .vs {
        font-size: 2rem;
        margin: 10px 0;
    }
    
    .current-score {
        font-size: 4rem;
    }
    
    .match-controls {
        flex-direction: column;
    }
    
    button {
        width: 100%;
    }
    
    .color-options-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
