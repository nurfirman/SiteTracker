import os
import time
from playwright.sync_api import sync_playwright

os.makedirs("docs/screenshots", exist_ok=True)

CMD_COOKIE = "eyJ1c2VySWQiOiJ1c3ItY21kLTEiLCJuYW1lIjoiQnVkaSBTYW50b3NvIChQYXRyb2xpIENNRCkiLCJlbWFpbCI6ImJ1ZGkuY21kQHNpdGV0cmFja2VyLmlkIiwicm9sZSI6IkNNRCIsInBob25lTnVtYmVyIjoiMDgxMi0zNDU2LTc4OTAiLCJwcm9qZWN0SWQiOm51bGwsInByb2plY3RJZHMiOltdLCJjcmVhdGVkQXQiOjE3ODk1NDE4MjY4MzB9.c2278c7c65b21b8c9b6eb2d40cba913a3d1cc1601971e8b643e4403aa29dc777"
PIC_COOKIE = "eyJ1c2VySWQiOiJ1c3ItcGljLTEiLCJuYW1lIjoiQWhtYWQgRmF1emkgKFBJQyBTaXRlIFNDQkQpIiwiZW1haWwiOiJhaG1hZC5mYXV6aUBzaXRldHJhY2tlci5pZCIsInJvbGUiOiJQSUMiLCJwaG9uZU51bWJlciI6IjA4MTMtODg5OS0wMDExIiwicHJvamVjdElkIjoicHJvai0xIiwicHJvamVjdElkcyI6WyJwcm9qLTEiXSwiY3JlYXRlZEF0IjoxNzg5NTQxODI2ODMwfQ==.ae3fae60fc47a93f239cf3901d78ac82e20d091c6d4c32302edc4023cbcdc595"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # 1. Login Page (Sudah ada atau refresh)
    context_pub = browser.new_context(viewport={"width": 1366, "height": 850})
    page_pub = context_pub.new_page()
    page_pub.goto("http://localhost:3000/login", wait_until="load")
    page_pub.screenshot(path="docs/screenshots/01_login_page.png")
    print("01_login_page captured")
    context_pub.close()

    # Context CMD
    context_cmd = browser.new_context(viewport={"width": 1366, "height": 850})
    context_cmd.add_cookies([{
        "name": "sitetracker_session",
        "value": CMD_COOKIE,
        "domain": "localhost",
        "path": "/"
    }])

    # 2. Dashboard CMD
    page_cmd = context_cmd.new_page()
    page_cmd.goto("http://localhost:3000/", wait_until="networkidle")
    time.sleep(2)
    page_cmd.screenshot(path="docs/screenshots/02_dashboard_cmd.png")
    print("02_dashboard_cmd captured")

    # 3. All Findings List
    page_cmd.goto("http://localhost:3000/findings", wait_until="networkidle")
    time.sleep(2)
    page_cmd.screenshot(path="docs/screenshots/03_findings_list.png")
    print("03_findings_list captured")

    # 4. Input Single Finding
    page_cmd.goto("http://localhost:3000/findings/new", wait_until="networkidle")
    time.sleep(2)
    page_cmd.screenshot(path="docs/screenshots/04_input_single_finding.png")
    print("04_input_single_finding captured")

    # 5. Input Bulk Finding
    page_cmd.goto("http://localhost:3000/findings/bulk", wait_until="networkidle")
    time.sleep(2)
    page_cmd.screenshot(path="docs/screenshots/05_input_bulk_finding.png")
    print("05_input_bulk_finding captured")

    # 6. Reports Page
    page_cmd.goto("http://localhost:3000/reports", wait_until="networkidle")
    time.sleep(2)
    page_cmd.screenshot(path="docs/screenshots/07_reports_page.png")
    print("07_reports_page captured")

    # Open Arsip modal
    arsip_btn = page_cmd.locator("button:has-text('Arsip Laporan CMD')")
    if arsip_btn.count() > 0:
        arsip_btn.click()
        time.sleep(1)
        page_cmd.screenshot(path="docs/screenshots/08_reports_archive_modal.png")
        print("08_reports_archive_modal captured")

    # Check SideBySide modal if any finding card has Validasi button
    page_cmd.goto("http://localhost:3000/findings", wait_until="networkidle")
    time.sleep(1)
    val_btn = page_cmd.locator("button:has-text('Validasi'), button:has-text('Cek')")
    if val_btn.count() > 0:
        val_btn.first.click()
        time.sleep(1)
        page_cmd.screenshot(path="docs/screenshots/09_validation_modal.png")
        print("09_validation_modal captured")
    context_cmd.close()

    # Context PIC
    context_pic = browser.new_context(viewport={"width": 1366, "height": 850})
    context_pic.add_cookies([{
        "name": "sitetracker_session",
        "value": PIC_COOKIE,
        "domain": "localhost",
        "path": "/"
    }])
    page_pic = context_pic.new_page()
    page_pic.goto("http://localhost:3000/pic/tasks", wait_until="networkidle")
    time.sleep(2)
    page_pic.screenshot(path="docs/screenshots/06_pic_task_list.png")
    print("06_pic_task_list captured")
    context_pic.close()

    browser.close()
    print("ALL SCREENSHOTS CAPTURED PERFECTLY!")
