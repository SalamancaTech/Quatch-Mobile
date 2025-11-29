from playwright.sync_api import sync_playwright
import time

def verify_spacing():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a slightly taller viewport to minimize overlap risk, but force click anyway
        context = browser.new_context(viewport={'width': 414, 'height': 896})
        page = context.new_page()

        print("Navigating...")
        page.goto('http://localhost:3001/Quatch-Mobile/')
        page.wait_for_selector('#slot-deck', state='visible', timeout=10000)

        # Shuffle and Deal to see the opponent hand and deck
        print("Shuffling...")
        # Force click because transparent layers might overlap on some viewports
        page.click('#slot-deck', force=True)
        time.sleep(1)

        print("Dealing...")
        page.click('#slot-deck', force=True)
        time.sleep(3) # Wait for animation

        print("Taking screenshot...")
        page.screenshot(path='layout_spacing_final.png')
        print("Screenshot saved to layout_spacing_final.png")

        browser.close()

if __name__ == "__main__":
    verify_spacing()
