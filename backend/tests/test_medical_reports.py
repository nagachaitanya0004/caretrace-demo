"""Unit tests for medical reports upload functionality."""
import pytest
from io import BytesIO
from fastapi import UploadFile
from app.api.routes import (
    validate_file_type,
    validate_file_size,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
)


class TestFileTypeValidation:
    """Test file type validation."""
    
    def test_valid_pdf_mime_type(self):
        """Valid PDF file should pass validation."""
        file = UploadFile(
            filename="test.pdf",
            file=BytesIO(b"fake pdf content"),
            headers={"content-type": "application/pdf"}
        )
        
        error = validate_file_type(file)
        assert error is None
    
    def test_valid_jpeg_mime_type(self):
        """Valid JPEG file should pass validation."""
        file = UploadFile(
            filename="test.jpg",
            file=BytesIO(b"fake jpg content"),
            headers={"content-type": "image/jpeg"}
        )
        
        error = validate_file_type(file)
        assert error is None
    
    def test_valid_png_mime_type(self):
        """Valid PNG file should pass validation."""
        file = UploadFile(
            filename="test.png",
            file=BytesIO(b"fake png content"),
            headers={"content-type": "image/png"}
        )
        
        error = validate_file_type(file)
        assert error is None
    
    def test_invalid_mime_type_text(self):
        """Text file should be rejected."""
        file = UploadFile(
            filename="test.txt",
            file=BytesIO(b"text content"),
            headers={"content-type": "text/plain"}
        )
        
        error = validate_file_type(file)
        assert error is not None
        assert "Invalid file type" in error
    
    def test_invalid_mime_type_zip(self):
        """ZIP file should be rejected."""
        file = UploadFile(
            filename="test.zip",
            file=BytesIO(b"zip content"),
            headers={"content-type": "application/zip"}
        )
        
        error = validate_file_type(file)
        assert error is not None
        assert "Invalid file type" in error
    
    def test_invalid_extension_with_valid_mime(self):
        """File with invalid extension should be rejected even with valid MIME type."""
        file = UploadFile(
            filename="test.txt",
            file=BytesIO(b"content"),
            headers={"content-type": "application/pdf"}
        )
        
        error = validate_file_type(file)
        assert error is not None
        assert "Invalid file" in error
    
    def test_case_insensitive_extension(self):
        """Extension check should be case-insensitive."""
        file = UploadFile(
            filename="test.PDF",
            file=BytesIO(b"pdf content"),
            headers={"content-type": "application/pdf"}
        )
        
        error = validate_file_type(file)
        assert error is None
    
    def test_jpeg_alternative_extension(self):
        """Both .jpg and .jpeg extensions should be valid."""
        file_jpg = UploadFile(
            filename="test.jpg",
            file=BytesIO(b"jpg content"),
            headers={"content-type": "image/jpeg"}
        )
        
        file_jpeg = UploadFile(
            filename="test.jpeg",
            file=BytesIO(b"jpeg content"),
            headers={"content-type": "image/jpeg"}
        )
        
        assert validate_file_type(file_jpg) is None
        assert validate_file_type(file_jpeg) is None


class TestFileSizeValidation:
    """Test file size validation."""
    
    def test_valid_small_file(self):
        """Small file should pass validation."""
        content = b"x" * 1024  # 1KB
        error = validate_file_size(content)
        assert error is None
    
    def test_valid_max_size_file(self):
        """File at exactly 10MB should pass validation."""
        content = b"x" * MAX_FILE_SIZE
        error = validate_file_size(content)
        assert error is None
    
    def test_empty_file(self):
        """Empty file should be rejected."""
        content = b""
        error = validate_file_size(content)
        assert error is not None
        assert "empty" in error.lower() or "corrupted" in error.lower()
    
    def test_oversized_file(self):
        """File larger than 10MB should be rejected."""
        content = b"x" * (MAX_FILE_SIZE + 1)
        error = validate_file_size(content)
        assert error is not None
        assert "exceeds 10MB limit" in error
    
    def test_large_oversized_file(self):
        """File much larger than 10MB should be rejected."""
        content = b"x" * (15 * 1024 * 1024)  # 15MB
        error = validate_file_size(content)
        assert error is not None
        assert "exceeds 10MB limit" in error


class TestValidationConstants:
    """Test validation constants are correctly defined."""
    
    def test_allowed_mime_types(self):
        """Verify allowed MIME types are correctly defined."""
        assert ALLOWED_MIME_TYPES == {'application/pdf', 'image/jpeg', 'image/png'}
    
    def test_max_file_size(self):
        """Verify max file size is 10MB."""
        assert MAX_FILE_SIZE == 10 * 1024 * 1024
        assert MAX_FILE_SIZE == 10485760
