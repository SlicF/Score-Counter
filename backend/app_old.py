from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
import redis

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

r = redis.Redis(host='redis', port=6379, db=0)

# Initialize Redis keys
r.set('score1', 0)
r.set('score2', 0)

@app.route('/api/data')
def get_data():
    return jsonify({"message": "Hello, World!"})

@app.route('/api/score1/<int:score>', methods=['POST'])
def update_score1(score):
    r.set('score1', score)
    socketio.emit('update_score1', {'score1': score})
    return jsonify({"message": "Score 1 updated successfully"})

@app.route('/api/score2/<int:score>', methods=['POST'])
def update_score2(score):
    r.set('score2', score)
    socketio.emit('update_score2', {'score2': score})
    return jsonify({"message": "Score 2 updated successfully"})

@app.route('/api/score1')
def get_score1():
    value = r.get('score1')
    score = int(value) if value is not None else 0
    return jsonify({"score1": score})

@app.route('/api/score2')
def get_score2():
    value = r.get('score2')
    score = int(value) if value is not None else 0
    return jsonify({"score2": score})

@app.route('/api/reset', methods=['POST'])
def reset_scores():
    r.set('score1', 0)
    r.set('score2', 0)
    socketio.emit('reset_scores', {'score1': 0, 'score2': 0})
    return jsonify({"message": "Scores reset successfully"})

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
