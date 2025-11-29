
from playwright.sync_api import sync_playwright

def verify_spacing_screenshot():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        context = browser.new_context(viewport={'width': 720, 'height': 1280})
        page = context.new_page()

        try:
            print("Navigating...")
            page.goto('http://localhost:3000')

            print("Starting game...")
            page.wait_for_selector('text=Click to Shuffle', timeout=10000).click(force=True)
            page.wait_for_timeout(1000)
            page.wait_for_selector('#slot-deck', timeout=10000).click(force=True)
            page.wait_for_timeout(3000)

            screenshot_path = '/home/jules/verification/layout_spacing_final.png'
            page.screenshot(path=screenshot_path)
            print(f"Screenshot taken at {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_spacing_screenshot()
