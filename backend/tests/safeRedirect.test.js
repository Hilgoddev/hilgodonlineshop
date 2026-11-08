const {safeRedirect}=require('../../frontend/lib/safeRedirect');
test('auth redirects stay internal and tolerate repeated query parameters',()=>{expect(safeRedirect('/checkout?step=2')).toBe('/checkout?step=2');for(const value of [null,[],['/account'],'//evil.test','/\\evil.test','https://evil.test','/\n/evil.test'])expect(safeRedirect(value)).toBeNull();});
