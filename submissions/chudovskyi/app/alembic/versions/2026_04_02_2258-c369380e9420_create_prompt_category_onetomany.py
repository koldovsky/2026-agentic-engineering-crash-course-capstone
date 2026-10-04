"""create prompt-category OneToMany

Revision ID: c369380e9420
Revises: 66857135073a
Create Date: 2026-04-02 22:58:05.663934

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c369380e9420"
down_revision: Union[str, Sequence[str], None] = "66857135073a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "prompts",
        sa.Column(
            "category_id",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        op.f("fk_prompts_category_id_categories"),
        "prompts",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("fk_prompts_category_id_categories"),
        "prompts",
        type_="foreignkey",
    )
    op.drop_column(
        "prompts",
        "category_id",
    )
