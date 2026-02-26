#!/usr/bin/env python3
"""
MongoDB Backup & Restore Utility for TLS Digital Certification Platform
Provides automated daily backups with retention management

Usage:
  python backup_manager.py backup          # Create a backup
  python backup_manager.py restore <file>  # Restore from backup
  python backup_manager.py list            # List available backups
  python backup_manager.py test-restore    # Test restore to temp DB
  python backup_manager.py cleanup         # Remove old backups beyond retention
"""

import os
import sys
import subprocess
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
BACKUP_DIR = Path("/app/backups")
MONGO_URI = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
RETENTION_DAYS = int(os.environ.get("BACKUP_RETENTION_DAYS", "14"))

# Ensure backup directory exists
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def get_backup_filename():
    """Generate timestamped backup filename"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"tls_backup_{timestamp}.archive.gz"


def create_backup() -> dict:
    """
    Create a compressed MongoDB backup using mongodump
    Returns dict with backup info
    """
    logger.info("Starting MongoDB backup...")
    
    backup_file = BACKUP_DIR / get_backup_filename()
    temp_archive = BACKUP_DIR / "temp_backup.archive"
    
    try:
        # Run mongodump
        cmd = [
            "mongodump",
            f"--uri={MONGO_URI}",
            f"--db={DB_NAME}",
            f"--archive={temp_archive}"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"mongodump failed: {result.stderr}")
            return {"success": False, "error": result.stderr}
        
        # Compress the archive
        logger.info("Compressing backup...")
        with open(temp_archive, 'rb') as f_in:
            with gzip.open(backup_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # Remove temp file
        temp_archive.unlink()
        
        # Get backup size
        backup_size = backup_file.stat().st_size
        
        # Create metadata file
        metadata = {
            "created_at": datetime.now().isoformat(),
            "database": DB_NAME,
            "size_bytes": backup_size,
            "size_mb": round(backup_size / (1024 * 1024), 2),
            "mongo_uri": MONGO_URI.split("@")[-1] if "@" in MONGO_URI else MONGO_URI,  # Redact credentials
            "retention_days": RETENTION_DAYS
        }
        
        metadata_file = backup_file.with_suffix(".json")
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Backup created successfully: {backup_file.name} ({metadata['size_mb']} MB)")
        
        return {
            "success": True,
            "file": str(backup_file),
            "filename": backup_file.name,
            **metadata
        }
        
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return {"success": False, "error": str(e)}


def restore_backup(backup_file: str, target_db: str = None) -> dict:
    """
    Restore MongoDB from a compressed backup
    
    Args:
        backup_file: Path to the backup file
        target_db: Target database name (defaults to original DB_NAME)
    """
    backup_path = Path(backup_file)
    
    if not backup_path.exists():
        # Check in backup directory
        backup_path = BACKUP_DIR / backup_file
    
    if not backup_path.exists():
        return {"success": False, "error": f"Backup file not found: {backup_file}"}
    
    target = target_db or DB_NAME
    logger.info(f"Restoring backup {backup_path.name} to database '{target}'...")
    
    try:
        # Decompress to temp file
        temp_archive = BACKUP_DIR / "temp_restore.archive"
        
        with gzip.open(backup_path, 'rb') as f_in:
            with open(temp_archive, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # Run mongorestore
        cmd = [
            "mongorestore",
            f"--uri={MONGO_URI}",
            f"--archive={temp_archive}",
            f"--nsFrom={DB_NAME}.*",
            f"--nsTo={target}.*",
            "--drop"  # Drop existing collections before restore
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Cleanup temp file
        temp_archive.unlink()
        
        if result.returncode != 0:
            logger.error(f"mongorestore failed: {result.stderr}")
            return {"success": False, "error": result.stderr}
        
        logger.info(f"Restore completed successfully to '{target}'")
        
        return {
            "success": True,
            "restored_from": backup_path.name,
            "target_database": target,
            "restored_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Restore failed: {e}")
        return {"success": False, "error": str(e)}


def test_restore() -> dict:
    """
    Test restore by restoring latest backup to a temporary database
    """
    backups = list_backups()
    
    if not backups:
        return {"success": False, "error": "No backups available to test"}
    
    latest = backups[0]
    test_db = f"tls_restore_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    logger.info(f"Testing restore with {latest['filename']} to temp DB '{test_db}'...")
    
    result = restore_backup(latest['filename'], target_db=test_db)
    
    if result["success"]:
        # Verify restore by checking collection count
        try:
            from pymongo import MongoClient
            client = MongoClient(MONGO_URI)
            db = client[test_db]
            collections = db.list_collection_names()
            
            result["test_database"] = test_db
            result["collections_restored"] = len(collections)
            result["collection_names"] = collections[:10]  # First 10
            
            # Count documents in key collections
            if "document_stamps" in collections:
                result["document_stamps_count"] = db.document_stamps.count_documents({})
            if "users" in collections:
                result["users_count"] = db.users.count_documents({})
            
            logger.info(f"Test restore verified: {len(collections)} collections")
            
            # Optionally drop test database
            # client.drop_database(test_db)
            # logger.info(f"Test database '{test_db}' dropped")
            
        except Exception as e:
            result["verification_error"] = str(e)
    
    return result


def list_backups() -> list:
    """List all available backups, sorted by date (newest first)"""
    backups = []
    
    for f in BACKUP_DIR.glob("tls_backup_*.archive.gz"):
        metadata_file = f.with_suffix(".json")
        
        info = {
            "filename": f.name,
            "path": str(f),
            "size_bytes": f.stat().st_size,
            "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
        }
        
        if metadata_file.exists():
            with open(metadata_file) as mf:
                info["metadata"] = json.load(mf)
        
        backups.append(info)
    
    # Sort by creation time (newest first)
    backups.sort(key=lambda x: x["created_at"], reverse=True)
    
    return backups


def cleanup_old_backups() -> dict:
    """Remove backups older than RETENTION_DAYS"""
    cutoff = datetime.now() - timedelta(days=RETENTION_DAYS)
    removed = []
    kept = []
    
    for f in BACKUP_DIR.glob("tls_backup_*.archive.gz"):
        file_time = datetime.fromtimestamp(f.stat().st_mtime)
        
        if file_time < cutoff:
            # Remove backup and metadata
            f.unlink()
            metadata_file = f.with_suffix(".json")
            if metadata_file.exists():
                metadata_file.unlink()
            removed.append(f.name)
            logger.info(f"Removed old backup: {f.name}")
        else:
            kept.append(f.name)
    
    return {
        "removed_count": len(removed),
        "removed": removed,
        "kept_count": len(kept),
        "retention_days": RETENTION_DAYS,
        "cutoff_date": cutoff.isoformat()
    }


def run_daily_backup() -> dict:
    """
    Run daily backup routine:
    1. Create new backup
    2. Cleanup old backups
    """
    logger.info("=" * 50)
    logger.info("Starting daily backup routine")
    logger.info("=" * 50)
    
    # Create backup
    backup_result = create_backup()
    
    # Cleanup old backups
    cleanup_result = cleanup_old_backups()
    
    return {
        "backup": backup_result,
        "cleanup": cleanup_result,
        "completed_at": datetime.now().isoformat()
    }


# CLI Interface
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "backup":
        result = create_backup()
        print(json.dumps(result, indent=2))
        
    elif command == "restore":
        if len(sys.argv) < 3:
            print("Usage: backup_manager.py restore <backup_file> [target_db]")
            sys.exit(1)
        target = sys.argv[3] if len(sys.argv) > 3 else None
        result = restore_backup(sys.argv[2], target)
        print(json.dumps(result, indent=2))
        
    elif command == "test-restore":
        result = test_restore()
        print(json.dumps(result, indent=2))
        
    elif command == "list":
        backups = list_backups()
        print(f"Found {len(backups)} backups:")
        for b in backups:
            print(f"  - {b['filename']} ({b['size_mb']} MB, {b['created_at']})")
        
    elif command == "cleanup":
        result = cleanup_old_backups()
        print(json.dumps(result, indent=2))
        
    elif command == "daily":
        result = run_daily_backup()
        print(json.dumps(result, indent=2))
        
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)
