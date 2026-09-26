"""AWS Lambda entry point via Mangum ASGI adapter."""
from mangum import Mangum
from app.main import app

handler = Mangum(app, lifespan="off")
