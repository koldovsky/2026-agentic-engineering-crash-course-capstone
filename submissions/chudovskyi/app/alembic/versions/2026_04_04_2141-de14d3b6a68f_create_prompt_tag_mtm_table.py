"""create prompt tag MtM table

Revision ID: de14d3b6a68f
Revises: cc3bc54f73a2
Create Date: 2026-04-04 21:41:52.953910

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "de14d3b6a68f"
down_revision: Union[str, Sequence[str], None] = "cc3bc54f73a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "prompt_tag_association",
        sa.Column(
            "id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "prompt_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "tag_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["prompt_id"],
            ["prompts.id"],
            name=op.f("fk_prompt_tag_association_prompt_id_prompts"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"],
            ["tags.id"],
            name=op.f("fk_prompt_tag_association_tag_id_tags"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prompt_tag_association")),
        sa.UniqueConstraint(
            "prompt_id",
            "tag_id",
            name=op.f("uq_prompt_tag_association_prompt_id_tag_id"),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("prompt_tag_association")
