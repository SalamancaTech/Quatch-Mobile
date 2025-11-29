from playwright.sync_api import sync_playwright

def verify_card_back():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        print("Navigating to app...")
        page.goto("http://localhost:3000/Quatch-Mobile/")

        # Wait for the game to load. The deck should be visible.
        print("Waiting for deck...")
        deck = page.locator("#slot-deck")
        deck.wait_for(state="visible", timeout=10000)

        # The deck is a stack of cards face down.
        # We need to take a screenshot of the deck to verify the card back.
        # But since the 'Card' component is used inside the deck, taking a screenshot of the deck element is good.

        print("Taking screenshot...")
        page.screenshot(path="verification/card_back_verification.png")

        # Also take a specific screenshot of the deck element
        deck.screenshot(path="verification/deck_only.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    verify_card_back()
