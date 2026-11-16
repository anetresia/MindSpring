
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.subscription.parent_subscription import ParentSubscription
from app.models.subscription.subscription_credit import SubscriptionCredit
from app.models.subscription.subscription_payment import SubscriptionPayment
from app.routers.auth import get_current_admin


router = APIRouter(
    prefix="/admin/subscriptions",
    tags=["Admin - Subscribers"],
)


@router.get("/subscribers")
def get_all_subscribers(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    subscriptions = (
        db.query(ParentSubscription)
        .options(
            joinedload(ParentSubscription.parent),
            joinedload(ParentSubscription.plan),
            joinedload(ParentSubscription.subscription_credit),
            joinedload(ParentSubscription.payments),
        )
        .order_by(ParentSubscription.created_at.desc())
        .all()
    )

    subscribers = []

    for subscription in subscriptions:
        parent = subscription.parent
        plan = subscription.plan
        credit = subscription.subscription_credit

        payments = sorted(
            subscription.payments,
            key=lambda payment: payment.created_at,
            reverse=True,
        )

        payment_history = []

        for payment in payments:
            payment_history.append({
                "payment_id": payment.payment_id,
                "amount_lkr": payment.amount_lkr,
                "currency": payment.currency,
                "provider": payment.provider,
                "status": payment.status,
                "created_at": payment.created_at,
                "verified_at": payment.verified_at,
            })

        subscribers.append({
            "subscription_id": subscription.subscription_id,

            "parent": {
                "user_id": parent.user_id,
                "name": parent.name,
                "email": parent.email,
                "phone": parent.phone,
            } if parent else None,

            "plan": {
                "plan_id": plan.plan_id,
                "plan_code": plan.plan_code,
                "plan_name": plan.plan_name,
                "plan_type": plan.plan_type,
                "price_lkr": plan.price_lkr,
                "video_credits": plan.video_credits,
                "max_children": plan.max_children,
            } if plan else None,

            "credits": {
                "total": credit.total_credits,
                "used": credit.used_credits,
                "remaining": credit.remaining_credits,
            } if credit else {
                "total": 0,
                "used": 0,
                "remaining": 0,
            },

            "status": subscription.status,
            "starts_at": subscription.starts_at,
            "expires_at": subscription.expires_at,
            "created_at": subscription.created_at,

            "payments": payment_history,
            "latest_payment": payment_history[0] if payment_history else None,
        })

    return {
        "total": len(subscribers),
        "active": sum(1 for s in subscribers if s["status"] == "ACTIVE"),
        "pending": sum(1 for s in subscribers if s["status"] == "PENDING"),
        "expired": sum(1 for s in subscribers if s["status"] == "EXPIRED"),
        "cancelled": sum(1 for s in subscribers if s["status"] == "CANCELLED"),
        "subscribers": subscribers,
    }
