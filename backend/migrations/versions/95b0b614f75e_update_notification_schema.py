
"""update notification schema

Revision ID: 95b0b614f75e
Revises: 5e29bdd389d2
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


revision: str = '95b0b614f75e'
down_revision: Union[str, Sequence[str], None] = '5e29bdd389d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add optional child reference
    op.add_column(
        'notifications',
        sa.Column('child_id', sa.Integer(), nullable=True)
    )

    # Convert notification_type from ENUM to VARCHAR
    op.alter_column(
        'notifications',
        'notification_type',
        existing_type=mysql.ENUM(
            'CREDITS_5_REMAINING',
            'CREDITS_1_REMAINING',
            'CREDITS_EXHAUSTED',
            'SUBSCRIPTION_EXPIRING',
            'SUBSCRIPTION_EXPIRED',
        ),
        type_=sa.String(length=64),
        existing_nullable=False,
    )

    # Add indexes
    op.create_index(
        'ix_notifications_child_id',
        'notifications',
        ['child_id'],
        unique=False,
    )

    op.create_index(
        'ix_notifications_notification_type',
        'notifications',
        ['notification_type'],
        unique=False,
    )

    op.create_index(
        'ix_notifications_sent_at',
        'notifications',
        ['sent_at'],
        unique=False,
    )

    # Add child foreign key
    op.create_foreign_key(
        'fk_notifications_child_id_child',
        'notifications',
        'child',
        ['child_id'],
        ['child_id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_notifications_child_id_child',
        'notifications',
        type_='foreignkey',
    )

    op.drop_index(
        'ix_notifications_sent_at',
        table_name='notifications',
    )

    op.drop_index(
        'ix_notifications_notification_type',
        table_name='notifications',
    )

    op.drop_index(
        'ix_notifications_child_id',
        table_name='notifications',
    )

    op.alter_column(
        'notifications',
        'notification_type',
        existing_type=sa.String(length=64),
        type_=mysql.ENUM(
            'CREDITS_5_REMAINING',
            'CREDITS_1_REMAINING',
            'CREDITS_EXHAUSTED',
            'SUBSCRIPTION_EXPIRING',
            'SUBSCRIPTION_EXPIRED',
        ),
        existing_nullable=False,
    )

    op.drop_column('notifications', 'child_id')
