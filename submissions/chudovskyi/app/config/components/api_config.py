from pydantic import BaseModel


class ApiV1PrefixConfig(BaseModel):
    prefix: str = "/v1"
    auth: str = "/auth"
    users: str = "/users"
    messages: str = "/messages"
    gemini: str = "/gemini"
    health: str = "/health"
    info: str = "/info"


class ApiPrefixConfig(BaseModel):
    prefix: str = "/api"
    v1: ApiV1PrefixConfig = ApiV1PrefixConfig()

    @property
    def bearer_token_url(self) -> str:
        """/api/v1/auth/login"""
        parts = (self.prefix, self.v1.prefix, self.v1.auth, "/login")
        path = "".join(parts)
        # return path[1:]
        return path.removeprefix("/")

    @property
    def builder_url(self) -> str:
        """/api/v1/"""
        parts = (self.prefix, self.v1.prefix)
        path = "".join(parts)
        return path
