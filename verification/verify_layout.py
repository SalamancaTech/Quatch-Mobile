from playwright.sync_api import sync_playwright

def verify_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a mobile device to test responsiveness
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        page = context.new_page()

        # Navigate to the game (ensure the dev server port is correct)
        page.goto("http://localhost:3000/Quatch-Mobile/")

        # Wait for the game to load
        page.wait_for_selector(".game-board-bg")

        # Start game (click through menu or start button if needed, assuming default start)
        # Based on code, the game loads directly into Setup/Shuffle.

        # Wait for shuffling/dealing animation to settle or just take a snapshot of initial state
        # The prompt mentioned "Start Game" button is removed and play starts automatically/via drag.

        # Take a screenshot
        page.screenshot(path="verification/layout_mobile.png")

        # Also take a desktop screenshot
        page.set_viewport_size({'width': 1920, 'height': 1080})
        page.screenshot(path="verification/layout_desktop.png")

        browser.close()

if __name__ == "__main__":
    verify_layout()
