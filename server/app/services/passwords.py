from werkzeug.security import generate_password_hash, check_password_hash

DEFAULT_METHOD = "pbkdf2:sha256:600000"

def hash_password(plain: str) -> str:
    if plain is None:
        return None
    return generate_password_hash(plain, method=DEFAULT_METHOD)

def is_hashed(value: str) -> bool:
    if not value or ":" not in value:
        return False
    # crude detection: werkzeug pattern method:salt:hash (at least 2 colons) or pbkdf2:...
    parts = value.split(":")
    return len(parts) >= 3 and parts[0] in ("pbkdf2", "scrypt", "argon2")

def verify_password(stored: str, provided: str) -> bool:
    if stored is None or provided is None:
        return False
    if is_hashed(stored):
        return check_password_hash(stored, provided)
    # legacy plain text fallback
    return stored == provided

def needs_rehash(stored: str) -> bool:
    return not is_hashed(stored)