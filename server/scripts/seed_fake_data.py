"""Populate the database with fake books, documents, and inventories.

Usage
-----
python scripts/seed_fake_data.py --books 10 --documents 6
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime
from pathlib import Path

from faker import Faker
from fpdf import FPDF

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db import get_db_connection  # noqa: E402

BOOK_CONDITIONS = [
    "Good",
    "Fair",
    "Average",
    "Poor",
    "Bad"
]

BOOK_AVAILABILITY = [
    "Available",
    "Reserved"
]

DOC_AVAILABILITY = [
    "Available",
]

DOC_CONDITIONS = [
    "Good",
    "Fair",
    "Average",
    "Poor",
    "Bad"
]

SENSITIVITY_LEVELS = ["Public", "Restricted", "Confidential"]


def ensure_upload_target() -> Path:
    uploads_root = BASE_DIR / "uploads"
    generated_dir = uploads_root
    generated_dir.mkdir(parents=True, exist_ok=True)
    return generated_dir


def require_connection():
    conn = get_db_connection()
    if conn is None:
        raise RuntimeError("Database connection is not available. Check configuration.")
    return conn


def collect_storage_ids(cursor) -> list[int]:
    cursor.execute("SELECT ID FROM Storages")
    rows = cursor.fetchall()
    return [row[0] for row in rows] if rows else []


def create_placeholder_pdf(target: Path, title: str, summary: str) -> None:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", "B", 18)
    pdf.cell(0, 12, title, ln=True)
    pdf.ln(6)
    pdf.set_font("Arial", size=12)
    prepared_on = datetime.utcnow().strftime("Prepared on %Y-%m-%d %H:%M UTC")
    pdf.multi_cell(0, 8, summary)
    pdf.ln(8)
    pdf.set_text_color(90, 90, 90)
    pdf.multi_cell(0, 8, prepared_on)
    target.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(target))


def seed_books(faker: Faker, count: int, storage_ids: list[int]) -> list[int]:
    if count <= 0:
        return []

    conn = require_connection()
    cursor = conn.cursor()

    created_ids: list[int] = []
    try:
        for _ in range(count):
            title = faker.sentence(nb_words=random.randint(3, 6)).rstrip(".")
            author = faker.name()
            edition = random.choice(["1st", "2nd", "3rd", "Revised", "Special"])
            publisher = faker.company()
            year = random.randint(1995, datetime.utcnow().year)
            subject = random.choice([
                "History",
                "Science",
                "Technology",
                "Arts",
                "Culture",
                "Mathematics",
                "Education",
            ])
            language = random.choice(["English", "Filipino", "Hiligaynon", "Cebuano", "Spanish"])
            isbn = faker.isbn13(separator="")

            cursor.execute(
                """
                INSERT INTO Books (Title, Author, Edition, Publisher, Year, Subject, Language, ISBN)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (title, author, edition, publisher, year, subject, language, isbn),
            )
            book_id = cursor.lastrowid
            if book_id is None:
                raise RuntimeError("Failed to obtain new Book_ID from database.")
            book_id = int(book_id)
            created_ids.append(book_id)

            copies = random.randint(1, 4)
            for copy_idx in range(copies):
                accession_number = f"ACC-{book_id:04d}-{copy_idx + 1:02d}"
                availability = random.choice(BOOK_AVAILABILITY)
                condition = random.choice(BOOK_CONDITIONS)
                location = random.choice(storage_ids) if storage_ids else None

                cursor.execute(
                    """
                    INSERT INTO Book_Inventory (
                        Book_ID, Accession_Number, Availability, BookCondition, StorageLocation
                    ) VALUES (%s, %s, %s, %s, %s)
                    """,
                    (book_id, accession_number, availability, condition, location),
                )

        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return created_ids


def seed_documents(faker: Faker, count: int, storage_ids: list[int], upload_dir: Path) -> list[int]:
    if count <= 0:
        return []

    conn = require_connection()
    cursor = conn.cursor()

    created_ids: list[int] = []
    try:
        for _ in range(count):
            title = faker.catch_phrase()
            author = faker.name()
            category = random.choice([
                "Memorandum",
                "Correspondence",
                "Report",
                "Ordinance",
                "Resolution",
                "Budget",
                "Minutes",
            ])
            department = random.choice([
                "Library Services",
                "Records Management",
                "Tourism",
                "Education",
                "Public Works",
                "Mayor's Office",
                "N/A"
            ])
            classification = random.choice([
                "Public Resource",
                "Government Document",
                "Historical File",
                "N/A",
            ])
            year = random.randint(2000, datetime.utcnow().year)
            sensitivity = random.choice(SENSITIVITY_LEVELS)

            safe_title = "_".join(title.lower().split())[:40]
            filename = f"{faker.uuid4()}_{safe_title or 'document'}.pdf"
            file_path = upload_dir / filename
            create_placeholder_pdf(
                file_path,
                title,
                faker.paragraph(nb_sentences=6),
            )

            public_path = f"/uploads/{filename}"

            cursor.execute(
                """
                INSERT INTO Documents (
                    Title, Author, Category, Department, Classification,
                    Year, Sensitivity, File_Path
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    title,
                    author,
                    category,
                    department,
                    classification,
                    year,
                    sensitivity,
                    public_path,
                ),
            )
            document_id = cursor.lastrowid
            if document_id is None:
                raise RuntimeError("Failed to obtain new Document_ID from database.")
            document_id = int(document_id)
            created_ids.append(document_id)

            entries = random.randint(1, 3)
            for _ in range(entries):
                availability = random.choice(DOC_AVAILABILITY)
                condition = random.choice(DOC_CONDITIONS)
                location = random.choice(storage_ids) if storage_ids else None

                cursor.execute(
                    """
                    INSERT INTO Document_Inventory (
                        Document_ID, Availability, `Condition`, `StorageLocation`
                    ) VALUES (%s, %s, %s, %s)
                    """,
                    (document_id, availability, condition, location),
                )

        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return created_ids


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed fake library data using Faker")
    parser.add_argument("--books", type=int, default=10, help="Number of books to create")
    parser.add_argument("--documents", type=int, default=8, help="Number of documents to create")
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Optional numeric seed for deterministic output",
    )
    args = parser.parse_args()

    faker = Faker()
    if args.seed is not None:
        Faker.seed(args.seed)
        random.seed(args.seed)

    upload_dir = ensure_upload_target()

    conn = require_connection()
    cursor = conn.cursor()
    try:
        storage_ids = collect_storage_ids(cursor)
    finally:
        cursor.close()
        conn.close()

    books = seed_books(faker, args.books, storage_ids)
    documents = seed_documents(faker, args.documents, storage_ids, upload_dir)

    print(f"Created {len(books)} fake books with inventories.")
    print(f"Created {len(documents)} fake documents with inventories and PDFs in {upload_dir}.")


if __name__ == "__main__":
    main()
