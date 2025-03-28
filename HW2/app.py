from flask import Flask, render_template, request, jsonify
import numpy as np
import random

app = Flask(__name__)

GRID_SIZE = 5
GAMMA = 0.9  # 折扣因子
ACTIONS = {
    "↑": (-1, 0),
    "↓": (1, 0),
    "←": (0, -1),
    "→": (0, 1)
}

@app.route('/')
def index():
    return render_template('index.html', grid_size=GRID_SIZE)

@app.route('/set_size', methods=['POST'])
def set_size():
    """更新 GRID_SIZE"""
    global GRID_SIZE, START_CELL, END_CELL, OBSTACLES
    try:
        data = request.get_json()
        size = data.get("size")

        if 5 <= size <= 9:
            GRID_SIZE = size
            START_CELL = None
            END_CELL = None
            OBSTACLES = set()
            return jsonify({"status": "success", "grid_size": GRID_SIZE})
        
        return jsonify({"status": "error", "message": "Grid size must be between 5 and 9"}), 400
    
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/find_best_path', methods=['POST'])
def find_best_path():
    """計算 Value Matrix 和 Policy Matrix，當找到 end cell 就結束當前 iteration"""
    global GRID_SIZE, START_CELL, END_CELL, OBSTACLES

    try:
        data = request.get_json()
        if not data or 'start' not in data or 'end' not in data or 'obstacles' not in data or 'grid_size' not in data:
            return jsonify({"status": "error", "message": "Missing required parameters"}), 400

        start = tuple(data['start'])
        end = tuple(data['end'])
        obstacles = set(tuple(obs) for obs in data['obstacles'])
        GRID_SIZE = data['grid_size']

        values = np.zeros((GRID_SIZE, GRID_SIZE))
        policy = np.full((GRID_SIZE, GRID_SIZE), " ", dtype=object)

        values[end] = 1.0  # 設定終點獎勵

        for obs in obstacles:
            values[obs] = -1.0  # 設定障礙物

        all_iterations_paths = []
        final_best_path = []

        # Value Iteration
        for iteration in range(100):  
            new_values = values.copy()
            updated = False  # 追蹤是否有更新

            for r in range(GRID_SIZE):
                for c in range(GRID_SIZE):
                    if (r, c) == end or (r, c) in obstacles:
                        continue
                    max_value = float('-inf')
                    best_actions = []
                    for action, (dr, dc) in ACTIONS.items():
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE and (nr, nc) not in obstacles:
                            value = GAMMA * values[nr, nc]
                            if value > max_value:
                                max_value = value
                                best_actions = [action]
                            elif value == max_value:
                                best_actions.append(action)
                    if new_values[r, c] != max_value:
                        updated = True  # 如果有變化，設為 True
                    new_values[r, c] = max_value
                    policy[r, c] = "".join(best_actions)
            
            values = new_values

            # 如果 values 沒有變化，則提早結束迭代
            if not updated:
                break  

            # 取得最佳路徑 (每次計算一條，並儲存最後一條)
            cur_pos = start
            path = []
            while cur_pos != end:
                path.append(cur_pos)
                actions = policy[cur_pos]
                if not actions:
                    break
                chosen_action = random.choice(actions)
                dr, dc = ACTIONS[chosen_action]
                cur_pos = (cur_pos[0] + dr, cur_pos[1] + dc)
                if cur_pos in obstacles:
                    break
                if cur_pos == end:
                    path.append(end)
                    break  # ✅ 抵達 end cell，結束當前 iteration
            
            all_iterations_paths.append(path)
            final_best_path = path  # 🚀 記錄最後一條最優路徑

        return jsonify({
            "status": "success",
            "value_matrix": values.tolist(),
            "policy_matrix": policy.tolist(),
            "paths": all_iterations_paths,
            "final_best_path": final_best_path  # 🔥 新增這個欄位！
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
