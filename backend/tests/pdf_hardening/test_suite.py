"""
PDF Hardening Test Suite
Comprehensive tests for PDF validation and stamping under edge cases
"""
import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from services.pdf_validation_service import PDFValidationService, PDFErrorCode, pdf_validator
from services.pdf_overlay_service import PDFOverlayService
from services.stamp_image_service import StampImageService


@dataclass
class TestResult:
    """Result of a single PDF test"""
    filename: str
    test_type: str  # validation, stamping, positioning
    passed: bool
    expected_outcome: str  # valid, invalid, specific_error_code
    actual_outcome: str
    duration_ms: float
    error: Optional[str] = None
    details: Optional[Dict] = None


class PDFHardeningTestSuite:
    """
    Test suite for PDF hardening validation.
    
    Tests:
    1. Validation - ensures PDFs are correctly accepted/rejected
    2. Stamping - ensures stamp overlay works on edge cases
    3. Positioning - ensures stamps appear correctly on rotated/mixed pages
    """
    
    SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")
    REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
    
    def __init__(self):
        self.validator = PDFValidationService()
        self.results: List[TestResult] = []
        
        # Ensure directories exist
        os.makedirs(self.SAMPLES_DIR, exist_ok=True)
        os.makedirs(self.REPORTS_DIR, exist_ok=True)
    
    def run_all_tests(self, include_generated: bool = True) -> Dict:
        """Run all hardening tests"""
        print("=" * 60)
        print("PDF HARDENING TEST SUITE")
        print("=" * 60)
        
        start_time = time.time()
        
        # Generate synthetic PDFs if requested
        if include_generated:
            self._generate_synthetic_pdfs()
        
        # Run validation tests
        self._run_validation_tests()
        
        # Run stamping tests
        self._run_stamping_tests()
        
        # Run positioning tests
        self._run_positioning_tests()
        
        # Run real samples tests (if any exist)
        self._run_real_samples_tests()
        
        total_time = time.time() - start_time
        
        # Generate report
        report = self._generate_report(total_time)
        
        return report
    
    def _generate_synthetic_pdfs(self):
        """Generate synthetic test PDFs"""
        print("\n[1/4] Generating synthetic test PDFs...")
        
        from tests.pdf_hardening.synthetic_pdf_generator import SyntheticPDFGenerator
        
        valid_pdfs = SyntheticPDFGenerator.generate_all()
        invalid_pdfs = SyntheticPDFGenerator.create_invalid_pdfs()
        
        print(f"  Generated {len(valid_pdfs)} valid PDFs")
        print(f"  Generated {len(invalid_pdfs)} invalid PDFs")
    
    def _run_validation_tests(self):
        """Test PDF validation accepts/rejects correctly"""
        print("\n[2/4] Running validation tests...")
        
        # Test cases: (filename, expected_valid, expected_code)
        test_cases = [
            # Valid PDFs - should pass
            ("standard_letter.pdf", True, PDFErrorCode.PDF_VALID),
            ("standard_a4.pdf", True, PDFErrorCode.PDF_VALID),
            ("multi_page_10.pdf", True, PDFErrorCode.PDF_VALID),
            ("multi_page_50.pdf", True, PDFErrorCode.PDF_VALID),
            ("multi_page_100.pdf", True, PDFErrorCode.PDF_VALID),
            ("rotated_90.pdf", True, PDFErrorCode.PDF_VALID),
            ("rotated_180.pdf", True, PDFErrorCode.PDF_VALID),
            ("rotated_270.pdf", True, PDFErrorCode.PDF_VALID),
            ("mixed_rotation.pdf", True, PDFErrorCode.PDF_VALID),
            ("page_very_small.pdf", True, PDFErrorCode.PDF_VALID),
            ("page_a6.pdf", True, PDFErrorCode.PDF_VALID),
            ("page_a5.pdf", True, PDFErrorCode.PDF_VALID),
            ("page_a3.pdf", True, PDFErrorCode.PDF_VALID),
            ("page_a2.pdf", True, PDFErrorCode.PDF_VALID),
            ("page_a1.pdf", True, PDFErrorCode.PDF_VALID),
            ("page_legal.pdf", True, PDFErrorCode.PDF_VALID),
            ("page_tabloid.pdf", True, PDFErrorCode.PDF_VALID),
            ("mixed_sizes.pdf", True, PDFErrorCode.PDF_VALID),
            ("with_annotations.pdf", True, PDFErrorCode.PDF_VALID),
            ("with_forms.pdf", True, PDFErrorCode.PDF_VALID),
            ("minimal_valid.pdf", True, PDFErrorCode.PDF_VALID),
            ("single_pixel_page.pdf", True, PDFErrorCode.PDF_VALID),
            
            # Invalid PDFs - should fail
            ("not_a_pdf.pdf", False, PDFErrorCode.PDF_NOT_PDF),
            ("empty_file.pdf", False, PDFErrorCode.PDF_EMPTY),
            ("truncated.pdf", False, PDFErrorCode.PDF_CORRUPT),
            ("corrupted.pdf", False, PDFErrorCode.PDF_CORRUPT),
        ]
        
        for filename, expected_valid, expected_code in test_cases:
            self._test_validation(filename, expected_valid, expected_code)
    
    def _test_validation(self, filename: str, expected_valid: bool, expected_code: PDFErrorCode):
        """Test validation of a single PDF"""
        filepath = os.path.join(self.SAMPLES_DIR, filename)
        
        if not os.path.exists(filepath):
            self.results.append(TestResult(
                filename=filename,
                test_type="validation",
                passed=False,
                expected_outcome=f"valid={expected_valid}, code={expected_code.value}",
                actual_outcome="FILE_NOT_FOUND",
                duration_ms=0,
                error=f"Test file not found: {filepath}"
            ))
            print(f"  ❌ {filename}: FILE NOT FOUND")
            return
        
        start = time.time()
        
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            result, metadata = self.validator.validate(content, filename)
            duration_ms = (time.time() - start) * 1000
            
            # Check if outcome matches expectation
            passed = (result.valid == expected_valid and result.error_code == expected_code)
            
            self.results.append(TestResult(
                filename=filename,
                test_type="validation",
                passed=passed,
                expected_outcome=f"valid={expected_valid}, code={expected_code.value}",
                actual_outcome=f"valid={result.valid}, code={result.error_code.value}",
                duration_ms=duration_ms,
                details=result.details if not passed else None
            ))
            
            status = "✅" if passed else "❌"
            print(f"  {status} {filename}: {result.error_code.value} ({duration_ms:.1f}ms)")
            
        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            self.results.append(TestResult(
                filename=filename,
                test_type="validation",
                passed=False,
                expected_outcome=f"valid={expected_valid}, code={expected_code.value}",
                actual_outcome="EXCEPTION",
                duration_ms=duration_ms,
                error=str(e)
            ))
            print(f"  ❌ {filename}: EXCEPTION - {e}")
    
    def _run_stamping_tests(self):
        """Test stamping works on various PDF types"""
        print("\n[3/4] Running stamping tests...")
        
        # PDFs that should stamp successfully
        stamp_test_files = [
            "standard_letter.pdf",
            "standard_a4.pdf",
            "multi_page_10.pdf",
            "rotated_90.pdf",
            "rotated_180.pdf",
            "rotated_270.pdf",
            "mixed_rotation.pdf",
            "mixed_sizes.pdf",
            "page_a3.pdf",
            "page_tabloid.pdf",
            "with_annotations.pdf",
            "with_forms.pdf",
        ]
        
        for filename in stamp_test_files:
            self._test_stamping(filename)
    
    def _test_stamping(self, filename: str):
        """Test that stamping completes without error"""
        filepath = os.path.join(self.SAMPLES_DIR, filename)
        
        if not os.path.exists(filepath):
            self.results.append(TestResult(
                filename=filename,
                test_type="stamping",
                passed=False,
                expected_outcome="stamp_success",
                actual_outcome="FILE_NOT_FOUND",
                duration_ms=0,
                error=f"Test file not found: {filepath}"
            ))
            print(f"  ❌ {filename}: FILE NOT FOUND")
            return
        
        start = time.time()
        
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            # Generate test stamp
            stamp_image = StampImageService.generate_stamp_image(
                stamp_id="TEST-STAMP-001",
                advocate_name="Test Advocate",
                verification_url="https://example.com/verify",
                border_color="#10B981",
                show_advocate_name=True,
                show_tls_logo=True,
                scale=2.0,
                transparent_background=True
            )
            
            # Apply stamp with anchor-based positioning
            position = {
                "anchor": "bottom_right",
                "offset_x_pt": 20,
                "offset_y_pt": 20,
                "page_mode": "first"
            }
            
            stamped_content = PDFOverlayService.embed_stamp(
                pdf_content=content,
                stamp_image=stamp_image,
                position=position,
                include_signature=False,
                signature_data=None,
                show_signature_placeholder=False,
                brand_color="#10B981"
            )
            
            duration_ms = (time.time() - start) * 1000
            
            # Verify stamped PDF is valid
            result, metadata = self.validator.validate(stamped_content, f"stamped_{filename}")
            
            # Check if stamping produced valid output
            passed = result.valid and len(stamped_content) > len(content)
            
            self.results.append(TestResult(
                filename=filename,
                test_type="stamping",
                passed=passed,
                expected_outcome="stamp_success",
                actual_outcome="stamp_success" if passed else f"stamp_failed: {result.error_code.value}",
                duration_ms=duration_ms,
                details={
                    "original_size": len(content),
                    "stamped_size": len(stamped_content),
                    "size_increase": len(stamped_content) - len(content)
                }
            ))
            
            status = "✅" if passed else "❌"
            print(f"  {status} {filename}: stamped ({duration_ms:.1f}ms, +{len(stamped_content) - len(content)} bytes)")
            
        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            self.results.append(TestResult(
                filename=filename,
                test_type="stamping",
                passed=False,
                expected_outcome="stamp_success",
                actual_outcome="EXCEPTION",
                duration_ms=duration_ms,
                error=str(e)
            ))
            print(f"  ❌ {filename}: EXCEPTION - {e}")
    
    def _run_positioning_tests(self):
        """Test stamp positioning on various anchors and rotations"""
        print("\n[4/4] Running positioning tests...")
        
        # Test all anchor positions on a standard PDF
        anchors = [
            "top_left", "top_center", "top_right",
            "center_left", "center", "center_right",
            "bottom_left", "bottom_center", "bottom_right"
        ]
        
        filepath = os.path.join(self.SAMPLES_DIR, "standard_letter.pdf")
        
        if not os.path.exists(filepath):
            print("  ⚠️ Skipping positioning tests: standard_letter.pdf not found")
            return
        
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Generate stamp once
        stamp_image = StampImageService.generate_stamp_image(
            stamp_id="TEST-POS-001",
            advocate_name="Position Test",
            verification_url="https://example.com/verify",
            border_color="#10B981",
            show_advocate_name=True,
            show_tls_logo=True,
            scale=2.0,
            transparent_background=True
        )
        
        for anchor in anchors:
            start = time.time()
            
            try:
                position = {
                    "anchor": anchor,
                    "offset_x_pt": 12,
                    "offset_y_pt": 12,
                    "page_mode": "first"
                }
                
                stamped_content = PDFOverlayService.embed_stamp(
                    pdf_content=content,
                    stamp_image=stamp_image,
                    position=position,
                    include_signature=False,
                    signature_data=None,
                    show_signature_placeholder=False,
                    brand_color="#10B981"
                )
                
                duration_ms = (time.time() - start) * 1000
                
                # Verify output
                result, _ = self.validator.validate(stamped_content, f"positioned_{anchor}.pdf")
                passed = result.valid
                
                self.results.append(TestResult(
                    filename=f"positioning_{anchor}",
                    test_type="positioning",
                    passed=passed,
                    expected_outcome="position_success",
                    actual_outcome="position_success" if passed else result.error_code.value,
                    duration_ms=duration_ms
                ))
                
                status = "✅" if passed else "❌"
                print(f"  {status} anchor={anchor} ({duration_ms:.1f}ms)")
                
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                self.results.append(TestResult(
                    filename=f"positioning_{anchor}",
                    test_type="positioning",
                    passed=False,
                    expected_outcome="position_success",
                    actual_outcome="EXCEPTION",
                    duration_ms=duration_ms,
                    error=str(e)
                ))
                print(f"  ❌ anchor={anchor}: EXCEPTION - {e}")
    
    def _run_real_samples_tests(self):
        """Run tests on any real-world sample PDFs"""
        print("\n[BONUS] Checking for real-world sample PDFs...")
        
        # Look for files that aren't our synthetic ones
        synthetic_names = {
            "standard_letter.pdf", "standard_a4.pdf", "multi_page_10.pdf",
            "multi_page_50.pdf", "multi_page_100.pdf", "rotated_90.pdf",
            "rotated_180.pdf", "rotated_270.pdf", "mixed_rotation.pdf",
            "page_very_small.pdf", "page_a6.pdf", "page_a5.pdf", "page_a3.pdf",
            "page_a2.pdf", "page_a1.pdf", "page_legal.pdf", "page_tabloid.pdf",
            "mixed_sizes.pdf", "with_annotations.pdf", "with_forms.pdf",
            "linearized_simulation.pdf", "minimal_valid.pdf", "single_pixel_page.pdf",
            "not_a_pdf.pdf", "empty_file.pdf", "truncated.pdf", "corrupted.pdf"
        }
        
        real_samples = []
        for filename in os.listdir(self.SAMPLES_DIR):
            if filename.endswith('.pdf') and filename not in synthetic_names:
                real_samples.append(filename)
        
        if not real_samples:
            print("  No real-world samples found in samples/ directory")
            print("  Add real PDFs to: " + self.SAMPLES_DIR)
            return
        
        print(f"  Found {len(real_samples)} real-world samples")
        
        for filename in real_samples:
            filepath = os.path.join(self.SAMPLES_DIR, filename)
            start = time.time()
            
            try:
                with open(filepath, 'rb') as f:
                    content = f.read()
                
                result, metadata = self.validator.validate(content, filename)
                duration_ms = (time.time() - start) * 1000
                
                self.results.append(TestResult(
                    filename=filename,
                    test_type="real_sample",
                    passed=True,  # We're just collecting data, not enforcing
                    expected_outcome="collect_data",
                    actual_outcome=f"valid={result.valid}, code={result.error_code.value}",
                    duration_ms=duration_ms,
                    details=metadata.to_dict() if metadata else result.details
                ))
                
                status = "✅" if result.valid else "⚠️"
                print(f"  {status} {filename}: {result.error_code.value} ({duration_ms:.1f}ms)")
                
                if metadata:
                    print(f"      Pages: {metadata.page_count}, Size: {metadata.file_size_bytes/1024:.1f}KB")
                
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                self.results.append(TestResult(
                    filename=filename,
                    test_type="real_sample",
                    passed=False,
                    expected_outcome="collect_data",
                    actual_outcome="EXCEPTION",
                    duration_ms=duration_ms,
                    error=str(e)
                ))
                print(f"  ❌ {filename}: EXCEPTION - {e}")
    
    def _generate_report(self, total_time: float) -> Dict:
        """Generate and save test report"""
        print("\n" + "=" * 60)
        print("TEST REPORT")
        print("=" * 60)
        
        # Calculate stats
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.passed)
        failed_tests = total_tests - passed_tests
        
        # Group by test type
        by_type = {}
        for r in self.results:
            if r.test_type not in by_type:
                by_type[r.test_type] = {"passed": 0, "failed": 0, "results": []}
            if r.passed:
                by_type[r.test_type]["passed"] += 1
            else:
                by_type[r.test_type]["failed"] += 1
            by_type[r.test_type]["results"].append(asdict(r))
        
        # Print summary
        print(f"\nTotal Tests: {total_tests}")
        print(f"  ✅ Passed: {passed_tests}")
        print(f"  ❌ Failed: {failed_tests}")
        print(f"  Pass Rate: {passed_tests/total_tests*100:.1f}%")
        print(f"\nTotal Time: {total_time:.2f}s")
        
        print("\nBy Test Type:")
        for test_type, stats in by_type.items():
            total = stats["passed"] + stats["failed"]
            print(f"  {test_type}: {stats['passed']}/{total} passed")
        
        # List failures
        failures = [r for r in self.results if not r.passed]
        if failures:
            print("\n⚠️ FAILURES:")
            for f in failures:
                print(f"  - {f.filename} ({f.test_type}): {f.actual_outcome}")
                if f.error:
                    print(f"    Error: {f.error}")
        
        # Build report
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "pass_rate": round(passed_tests/total_tests*100, 1) if total_tests > 0 else 0,
                "total_time_seconds": round(total_time, 2)
            },
            "by_type": by_type,
            "failures": [asdict(r) for r in failures],
            "go_live_ready": failed_tests == 0
        }
        
        # Save report
        report_path = os.path.join(
            self.REPORTS_DIR, 
            f"hardening_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Report saved to: {report_path}")
        
        # Final verdict
        print("\n" + "=" * 60)
        if failed_tests == 0:
            print("🎉 ALL TESTS PASSED - PDF HARDENING COMPLETE")
            print("   System is ready for go-live certification")
        else:
            print(f"⚠️  {failed_tests} TEST(S) FAILED - REVIEW REQUIRED")
            print("   Fix failures before go-live")
        print("=" * 60)
        
        return report


def main():
    """Run the PDF hardening test suite"""
    suite = PDFHardeningTestSuite()
    report = suite.run_all_tests(include_generated=True)
    
    # Exit with appropriate code
    sys.exit(0 if report["go_live_ready"] else 1)


if __name__ == "__main__":
    main()
