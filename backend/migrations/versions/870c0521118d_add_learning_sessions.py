
"""add learning sessions

Revision ID: 870c0521118d
Revises: 95b0b614f75e
"""

from alembic import op
import sqlalchemy as sa


revision = "870c0521118d"
down_revision = "95b0b614f75e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learning_sessions",
        sa.Column("session_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("child_id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=False),
        sa.Column("learning_date", sa.Date(), nullable=False),
        sa.Column(
            "total_seconds",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("last_heartbeat_at", sa.DateTime(), nullable=True),
        sa.Column(
            "limit_reached",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["child.child_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["user.user_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("session_id"),
        sa.UniqueConstraint(
            "child_id",
            "learning_date",
            name="uq_child_learning_date",
        ),
    )

    op.create_index(
        "ix_learning_sessions_child_id",
        "learning_sessions",
        ["child_id"],
    )
    op.create_index(
        "ix_learning_sessions_parent_id",
        "learning_sessions",
        ["parent_id"],
    )
    op.create_index(
        "ix_learning_sessions_learning_date",
        "learning_sessions",
        ["learning_date"],
    )


def downgrade() -> None:
    op.drop_table("learning_sessions")
