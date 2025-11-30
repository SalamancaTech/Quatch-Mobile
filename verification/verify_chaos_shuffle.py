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

        # Phase 1: Split (takes ~1s total: 20*30 + 400 = 1000ms)
        time.sleep(0.8)
        page.screenshot(path="verification/shuffle_phase_1_split.png")

        # Phase 2: Merge (takes ~0.8s total: 20*20 + 400 = 800ms)
        time.sleep(1.2) # 1s (split) + 0.4s (wait) = 1.4s total, so this is mid-merge
        page.screenshot(path="verification/shuffle_phase_2_merge.png")

        # Phase 3: Return (takes ~0.7s total: 20*10 + 500 = 700ms)
        time.sleep(1.0) # wait for merge to finish
        page.screenshot(path="verification/shuffle_phase_3_return.png")

        browser.close()

if __name__ == "__main__":
    verify_chaos_shuffle()
