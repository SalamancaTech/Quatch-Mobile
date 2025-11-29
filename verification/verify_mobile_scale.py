from playwright.sync_api import sync_playwright

def verify_mobile_scale():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a mobile device (iPhone 13 dimensions)
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        page = context.new_page()

        print("Navigating to page...")
        page.goto("http://localhost:3000/Quatch-Mobile/")

        print("Waiting for game board...")
        page.wait_for_selector(".game-board-bg")

        # Take a screenshot of the initial load
        page.screenshot(path="verification/mobile_guide_layout.png")
        print("Screenshot saved to verification/mobile_guide_layout.png")

        # Verify card dimensions via JS evaluation
        # We expect card-size to be 19vw. 390 * 0.19 = 74.1px.

        # Let's find a card-size element. The Deck is a good candidate.
        deck = page.locator("#slot-deck").first
        box = deck.bounding_box()

        if box:
            print(f"Deck Dimensions: {box['width']}x{box['height']}")
            expected_width = 390 * 0.19
            # Tolerance of 2px
            if abs(box['width'] - expected_width) < 2:
                print(f"SUCCESS: Card width {box['width']} matches 19vw logic (~{expected_width})!")
            else:
                print(f"WARNING: Card width {box['width']} does not match expected {expected_width}")
        else:
            print("ERROR: Could not find deck slot")

        browser.close()

if __name__ == "__main__":
    verify_mobile_scale()
