from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize slowapi rate limiter with default limit of 100 requests per minute
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
