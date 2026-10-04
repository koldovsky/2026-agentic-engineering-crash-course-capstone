from fastapi.security import HTTPBearer


def get_http_bearer():
    return HTTPBearer(auto_error=False)
