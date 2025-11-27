from playwright.sync_api import sync_playwright, Page, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Open the game
    print("Navigating to game...")
    try:
        page.goto("http://localhost:3000/Quatch-Mobile/", timeout=30000)
    except Exception as e:
        print(f"Error navigating: {e}")
        # Try once more
        page.goto("http://localhost:3000/Quatch-Mobile/")

    # Wait for the game to load
    print("Waiting for deck...")
    page.wait_for_selector("#slot-deck", state="visible", timeout=60000)

    # 2. Shuffle
    print("Clicking shuffle...")
    page.locator("#slot-deck").click()
    page.wait_for_timeout(1000) # Wait for shuffle animation

    # 3. Deal
    print("Clicking deal...")
    page.locator("#slot-deck").click()

    # Wait for dealing animation to complete (it takes a few seconds)
    print("Waiting for animations...")
    page.wait_for_timeout(5000)

    # 4. Screenshot the player's card area
    print("Taking screenshot...")

    slot0 = page.locator("#player-table-slot-0")
    if slot0.count() > 0:
        slot0.screenshot(path="/home/jules/verification/player_slot_0.png")
        print("Screenshot of slot 0 saved.")
    else:
        print("Slot 0 not found!")

    # Full page screenshot as backup
    page.screenshot(path="/home/jules/verification/full_game.png")

    browser.close()
    print("Done.")

with sync_playwright() as playwright:
    run(playwright)
