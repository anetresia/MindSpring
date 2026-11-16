
"""add admin reply fields to contact messages"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9c13241bf272'
down_revision: Union[str, Sequence[str], None] = '61e80e2ca874'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contact_messages",
        sa.Column("admin_reply", sa.Text(), nullable=True)
    )

    op.add_column(
        "contact_messages",
        sa.Column("replied_at", sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("contact_messages", "replied_at")
    op.drop_column("contact_messages", "admin_reply")
