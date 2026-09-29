import { expect, test, type Page } from '@playwright/test'

const JANUARY = '2026-01'
const FEBRUARY = '2026-02'

async function completeSetup(
  page: Page,
  currency = 'USD',
  month = JANUARY,
): Promise<void> {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Welcome to Varto' }),
  ).toBeVisible()
  await page.getByLabel('Currency', { exact: true }).selectOption(currency)
  await page.getByRole('button', { name: 'Start tracking' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Application currency')).toHaveText(currency)
  await expect(page.getByLabel('Currency', { exact: true })).toHaveCount(0)
  await page.getByLabel('Month', { exact: true }).fill(month)
}

async function addExpense(
  page: Page,
  amount: string,
  date: string,
  category: string,
): Promise<void> {
  await page.getByRole('radio', { name: 'Expense', exact: true }).check()
  await page.getByLabel('Amount').fill(amount)
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Category', { exact: true }).selectOption(category)
  await page.getByRole('button', { name: 'Add transaction' }).click()
}

async function addIncome(
  page: Page,
  amount: string,
  date: string,
): Promise<void> {
  await page.getByRole('radio', { name: 'Income', exact: true }).check()
  await expect(page.getByLabel('Category', { exact: true })).toHaveCount(0)
  await page.getByLabel('Amount').fill(amount)
  await page.getByLabel('Date').fill(date)
  await page.getByRole('button', { name: 'Add transaction' }).click()
}

test('setup, record, summarize, and restore without external requests', async ({
  page,
}) => {
  const externalRequests = new Set<string>()
  const observeUrl = (value: string): void => {
    const url = new URL(value)

    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      externalRequests.add(value)
    }
  }

  page.on('request', (request) => observeUrl(request.url()))
  page.on('websocket', (webSocket) => observeUrl(webSocket.url()))

  await completeSetup(page)
  await addIncome(page, '1000', '2026-01-05')
  await addExpense(page, '25.50', '2026-01-10', 'Groceries')

  await expect(page.getByLabel('Total income')).toHaveText('USD 1,000.00')
  await expect(page.getByLabel('Total expenses')).toHaveText('USD 25.50')
  await expect(page.getByLabel('Total balance')).toHaveText('USD 974.50')

  const categorySummary = page.getByRole('region', {
    name: 'Spending by category',
  })
  await expect(categorySummary).toContainText('Groceries')
  await expect(categorySummary).toContainText('USD 25.50')

  const transactionList = page.getByRole('region', { name: 'Transactions' })
  await expect(transactionList.getByRole('listitem')).toHaveCount(2)
  await expect(transactionList).toContainText('Income')
  await expect(transactionList).toContainText('Expense')
  await expect(transactionList).toContainText('Groceries')

  await page.reload()

  await expect(page.getByLabel('Application currency')).toHaveText('USD')
  await expect(page.getByLabel('Currency', { exact: true })).toHaveCount(0)
  await page.getByLabel('Month', { exact: true }).fill(JANUARY)
  await expect(transactionList.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByLabel('Total balance')).toHaveText('USD 974.50')
  expect([...externalRequests]).toEqual([])
})

test('select a month, edit a transaction, and move it between months', async ({
  page,
}) => {
  await completeSetup(page)
  await addExpense(page, '25.50', '2026-01-10', 'Groceries')
  await addExpense(page, '20', '2026-02-12', 'Travel')

  const transactionList = page.getByRole('region', { name: 'Transactions' })
  await expect(transactionList.getByRole('listitem')).toHaveCount(1)
  await expect(transactionList).toContainText('Groceries')
  await expect(transactionList).not.toContainText('Travel')

  await page.getByLabel('Month', { exact: true }).fill(FEBRUARY)
  await expect(transactionList.getByRole('listitem')).toHaveCount(1)
  await expect(transactionList).toContainText('Travel')
  await expect(page.getByLabel('Total expenses')).toHaveText('USD 20.00')

  await page.getByLabel('Month', { exact: true }).fill(JANUARY)
  const januaryRow = transactionList.getByRole('listitem')
  await januaryRow.getByRole('button', { name: 'Edit' }).click()
  await expect(
    page.getByRole('heading', { name: 'Edit transaction' }),
  ).toBeVisible()
  await expect(page.getByLabel('Amount')).toHaveValue('25.50')
  await page.getByLabel('Amount').fill('30.00')
  await page.getByLabel('Category', { exact: true }).selectOption('Car')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(transactionList).toContainText('Car')
  await expect(transactionList).not.toContainText('Groceries')
  await expect(page.getByLabel('Total expenses')).toHaveText('USD 30.00')

  await januaryRow.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Date').fill('2026-02-15')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('No transactions this month.')).toBeVisible()
  await expect(page.getByLabel('Total expenses')).toHaveText('USD 0.00')
  await expect(page.getByLabel('Total balance')).toHaveText('USD 0.00')

  await page.getByLabel('Month', { exact: true }).fill(FEBRUARY)
  await expect(transactionList.getByRole('listitem')).toHaveCount(2)
  await expect(transactionList).toContainText('Travel')
  await expect(transactionList).toContainText('Car')
  await expect(transactionList).toContainText('2026-02-15')
  await expect(page.getByLabel('Total expenses')).toHaveText('USD 50.00')
})

test('validate input, cancel and confirm deletion, and show the empty state', async ({
  page,
}) => {
  await completeSetup(page)
  const addButton = page.getByRole('button', { name: 'Add transaction' })
  await addButton.focus()
  await page.keyboard.press('Enter')

  await expect(page.getByLabel('Amount')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Date')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Category', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByText('Amount is required')).toBeVisible()
  await expect(page.getByText('Enter a valid calendar date')).toBeVisible()
  await expect(page.getByText('Select a valid expense category')).toBeVisible()
  await expect(page.getByText('No transactions this month.')).toBeVisible()

  await addExpense(page, '25.50', '2026-01-10', 'Groceries')
  const transactionList = page.getByRole('region', { name: 'Transactions' })
  const deleteButton = transactionList.getByRole('button', { name: 'Delete' })
  let cancelledDialogMessage = ''
  page.once('dialog', async (dialog) => {
    cancelledDialogMessage = dialog.message()
    expect(dialog.type()).toBe('confirm')
    await dialog.dismiss()
  })
  await deleteButton.focus()
  await page.keyboard.press('Enter')

  expect(cancelledDialogMessage).toBe(
    'Delete this expense transaction permanently?',
  )
  await expect(transactionList.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByLabel('Total expenses')).toHaveText('USD 25.50')

  let confirmedDialogMessage = ''
  page.once('dialog', async (dialog) => {
    confirmedDialogMessage = dialog.message()
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })
  await deleteButton.click()

  expect(confirmedDialogMessage).toBe(
    'Delete this expense transaction permanently?',
  )
  await expect(page.getByText('No transactions this month.')).toBeVisible()
  await expect(page.getByText('No expense categories this month.')).toBeVisible()
  await expect(page.getByLabel('Total income')).toHaveText('USD 0.00')
  await expect(page.getByLabel('Total expenses')).toHaveText('USD 0.00')
  await expect(page.getByLabel('Total balance')).toHaveText('USD 0.00')
  await expect(page.getByRole('button', { name: /undo/i })).toHaveCount(0)

  await page.reload()
  await page.getByLabel('Month', { exact: true }).fill(JANUARY)
  await expect(page.getByText('No transactions this month.')).toBeVisible()
  await expect(transactionList.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No expense categories this month.')).toBeVisible()
  await expect(page.getByLabel('Total income')).toHaveText('USD 0.00')
  await expect(page.getByLabel('Total expenses')).toHaveText('USD 0.00')
  await expect(page.getByLabel('Total balance')).toHaveText('USD 0.00')
})
