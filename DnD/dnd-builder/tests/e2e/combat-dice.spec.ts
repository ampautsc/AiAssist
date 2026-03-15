/**
 * combat-dice.spec.ts
 *
 * Requirements verified:
 * - When a character performs an attack, the 3D DiceArena overlay appears.
 * - The DiceArena waits for user interaction (click to throw).
 * - After throwing the dice, the DiceArena closes and the action concludes.
 */
import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

test.describe('Dice Arena 3D Rolls Test', () => {
  test('User interaction triggers 3D dice and concludes action', async ({ page }) => {
    // Log browser console to terminal to catch WebGL / asset loading errors
    page.on('console', msg => console.log(`BROWSER MSG: ${msg.text()}`))
    page.on('pageerror', err => console.log(`BROWSER ERR: ${err.message}`))

    // 1. Navigate and load combat
    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    // 2. Load an encounter or just use default start if there are targets
    await page.getByTestId('load-encounter-btn').click()
    await expect(page.getByTestId('encounter-modal')).toBeVisible()

    // Answer dialog
    page.once('dialog', async dialog => {
      await dialog.accept()
    })

    await page.getByTestId('encounter-load-undead-patrol').click()
    await combat.waitForSession()

    // 3. Initiate an Action that causes a roll (e.g. standard Longsword attack)
    await combat.clickToolbar('attack')
    
    // Pick an action from the flyout (assuming "Longsword" or similar is visible)
    const attackItem = page.locator('[data-testid^="flyout-"]').first()
    await expect(attackItem).toBeVisible({ timeout: 5000 })
    await attackItem.click()

    // 5. Verify DiceArena appears
    const diceArena = page.getByTestId('dice-arena')
    await expect(diceArena).toBeVisible({ timeout: 10000 })

    // 5b. Verify the 3D dice canvas is actually rendered
    const diceCanvas = diceArena.locator('canvas')
    await expect(diceCanvas).toBeAttached({ timeout: 5000 })
    await expect(diceCanvas).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000) // Give the 3D scene time to settle/render
    await page.screenshot({ path: 'test-results/before-roll.png' })

    // 6. User clicks to throw (which triggers 3D roll and resolution)
    // The button is inside the arena
    const actionButton = diceArena.locator('button').first()
    await actionButton.click({ force: true })

    // 6b. Verify the action button hides during the throw (isThrowing state)
    await expect(actionButton).toBeHidden({ timeout: 1000 })

    await page.waitForTimeout(400) // mid-roll screenshot
    await page.screenshot({ path: 'test-results/mid-roll.png' })

    // 6c. Result must be acknowledged by user click before arena closes
    const resultConfirm = page.getByTestId('dice-result-confirm')
    await expect(resultConfirm).toBeVisible({ timeout: 10000 })
    await resultConfirm.click({ force: true })

    // 7. Verify the DiceArena hides after action finishes (which should take > 800ms)
    await expect(diceArena).not.toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: 'test-results/after-roll.png' })

    // 8. Try FREE roll on the Roll Bar — now also opens DiceArena
    const d20Btn = page.getByTestId('die-btn-20')
    await d20Btn.click()

    // 9. DiceArena should open for the free roll too
    await expect(page.getByTestId('dice-arena')).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: 'test-results/free-roll-arena.png' })

    // 10. Throw the free roll
    const freeThrowBtn = page.getByTestId('dice-arena').locator('button').first()
    await freeThrowBtn.click({ force: true })

    // 10b. Confirm result before arena closes
    const freeResultConfirm = page.getByTestId('dice-result-confirm')
    await expect(freeResultConfirm).toBeVisible({ timeout: 10000 })
    await freeResultConfirm.click({ force: true })

    // 11. Arena should close after physics
    await expect(page.getByTestId('dice-arena')).not.toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: 'test-results/free-roll-done.png' })
  })
})