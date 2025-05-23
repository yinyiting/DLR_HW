document.addEventListener('DOMContentLoaded', () => {
    const gridSizeInput = document.getElementById('gridSize');
    const generateGridButton = document.getElementById('generateGrid');
    const clearGridButton = document.getElementById('clearGrid');
    const startGameButton = document.getElementById('startGame');
    const toolRadios = document.querySelectorAll('input[name="tool"]');

    const gridElement = document.getElementById('grid');
    const simulationGridElement = document.getElementById('simulationGrid');
    const valueMatrixTable = document.getElementById('valueMatrix');
    const policyMatrixTable = document.getElementById('policyMatrix');

    const CELL_TYPE = {
        EMPTY: 'empty',
        START: 'start',
        GOAL: 'goal',
        OBSTACLE: 'obstacle',
        PLAYER: 'player'
    };

    // 定義方向動作和對應的箭頭
    const ACTIONS = [
        { name: 'UP', r: -1, c: 0, arrow: '↑' },
        { name: 'RIGHT', r: 0, c: 1, arrow: '→' },
        { name: 'DOWN', r: 1, c: 0, arrow: '↓' },
        { name: 'LEFT', r: 0, c: -1, arrow: '←' }
    ];

    const POLICY_ARROWS = {
        UP: '↑',
        RIGHT: '→',
        DOWN: '↓',
        LEFT: '←',
        GOAL: '⭐',
        OBSTACLE: '🧱'
    };

    let gridSize = 5; // 預設為 5x5
    let gridData = [];
    let simulationData = [];
    let valueData = [];
    let policyData = [];

    let selectedTool = 'start';
    let startPos = null;
    let goalPos = null;

    function updateObstacleCounter() {
        const count = countObstacles();
        const maxObstacles = gridSize - 2;
        document.getElementById('obstacleCount').textContent = count;
        document.getElementById('maxObstacles').textContent = maxObstacles;
    }

    function updateSelectedTool() {
        selectedTool = document.querySelector('input[name="tool"]:checked').value;
    }

    toolRadios.forEach(radio => radio.addEventListener('change', updateSelectedTool));

    function initializeGridData(size) {
        const newGridData = [];
        for (let r = 0; r < size; r++) {
            newGridData[r] = [];
            for (let c = 0; c < size; c++) {
                newGridData[r][c] = CELL_TYPE.EMPTY;
            }
        }
        return newGridData;
    }

    function createGridCells(element, size, dataArray, isInteractive) {
        element.innerHTML = '';
        element.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        element.style.gridTemplateRows = `repeat(${size}, 1fr)`;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.r = r;
                cell.dataset.c = c;
                updateCellAppearance(cell, dataArray[r][c]);
                if (isInteractive) {
                    cell.addEventListener('click', handleCellClick);
                }
                element.appendChild(cell);
            }
        }
    }

    function createTableCells(tableElement, size, dataArray, isPolicy = false) {
        tableElement.innerHTML = '';
        const tbody = tableElement.createTBody();
        for (let r = 0; r < size; r++) {
            const row = tbody.insertRow();
            for (let c = 0; c < size; c++) {
                const cell = row.insertCell();
                if (isPolicy) {
                    // 政策矩陣可以包含多個箭頭
                    if (Array.isArray(dataArray[r][c])) {
                        cell.textContent = dataArray[r][c].join('');
                    } else {
                        cell.textContent = dataArray[r][c] || '';
                    }
                } else {
                    const val = dataArray[r][c];
                    if (val === -Infinity) {
                        cell.textContent = '-∞';
                    } else if (val === Infinity) {
                        cell.textContent = '∞';
                    } else {
                        // 確保數值格式化為兩位小數
                        cell.textContent = (val !== undefined && val !== null) ? val.toFixed(2) : '0.00';
                    }
                }
            }
        }
    }

    function updateCellAppearance(cellElement, type) {
        cellElement.className = 'grid-cell';
        cellElement.classList.add(type);
        cellElement.textContent = '';
        if (type === CELL_TYPE.START) cellElement.textContent = 'S';
        else if (type === CELL_TYPE.GOAL) cellElement.textContent = 'G';
        // 移除 Player 的 "P" 標記
        // else if (type === CELL_TYPE.PLAYER) cellElement.textContent = 'P';
    }

    function findCellElement(gridParent, r, c) {
        return gridParent.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
    }

    function handleCellClick(event) {
        const r = parseInt(event.target.dataset.r);
        const c = parseInt(event.target.dataset.c);

        // 計算當前障礙物數量
        function countObstacles() {
            let count = 0;
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (gridData[r][c] === CELL_TYPE.OBSTACLE) {
                        count++;
                    }
                }
            }
            return count;
        }

        if (selectedTool === CELL_TYPE.START) {
            if (startPos) {
                gridData[startPos.r][startPos.c] = CELL_TYPE.EMPTY;
                updateCellAppearance(findCellElement(gridElement, startPos.r, startPos.c), CELL_TYPE.EMPTY);
            }
            startPos = { r, c };
            gridData[r][c] = CELL_TYPE.START;
        } else if (selectedTool === CELL_TYPE.GOAL) {
            if (goalPos) {
                gridData[goalPos.r][goalPos.c] = CELL_TYPE.EMPTY;
                updateCellAppearance(findCellElement(gridElement, goalPos.r, goalPos.c), CELL_TYPE.EMPTY);
            }
            goalPos = { r, c };
            gridData[r][c] = CELL_TYPE.GOAL;
        } else if (selectedTool === CELL_TYPE.ERASE) {
            if (startPos && startPos.r === r && startPos.c === c) startPos = null;
            if (goalPos && goalPos.r === r && goalPos.c === c) goalPos = null;
            gridData[r][c] = CELL_TYPE.EMPTY;
        } else if (selectedTool === CELL_TYPE.OBSTACLE) {
            // 檢查是否已經是障礙物
            if (gridData[r][c] === CELL_TYPE.OBSTACLE) {
                gridData[r][c] = CELL_TYPE.EMPTY;
            } else {
                // 檢查是否不是起點或終點
                if (gridData[r][c] !== CELL_TYPE.START && gridData[r][c] !== CELL_TYPE.GOAL) {
                    // 檢查障礙物數量限制
                    const maxObstacles = gridSize - 2;
                    if (countObstacles() < maxObstacles) {
                        gridData[r][c] = CELL_TYPE.OBSTACLE;
                    } else {
                        alert(`最多只能放置 ${maxObstacles} 個障礙物！`);
                        return; // 不更新單元格
                    }
                }
            }
        }

        updateCellAppearance(event.target, gridData[r][c]);
        updateObstacleCounter();
    }

    function generateNewGrid() {
        gridSize = parseInt(gridSizeInput.value);
        if (gridSize < 5 || gridSize > 9) {
            alert("Grid size must be between 5 and 9.");
            gridSizeInput.value = Math.max(5, Math.min(9, gridSize));
            gridSize = parseInt(gridSizeInput.value);
        }

        gridData = initializeGridData(gridSize);
        startPos = null;
        goalPos = null;
        createGridCells(gridElement, gridSize, gridData, true);

        simulationData = initializeGridData(gridSize);
        createGridCells(simulationGridElement, gridSize, simulationData, false);

        valueData = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        createTableCells(valueMatrixTable, gridSize, valueData);

        policyData = Array(gridSize).fill().map(() => Array(gridSize).fill(''));
        createTableCells(policyMatrixTable, gridSize, policyData, true);

        updateObstacleCounter(); // 更新計數器
    }

    function clearInteractiveGrid() {
        gridData = initializeGridData(gridSize);
        startPos = null;
        goalPos = null;
        createGridCells(gridElement, gridSize, gridData, true);
        updateObstacleCounter(); 
    }

    function isValidPosition(r, c) {
        return r >= 0 && r < gridSize && c >= 0 && c < gridSize;
    }

    function valueIteration() {
        if (!startPos || !goalPos) {
            alert("Please define a Start (S) and a Goal (G) position on the grid.");
            return null;
        }

        // 設定價值迭代參數
        const gamma = 0.9;  // 折扣因子
        const theta = 0.001; // 收斂閾值
        const maxIterations = 1000; // 最大迭代次數

        // 設定獎勵結構
        const goalReward = 1.0;   // 目標獎勵設為 1.0
        const stepCost = -0.04;   // 每步小成本，調整以得到 0-1 範圍內的值

        // 初始化價值矩陣
        let V = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        
        // 初始化策略矩陣
        let policy = Array(gridSize).fill().map(() => Array(gridSize).fill().map(() => []));
        
        // 設定障礙物和目標點
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (gridData[r][c] === CELL_TYPE.OBSTACLE) {
                    V[r][c] = -1.0; // 將障礙物設為 -1.00 而非 -Infinity
                    policy[r][c] = POLICY_ARROWS.OBSTACLE;
                } else if (r === goalPos.r && c === goalPos.c) {
                    V[r][c] = goalReward; // 目標點設為 1.0
                    policy[r][c] = POLICY_ARROWS.GOAL;
                }
            }
        }

        // 價值迭代算法
        let iteration = 0;
        let delta;
        
        do {
            delta = 0;
            
            // 對每個狀態進行迭代
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    // 跳過障礙物和目標
                    if (gridData[r][c] === CELL_TYPE.OBSTACLE || 
                        (r === goalPos.r && c === goalPos.c)) {
                        continue;
                    }
                    
                    const oldValue = V[r][c];
                    let maxValue = -Infinity;
                    let bestActions = [];
                    
                    // 嘗試每個動作
                    for (let a = 0; a < ACTIONS.length; a++) {
                        const action = ACTIONS[a];
                        const newR = r + action.r;
                        const newC = c + action.c;
                        
                        // 檢查動作是否有效
                        if (isValidPosition(newR, newC)) {
                            // 如果下一格是障礙物，則視為留在原地
                            const nextR = (gridData[newR][newC] === CELL_TYPE.OBSTACLE) ? r : newR;
                            const nextC = (gridData[newR][newC] === CELL_TYPE.OBSTACLE) ? c : newC;
                            
                            // 獎勵設計
                            let reward;
                            if (nextR === goalPos.r && nextC === goalPos.c) {
                                reward = goalReward; // 到達目標
                            } else if (nextR === r && nextC === c) {
                                reward = -0.1; // 撞到障礙物或牆壁（懲罰更大）
                            } else {
                                reward = stepCost; // 一般移動
                            }
                            
                            const nextValue = reward + gamma * V[nextR][nextC];
                            
                            // 更新最大值和最佳動作
                            if (Math.abs(nextValue - maxValue) < 1e-6) {
                                bestActions.push(action.arrow);
                            } else if (nextValue > maxValue) {
                                maxValue = nextValue;
                                bestActions = [action.arrow];
                            }
                        }
                    }
                    
                    // 更新價值和策略
                    if (maxValue !== -Infinity) {
                        V[r][c] = maxValue;
                        // 限制值在範圍內
                        if (V[r][c] < -1.0) V[r][c] = -1.0;
                        if (V[r][c] > 1.0) V[r][c] = 1.0;
                        
                        policy[r][c] = bestActions;
                        
                        // 更新 delta
                        delta = Math.max(delta, Math.abs(oldValue - V[r][c]));
                    }
                }
            }
            
            iteration++;
            
        } while (delta > theta && iteration < maxIterations);
        
        console.log(`價值迭代在 ${iteration} 次迭代後收斂`);
        
        // 格式化價值矩陣，使其符合要求的格式
        const formattedV = V.map(row => 
            row.map(val => {
                if (val === -1.0) return -1.0; // 障礙物保持 -1.00
                return Math.round(val * 100) / 100; // 其他值四捨五入到兩位小數
            })
        );
        
        return { valueMatrix: formattedV, policyMatrix: policy };
    }

    function findBestPath() {
        if (!startPos || !goalPos) return [];
        
        // 執行價值迭代
        const result = valueIteration();
        if (!result) return [];
        
        const { policyMatrix } = result;
        
        // 找出從起點到終點的最佳路徑
        let path = [];
        let current = { ...startPos };
        let maxSteps = gridSize * gridSize; // 防止無限循環
        let steps = 0;
        
        // 將起點加入路徑
        path.push({ ...current });
        
        // 循環直到達到終點或達到最大步數
        while (!(current.r === goalPos.r && current.c === goalPos.c) && steps < maxSteps) {
            const currentPolicy = policyMatrix[current.r][current.c];
            
            // 如果策略為空或不是陣列，則停止
            if (!currentPolicy || !Array.isArray(currentPolicy) || currentPolicy.length === 0) {
                break;
            }
            
            // 選擇第一個可用的動作
            const nextMoveArrow = currentPolicy[0];
            let nextMove = null;
            
            // 找到箭頭對應的動作
            for (const action of ACTIONS) {
                if (action.arrow === nextMoveArrow) {
                    nextMove = action;
                    break;
                }
            }
            
            // 如果沒有有效動作，則停止
            if (!nextMove) break;
            
            // 計算下一步的位置
            const newR = current.r + nextMove.r;
            const newC = current.c + nextMove.c;
            
            // 檢查下一步是否有效
            if (!isValidPosition(newR, newC) || 
                gridData[newR][newC] === CELL_TYPE.OBSTACLE) {
                break;
            }
            
            // 更新當前位置並加入路徑
            current = { r: newR, c: newC };
            path.push({ ...current });
            steps++;
        }
        
        return path;
    }

    function animatePath(path) {
        // 深拷貝原始網格數據
        simulationData = JSON.parse(JSON.stringify(gridData));
        createGridCells(simulationGridElement, gridSize, simulationData, false);
        
        // 逐步顯示路徑
        path.forEach((point, index) => {
            setTimeout(() => {
                if ((point.r === startPos.r && point.c === startPos.c) || 
                    (point.r === goalPos.r && point.c === goalPos.c)) {
                    return; // 跳過起點和終點
                }
                
                const cell = findCellElement(simulationGridElement, point.r, point.c);
                cell.className = 'grid-cell player';
                
                // 如果不是最後一個點，添加箭頭指示方向
                if (index < path.length - 1) {
                    const nextPoint = path[index + 1];
                    let direction = '';
                    
                    // 計算方向
                    if (nextPoint.r < point.r) direction = POLICY_ARROWS.UP;
                    else if (nextPoint.r > point.r) direction = POLICY_ARROWS.DOWN;
                    else if (nextPoint.c < point.c) direction = POLICY_ARROWS.LEFT;
                    else if (nextPoint.c > point.c) direction = POLICY_ARROWS.RIGHT;
                    
                    // 設置箭頭
                    cell.textContent = direction;
                }
            }, index * 300); // 每 300ms 顯示一步
        });
    }

    function runGameAndMatrices() {
        if (!startPos || !goalPos) {
            alert("Please define a Start (S) and a Goal (G) position on the grid.");
            return;
        }
        
        // 添加路徑檢查
        if (!checkPathExists()) {
            alert("No valid path exists from start to goal. Please adjust the obstacles.");
            return;
        }

        // 執行價值迭代
        const result = valueIteration();
        if (!result) return;
        
        const { valueMatrix, policyMatrix } = result;
        
        // 顯示價值矩陣和策略矩陣
        valueData = valueMatrix;
        policyData = policyMatrix;
        
        createTableCells(valueMatrixTable, gridSize, valueData);
        createTableCells(policyMatrixTable, gridSize, policyData, true);
        
        // 找出最佳路徑並顯示
        const bestPath = findBestPath();
        
        // 動畫顯示路徑
        animatePath(bestPath);
    }
    function checkPathExists() {
        if (!startPos || !goalPos) return false;
        
        // 使用廣度優先搜索檢查路徑
        const queue = [{ ...startPos }];
        const visited = {};
        visited[`${startPos.r},${startPos.c}`] = true;
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            // 如果到達目標，返回 true
            if (current.r === goalPos.r && current.c === goalPos.c) {
                return true;
            }
            
            // 嘗試四個方向
            for (const action of ACTIONS) {
                const newR = current.r + action.r;
                const newC = current.c + action.c;
                
                // 檢查是否有效且未訪問
                if (isValidPosition(newR, newC) && 
                    gridData[newR][newC] !== CELL_TYPE.OBSTACLE &&
                    !visited[`${newR},${newC}`]) {
                    queue.push({ r: newR, c: newC });
                    visited[`${newR},${newC}`] = true;
                }
            }
        }
        
        return false; // 沒有找到路徑
    }
    
    // 添加事件監聽器
    generateGridButton.addEventListener('click', generateNewGrid);
    clearGridButton.addEventListener('click', clearInteractiveGrid);
    startGameButton.addEventListener('click', runGameAndMatrices);

    // 初始化
    updateSelectedTool();
    generateNewGrid();
});