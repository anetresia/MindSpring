from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
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

def get_owned_child(
    db: Session,
    parent_id: int,
    child_id: int,
):
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
    ).order_by(
        Child.child_id
    ).all()

    child_rewards = []

    for child in children:

        total_stars = db.query(
            func.coalesce(
                func.sum(RewardTransaction.stars_earned),
                0,
            )
        ).filter(
            RewardTransaction.child_id == child.child_id
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

    # 1. VERIFY CHILD OWNERSHIP

    child = get_owned_child(
        db=db,
        parent_id=current_parent.user_id,
        child_id=child_id,
    )

    # 2. GET SELECTED TOPICS

    selected_topic_ids = {
        item[0]
        for item in db.query(
            ChildSelectedTopic.topic_id
        ).filter(
            ChildSelectedTopic.child_id == child_id
        ).all()
    }

    # 3. GET TOPICS WITH PREVIOUS REWARDS

    rewarded_topic_ids = {
        item[0]
        for item in db.query(
            Lesson.topic_id
        ).join(
            RewardTransaction,
            RewardTransaction.lesson_id == Lesson.lesson_id,
        ).filter(
            RewardTransaction.child_id == child_id
        ).distinct().all()
    }

    # Include both selected and previously rewarded topics

    topic_ids = selected_topic_ids | rewarded_topic_ids

    topic_rewards = []

    if topic_ids:

        # 4. GET TOPICS

        topics = db.query(
            LifeSkillTopic
        ).filter(
            LifeSkillTopic.topic_id.in_(topic_ids)
        ).order_by(
            LifeSkillTopic.topic_id
        ).all()

        # 5. GET ALL LESSONS FOR THESE TOPICS

        lessons = db.query(
            Lesson
        ).filter(
            Lesson.topic_id.in_(topic_ids)
        ).order_by(
            Lesson.topic_id,
            Lesson.lesson_id
        ).all()

        # Group lessons by topic

        lessons_by_topic = {}

        for lesson in lessons:

            lessons_by_topic.setdefault(
                lesson.topic_id, []
            ).append(lesson)

        # 6. GET ALL REWARDS FOR THIS CHILD

        rewards = db.query(
            RewardTransaction
        ).filter(
            RewardTransaction.child_id == child_id
        ).all()

        # Map rewards by lesson ID

        reward_by_lesson = {
            reward.lesson_id: reward
            for reward in rewards
        }

        # 7. BUILD TOPIC AND LESSON RESPONSE

        for topic in topics:

            lesson_rewards = []

            topic_lessons = lessons_by_topic.get(
                topic.topic_id, []
            )

            for lesson in topic_lessons:

                reward = reward_by_lesson.get(
                    lesson.lesson_id
                )

                stars_earned = (
                    int(reward.stars_earned)
                    if reward else 0
                )

                total_questions = (
                    int(reward.total_questions)
                    if reward else 0
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

    # 8. CALCULATE TOTAL STARS FOR THIS CHILD

    total_stars = db.query(
        func.coalesce(
            func.sum(RewardTransaction.stars_earned),
            0,
        )
    ).filter(
        RewardTransaction.child_id == child_id
    ).scalar()

    # 9. RETURN RESPONSE

    return {
        "child_id": child.child_id,
        "child_name": child.child_name,
        "total_stars": int(total_stars or 0),
        "topics": topic_rewards,
    }