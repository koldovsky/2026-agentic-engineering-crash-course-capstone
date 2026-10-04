"""create prompts-user relationship

Revision ID: 31e3ab093eab
Revises: de14d3b6a68f
Create Date: 2026-04-10 12:09:02.454868

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "31e3ab093eab"
down_revision: Union[str, Sequence[str], None] = "de14d3b6a68f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "prompts",
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        op.f("fk_prompts_user_id_users"),
        "prompts",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("fk_prompts_user_id_users"),
        "prompts",
        type_="foreignkey",
    )
    op.drop_column(
        "prompts",
        "user_id",
    )
