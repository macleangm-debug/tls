import asyncio
from playwright.async_api import async_playwright
import os

async def capture_screenshots():
    base_path = "/app/frontend/public/ui-screenshots"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Desktop screenshots
        await page.set_viewport_size({"width": 1920, "height": 1080})
        
        # 1. Login page
        await page.goto("https://practice-vault-1.preview.emergentagent.com/login")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/01_login.png")
        print("Saved: 01_login.png")
        
        # Login as Advocate
        await page.fill('input[type="email"]', 'test@tls.or.tz')
        await page.fill('input[type="password"]', 'Test@12345678!')
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(4000)
        await page.screenshot(path=f"{base_path}/desktop/02_advocate_dashboard_modal.png")
        print("Saved: 02_advocate_dashboard_modal.png")
        
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base_path}/desktop/03_advocate_dashboard.png")
        print("Saved: 03_advocate_dashboard.png")
        
        # Stamp Document
        await page.goto("https://practice-vault-1.preview.emergentagent.com/stamp-document")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/04_stamp_document.png")
        print("Saved: 04_stamp_document.png")
        
        # Batch Stamp
        await page.goto("https://practice-vault-1.preview.emergentagent.com/batch-stamp")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/05_batch_stamp.png")
        print("Saved: 05_batch_stamp.png")
        
        # Stamp Ledger
        await page.goto("https://practice-vault-1.preview.emergentagent.com/stamp-ledger")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/06_stamp_ledger.png")
        print("Saved: 06_stamp_ledger.png")
        
        # Profile
        await page.goto("https://practice-vault-1.preview.emergentagent.com/profile")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/07_profile.png")
        print("Saved: 07_profile.png")
        
        # Help Center
        await page.goto("https://practice-vault-1.preview.emergentagent.com/help")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/08_help_center.png")
        print("Saved: 08_help_center.png")
        
        # Public pages (no login needed)
        await page.goto("https://practice-vault-1.preview.emergentagent.com/")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/09_landing_page.png")
        print("Saved: 09_landing_page.png")
        
        await page.goto("https://practice-vault-1.preview.emergentagent.com/verify")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/10_verify_page.png")
        print("Saved: 10_verify_page.png")
        
        await page.goto("https://practice-vault-1.preview.emergentagent.com/advocates")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/11_advocates_directory.png")
        print("Saved: 11_advocates_directory.png")
        
        # TLS Admin
        await page.goto("https://practice-vault-1.preview.emergentagent.com/login")
        await page.wait_for_timeout(1000)
        await page.fill('input[type="email"]', 'admin@tls.or.tz')
        await page.fill('input[type="password"]', 'TLS@Admin2024')
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(4000)
        await page.screenshot(path=f"{base_path}/desktop/12_tls_admin_dashboard.png")
        print("Saved: 12_tls_admin_dashboard.png")
        
        await page.goto("https://practice-vault-1.preview.emergentagent.com/admin/advocates")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/desktop/13_tls_admin_advocates.png")
        print("Saved: 13_tls_admin_advocates.png")
        
        # SuperAdmin
        await page.goto("https://practice-vault-1.preview.emergentagent.com/login")
        await page.wait_for_timeout(1000)
        await page.fill('input[type="email"]', 'superadmin@idc.co.tz')
        await page.fill('input[type="password"]', 'IDC@SuperAdmin2024')
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(4000)
        await page.screenshot(path=f"{base_path}/desktop/14_superadmin_dashboard.png")
        print("Saved: 14_superadmin_dashboard.png")
        
        # Mobile screenshots
        await page.set_viewport_size({"width": 390, "height": 844})
        
        await page.goto("https://practice-vault-1.preview.emergentagent.com/login")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/mobile/01_mobile_login.png")
        print("Saved: mobile/01_mobile_login.png")
        
        await page.fill('input[type="email"]', 'test@tls.or.tz')
        await page.fill('input[type="password"]', 'Test@12345678!')
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(4000)
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base_path}/mobile/02_mobile_dashboard.png")
        print("Saved: mobile/02_mobile_dashboard.png")
        
        await page.goto("https://practice-vault-1.preview.emergentagent.com/stamp-document")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/mobile/03_mobile_stamp_document.png")
        print("Saved: mobile/03_mobile_stamp_document.png")
        
        await page.goto("https://practice-vault-1.preview.emergentagent.com/stamp-ledger")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/mobile/04_mobile_stamp_ledger.png")
        print("Saved: mobile/04_mobile_stamp_ledger.png")
        
        await page.goto("https://practice-vault-1.preview.emergentagent.com/verify")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/mobile/05_mobile_verify.png")
        print("Saved: mobile/05_mobile_verify.png")
        
        await page.goto("https://practice-vault-1.preview.emergentagent.com/")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base_path}/mobile/06_mobile_landing.png")
        print("Saved: mobile/06_mobile_landing.png")
        
        await browser.close()
        print("\n✅ All screenshots captured!")

if __name__ == "__main__":
    asyncio.run(capture_screenshots())
