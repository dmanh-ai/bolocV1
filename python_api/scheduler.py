"""
VN Sniper - Auto Scheduler
Tự động chạy stock screening vào 11:45 và 15:15 (múi giờ UTC+7)

- 11:45: Giữa phiên sáng (trước khi nghỉ trưa 11:30)
- 15:15: Sau khi đóng cửa thị trường (14:45 khớp lệnh ATC)
"""

import json
import os
import logging
from datetime import datetime
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

logger = logging.getLogger("vn-sniper.scheduler")

# Múi giờ Việt Nam
VN_TZ = pytz.timezone("Asia/Ho_Chi_Minh")

# Thư mục lưu kết quả screening
RESULTS_DIR = Path(__file__).parent / "screening_results"
RESULTS_DIR.mkdir(exist_ok=True)

# Biến lưu kết quả mới nhất trong memory
latest_screening_result = None
latest_screening_time = None


def run_screening():
    """Chạy stock screening tự động"""
    global latest_screening_result, latest_screening_time

    now = datetime.now(VN_TZ)
    logger.info(f"[Scheduler] Bắt đầu auto screening lúc {now.strftime('%Y-%m-%d %H:%M:%S')} (UTC+7)")

    try:
        from stock_analyzer import AutoScreener

        screener = AutoScreener()
        result = screener.screen_all_strategies(top_n=10)

        # Thêm metadata
        result["scheduled_at"] = now.isoformat()
        result["session"] = "morning" if now.hour < 13 else "afternoon"

        # Lưu vào memory
        latest_screening_result = result
        latest_screening_time = now

        # Lưu ra file JSON
        filename = f"screening_{now.strftime('%Y%m%d_%H%M')}.json"
        filepath = RESULTS_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, default=str, indent=2)

        # Lưu file latest để dễ truy cập
        latest_path = RESULTS_DIR / "latest.json"
        with open(latest_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, default=str, indent=2)

        # Xóa file cũ (giữ lại 30 file gần nhất)
        cleanup_old_results()

        total_recs = sum(
            len(s.get("recommendations", []))
            for s in result.get("strategies", {}).values()
        )
        logger.info(
            f"[Scheduler] Screening hoàn tất: {total_recs} recommendations, "
            f"session={result['session']}, file={filename}"
        )

    except Exception as e:
        logger.error(f"[Scheduler] Lỗi khi chạy screening: {e}", exc_info=True)


def cleanup_old_results(keep=30):
    """Xóa các file kết quả cũ, giữ lại `keep` file gần nhất"""
    files = sorted(RESULTS_DIR.glob("screening_*.json"), reverse=True)
    for f in files[keep:]:
        try:
            f.unlink()
        except Exception:
            pass


def get_latest_result():
    """Lấy kết quả screening mới nhất"""
    global latest_screening_result, latest_screening_time

    # Nếu có trong memory, trả về luôn
    if latest_screening_result:
        return {
            "result": latest_screening_result,
            "screened_at": latest_screening_time.isoformat() if latest_screening_time else None,
            "source": "memory",
        }

    # Nếu không, đọc từ file
    latest_path = RESULTS_DIR / "latest.json"
    if latest_path.exists():
        with open(latest_path, "r", encoding="utf-8") as f:
            result = json.load(f)
        return {
            "result": result,
            "screened_at": result.get("scheduled_at"),
            "source": "file",
        }

    return None


def get_schedule_info():
    """Lấy thông tin lịch chạy"""
    now = datetime.now(VN_TZ)
    return {
        "timezone": "Asia/Ho_Chi_Minh (UTC+7)",
        "schedules": [
            {
                "time": "11:45",
                "description": "Giữa phiên sáng - trước nghỉ trưa",
                "days": "Thứ 2 - Thứ 6",
            },
            {
                "time": "15:15",
                "description": "Sau đóng cửa thị trường",
                "days": "Thứ 2 - Thứ 6",
            },
        ],
        "current_time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "has_latest_result": latest_screening_result is not None
        or (RESULTS_DIR / "latest.json").exists(),
    }


def create_scheduler() -> BackgroundScheduler:
    """Tạo và cấu hình scheduler"""
    scheduler = BackgroundScheduler(timezone=VN_TZ)

    # Lịch 1: 11:45 sáng (Thứ 2 - Thứ 6)
    scheduler.add_job(
        run_screening,
        CronTrigger(hour=11, minute=45, day_of_week="mon-fri", timezone=VN_TZ),
        id="screening_morning",
        name="Stock Screening - Phiên sáng (11:45)",
        replace_existing=True,
    )

    # Lịch 2: 15:15 chiều (Thứ 2 - Thứ 6)
    scheduler.add_job(
        run_screening,
        CronTrigger(hour=15, minute=15, day_of_week="mon-fri", timezone=VN_TZ),
        id="screening_afternoon",
        name="Stock Screening - Phiên chiều (15:15)",
        replace_existing=True,
    )

    logger.info("[Scheduler] Đã cấu hình lịch chạy tự động:")
    logger.info("  - 11:45 (UTC+7) Thứ 2-6: Screening phiên sáng")
    logger.info("  - 15:15 (UTC+7) Thứ 2-6: Screening phiên chiều")

    return scheduler
