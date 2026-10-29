import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':390,'height':844}, timezone_id='Asia/Riyadh')
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html#/task/new?mode=manual'); await pg.wait_for_timeout(300)
        await pg.fill('[name=title]','النادي')
        await pg.select_option('[name=repeat]','custom'); await pg.wait_for_timeout(100)
        await pg.click('[data-act=toggle-day][data-day="0"]'); await pg.click('[data-act=toggle-day][data-day="2"]')
        await pg.fill('[name=repEvery]','2')
        await pg.screenshot(path='/home/claude/shots/rep1.png', full_page=True)
        await pg.click('[data-act=save-manual]'); await pg.wait_for_timeout(300)
        it = await pg.evaluate("SK.store.activeItems().find(i=>i.title==='النادي')")
        f = "t=>new Date(t).toLocaleString('en-GB',{timeZone:'Asia/Riyadh',weekday:'short',day:'2-digit',month:'short'})"
        print('rep', it['rep'], await pg.evaluate(f, it['due']), await pg.evaluate("i=>SK.store.repeatLabel(i)", it))
        ts=[it['due']]; cur=it
        for k in range(4):
            t = await pg.evaluate("([i,t])=>SK.store.nextDue(i,t)", [cur, ts[-1]]); ts.append(t)
        print([await pg.evaluate(f,t) for t in ts])
        await pg.goto('http://localhost:8765/index.html#/tasks'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/shots/rep2.png', full_page=True)
        print('errors', errs); await b.close()
asyncio.run(main())
