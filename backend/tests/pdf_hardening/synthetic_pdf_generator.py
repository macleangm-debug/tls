"""
Synthetic PDF Generator for Stress Testing
Creates PDFs with various edge cases for validation testing
"""
import io
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4, A0, A1, A2, A3, A5, A6, LEGAL, TABLOID
from reportlab.lib.units import inch, mm
from PyPDF2 import PdfWriter, PdfReader
from PyPDF2.generic import NameObject, NumberObject


class SyntheticPDFGenerator:
    """Generate test PDFs with various characteristics"""
    
    OUTPUT_DIR = os.path.dirname(__file__)
    
    @classmethod
    def generate_all(cls) -> dict:
        """Generate all synthetic test PDFs and return paths"""
        results = {}
        
        # Standard PDFs
        results["standard_letter"] = cls.create_standard_pdf("standard_letter.pdf", letter, 1)
        results["standard_a4"] = cls.create_standard_pdf("standard_a4.pdf", A4, 1)
        results["multi_page_10"] = cls.create_standard_pdf("multi_page_10.pdf", letter, 10)
        results["multi_page_50"] = cls.create_standard_pdf("multi_page_50.pdf", letter, 50)
        results["multi_page_100"] = cls.create_standard_pdf("multi_page_100.pdf", letter, 100)
        
        # Rotated pages
        results["rotated_90"] = cls.create_rotated_pdf("rotated_90.pdf", 90)
        results["rotated_180"] = cls.create_rotated_pdf("rotated_180.pdf", 180)
        results["rotated_270"] = cls.create_rotated_pdf("rotated_270.pdf", 270)
        results["mixed_rotation"] = cls.create_mixed_rotation_pdf("mixed_rotation.pdf")
        
        # Page sizes
        results["page_very_small"] = cls.create_standard_pdf("page_very_small.pdf", (2*inch, 3*inch), 1)  # Receipt
        results["page_a6"] = cls.create_standard_pdf("page_a6.pdf", A6, 1)
        results["page_a5"] = cls.create_standard_pdf("page_a5.pdf", A5, 1)
        results["page_a3"] = cls.create_standard_pdf("page_a3.pdf", A3, 1)
        results["page_a2"] = cls.create_standard_pdf("page_a2.pdf", A2, 1)
        results["page_a1"] = cls.create_standard_pdf("page_a1.pdf", A1, 1)
        results["page_legal"] = cls.create_standard_pdf("page_legal.pdf", LEGAL, 1)
        results["page_tabloid"] = cls.create_standard_pdf("page_tabloid.pdf", TABLOID, 1)
        
        # Mixed page sizes
        results["mixed_sizes"] = cls.create_mixed_size_pdf("mixed_sizes.pdf")
        
        # With annotations
        results["with_annotations"] = cls.create_pdf_with_annotations("with_annotations.pdf")
        
        # With form fields
        results["with_forms"] = cls.create_pdf_with_forms("with_forms.pdf")
        
        # Linearized (simulated - actual linearization requires special tools)
        results["linearized_simulation"] = cls.create_linearized_simulation("linearized_simulation.pdf")
        
        # Edge cases
        results["minimal_valid"] = cls.create_minimal_pdf("minimal_valid.pdf")
        results["single_pixel_page"] = cls.create_standard_pdf("single_pixel_page.pdf", (72, 72), 1)  # 1 inch
        
        return results
    
    @classmethod
    def create_standard_pdf(cls, filename: str, pagesize: tuple, pages: int) -> str:
        """Create a standard PDF with specified page size and count"""
        path = os.path.join(cls.OUTPUT_DIR, "samples", filename)
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=pagesize)
        
        for i in range(pages):
            c.setFont("Helvetica", 12)
            c.drawString(72, pagesize[1] - 72, f"Test Document - Page {i+1} of {pages}")
            c.drawString(72, pagesize[1] - 90, f"Page Size: {pagesize[0]:.0f} x {pagesize[1]:.0f} points")
            c.drawString(72, 72, f"Generated for PDF Hardening Tests")
            c.showPage()
        
        c.save()
        buffer.seek(0)
        
        with open(path, 'wb') as f:
            f.write(buffer.getvalue())
        
        return path
    
    @classmethod
    def create_rotated_pdf(cls, filename: str, rotation: int) -> str:
        """Create a PDF with rotated pages"""
        path = os.path.join(cls.OUTPUT_DIR, "samples", filename)
        
        # Create base PDF
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.setFont("Helvetica", 14)
        c.drawString(72, letter[1] - 72, f"This page has /Rotate = {rotation}")
        c.drawString(72, letter[1] - 100, "The stamp should still appear correctly positioned")
        c.showPage()
        c.save()
        buffer.seek(0)
        
        # Add rotation
        reader = PdfReader(buffer)
        writer = PdfWriter()
        
        page = reader.pages[0]
        page.rotate(rotation)
        writer.add_page(page)
        
        with open(path, 'wb') as f:
            writer.write(f)
        
        return path
    
    @classmethod
    def create_mixed_rotation_pdf(cls, filename: str) -> str:
        """Create a PDF with pages of different rotations"""
        path = os.path.join(cls.OUTPUT_DIR, "samples", filename)
        
        # Create base PDF with multiple pages
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        rotations = [0, 90, 180, 270, 0]
        for i, rot in enumerate(rotations):
            c.setFont("Helvetica", 14)
            c.drawString(72, letter[1] - 72, f"Page {i+1}: /Rotate = {rot}")
            c.showPage()
        
        c.save()
        buffer.seek(0)
        
        # Apply rotations
        reader = PdfReader(buffer)
        writer = PdfWriter()
        
        for i, page in enumerate(reader.pages):
            if i < len(rotations) and rotations[i] != 0:
                page.rotate(rotations[i])
            writer.add_page(page)
        
        with open(path, 'wb') as f:
            writer.write(f)
        
        return path
    
    @classmethod
    def create_mixed_size_pdf(cls, filename: str) -> str:
        """Create a PDF with pages of different sizes"""
        path = os.path.join(cls.OUTPUT_DIR, "samples", filename)
        
        writer = PdfWriter()
        sizes = [letter, A4, LEGAL, A5, TABLOID]
        
        for i, size in enumerate(sizes):
            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=size)
            c.setFont("Helvetica", 12)
            c.drawString(72, size[1] - 72, f"Page {i+1}: Size = {size[0]:.0f} x {size[1]:.0f} pt")
            c.showPage()
            c.save()
            buffer.seek(0)
            
            reader = PdfReader(buffer)
            writer.add_page(reader.pages[0])
        
        with open(path, 'wb') as f:
            writer.write(f)
        
        return path
    
    @classmethod
    def create_pdf_with_annotations(cls, filename: str) -> str:
        """Create a PDF with annotation objects"""
        path = os.path.join(cls.OUTPUT_DIR, "samples", filename)
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.setFont("Helvetica", 12)
        c.drawString(72, letter[1] - 72, "This PDF has annotations (comments, highlights)")
        
        # Add a link annotation
        c.linkURL("https://example.com", (72, 600, 200, 620), relative=0)
        c.drawString(72, 610, "Click here (link annotation)")
        
        c.showPage()
        c.save()
        buffer.seek(0)
        
        with open(path, 'wb') as f:
            f.write(buffer.getvalue())
        
        return path
    
    @classmethod
    def create_pdf_with_forms(cls, filename: str) -> str:
        """Create a PDF with form fields (AcroForm)"""
        path = os.path.join(cls.OUTPUT_DIR, "samples", filename)
        
        from reportlab.lib.colors import black
        from reportlab.pdfbase import pdfform
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.setFont("Helvetica", 12)
        c.drawString(72, letter[1] - 72, "This PDF has form fields (AcroForm)")
        
        # Add form field
        c.acroForm.textfield(
            name='field1',
            tooltip='Enter text here',
            x=72, y=letter[1] - 150,
            width=200, height=20,
            borderWidth=1,
            borderColor=black,
            fillColor=None,
            textColor=black,
            forceBorder=True
        )
        c.drawString(72, letter[1] - 130, "Text field:")
        
        c.showPage()
        c.save()
        buffer.seek(0)
        
        with open(path, 'wb') as f:
            f.write(buffer.getvalue())
        
        return path
    
    @classmethod
    def create_linearized_simulation(cls, filename: str) -> str:
        """
        Create a PDF that simulates linearization markers.
        Note: True linearization requires qpdf or similar tools.
        """
        path = os.path.join(cls.OUTPUT_DIR, "samples", filename)
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.setFont("Helvetica", 12)
        c.drawString(72, letter[1] - 72, "This PDF simulates linearization structure")
        c.showPage()
        c.save()
        buffer.seek(0)
        
        with open(path, 'wb') as f:
            f.write(buffer.getvalue())
        
        return path
    
    @classmethod
    def create_minimal_pdf(cls, filename: str) -> str:
        """Create the smallest valid PDF possible"""
        path = os.path.join(cls.OUTPUT_DIR, "samples", filename)
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=(100, 100))
        c.showPage()
        c.save()
        buffer.seek(0)
        
        with open(path, 'wb') as f:
            f.write(buffer.getvalue())
        
        return path
    
    @classmethod
    def create_invalid_pdfs(cls) -> dict:
        """Create intentionally invalid PDFs for testing rejection"""
        results = {}
        samples_dir = os.path.join(cls.OUTPUT_DIR, "samples")
        
        # Not a PDF (text file)
        path = os.path.join(samples_dir, "not_a_pdf.pdf")
        with open(path, 'w') as f:
            f.write("This is not a PDF file, just plain text.")
        results["not_a_pdf"] = path
        
        # Empty file
        path = os.path.join(samples_dir, "empty_file.pdf")
        with open(path, 'wb') as f:
            pass  # Empty
        results["empty_file"] = path
        
        # Truncated PDF (valid header but incomplete)
        path = os.path.join(samples_dir, "truncated.pdf")
        with open(path, 'wb') as f:
            f.write(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')  # Just header
        results["truncated"] = path
        
        # Corrupted PDF (random garbage after header)
        path = os.path.join(samples_dir, "corrupted.pdf")
        with open(path, 'wb') as f:
            f.write(b'%PDF-1.4\n' + os.urandom(1000))
        results["corrupted"] = path
        
        return results


if __name__ == "__main__":
    print("Generating synthetic test PDFs...")
    
    valid_pdfs = SyntheticPDFGenerator.generate_all()
    print(f"\nGenerated {len(valid_pdfs)} valid test PDFs:")
    for name, path in valid_pdfs.items():
        size = os.path.getsize(path)
        print(f"  - {name}: {path} ({size} bytes)")
    
    invalid_pdfs = SyntheticPDFGenerator.create_invalid_pdfs()
    print(f"\nGenerated {len(invalid_pdfs)} invalid test PDFs:")
    for name, path in invalid_pdfs.items():
        size = os.path.getsize(path)
        print(f"  - {name}: {path} ({size} bytes)")
    
    print("\nDone!")
