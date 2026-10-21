// Game rules and questions. No DOM here, so check.js can run it in Node.

const MAX_HP = 100;
const MAIN_TIME = 10, BONUS_TIME = 5;           // seconds to answer
const BOT_MAIN_RATE = 0.7, BOT_BONUS_RATE = 0.5; // chance the bot answers right

const WEAPONS = [
    { id: 'sword', icon: '🗡️', name: 'ดาบ', dmg: 15, heal: 10 },
    { id: 'bow', icon: '🏹', name: 'ธนู', dmg: 40, miss: 0.5 },
    { id: 'staff', icon: '🪄', name: 'คทาเวท', poisonDmg: 10, poisonTurns: 3 },
];
const [SWORD, BOW, STAFF] = WEAPONS;
SWORD.desc = `ดาเมจ ${SWORD.dmg} + ฮีลตัวเอง ${SWORD.heal}`;
BOW.desc = `ดาเมจ ${BOW.dmg} แต่พลาดได้ ${BOW.miss * 100}%`;
STAFF.desc = `ติดพิษ ${STAFF.poisonDmg} ต่อเทิร์น นาน ${STAFF.poisonTurns} เทิร์น`;

const BUFFS = [
    { id: 'shield', icon: '🛡️', name: 'โล่', rate: 0.5 },
    { id: 'reflect', icon: '🪞', name: 'สะท้อน', rate: 0.5 },
    { id: 'heal', icon: '💚', name: 'ฮีล', rate: 0.15 },
];
const [SHIELD, REFLECT, HEAL] = BUFFS;
SHIELD.desc = `ลดดาเมจที่โดน ${SHIELD.rate * 100}%`;
REFLECT.desc = `สะท้อนดาเมจ ${REFLECT.rate * 100}% กลับไป`;
HEAL.desc = `ฟื้นเลือด ${HEAL.rate * 100}% ของเลือดเต็ม`;

function newFighter(name) {
    return { name, hp: MAX_HP, poison: 0 };
}

function heal(f, n) { f.hp = Math.min(MAX_HP, f.hp + n); }
function hurt(f, n) { f.hp = Math.max(0, f.hp - n); }

// One attack. Mutates both fighters and returns the lines to show.
// buff = the defender's buff (null if they missed the bonus question). Buffs never block poison.
function resolveAttack(att, def, weapon, buff, rand = Math.random) {
    const log = [];
    let dmg = 0;
    if (weapon === SWORD) {
        heal(att, SWORD.heal);
        log.push(`${att.name} ฮีล +${SWORD.heal}`);
        dmg = SWORD.dmg;
    } else if (weapon === BOW) {
        if (rand() < BOW.miss) log.push('ธนูพลาดเป้า!');
        else dmg = BOW.dmg;
    } else {
        def.poison = STAFF.poisonTurns; // recasting resets the countdown, it does not stack
        log.push(`${def.name} ติดพิษ ${STAFF.poisonTurns} เทิร์น`);
    }
    if (dmg && buff === SHIELD) dmg = Math.round(dmg * (1 - SHIELD.rate));
    if (dmg) {
        hurt(def, dmg);
        log.push(`${def.name} เสียเลือด ${dmg}`);
    }
    if (dmg && buff === REFLECT) {
        const back = Math.round(dmg * REFLECT.rate);
        hurt(att, back);
        log.push(`สะท้อนกลับ ${att.name} เสียเลือด ${back}`);
    }
    if (buff === HEAL && def.hp > 0) {
        const n = Math.round(MAX_HP * HEAL.rate);
        heal(def, n);
        log.push(`${def.name} ฮีล +${n}`);
    }
    return log;
}

// Runs at the start of the poisoned fighter's own turn. Returns a line, or null.
function tickPoison(f) {
    if (f.poison <= 0) return null;
    f.poison--;
    hurt(f, STAFF.poisonDmg);
    return `☠️ ${f.name} โดนพิษ เสียเลือด ${STAFF.poisonDmg} (เหลืออีก ${f.poison} เทิร์น)`;
}

// e = the math shown (and checked by check.js); q = extra text when it's a word problem.
// o[0] is the correct answer; the game shuffles the options.
const MAIN_QUESTIONS = [
    { e: "2⁻³", o: ["1/8", "-8", "-6"] },
    { e: "(-5)⁰", o: ["1", "0", "-5"] },
    { e: "-3²", o: ["-9", "9", "-6"] },
    { e: "3⁻² × 3⁵", o: ["3³", "3⁻¹⁰", "9³"] },
    { e: "5⁴ ÷ 5⁻²", o: ["5⁶", "5²", "5⁻⁸"] },
    { e: "(2⁻³)²", o: ["2⁻⁶", "2⁻¹", "2⁹"] },
    { e: "(1/2)⁻³", o: ["8", "1/8", "-8"] },
    { e: "(3⁻¹)⁻²", o: ["9", "1/9", "-9"] },
    { e: "2⁻¹ + 2⁻¹", o: ["1", "1/4", "-4"] },
    { e: "10⁻² × 10⁵ ÷ 10", o: ["10²", "10³", "10⁻⁸"] },
    { e: "a⁻⁴ × a⁶", o: ["a²", "a⁻²⁴", "a¹⁰"] },
    { e: "x⁵ ÷ x⁸", o: ["x⁻³", "x³", "x¹³"] },
    { e: "(2a)³", o: ["8a³", "2a³", "6a³"] },
    { e: "(a²b)³", o: ["a⁶b³", "a⁵b³", "a⁶b"] },
    { e: "a⁰ × a³ ÷ a⁻¹", q: "a⁰ × a³ ÷ a⁻¹ = ?  (a ≠ 0)", o: ["a⁴", "a²", "a⁻³"] },
    { e: "0.00045", q: "0.00045 เขียนในรูปสัญ\u2060กรณ์วิทยาศาสตร์ได้อย่างไร?", o: ["4.5 × 10⁻⁴", "4.5 × 10⁻⁵", "4.5 × 10⁴"] },
    { e: "3.2 × 10⁻³", q: "3.2 × 10⁻³ เท่ากับจำนวนใด?", o: ["0.0032", "0.00032", "3200"] },
    { e: "(6 × 10³) × (2 × 10⁻⁵)", q: "(6 × 10³) × (2 × 10⁻⁵) เขียนในรูปสัญ\u2060กรณ์วิทยาศาสตร์ได้อย่างไร?", o: ["1.2 × 10⁻¹", "1.2 × 10⁻²", "1.2 × 10⁸"] },
    { e: "10⁻⁷ × 1000", q: "ไวรัสยาว 10⁻⁷ เมตร เรียงต่อกัน 1000 ตัว ยาวกี่เมตร?", o: ["10⁻⁴", "10⁻¹⁰", "10⁻²¹"] },
    { e: "2⁵ ÷ 2³", q: "แบคทีเรียเพิ่มเป็น 2 เท่าทุกชั่วโมง ตอนนี้มี 2⁵ เซลล์ เมื่อ 3 ชั่วโมงก่อนมีกี่เซลล์?", o: ["2²", "2⁸", "2¹⁵"] },
];

// Short ones: the defender has only 5 seconds
const BONUS_QUESTIONS = [
    { e: "5⁰", o: ["1", "0", "5"] },
    { e: "2⁻¹", o: ["1/2", "-2", "2"] },
    { e: "3⁻²", o: ["1/9", "-9", "-6"] },
    { e: "(-2)³", o: ["-8", "8", "-6"] },
    { e: "(-1)¹⁰⁰", o: ["1", "-1", "100"] },
    { e: "10⁻³", o: ["0.001", "-1000", "0.01"] },
    { e: "a² × a³", o: ["a⁵", "a⁶", "a⁸"] },
    { e: "a⁷ ÷ a²", o: ["a⁵", "a⁹", "a¹⁴"] },
    { e: "(a³)²", o: ["a⁶", "a⁵", "a⁹"] },
    { e: "x⁻² × x²", o: ["1", "0", "x⁴"] },
    { e: "2³ × 2⁻³", o: ["1", "0", "2⁻⁹"] },
    { e: "(2⁻¹)²", o: ["1/4", "-4", "4"] },
    { e: "10⁴ × 10⁻⁶", o: ["10⁻²", "10²", "10⁻²⁴"] },
    { e: "(5²)⁰", o: ["1", "25", "0"] },
    { e: "0.01", q: "0.01 = ?", o: ["10⁻²", "10²", "10⁻¹"] },
];

if (typeof module !== 'undefined') {
    module.exports = { MAX_HP, WEAPONS, BUFFS, MAIN_QUESTIONS, BONUS_QUESTIONS, newFighter, resolveAttack, tickPoison };
}
