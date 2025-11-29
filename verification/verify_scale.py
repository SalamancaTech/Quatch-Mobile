from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 412, "height": 915}) # S24+ viewport approx
        page = context.new_page()
        page.goto("http://localhost:3000/Quatch-Mobile/")

        # Wait for game board to load
        page.wait_for_selector(".player-area")

        # Take screenshot of the whole page
        page.screenshot(path="verification/verify_s24_scale.png", full_page=True)
        browser.close()

if __name__ == "__main__":
    run()
