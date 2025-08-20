# Script Lua para incrementar e aplicar TTL
LUA_INCR_SETEX = """
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local val = redis.call('get', key)
local num = tonumber(val) or 0
num = num + 1
redis.call('setex', key, ttl, num)
return num
"""
# Script Lua para decrementar saturando em zero e aplicando TTL
LUA_DECR_SATURATE_SETEX = """
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local val = redis.call('get', key)
local num = tonumber(val) or 0
if num > 0 then
    num = num - 1
end
redis.call('setex', key, ttl, num)
return num
"""

# Helper local para conversão robusta de score
def parse_score(value):
    """Converte value para int, retornando 0 em caso de erro ou None. Decodifica bytes se necessário."""
    if value is None:
        return 0
    if isinstance(value, bytes):
        value = value.decode()
    try:
        return int(str(value))
    except Exception:
        return 0
import threading
# Mapeamento thread-safe de socket para sala
socket_rooms = {}
socket_rooms_lock = threading.Lock()
# Mapeamento de socket para sala
socket_rooms = {}
def get_room_scores(room_id):
    """Get scores for a room with safe parsing."""
    val1 = r.get(room_key(room_id, "score1"))
    val2 = r.get(room_key(room_id, "score2"))
    score1 = parse_score(val1)
    score2 = parse_score(val2)
    return score1, score2

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room
import redis
import hashlib

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")  # Initialize SocketIO
r = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

TTL_SECONDS = 100  # tempo de expiração (100s para testes)


# --- helpers ---
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def room_key(room_id, key):
    return f"room:{room_id}:{key}"

def refresh_ttl(room_id):
    """Renova o TTL de todos os dados da sala."""
    for key in ["score1", "score2", "admin_pass", "spectator_pass", "participants"]:
        if r.exists(room_key(room_id, key)):
            r.expire(room_key(room_id, key), TTL_SECONDS)

def get_room_participants(room_id):
    """Retorna o número de participantees conectados na sala."""
    participants_key = room_key(room_id, "participants")
    try:
        val = r.get(participants_key)
        if val is not None:
            return int(str(val))
        return 0
    except Exception:
        return 0

def increment_room_participants(room_id):
    """Incrementa o contador de participantees na sala."""
    participants_key = room_key(room_id, "participants")
    r.incr(participants_key)
    r.expire(participants_key, TTL_SECONDS)

def get_all_rooms():
    """Retorna todas as salas ativas."""
    rooms = []
    pattern = "room:*:score1"
    room_ids = []
    try:
        for key in r.scan_iter(match=pattern, count=100):
            parts = key.split(':')
            if len(parts) != 3:
                continue
            room_id = parts[1]
            room_ids.append(room_id)
        if not room_ids:
            return rooms
        # Usar pipeline para verificar existência e buscar dados
        pipe = r.pipeline()
        for room_id in room_ids:
            pipe.exists(room_key(room_id, "score1"))
            pipe.get(room_key(room_id, "participants"))
            pipe.exists(room_key(room_id, "admin_pass"))
            pipe.exists(room_key(room_id, "spectator_pass"))
        results = pipe.execute()
        # Processar resultados em chunks de 4
        for idx, room_id in enumerate(room_ids):
            result_chunk = results[idx*4:(idx+1)*4]
            exists, participants_val, has_admin_pass, has_spectator_pass = result_chunk
            if exists:
                try:
                    participants = int(participants_val) if participants_val is not None else 0
                except (ValueError, TypeError):
                    participants = 0
                rooms.append({
                    "id": room_id,
                    "participants": participants,
                    "hasPassword": bool(has_admin_pass or has_spectator_pass)
                })
    except (IndexError, ValueError, redis.RedisError) as e:
        # Logar erro real
        print(f"Erro ao buscar salas: {e}")
        raise
    return rooms


# --- routes ---
@app.route('/api/rooms', methods=['GET'])
def list_rooms():
    """Lista todas as salas disponíveis."""
    try:
        rooms = get_all_rooms()
        return jsonify({"rooms": rooms})
    except Exception as e:
        return jsonify({"error": "Erro ao carregar salas", "rooms": []}), 500

@app.route('/api/create_room', methods=['POST'])
def create_room():
    data = request.get_json()
    room_id = data.get("room_id")

    # Validate room_id format
    if not room_id or not isinstance(room_id, str):
        return jsonify({"error": "Invalid room_id"}), 400
    if len(room_id) > 50 or not room_id.replace('-', '').replace('_', '').isalnum():
        return jsonify({"error": "Room ID must be alphanumeric with dashes/underscores, max 50 chars"}), 400

    # Verificar se a sala já existe
    if r.exists(room_key(room_id, "score1")):
        return jsonify({"error": "Sala já existe"}), 409

    admin_pass = data.get("admin_pass")
    spectator_pass = data.get("spectator_pass")

    # Inicializar scores
    r.setex(room_key(room_id, "score1"), TTL_SECONDS, 0)
    r.setex(room_key(room_id, "score2"), TTL_SECONDS, 0)
    r.setex(room_key(room_id, "participants"), TTL_SECONDS, 0)  # Inicializa com 0 participantes

    # Guardar hashes das senhas
    if admin_pass:
        r.setex(room_key(room_id, "admin_pass"), TTL_SECONDS, hash_password(admin_pass))
    if spectator_pass:
        r.setex(room_key(room_id, "spectator_pass"), TTL_SECONDS, hash_password(spectator_pass))

    return jsonify({
        "message": f"Sala {room_id} criada com sucesso",
        "room_id": room_id,
        "role": "admin"
    })

@app.route('/api/join_room', methods=['POST'])
def join_room_api():
    data = request.get_json()
    room_id = data.get("room_id")

    # Validate room_id format
    if not room_id or not isinstance(room_id, str):
        return jsonify({"error": "Invalid room_id"}), 400
    if len(room_id) > 50 or not room_id.replace('-', '').replace('_', '').isalnum():
        return jsonify({"error": "Room ID must be alphanumeric with dashes/underscores, max 50 chars"}), 400

    # Verificar se a sala existe
    if not r.exists(room_key(room_id, "score1")):
        return jsonify({"error": "Sala não encontrada"}), 404

    password = data.get("password", "")
    role = (data.get("role") or "").strip().lower()
    if role not in ("admin", "spectator"):
        return jsonify({"error": "Invalid role"}), 400

    # validar password
    admin_hash = r.get(room_key(room_id, "admin_pass"))
    spectator_hash = r.get(room_key(room_id, "spectator_pass"))

    if role == "admin":
        if admin_hash and password and hash_password(password) == admin_hash:
            role = "admin"
        elif not admin_hash:
            role = "admin"
        else:
            return jsonify({"error": "Senha incorreta"}), 403
    elif role == "spectator":
        if spectator_hash and password and hash_password(password) == spectator_hash:
            role = "spectator"
        elif not spectator_hash:
            role = "spectator"
        else:
            return jsonify({"error": "Senha incorreta"}), 403
    # Não incrementa participantes aqui, apenas via socket
    refresh_ttl(room_id)  # renovar vida da sala
    
    return jsonify({"message": f"Entrou em {room_id} como {role}", "role": role})

@app.route('/api/score/<room_id>/<int:team>/<int:score>', methods=['POST'])
def update_score(room_id, team, score):
    if team not in [1, 2]:
        return jsonify({"error": "Invalid team number"}), 400
    if score < 0:
        return jsonify({"error": "Score cannot be negative"}), 400
    
    # Verificar se a sala existe
    if not r.exists(room_key(room_id, "score1")):
        return jsonify({"error": "Sala não encontrada"}), 404
    
    key = f"score{team}"
    r.setex(room_key(room_id, key), TTL_SECONDS, score)

    socketio.emit("update_score", {"team": team, "score": score}, to=room_id)
    refresh_ttl(room_id)
    return jsonify({"message": f"Score {team} updated in room {room_id}"})

@app.route('/api/reset/<room_id>', methods=['POST'])
def reset_scores(room_id):
    # Verificar se a sala existe
    if not r.exists(room_key(room_id, "score1")):
        return jsonify({"error": "Sala não encontrada"}), 404
    
    r.setex(room_key(room_id, "score1"), TTL_SECONDS, 0)
    r.setex(room_key(room_id, "score2"), TTL_SECONDS, 0)
    socketio.emit("reset_scores", {"score1": 0, "score2": 0}, to=room_id)
    refresh_ttl(room_id)
    return jsonify({"message": f"Scores reset in room {room_id}"})


# --- socket events ---
@socketio.on("join")
def on_join(data):
    room_id = data["room_id"]
    join_room(room_id)
    sid = getattr(request, 'sid', None)
    if sid:
        with socket_rooms_lock:
            prev_room = socket_rooms.get(sid)
            if prev_room and prev_room != room_id:
                prev_participants_key = room_key(prev_room, "participants")
                try:
                    r.eval(LUA_DECR_SATURATE_SETEX, 1, prev_participants_key, str(TTL_SECONDS))
                except Exception:
                    pass
            # Incrementa participantes da nova sala via Lua (atômico)
            participants_key = room_key(room_id, "participants")
            try:
                num = r.eval(LUA_INCR_SETEX, 1, participants_key, str(TTL_SECONDS))
                num = int(num)
            except Exception:
                num = parse_score(r.get(participants_key)) + 1
                r.setex(participants_key, TTL_SECONDS, str(num))
            socket_rooms[sid] = room_id
    score1, score2 = get_room_scores(room_id)
    participants_val = r.get(room_key(room_id, "participants"))
    participants = parse_score(participants_val)
    socketio.emit("init_scores", {"score1": score1, "score2": score2, "participants": participants}, to=room_id)
    refresh_ttl(room_id)

@socketio.on("disconnect")
def on_disconnect():
    sid = getattr(request, 'sid', None)
    room_id = None
    with socket_rooms_lock:
        room_id = socket_rooms.pop(sid, None)
    if room_id:
        participants_key = room_key(room_id, "participants")
        # Decrementa atomicamente via Lua, saturando em zero e aplicando TTL
        try:
            new_participants = r.eval(LUA_DECR_SATURATE_SETEX, 1, participants_key, str(TTL_SECONDS))
        except Exception:
            # fallback: não decrementa
            new_participants = parse_score(r.get(participants_key))
        # Emitir estado atualizado para a sala
        val1 = r.get(room_key(room_id, "score1"))
        val2 = r.get(room_key(room_id, "score2"))
        score1 = parse_score(val1)
        score2 = parse_score(val2)
        socketio.emit("init_scores", {"score1": score1, "score2": score2, "participants": new_participants}, to=room_id)
if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)