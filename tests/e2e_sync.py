"""
CleanClip Sync/Encryption Improvements - Focused E2E
- Verifies new sync UI in settings, localOnly toggle in entry-edit, and 4th onboarding page.
- Runs against the web build (Playwright). iCloud is iOS-only so we only check UI presence + non-iOS guards (toggle is hidden on web).
"""
import sys
from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:18084'
RESULTS = []


def log_result(name, passed, detail=''):
    status = 'PASS' if passed else 'FAIL'
    RESULTS.append({'name': name, 'passed': passed, 'detail': detail})
    print(f"  [{status}] {name}" + (f" - {detail}" if detail else ""))


def has_any(body, *needles):
    return any(n in body for n in needles)


def run():
    print('=' * 60)
    print('CleanClip Sync/Encryption E2E')
    print('=' * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 430, "height": 932})
        page = context.new_page()

        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

        # ---- Onboarding: 4 dots / 4 pages ----
        print('\n--- Onboarding 4 pages ---')
        try:
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            page.wait_for_timeout(3000)

            body = page.locator('body').inner_text()
            on_onboarding = has_any(body, 'はじめる', 'Get Started', '次へ', 'Next', 'Store Text', 'テキストを安全')
            log_result('Onboarding visible', on_onboarding, body[:80] if not on_onboarding else '')

            if on_onboarding:
                # Click Next button 3 times to reach the 4th page
                pressed = 0
                for _ in range(5):
                    body = page.locator('body').inner_text()
                    if has_any(body, 'はじめる', 'Get Started'):
                        break
                    next_btn = page.locator('text=次へ').first
                    if next_btn.count() == 0:
                        next_btn = page.locator('text=Next').first
                    if next_btn.count() == 0:
                        break
                    next_btn.click(force=True)
                    page.wait_for_timeout(700)
                    pressed += 1
                body = page.locator('body').inner_text()
                page.screenshot(path='/tmp/cleanclip_onb_last.png', full_page=True)
                log_result('Page 4 reachable (iCloud copy visible)', has_any(
                    body,
                    'iCloudで安全に同期', 'Sync Safely', 'iCloud Keychain', 'AES-256-GCM',
                ), f"pressed={pressed}; body={body[:120]}")

                # finish onboarding
                start_btn = page.locator('text=はじめる').first
                if start_btn.count() == 0:
                    start_btn = page.locator('text=Get Started').first
                if start_btn.count() > 0:
                    start_btn.click(force=True)
                    page.wait_for_timeout(2000)
        except Exception as e:
            log_result('Onboarding page 4', False, str(e))

        # ---- Make sure we are past onboarding ----
        try:
            page.evaluate("window.localStorage.setItem('cleanclip_onboarded', 'true')")
            page.reload()
            page.wait_for_load_state('networkidle', timeout=30000)
            page.wait_for_timeout(3000)
        except Exception as e:
            print(f'  warn: post-onboarding skip: {e}')

        # ---- Settings: open ----
        print('\n--- Settings screen ---')
        try:
            header_buttons = page.locator('div[role="button"], button').all()
            settings_clicked = False
            for btn in header_buttons:
                try:
                    box = btn.bounding_box()
                    if box and box['x'] > 350 and box['y'] < 60:
                        btn.click(timeout=4000)
                        settings_clicked = True
                        break
                except Exception:
                    continue
            if not settings_clicked:
                page.click('body', position={"x": 400, "y": 30})
            page.wait_for_timeout(2000)

            body = page.locator('body').inner_text()
            log_result('Settings opens', has_any(body, '設定', 'Settings', 'ダーク', 'Dark Mode'))

            # iCloud sync section is iOS-only -> on web should be HIDDEN
            log_result(
                'iCloud sync section hidden on web (Platform.OS guard)',
                ('iCloud同期' not in body) and ('iCloud Sync' not in body),
                f"web should not show ios-only section; body excerpt: {body[:120]}"
            )

            # Security section now mentions AES-256-GCM
            log_result(
                'Security copy upgraded to AES-256-GCM',
                has_any(body, 'AES-256-GCM', 'authenticated-encrypted', '認証付き暗号化'),
                'expected new wording in security section'
            )

            page.screenshot(path='/tmp/cleanclip_sync_settings.png', full_page=True)
        except Exception as e:
            log_result('Settings screen', False, str(e))

        # ---- Entry-edit: localOnly toggle ----
        print('\n--- Entry edit: device-only toggle ---')
        try:
            # Close settings cleanly via in-page navigation
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            page.wait_for_timeout(2500)

            add_btn = page.locator('[aria-label="エントリを追加"], [aria-label="Add entry"]').first
            if add_btn.count() == 0:
                page.click('body', position={"x": 400, "y": 850})
            else:
                add_btn.click(force=True)
            page.wait_for_timeout(2000)

            body = page.locator('body').inner_text()
            log_result(
                'Entry edit opens',
                has_any(body, '新規エントリ', 'New Entry', 'コンテンツ', 'Content')
            )

            # Web build should NOT show localOnly (syncAvailable === false on web)
            log_result(
                'localOnly toggle hidden on web (syncAvailable false)',
                ('この端末のみ' not in body) and ('This device only' not in body),
                'syncAvailable is false on web; toggle should be hidden'
            )
            page.screenshot(path='/tmp/cleanclip_entry_edit.png', full_page=True)
        except Exception as e:
            log_result('Entry edit page', False, str(e))

        # ---- Console errors ----
        print('\n--- Console errors ---')
        critical = [
            e for e in console_errors
            if 'clipboard' not in e.lower()
            and 'not supported' not in e.lower()
            and 'ResizeObserver' not in e
        ]
        log_result('No critical console errors', len(critical) == 0, f"{len(critical)} errors")
        if critical:
            for c in critical[:5]:
                print(f"    error: {c[:160]}")

        page.screenshot(path='/tmp/cleanclip_sync_final.png', full_page=True)
        browser.close()

    print('\n' + '=' * 60)
    passed = sum(1 for r in RESULTS if r['passed'])
    failed = sum(1 for r in RESULTS if not r['passed'])
    total = len(RESULTS)
    print(f'Total: {total} | Passed: {passed} | Failed: {failed}')
    print(f'Pass rate: {passed/total*100:.1f}%' if total else 'No tests')
    if failed:
        print('\nFAILED:')
        for r in RESULTS:
            if not r['passed']:
                print(f"  X {r['name']}" + (f" - {r['detail']}" if r['detail'] else ''))
    sys.exit(0 if failed == 0 else 1)


if __name__ == '__main__':
    run()
