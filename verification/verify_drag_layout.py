from playwright.sync_api import sync_playwright, expect
import time

def verify_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        try:
            # Navigate to the correct base path
            page.goto("http://127.0.0.1:5173/Quatch-Mobile/", timeout=10000)

            # Wait for content
            page.wait_for_selector("button:has-text('Start Game')", timeout=10000)

            # Click Start Game
            page.click("button:has-text('Start Game')")

            # Wait for hand container
            page.wait_for_selector("#player-hand-container", timeout=5000)

            time.sleep(2)

            page.screenshot(path="verification/layout_check.png")
            print("Screenshot saved to verification/layout_check.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="verification/error_state.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_layout()
