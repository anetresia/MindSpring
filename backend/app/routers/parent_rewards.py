
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.child import Child
from app.models.child_selected_topic import ChildSelectedTopic
from app.models.life_skill_topic import LifeSkillTopic
from app.models.lesson import Lesson
from app.models.reward_transaction import RewardTransaction

from app.routers.parent import get_current_parent


router = APIRouter(
    prefix="/parent/rewards",
    tags=["Parent Rewards"],
)


# ==========================================
# VERIFY CHILD OWNERSHIP
# ==========================================

def get_owned_child(db: Session, parent_id: int, child_id: int):

    child = db.query(Child).filter(
        Child.child_id == child_id,
        Child.parent_id == parent_id,
    ).first()

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found",
        )

    return child


# ==========================================
# PARENT DASHBOARD - CHILD STAR TOTALS
# ==========================================

@router.get("/children")
def get_children_reward_totals(
    db: Session = Depends(get_db),
    current_parent=Depends(get_current_parent),
):

    children = db.query(Child).filter(
        Child.parent_id == current_parent.user_id
    ).order_by(Child.child_id).all()

    child_rewards = []

    for child in children:

        total_stars = db.query(
            RewardTransaction
        ).filter(
            RewardTransaction.child_id == child.child_id
        ).with_entities(
            __import__("sqlalchemy").func.coalesce(
                __import__("sqlalchemy").func.sum(
                    RewardTransaction.stars_earned
                ),
                0,
            )
        ).scalar()

        child_rewards.append({
            "child_id": child.child_id,
            "child_name": child.child_name,
            "total_stars": int(total_stars or 0),
        })

    return {
        "children": child_rewards
    }


# ==========================================
# PARENT REWARDS PAGE - TOPIC AND LESSON
# ==========================================

@router.get("/{child_id}")
def get_child_rewards(
    child_id: int,
    db: Session = Depends(get_db),
    current_parent=Depends(get_current_parent),
):

    # 1. Verify child belongs to this parent

    child = get_owned_child(
        db,
        current_parent.user_id,
        child_id,
    )

    # 2. Get topics selected by this child

    selected_topics = db.query(
        ChildSelectedTopic
    ).filter(
        ChildSelectedTopic.child_id == child_id
    ).all()

    topic_rewards = []

    # 3. Get lessons and rewards topic by topic

    for selected_topic in selected_topics:

        topic = db.query(LifeSkillTopic).filter(
            LifeSkillTopic.topic_id == selected_topic.topic_id
        ).first()

        if not topic:
            continue

        lessons = db.query(Lesson).filter(
            Lesson.topic_id == topic.topic_id
        ).order_by(
            Lesson.lesson_id
        ).all()

        lesson_rewards = []

        for lesson in lessons:

            reward = db.query(RewardTransaction).filter(
                RewardTransaction.child_id == child_id,
                RewardTransaction.lesson_id == lesson.lesson_id,
            ).first()

            stars_earned = (
                reward.stars_earned if reward else 0
            )

            total_questions = (
                reward.total_questions if reward else 0
            )

            lesson_rewards.append({
                "lesson_id": lesson.lesson_id,
                "lesson_title": lesson.title,
                "stars_earned": stars_earned,
                "total_questions": total_questions,
                "completed": reward is not None,
            })

        topic_rewards.append({
            "topic_id": topic.topic_id,
            "topic_name": topic.topic_name,
            "lessons": lesson_rewards,
        })

    # 4. Return selected child's rewards

    total_stars = db.query(
        __import__("sqlalchemy").func.coalesce(
            __import__("sqlalchemy").func.sum(
                RewardTransaction.stars_earned
            ),
            0,
        )
    ).filter(
        RewardTransaction.child_id == child_id
    ).scalar()

    return {
        "child_id": child.child_id,
        "child_name": child.child_name,
        "total_stars": int(total_stars or 0),
        "topics": topic_rewards,
    }
