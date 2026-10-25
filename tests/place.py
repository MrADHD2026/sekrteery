import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, timezone_id='Asia/Riyadh')
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)+' '+str(e.stack)))
        await pg.goto('http://localhost:8765/index.html#/task/new?mode=voice'); await pg.wait_for_timeout(300)
        await pg.evaluate("""()=>{ SK.geo.search=async q=>[{name:'مدينة الملك عبدالله الطبية',address:'العوالي، مكة المكرمة',lat:21.38,lng:39.89,src:'osm'},{name:'مستشفى النور',address:'العزيزية، مكة',lat:21.4,lng:39.85,src:'osm'}]; SK.geo.travel=async()=>({minutes:23,km:14.2,src:'osm'}); }""")
        await pg.fill('textarea[name=vtext]','بكرة الساعة عشرة الصبح موعد مهم في مدينة الملك عبدالله الطبية')
        await pg.click('[data-act=parse]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act=place-open][data-i="0"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/shots/p1-search.png')
        await pg.click('[data-act=place-pick][data-k="0"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/shots/p2-draft.png', full_page=True)
        await pg.click('[data-act=save-drafts]'); await pg.wait_for_timeout(300)
        it = await pg.evaluate("SK.store.activeItems().slice(-1)[0]")
        print(it['title'], it['place'], json.loads(it['nat']))
        await pg.goto('http://localhost:8765/index.html#/task/'+it['id']); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/shots/p3-edit.png', full_page=True)
        print(await pg.evaluate("SK.store.upcomingAlarms().map(a=>a.key)"))
        print('errors', errs); await b.close()
asyncio.run(main())
