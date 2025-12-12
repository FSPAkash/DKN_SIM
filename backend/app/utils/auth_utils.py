import hashlib
from datetime import datetime, timedelta

# User database - In production, use a proper database
USERS_DB = {
    "admin": {
        "password_hash": hashlib.sha256("admin123".encode()).hexdigest(),
        "is_admin": True
    },
    "Naina": {
        "password_hash": hashlib.sha256("n2025".encode()).hexdigest(),
        "is_admin": False
    },
    "Akash": {
        "password_hash": hashlib.sha256("a2025".encode()).hexdigest(),
        "is_admin": False
    },
    "Sushant": {
        "password_hash": hashlib.sha256("s2025".encode()).hexdigest(),
        "is_admin": False
    }
}

# Track login attempts
login_attempts = {}
LOCKOUT_DURATION = timedelta(minutes=5)
MAX_ATTEMPTS = 3

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(username, password):
    if username not in USERS_DB:
        return False
    return USERS_DB[username]["password_hash"] == hash_password(password)

def is_admin(username):
    if username not in USERS_DB:
        return False
    return USERS_DB[username].get("is_admin", False)

def check_lockout(username):
    if username not in login_attempts:
        return False, 0
    
    attempts, lockout_time = login_attempts[username]
    
    if lockout_time and datetime.now() < lockout_time:
        remaining = (lockout_time - datetime.now()).seconds // 60 + 1
        return True, remaining
    
    if lockout_time and datetime.now() >= lockout_time:
        login_attempts[username] = (0, None)
        return False, 0
    
    return False, 0

def record_failed_attempt(username):
    if username not in login_attempts:
        login_attempts[username] = (0, None)
    
    attempts, _ = login_attempts[username]
    attempts += 1
    
    if attempts >= MAX_ATTEMPTS:
        lockout_time = datetime.now() + LOCKOUT_DURATION
        login_attempts[username] = (attempts, lockout_time)
        return True, MAX_ATTEMPTS - attempts
    
    login_attempts[username] = (attempts, None)
    return False, MAX_ATTEMPTS - attempts

def clear_attempts(username):
    if username in login_attempts:
        login_attempts[username] = (0, None)