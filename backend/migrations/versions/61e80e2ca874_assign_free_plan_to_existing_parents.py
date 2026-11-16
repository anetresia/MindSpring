
"""Assign free plan to existing parents."""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.subscription.parent_subscription import ParentSubscription
from app.services.subscription_service import assign_free_subscription


revision: str = "61e80e2ca874"
down_revision: Union[str, Sequence[str], None] = "870c0521118d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    with Session(bind=connection) as db:

        # Find parents who do not have an ACTIVE subscription.
        active_subscription = and_(
            ParentSubscription.parent_id == User.user_id,
            ParentSubscription.status == "ACTIVE",
        )

        parent_ids = (
            db.query(User.user_id)
            .outerjoin(
                ParentSubscription,
                active_subscription,
            )
            .filter(func.lower(User.role) == "parent")
            .filter(ParentSubscription.subscription_id.is_(None))
            .order_by(User.user_id)
            .all()
        )

        for (parent_id,) in parent_ids:
            assign_free_subscription(
                db=db,
                parent_id=parent_id,
            )

        # Persist the data changes.
        db.flush()
        db.commit()


def downgrade() -> None:
    # Preserve subscription and credit data.
    pass
