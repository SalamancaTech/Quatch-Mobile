from playwright.sync_api import sync_playwright

def verify_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Increase viewport width to ensure desktop layout (where alignment matters most)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        try:
            # Wait for Vite dev server (Port 3000 as per vite.config.ts)
            page.goto("http://localhost:3000/Quatch-Mobile/")

            # Wait for game to load (Opponent and Player names are good indicators)
            page.wait_for_selector("text=OPPONENT", timeout=10000)
            page.wait_for_selector("text=PLAYER 1", timeout=10000)

            # Additional wait to ensure layout settles
            page.wait_for_timeout(2000)

            # Take screenshot of the full game board
            page.screenshot(path="verification/layout_alignment.png", full_page=True)
            print("Screenshot saved to verification/layout_alignment.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_layout()
