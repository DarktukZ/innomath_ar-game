// Run: node check.js — checks every question's answer and the combat rules
const assert = require('assert');
const L = require('./logic.js');

// "(a²b)³" → JS: each superscript run becomes **(n) on the base right before it
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
const VARS = { a: 2, b: 5, x: 3 };
function value(s) {
    let out = '';
    s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s/g, '');
    for (let i = 0; i < s.length; i++) {
        if (!SUP[s[i]]) { out += s[i]; continue; }
        let exp = '';
        while (SUP[s[i]]) exp += SUP[s[i++]];
        i--;
        let j = out.length - 1;
        if (out[j] === ')') {
            for (let depth = 0; j >= 0; j--) {
                if (out[j] === ')') depth++;
                if (out[j] === '(' && --depth === 0) break;
            }
        } else {
            while (j > 0 && /[\d.]/.test(out[j - 1]) && /[\d.]/.test(out[j])) j--;
        }
        out = out.slice(0, j) + '(' + out.slice(j) + '**(' + exp + '))';
    }
    out = out.replace(/[a-z]/g, v => `(${VARS[v]})`)
             .replace(/([\d)])(?=\()/g, '$1*');
    return Function(`return ${out}`)();
}
const same = (p, q) => Math.abs(p - q) <= 1e-9 * Math.max(Math.abs(p), Math.abs(q));

assert.strictEqual(value('-3²'), -9);
assert.strictEqual(value('(-3)²'), 9);
assert.strictEqual(value('(a²b)³'), 64 * 125);

for (const [name, qs, n] of [['main', L.MAIN_QUESTIONS, 20], ['bonus', L.BONUS_QUESTIONS, 15]]) {
    assert.strictEqual(qs.length, n, `${name} should have ${n} questions`);
    qs.forEach((q, i) => {
        const v = value(q.e), vals = q.o.map(value);
        assert.strictEqual(q.o.length, 3, `${name} ${i + 1}: needs 3 options`);
        assert(same(v, vals[0]), `${name} ${i + 1}: ${q.e} = ${v}, but answer ${q.o[0]} = ${vals[0]}`);
        assert(!same(vals[0], vals[1]) && !same(vals[0], vals[2]) && !same(vals[1], vals[2]),
            `${name} ${i + 1}: two options have the same value ${q.o}`);
        console.log(`${name} ${String(i + 1).padStart(2)}. ${q.q || q.e + ' = ?'}  →  ${q.o[0]}   (ตัวลวง ${q.o[1]}, ${q.o[2]})`);
    });
}

// Combat
const [SWORD, BOW, STAFF] = L.WEAPONS, [SHIELD, REFLECT, HEAL] = L.BUFFS;
const hit = () => 0.9, miss = () => 0.1;
let p, b;
const fresh = () => { p = L.newFighter('คุณ'); b = L.newFighter('บอท'); };

fresh(); p.hp = 50; L.resolveAttack(p, b, SWORD, null);
assert.deepStrictEqual([p.hp, b.hp], [60, 85]);
fresh(); L.resolveAttack(p, b, SWORD, null);
assert.strictEqual(p.hp, 100, 'heal caps at max HP');
fresh(); L.resolveAttack(p, b, BOW, null, hit);
assert.strictEqual(b.hp, 60);
fresh(); L.resolveAttack(p, b, BOW, null, miss);
assert.strictEqual(b.hp, 100);
fresh(); L.resolveAttack(p, b, BOW, SHIELD, hit);
assert.strictEqual(b.hp, 80);
fresh(); L.resolveAttack(p, b, BOW, REFLECT, hit);
assert.deepStrictEqual([p.hp, b.hp], [80, 60]);
fresh(); b.hp = 70; L.resolveAttack(p, b, BOW, HEAL, hit);
assert.strictEqual(b.hp, 45);
fresh(); b.hp = 30; L.resolveAttack(p, b, BOW, HEAL, hit);
assert.strictEqual(b.hp, 0, 'heal does not revive');

fresh(); L.resolveAttack(p, b, STAFF, SHIELD);
assert.deepStrictEqual([b.hp, b.poison], [100, 3]);
L.tickPoison(b); L.tickPoison(b);
L.resolveAttack(p, b, STAFF, null);
assert.strictEqual(b.poison, 3, 'recast resets, does not stack');
L.tickPoison(b); L.tickPoison(b); L.tickPoison(b);
assert.strictEqual(L.tickPoison(b), null);
assert.strictEqual(b.hp, 50);

console.log('\nผ่านทั้งหมด ✅');
