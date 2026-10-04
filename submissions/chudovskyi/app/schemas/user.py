from fastapi_users import schemas


class UserRead(schemas.BaseUser[int]):
    pass
    # first_name: str  # need this field in models and apply migration for DB


class UserCreate(schemas.BaseUserCreate):
    pass
    # first_name: str  # need this field in models and apply migration for DB


class UserUpdate(schemas.BaseUserUpdate):
    pass
    # first_name: str  # need this field in models and apply migration for DB
