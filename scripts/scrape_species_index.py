"""Scrape all species/lineage links from dnd5e.wikidot.com"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Go to the main lineages list page
    page.goto('https://dnd5e.wikidot.com/lineage', wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(3000)
    
    # Get ALL links on the page
    links = page.evaluate("""() => {
        const allLinks = document.querySelectorAll('#page-content a');
        return Array.from(allLinks).map(a => ({href: a.getAttribute('href'), text: a.textContent.trim()}));
    }""")
    
    print("=== All content links ===")
    for l in links:
        print(f'{l["text"]} -> {l["href"]}')
    
    browser.close()
