
"""update subscription plan rules

Revision ID: bd8c38bbaeb4
Revises: 9c13241bf272
Create Date: 2026-11-18 02:47:33.934449
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bd8c38bbaeb4'
down_revision: Union[str, Sequence[str], None] = '9c13241bf272'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def update_subscription_plans(plans):
    connection = op.get_bind()

    check_query = sa.text("""
        SELECT COUNT(*)
        FROM subscription_plans
        WHERE plan_code = :plan_code
    """)

    update_query = sa.text("""
        UPDATE subscription_plans
        SET
            plan_name = :plan_name,
            max_children = :max_children,
            billing_type = :billing_type,
            validity_days = :validity_days
        WHERE plan_code = :plan_code
    """)

    for plan in plans:
        count = connection.execute(
            check_query,
            {"plan_code": plan["plan_code"]}
        ).scalar()

        if count != 1:
            raise RuntimeError(
                f"Expected exactly one row for plan "
                f"{plan['plan_code']}, but found {count}"
            )

        connection.execute(update_query, plan)


def upgrade() -> None:
    """Update existing subscription plan rules without deleting data."""

    plan_updates = [
        {
            "plan_code": "FREE",
            "plan_name": "Free",
            "max_children": 2,
            "billing_type": "FREE",
            "validity_days": None,
        },
        {
            "plan_code": "INDIVIDUAL_10",
            "plan_name": "Plus",
            "max_children": 1,
            "billing_type": "ONE_TIME",
            "validity_days": None,
        },
        {
            "plan_code": "INDIVIDUAL_30",
            "plan_name": "Pro",
            "max_children": 1,
            "billing_type": "ONE_TIME",
            "validity_days": None,
        },
        {
            "plan_code": "FAMILY_25",
            "plan_name": "Family Pack Plus",
            "max_children": 2,
            "billing_type": "ONE_TIME",
            "validity_days": None,
        },
        {
            "plan_code": "FAMILY_50",
            "plan_name": "Family Pack Pro",
            "max_children": 2,
            "billing_type": "ONE_TIME",
            "validity_days": None,
        },
    ]

    update_subscription_plans(plan_updates)


def downgrade() -> None:
    """Restore previous subscription plan rules without deleting data."""

    previous_plans = [
        {
            "plan_code": "FREE",
            "plan_name": "Free",
            "max_children": 1,
            "billing_type": "FREE",
            "validity_days": None,
        },
        {
            "plan_code": "INDIVIDUAL_10",
            "plan_name": "Individual 10 Video Bundle",
            "max_children": 1,
            "billing_type": "ONE_TIME",
            "validity_days": None,
        },
        {
            "plan_code": "INDIVIDUAL_30",
            "plan_name": "Individual 30 Video Bundle",
            "max_children": 1,
            "billing_type": "ONE_TIME",
            "validity_days": None,
        },
        {
            "plan_code": "FAMILY_25",
            "plan_name": "Family 25",
            "max_children": 2,
            "billing_type": "MONTHLY",
            "validity_days": 30,
        },
        {
            "plan_code": "FAMILY_50",
            "plan_name": "Family 50",
            "max_children": 2,
            "billing_type": "MONTHLY",
            "validity_days": 30,
        },
    ]

    update_subscription_plans(previous_plans)
