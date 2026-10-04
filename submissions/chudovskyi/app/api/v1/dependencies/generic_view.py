from typing import ClassVar

from fastapi import Depends
from fastapi_jsonapi.misc.sqla.generics.base import ViewBaseGeneric
from fastapi_jsonapi.views import Operation, OperationConfig
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from config import db_helper
from models import User

from api.v1.dependencies.current_user import current_active_user
from api.v1.dependencies.current_user import current_active_superuser


class SuperuserViewsDependencies(BaseModel):
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
    )
    session: AsyncSession = Depends(db_helper.session_getter)
    user: User = Depends(current_active_superuser)


class AllViewsDependencies(BaseModel):
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
    )
    session: AsyncSession = Depends(db_helper.session_getter)
    user: User = Depends(current_active_user)


def extract_datalayer_kwargs(
    view: ViewBaseGeneric,
    dto: AllViewsDependencies,
):
    return {
        "session": dto.session,
    }


class GenericView(ViewBaseGeneric):
    operation_dependencies: ClassVar = {
        # Operation.ALL: OperationConfig(
        #     dependencies=AllViewsDependencies,
        #     prepare_data_layer_kwargs=extract_datalayer_kwargs,
        # ),
        Operation.CREATE: OperationConfig(
            dependencies=AllViewsDependencies,
            prepare_data_layer_kwargs=extract_datalayer_kwargs,
        ),
        Operation.GET: OperationConfig(
            dependencies=AllViewsDependencies,
            prepare_data_layer_kwargs=extract_datalayer_kwargs,
        ),
        Operation.GET_LIST: OperationConfig(
            dependencies=AllViewsDependencies,
            prepare_data_layer_kwargs=extract_datalayer_kwargs,
        ),
        Operation.UPDATE: OperationConfig(
            dependencies=AllViewsDependencies,
            prepare_data_layer_kwargs=extract_datalayer_kwargs,
        ),
        Operation.DELETE: OperationConfig(
            dependencies=SuperuserViewsDependencies,
            prepare_data_layer_kwargs=extract_datalayer_kwargs,
        ),
        Operation.DELETE_LIST: OperationConfig(
            dependencies=SuperuserViewsDependencies,
            prepare_data_layer_kwargs=extract_datalayer_kwargs,
        ),
    }
