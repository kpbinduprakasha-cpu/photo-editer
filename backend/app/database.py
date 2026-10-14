"""SQLite database interface for FotoOwl."""

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.config import DB_PATH


def get_db_connection() -> sqlite3.Connection:
    """Create a thread-safe connection to the SQLite database with WAL enabled."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    """Initialize database tables and indexes."""
    with get_db_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                aspect_ratio TEXT NOT NULL DEFAULT '9:16',
                style TEXT NOT NULL DEFAULT 'cinematic',
                duration_seconds INTEGER NOT NULL DEFAULT 15,
                music_enabled BOOLEAN NOT NULL DEFAULT 1,
                captions_enabled BOOLEAN NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'pending',
                current_agent TEXT NOT NULL DEFAULT 'idle',
                progress_pct INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                storyboard_json TEXT,
                script_json TEXT,
                output_video_path TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS job_images (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                width INTEGER,
                height INTEGER,
                mime_type TEXT NOT NULL,
                sequence_index INTEGER NOT NULL DEFAULT 0,
                analysis_json TEXT,
                FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS job_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                level TEXT NOT NULL DEFAULT 'info',
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_job_images_job_id ON job_images(job_id);
            CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
            """
        )
        conn.commit()


def create_job(
    job_id: str,
    prompt: str,
    aspect_ratio: str = "9:16",
    style: str = "cinematic",
    duration_seconds: int = 15,
    music_enabled: bool = True,
    captions_enabled: bool = True,
) -> Dict[str, Any]:
    """Insert a new job into the database."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO jobs (
                id, prompt, aspect_ratio, style, duration_seconds,
                music_enabled, captions_enabled, status, current_agent,
                progress_pct, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'idle', 0, ?, ?)
            """,
            (
                job_id,
                prompt,
                aspect_ratio,
                style,
                duration_seconds,
                int(music_enabled),
                int(captions_enabled),
                now,
                now,
            ),
        )
        conn.commit()
    return get_job(job_id) or {}


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve job details by ID."""
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            return None
        data = dict(row)
        data["music_enabled"] = bool(data["music_enabled"])
        data["captions_enabled"] = bool(data["captions_enabled"])
        if data.get("storyboard_json"):
            try:
                data["storyboard"] = json.loads(data["storyboard_json"])
            except Exception:
                data["storyboard"] = None
        else:
            data["storyboard"] = None

        if data.get("script_json"):
            try:
                data["script"] = json.loads(data["script_json"])
            except Exception:
                data["script"] = None
        else:
            data["script"] = None

        return data


def list_jobs(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve list of recent jobs."""
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT id, prompt, aspect_ratio, style, duration_seconds, status, current_agent, progress_pct, output_video_path, created_at, updated_at FROM jobs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def update_job(job_id: str, **kwargs: Any) -> None:
    """Update job fields dynamically."""
    if not kwargs:
        return
    kwargs["updated_at"] = datetime.now(timezone.utc).isoformat()
    columns = []
    values = []
    for k, v in kwargs.items():
        columns.append(f"{k} = ?")
        if isinstance(v, (dict, list)):
            values.append(json.dumps(v))
        elif isinstance(v, bool):
            values.append(int(v))
        else:
            values.append(v)
    values.append(job_id)
    sql = f"UPDATE jobs SET {', '.join(columns)} WHERE id = ?"
    with get_db_connection() as conn:
        conn.execute(sql, tuple(values))
        conn.commit()


def add_job_image(
    image_id: str,
    job_id: str,
    original_filename: str,
    stored_filename: str,
    file_path: str,
    file_size: int,
    width: Optional[int] = None,
    height: Optional[int] = None,
    mime_type: str = "image/jpeg",
    sequence_index: int = 0,
) -> None:
    """Record an uploaded image associated with a job."""
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO job_images (
                id, job_id, original_filename, stored_filename,
                file_path, file_size, width, height, mime_type, sequence_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                image_id,
                job_id,
                original_filename,
                stored_filename,
                file_path,
                file_size,
                width,
                height,
                mime_type,
                sequence_index,
            ),
        )
        conn.commit()


def get_job_images(job_id: str) -> List[Dict[str, Any]]:
    """Retrieve all images associated with a job in order."""
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM job_images WHERE job_id = ? ORDER BY sequence_index ASC",
            (job_id,),
        ).fetchall()
        images = []
        for r in rows:
            img = dict(r)
            if img.get("analysis_json"):
                try:
                    img["analysis"] = json.loads(img["analysis_json"])
                except Exception:
                    img["analysis"] = None
            else:
                img["analysis"] = None
            images.append(img)
        return images


def update_image_analysis(image_id: str, analysis: Dict[str, Any]) -> None:
    """Save analysis JSON for a specific image."""
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE job_images SET analysis_json = ? WHERE id = ?",
            (json.dumps(analysis), image_id),
        )
        conn.commit()


def add_job_log(
    job_id: str, agent_name: str, message: str, level: str = "info"
) -> None:
    """Record an execution log entry for a job and agent."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO job_logs (job_id, agent_name, level, message, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, agent_name, level, message, now),
        )
        conn.commit()


def get_job_logs(job_id: str, limit: int = 200) -> List[Dict[str, Any]]:
    """Retrieve recent log messages for a job."""
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT id, agent_name, level, message, timestamp FROM job_logs WHERE job_id = ? ORDER BY id ASC LIMIT ?",
            (job_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def delete_job(job_id: str) -> bool:
    """Delete a job and its associated logs and image records."""
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        conn.commit()
        return cursor.rowcount > 0
