"""create categories table

Revision ID: 66857135073a
Revises: cdb136b064d0
Create Date: 2026-04-01 22:28:18.989478

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "66857135073a"
down_revision: Union[str, Sequence[str], None] = "cdb136b064d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "categories",
        sa.Column(
            "id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.String(length=255),
            server_default="",
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categories")),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("categories")
