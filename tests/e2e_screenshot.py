from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 430, "height": 932})
    page.goto('http://localhost:18084')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    page.screenshot(path='/tmp/cleanclip_initial.png', full_page=True)

    # Inspect DOM
    content = page.content()
    with open('/tmp/cleanclip_dom.html', 'w') as f:
        f.write(content)

    # Check console errors
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    page.screenshot(path='/tmp/cleanclip_reload.png', full_page=True)

    print(f"Console errors: {len(errors)}")
    for e in errors[:10]:
        print(f"  ERROR: {e}")

    browser.close()
