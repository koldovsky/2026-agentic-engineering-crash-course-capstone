"""create prompts table

Revision ID: cdb136b064d0
Revises: d0183e1abe6e
Create Date: 2026-04-01 20:50:42.975700

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "cdb136b064d0"
down_revision: Union[str, Sequence[str], None] = "d0183e1abe6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "prompts",
        sa.Column(
            "id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "type_llm",
            sa.Enum(
                "GPT4",
                "GPT35",
                "GEMINI",
                "COPILOT",
                "CLAUDE",
                "LLAMA3",
                "CUSTOM",
                name="typellm",
            ),
            nullable=False,
        ),
        sa.Column(
            "title",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "pmpt_request",
            sa.String(length=1000),
            nullable=False,
        ),
        sa.Column(
            "pmpt_response",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "rating",
            sa.Integer(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prompts")),
    )
    op.create_index(
        op.f("ix_prompts_title"),
        "prompts",
        ["title"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_prompts_title"), table_name="prompts")
    op.drop_table("prompts")
