#!/usr/bin/env python3
"""
Mistral OCR processing utility.
Supports document URLs as well as local PDF and image files.
"""

import os
import sys
import base64
import mimetypes
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

try:
    try:
        from mistralai import Mistral
    except ImportError:
        from mistralai.client.sdk import Mistral
except ImportError:
    print("Error: mistralai package not installed. Run `.venv/bin/pip install mistralai`.")
    sys.exit(1)


def get_client() -> Mistral:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key or api_key == "your_mistral_api_key_here":
        print("\n❌ Error: MISTRAL_API_KEY is not set.")
        print("Please set your Mistral API key either by:")
        print("  1. Adding it to a `.env` file: MISTRAL_API_KEY=your_key_here")
        print("  2. Exporting it: export MISTRAL_API_KEY=\"your_key_here\"\n")
        print("You can get an API key at: https://console.mistral.ai/api-keys/")
        sys.exit(1)
    return Mistral(api_key=api_key)


def process_document_url(url: str, include_images: bool = False):
    """Process a document accessible via public URL."""
    client = get_client()
    print(f"Processing URL: {url}...")
    response = client.ocr.process(
        model="mistral-ocr-latest",
        document={
            "type": "document_url",
            "document_url": url,
        },
        include_image_base64=include_images,
    )
    return response


def process_local_file(file_path: str, include_images: bool = False):
    """Process a local image or PDF file."""
    path = Path(file_path)
    if not path.is_file():
        print(f"❌ Error: File '{file_path}' does not exist.")
        sys.exit(1)

    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        mime_type = "application/pdf" if path.suffix.lower() == ".pdf" else "image/jpeg"

    with open(path, "rb") as f:
        encoded_data = base64.b64encode(f.read()).decode("utf-8")

    data_url = f"data:{mime_type};base64,{encoded_data}"
    
    client = get_client()
    print(f"Processing local file: {file_path} ({mime_type})...")
    
    if mime_type.startswith("image/"):
        doc_payload = {
            "type": "image_url",
            "image_url": data_url,
        }
    else:
        doc_payload = {
            "type": "document_url",
            "document_url": data_url,
        }

    response = client.ocr.process(
        model="mistral-ocr-latest",
        document=doc_payload,
        include_image_base64=include_images,
    )
    return response


def print_ocr_result(response):
    """Print parsed OCR markdown output page by page."""
    print("\n" + "=" * 50)
    print("OCR EXTRACTION RESULT")
    print("=" * 50 + "\n")
    for i, page in enumerate(response.pages):
        print(f"--- Page {page.index + 1 if hasattr(page, 'index') and page.index is not None else i + 1} ---")
        print(page.markdown)
        print()


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python mistral_ocr.py <path_or_url_to_document_or_image>")
        print("\nExample:")
        print("  .venv/bin/python mistral_ocr.py sample.pdf")
        print("  .venv/bin/python mistral_ocr.py https://example.com/invoice.pdf")
        return

    target = sys.argv[1]
    if target.startswith("http://") or target.startswith("https://"):
        res = process_document_url(target)
    else:
        res = process_local_file(target)

    print_ocr_result(res)


if __name__ == "__main__":
    main()
