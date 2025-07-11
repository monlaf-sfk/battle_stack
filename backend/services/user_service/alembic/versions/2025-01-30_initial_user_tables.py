"""Initial user tables

Revision ID: 20250130_user_initial
Revises: 
Create Date: 2025-01-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision: str = '20250130_user_initial'
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('xp', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('level', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('tasks_completed', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('current_streak', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('successful_duels', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_duels', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('tournaments_won', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('category_progress', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'")),
        sa.Column('achievements', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column('ai_recommendations', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column('news_feed', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column('roadmap_events', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column('recent_duels', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column('last_active', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('average_solve_time', sa.Float(), nullable=True),
        sa.Column('fastest_solve_time', sa.Float(), nullable=True),
        sa.Column('total_attempts', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('success_rate', sa.Float(), nullable=True),
        sa.Column('ai_duels', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('pvp_duels', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('best_streak', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('tournaments_played', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_profiles_user_id'), 'user_profiles', ['user_id'], unique=True)
    
    op.create_table(
        'user_progress',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('progress_percentage', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('tasks_completed', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_tasks', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_progress_user_id'), 'user_progress', ['user_id'], unique=False)
    
    op.create_table(
        'user_achievements',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('achievement_name', sa.String(length=200), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default=sa.text("'Not Started'")),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=False, server_default=sa.text("'award'")),
        sa.Column('earned_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_achievements_user_id'), 'user_achievements', ['user_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_user_achievements_user_id'), table_name='user_achievements')
    op.drop_table('user_achievements')
    
    op.drop_index(op.f('ix_user_progress_user_id'), table_name='user_progress')
    op.drop_table('user_progress')
    
    op.drop_index(op.f('ix_user_profiles_user_id'), table_name='user_profiles')
    op.drop_table('user_profiles')
    # ### end Alembic commands ### 