from flask import Flask, render_template, request, jsonify
import numpy as np
import random

app = Flask(__name__)

GRID_SIZE = 5
START_CELL = None
END_CELL = None
OBSTACLES = set()

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
    """隨機產生 Value Matrix 和 Policy Matrix，並確保不會超出範圍"""
    global GRID_SIZE, START_CELL, END_CELL, OBSTACLES

    try:
        data = request.get_json()
        if not data or 'start' not in data or 'end' not in data or 'obstacles' not in data or 'grid_size' not in data:
            return jsonify({"status": "error", "message": "Missing required parameters"}), 400

        start = tuple(data['start'])
        end = tuple(data['end'])
        obstacles = set(tuple(obs) for obs in data['obstacles'])
        GRID_SIZE = data['grid_size']  # 讀取前端傳來的 grid_size

        # 產生隨機 Value Matrix
        values = np.random.uniform(-0.5, 0.5, (GRID_SIZE, GRID_SIZE))
        values[end] = 1.0  # 設定終點獎勵
        for obs in obstacles:
            values[obs] = -1.0  # 設定障礙物

        # 產生隨機 Policy Matrix，確保不會超出範圍
        policy = np.full((GRID_SIZE, GRID_SIZE), " ", dtype=object)
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if (r, c) == end or (r, c) in obstacles:
                    continue
                
                valid_actions = []
                for action, (dr, dc) in ACTIONS.items():
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE and (nr, nc) not in obstacles:
                        valid_actions.append(action)

                if valid_actions:
                    num_actions = random.randint(1, len(valid_actions))  # 隨機選擇 1~所有合法動作
                    policy[r, c] = "".join(random.sample(valid_actions, num_actions))

        return jsonify({
            "status": "success",
            "value_matrix": values.tolist(),
            "policy_matrix": policy.tolist()
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
