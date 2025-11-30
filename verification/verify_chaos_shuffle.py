from playwright.sync_api import sync_playwright
import time

def verify_chaos_shuffle():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:3000/Quatch-Mobile/")

        # Wait for the game to load
        page.wait_for_selector("#slot-deck")

        # Click the deck to trigger shuffle
        page.click("#slot-deck")

        # Phase 1: Split (takes ~1.6s total: 20*50 + 600 = 1600ms)
        time.sleep(1.2)
        page.screenshot(path="verification/shuffle_phase_1_split.png")

        # Phase 2: Merge (takes ~1.3s total: 20*40 + 500 = 1300ms)
        # Previous total time = 1.6s. We want mid-merge.
        time.sleep(1.6) # Wait for split to finish + some merge time
        page.screenshot(path="verification/shuffle_phase_2_merge.png")

        # Phase 3: Return (takes ~1.0s total: 20*20 + 600 = 1000ms)
        # Previous total time = 1.6 + 1.3 = 2.9s.
        time.sleep(1.4) # Wait for merge to finish + some return time
        page.screenshot(path="verification/shuffle_phase_3_return.png")

        browser.close()

if __name__ == "__main__":
    verify_chaos_shuffle()
