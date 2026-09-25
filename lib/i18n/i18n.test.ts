import { describe, it, expect } from "vitest";
import { t, formatNumber, uk, en } from "./index";
import type { TranslationKey } from "./index";

/** U+2019 — the Ukrainian apostrophe (design D21). Written as an escape to stay unambiguous. */
const APOSTROPHE = "\u2019";
/** U+00A0 — no-break space: before a percent sign in Ukrainian copy and as thousands separator. */
const NBSP = "\u00a0";

/**
 * The confirmed copy of `specs/localization/spec.md` (add-content-v3), rows 1–160 in table order.
 * Tuple order is `[key, uk, en]`.
 */
const COPY: ReadonlyArray<readonly [TranslationKey, string, string]> = [
  ["mainButton.label", "Клік", "Click"], // 1
  ["balance.ariaLabel", "Баланс: {value}", "Balance: {value}"], // 2
  ["theme.switchToDark", "Увімкнути темну тему", "Switch to dark theme"], // 3
  ["theme.switchToLight", "Увімкнути світлу тему", "Switch to light theme"], // 4
  ["language.short", "УКР", "ENG"], // 5
  ["language.switch", "Змінити мову на англійську", "Switch language to Ukrainian"], // 6
  ["reset.button", "Скинути прогрес", "Reset progress"], // 7
  ["reset.title", "Скинути весь прогрес?", "Reset all progress?"], // 8
  ["reset.body", "Баланс, кліки й покупки буде обнулено. Тема й мова залишаться.", "Your balance, clicks and purchases will be reset. Theme and language stay."], // 9
  ["reset.confirm", "Скинути", "Reset"], // 10
  ["reset.cancel", "Скасувати", "Cancel"], // 11
  ["shop.title", "Магазин", "Shop"], // 12
  ["shop.category.skins", "Скіни", "Skins"], // 13
  ["shop.category.decor", "Декор", "Decor"], // 14
  ["shop.category.upgrades", "Покращення", "Upgrades"], // 15
  ["shop.buy", "Купити за {price}", "Buy for {price}"], // 16
  ["shop.owned", "Куплено", "Owned"], // 17
  ["shop.requires", "Потрібно: {item}", "Requires: {item}"], // 18
  ["shop.count", "Маєте: {count}", "Owned: {count}"], // 19
  ["skin.on", "Увімкнено", "On"], // 20
  ["skin.off", "Вимкнено", "Off"], // 21
  ["item.soft-shadow.name", `М${APOSTROPHE}яка тінь`, "Soft shadow"], // 22
  ["item.soft-shadow.description", "Тінь, що глибшає під курсором і при натисканні", "A shadow that deepens on hover and press"], // 23
  ["item.squish.name", "Желе", "Squish"], // 24
  ["item.squish.description", "Кнопка сплющується й пружинить після кліку", "Jelly-like squash and spring-back on click"], // 25
  ["item.floating-number.name", "Спливаючі +N", "Floating +N"], // 26
  ["item.floating-number.description", "Зароблене спливає від курсора й тане", "The earned amount floats up from the cursor and fades"], // 27
  ["item.jumping-cap.name", "Кепка-стрибунець", "Jumping cap"], // 28
  ["item.jumping-cap.description", "Кепка на кнопці підстрибує з кожним кліком", "A cap sits on the button and hops on each click"], // 29
  ["item.gold.name", "Золото", "Gold"], // 30
  ["item.gold.description", "Металева золота поверхня", "Metallic gold surface"], // 31
  ["item.sleeping-cat.name", "Сплячий кіт", "Sleeping cat"], // 32
  ["item.sleeping-cat.description", "Кіт повільно дихає, часом ворушить вухами", "A cat that slowly breathes, ears twitch now and then"], // 33
  ["item.lava-lamp.name", "Лава-лампа", "Lava lamp"], // 34
  ["item.lava-lamp.description", "Краплі воску здіймаються й зливаються", "Blobs rising and merging"], // 35
  ["item.hydraulic-press.name", "Гідравлічний прес", "Hydraulic press"], // 36
  ["item.hydraulic-press.description", "Прес повільно чавить нескінченну низку предметів", "A press slowly crushing an endless line of objects"], // 37
  ["item.double-click.name", "Подвійний клік", "Double click"], // 38
  ["item.double-click.description", "Кожен клік приносить ×2", "Each click is worth ×2"], // 39
  ["item.triple-click.name", "Потрійний клік", "Triple click"], // 40
  ["item.triple-click.description", "Кожен клік приносить ×3 (замість ×2)", "Each click is worth ×3 (replaces ×2)"], // 41
  ["item.monkey.name", "Мавпочка", "Monkey"], // 42
  ["item.monkey.description", "Сама тисне свою кнопку: 1 клік за секунду", "Presses its own button: 1 click per second"], // 43
  ["helper.monkey.label", "Мавпочки: {count} (+{rate} за секунду)", "Monkeys: {count} (+{rate} per second)"], // 44
  ["item.crit.name", "Крит", "Crit"], // 45
  ["item.crit.description", `Шанс, що клік зарахується ×10: 5${NBSP}% → 10${NBSP}% → 15${NBSP}%`, "Chance for a click to count ×10: 5% → 10% → 15%"], // 46
  ["item.combo.name", "Комбо", "Combo"], // 47
  ["item.combo.description", "Швидкі кліки поспіль піднімають множник до ×2; на паузі він спадає", "Fast clicks in a row build a multiplier up to ×2; it fades when you pause"], // 48
  ["item.golden-button.name", "Золота кнопка", "Golden button"], // 49
  ["item.golden-button.description", `Часом з${APOSTROPHE}являється на кілька секунд: злови — і 30 с кліки ×7`, "Appears now and then for a few seconds: catch it for 30 s of ×7 clicks"], // 50
  ["item.robot.name", "Робот", "Robot"], // 51
  ["item.robot.description", "Сам тисне свою кнопку: 5 кліків за секунду", "Presses its own button: 5 clicks per second"], // 52
  ["item.factory.name", "Фабрика", "Factory"], // 53
  ["item.factory.description", "Сама тисне свою кнопку: 40 кліків за секунду", "Presses its own button: 40 clicks per second"], // 54
  ["item.speed-monkey.name", "Прискорення мавпочок", "Monkey speed-up"], // 55
  ["item.speed-monkey.description", "Мавпочки клікають удвічі швидше за кожен рівень", "Monkeys click twice as fast per level"], // 56
  ["item.speed-robot.name", "Прискорення роботів", "Robot speed-up"], // 57
  ["item.speed-robot.description", "Роботи клікають удвічі швидше за кожен рівень", "Robots click twice as fast per level"], // 58
  ["item.speed-factory.name", "Прискорення фабрик", "Factory speed-up"], // 59
  ["item.speed-factory.description", "Фабрики клікають удвічі швидше за кожен рівень", "Factories click twice as fast per level"], // 60
  ["shop.level", "Рівень {level} з {max}", "Level {level} of {max}"], // 61
  ["shop.maxed", "Максимальний рівень", "Max level"], // 62
  ["helper.robot.label", "Роботи: {count} (+{rate} за секунду)", "Robots: {count} (+{rate} per second)"], // 63
  ["helper.factory.label", "Фабрики: {count} (+{rate} за секунду)", "Factories: {count} (+{rate} per second)"], // 64
  ["crit.text", "КРИТ ×10!", "CRIT ×10!"], // 65
  ["combo.label", "Комбо ×{value}", "Combo ×{value}"], // 66
  ["golden.catch", "Зловити золоту кнопку", "Catch the golden button"], // 67
  ["golden.bonus", "Золотий бонус ×7: {seconds} с", "Golden bonus ×7: {seconds} s"], // 68
  // Stage 4 (add-content-v3) - video category and items
  ["shop.category.video", "Відео", "Video"], // 69
  ["item.video-runner.name", "Subway Surfers", "Subway Surfers"], // 70
  ["item.video-runner.description", "Довгий забіг у фоні", "A long run in the background"], // 71
  ["item.video-parkour.name", "Гідравлічний прес", "Hydraulic press"], // 72
  ["item.video-parkour.description", "Прес чавить усе підряд", "A press crushing one thing after another"], // 73
  ["item.video-soap.name", "Різання води", "Cutting water"], // 74
  ["item.video-soap.description", "Ніж ріже воду", "A knife cutting through water"], // 75
  ["item.video-kinetic-sand.name", "Качка на прогулянці", "Duck on a walk"], // 76
  ["item.video-kinetic-sand.description", "Качка гуляє без кінця", "A duck walking on and on"], // 77
  ["item.video-slime.name", "Медитація Відьмака", "Witcher meditation"], // 78
  ["item.video-slime.description", "Спокійна медитація", "A quiet meditation"], // 79
  ["item.video-hydraulic.name", "Краєвиди природи", "Nature views"], // 80
  ["item.video-hydraulic.description", "Довгі краєвиди природи", "Long views of nature"], // 81
  ["item.video-music.name", "Музика Експедиції", "Expedition music"], // 82
  ["item.video-music.description", "Тиха музика табору", "Quiet camp music"], // 83
  ["item.video-trailer.name", "Трейлер Експедиції 33", "Expedition 33 trailer"], // 84
  ["item.video-trailer.description", "Трейлер запуску гри", "The game's launch trailer"], // 85
  ["item.video-combat.name", "Бій Експедиції 33", "Expedition 33 combat"], // 86
  ["item.video-combat.description", "Посібник з бою для новачків", "A beginner's combat guide"], // 87
  ["item.video-rain.name", "Паркур у Minecraft", "Minecraft parkour"], // 88
  ["item.video-rain.description", "Стрибки по блоках у Minecraft", "Block-hopping in Minecraft"], // 89
  ["item.video-seal.name", "Тюлень, що крутиться", "Spinning seal"],
  ["item.video-seal.description", "Тюлень крутиться по колу", "A seal spinning in circles"],
  // Video UI strings
  ["video.label", "Відео: {name}", "Video: {name}"], // 90
  ["video.offline", "Відео недоступне без мережі", "Video unavailable offline"], // 91
  ["video.play", "Увімкнути відео", "Play video"], // 92
  // Achievement UI strings
  ["achievements.open", "Досягнення", "Achievements"], // 93
  ["achievements.title", "Досягнення", "Achievements"], // 94
  ["achievements.close", "Закрити", "Close"], // 95
  ["achievements.count", "Відкрито {unlocked} з {total}", "{unlocked} of {total} unlocked"], // 96
  ["achievements.locked", "Закрито", "Locked"], // 97
  ["achievements.unlocked", "Відкрито", "Unlocked"], // 98
  ["achievements.progress", "{current} / {goal}", "{current} / {goal}"], // 99
  ["achievements.toast", "Досягнення: {name}", "Achievement: {name}"], // 100
  // 30 achievements
  ["achievement.first-click.name", "Перший клік", "First click"], // 101
  ["achievement.first-click.description", "Зроби один клік", "Make one click"], // 102
  ["achievement.clicks-100.name", "Сотня", "Hundred"], // 103
  ["achievement.clicks-100.description", "Набери 100 кліків усього", "Reach 100 total clicks"], // 104
  ["achievement.clicks-1000.name", "Тисяча", "Thousand"], // 105
  ["achievement.clicks-1000.description", `Набери 1${NBSP}000 кліків усього`, "Reach 1,000 total clicks"], // 106
  ["achievement.clicks-10000.name", "Десять тисяч", "Ten thousand"], // 107
  ["achievement.clicks-10000.description", `Набери 10${NBSP}000 кліків усього`, "Reach 10,000 total clicks"], // 108
  ["achievement.clicks-100000.name", "Сто тисяч", "Hundred thousand"], // 109
  ["achievement.clicks-100000.description", `Набери 100${NBSP}000 кліків усього`, "Reach 100,000 total clicks"], // 110
  ["achievement.balance-1000.name", "Скарбничка", "Piggy bank"], // 111
  ["achievement.balance-1000.description", `Май 1${NBSP}000 кліків на балансі`, "Hold 1,000 clicks in your balance"], // 112
  ["achievement.balance-50000.name", "Сейф", "Vault"], // 113
  ["achievement.balance-50000.description", `Май 50${NBSP}000 кліків на балансі`, "Hold 50,000 clicks in your balance"], // 114
  ["achievement.first-purchase.name", "Перша покупка", "First purchase"], // 115
  ["achievement.first-purchase.description", "Купи будь-що в магазині", "Buy anything in the shop"], // 116
  ["achievement.purchases-10.name", "Колекціонер", "Collector"], // 117
  ["achievement.purchases-10.description", "Зроби 10 покупок", "Make 10 purchases"], // 118
  ["achievement.purchases-25.name", "Шопоголік", "Shopaholic"], // 119
  ["achievement.purchases-25.description", "Зроби 25 покупок", "Make 25 purchases"], // 120
  ["achievement.skins-3.name", "Модник", "Trendsetter"], // 121
  ["achievement.skins-3.description", "Май 3 скіни", "Own 3 skins"], // 122
  ["achievement.skins-all.name", "Повна шафа", "Full wardrobe"], // 123
  ["achievement.skins-all.description", "Май усі 5 скінів", "Own all 5 skins"], // 124
  ["achievement.gold-equipped.name", "Золота лихоманка", "Gold rush"], // 125
  ["achievement.gold-equipped.description", "Увімкни золотий матеріал", "Equip the gold material"], // 126
  ["achievement.first-decor.name", "Затишок", "Cosy"], // 127
  ["achievement.first-decor.description", "Купи перший декор", "Buy your first decoration"], // 128
  ["achievement.decor-all.name", "Дизайнер", "Designer"], // 129
  ["achievement.decor-all.description", "Купи всі 3 декори", "Buy all 3 decorations"], // 130
  ["achievement.cat-nap.name", "Котосон", "Cat nap"], // 131
  ["achievement.cat-nap.description", "Купи сплячого кота", "Buy the sleeping cat"], // 132
  ["achievement.first-video.name", "Фоновий режим", "Background mode"], // 133
  ["achievement.first-video.description", "Купи перше відео", "Buy your first video"], // 134
  ["achievement.videos-all.name", "Марафон", "Marathon"], // 135
  ["achievement.videos-all.description", "Купи всі 11 відео", "Buy all 11 videos"], // 136
  ["achievement.first-helper.name", "Не сам", "Not alone"], // 137
  ["achievement.first-helper.description", "Купи першого помічника", "Buy your first helper"], // 138
  ["achievement.helpers-10.name", "Бригада", "Crew"], // 139
  ["achievement.helpers-10.description", "Май 10 помічників", "Own 10 helpers"], // 140
  ["achievement.factory-owner.name", "Промисловість", "Industry"], // 141
  ["achievement.factory-owner.description", "Май хоча б одну фабрику", "Own at least one factory"], // 142
  ["achievement.first-crit.name", "Критичний удар", "Critical hit"], // 143
  ["achievement.first-crit.description", "Зроби перший крит", "Land your first crit"], // 144
  ["achievement.crits-100.name", "Сотня критів", "Hundred crits"], // 145
  ["achievement.crits-100.description", "Зроби 100 критів", "Land 100 crits"], // 146
  ["achievement.combo-5.name", "Розігрів", "Warm-up"], // 147
  ["achievement.combo-5.description", "Набери комбо ×1,5", "Reach a ×1.5 combo"], // 148
  ["achievement.combo-max.name", "Максимальне комбо", "Max combo"], // 149
  ["achievement.combo-max.description", "Набери комбо ×2", "Reach a ×2 combo"], // 150
  ["achievement.first-golden.name", "Золота мить", "Golden moment"], // 151
  ["achievement.first-golden.description", "Злови золоту кнопку", "Catch a golden button"], // 152
  ["achievement.golden-10.name", "Золотошукач", "Gold digger"], // 153
  ["achievement.golden-10.description", "Злови 10 золотих кнопок", "Catch 10 golden buttons"], // 154
  ["achievement.reset-once.name", "З чистого аркуша", "Clean slate"], // 155
  ["achievement.reset-once.description", "Скинь прогрес один раз", "Reset your progress once"], // 156
  ["achievement.achievements-10.name", "Десятка", "Ten of them"], // 157
  ["achievement.achievements-10.description", "Відкрий 10 досягнень", "Unlock 10 achievements"], // 158
  ["achievement.achievements-all.name", "Повна колекція", "Full collection"], // 159
  ["achievement.achievements-all.description", "Відкрий усі інші досягнення", "Unlock every other achievement"], // 160
];

/** Expected uk / en copy of a key, looked up in the table above. */
const expectedCopy = (key: TranslationKey): { uk: string; en: string } => {
  const row = COPY.find(([candidate]) => candidate === key);
  if (!row) {
    throw new Error(`No expected copy for "${key}" in specs/localization/spec.md`);
  }
  return { uk: row[1], en: row[2] };
};

/** The 30 shop item ids of Stage 1 + 2 + 3 + 4, in catalog order. */
const ITEM_IDS = [
  "soft-shadow",
  "squish",
  "floating-number",
  "jumping-cap",
  "gold",
  "sleeping-cat",
  "lava-lamp",
  "hydraulic-press",
  "double-click",
  "triple-click",
  "crit",
  "combo",
  "golden-button",
  "monkey",
  "speed-monkey",
  "robot",
  "speed-robot",
  "factory",
  "speed-factory",
  "video-music",
  "video-runner",
  "video-parkour",
  "video-soap",
  "video-kinetic-sand",
  "video-slime",
  "video-hydraulic",
  "video-trailer",
  "video-combat",
  "video-rain",
  "video-seal",
] as const;

/** The 30 achievement ids, in catalog order. */
const ACHIEVEMENT_IDS = [
  "first-click",
  "clicks-100",
  "clicks-1000",
  "clicks-10000",
  "clicks-100000",
  "balance-1000",
  "balance-50000",
  "first-purchase",
  "purchases-10",
  "purchases-25",
  "skins-3",
  "skins-all",
  "gold-equipped",
  "first-decor",
  "decor-all",
  "cat-nap",
  "first-video",
  "videos-all",
  "first-helper",
  "helpers-10",
  "factory-owner",
  "first-crit",
  "crits-100",
  "combo-5",
  "combo-max",
  "first-golden",
  "golden-10",
  "reset-once",
  "achievements-10",
  "achievements-all",
] as const;

/** Rows 61–68 of the table: the Stage 3 keys that are not item names / descriptions. */
const STAGE_3_KEYS: readonly TranslationKey[] = [
  "shop.level",
  "shop.maxed",
  "helper.robot.label",
  "helper.factory.label",
  "crit.text",
  "combo.label",
  "golden.catch",
  "golden.bonus",
];

describe("lib/i18n", () => {
  describe("Requirement: Dictionaries with identical keys", () => {
    describe("Scenario: Key parity [unit]", () => {
      it("should have identical key sets in uk and en", () => {
        expect(Object.keys(uk).sort()).toEqual(Object.keys(en).sort());
      });
    });

    describe("Scenario: No empty values [unit]", () => {
      it("should have a non-empty string for every uk value", () => {
        Object.entries(uk).forEach(([key, value]) => {
          expect(typeof value, key).toBe("string");
          expect(value.trim().length, key).toBeGreaterThan(0);
        });
      });

      it("should have a non-empty string for every en value", () => {
        Object.entries(en).forEach(([key, value]) => {
          expect(typeof value, key).toBe("string");
          expect(value.trim().length, key).toBeGreaterThan(0);
        });
      });
    });

    describe("Scenario: Required Stage 1 keys and copy [unit]", () => {
      it("should contain exactly the 160 keys of the table", () => {
        const expectedKeys = COPY.map(([key]) => key).sort();
        expect(expectedKeys).toHaveLength(162);
        expect(new Set(expectedKeys).size).toBe(162);
        expect(Object.keys(uk).sort()).toEqual(expectedKeys);
        expect(Object.keys(en).sort()).toEqual(expectedKeys);
      });

      it("should have exactly the confirmed copy for every key", () => {
        COPY.forEach(([key, ukValue, enValue]) => {
          expect(uk[key], key).toBe(ukValue);
          expect(en[key], key).toBe(enValue);
        });
      });

      it("should have the exact copy the spec calls out for Stage 1", () => {
        expect(uk["mainButton.label"]).toBe("Клік");
        expect(en["mainButton.label"]).toBe("Click");
        expect(uk["reset.button"]).toBe("Скинути прогрес");
        expect(en["reset.button"]).toBe("Reset progress");
        expect(uk["reset.body"]).toBe(
          "Баланс, кліки й покупки буде обнулено. Тема й мова залишаться.",
        );
      });

      it("should use the typographic apostrophe U+2019 in Ukrainian copy", () => {
        expect(uk["item.soft-shadow.name"]).toBe(`М${APOSTROPHE}яка тінь`);
        expect(uk["item.soft-shadow.name"]).toContain(APOSTROPHE);
        expect(uk["item.soft-shadow.name"]).not.toContain("'");
        expect(uk["item.golden-button.description"]).toContain(`з${APOSTROPHE}являється`);
        expect(uk["item.golden-button.description"]).not.toContain("'");
      });
    });

    describe("Scenario: Every shop item has a name and description [unit]", () => {
      it("should return the table copy for all lookups of the 30 items", () => {
        expect(ITEM_IDS).toHaveLength(30);
        let lookups = 0;
        ITEM_IDS.forEach((id) => {
          (["name", "description"] as const).forEach((suffix) => {
            const key = `item.${id}.${suffix}` as TranslationKey;
            const expected = expectedCopy(key);
            expect(t("uk", key), key).toBe(expected.uk);
            expect(t("en", key), key).toBe(expected.en);
            lookups += 2;
          });
        });
        expect(lookups).toBe(120);
      });
    });

    describe("Scenario: Every achievement has a name and description [unit]", () => {
      it("should return the table copy for all lookups of the 30 achievements", () => {
        expect(ACHIEVEMENT_IDS).toHaveLength(30);
        let lookups = 0;
        ACHIEVEMENT_IDS.forEach((id) => {
          (["name", "description"] as const).forEach((suffix) => {
            const key = `achievement.${id}.${suffix}` as TranslationKey;
            const expected = expectedCopy(key);
            expect(t("uk", key), key).toBe(expected.uk);
            expect(t("en", key), key).toBe(expected.en);
            lookups += 2;
          });
        });
        expect(lookups).toBe(120);
      });

      it("should match the examples of the scenario", () => {
        expect(t("uk", "achievement.cat-nap.name")).toBe("Котосон");
        expect(t("en", "achievement.cat-nap.description")).toBe("Buy the sleeping cat");
        expect(t("uk", "achievement.achievements-all.description")).toBe(
          "Відкрий усі інші досягнення",
        );
      });
    });

    describe("Scenario: Stage 4 copy and interpolation [unit]", () => {
      it("should return the table copy for Stage 4 keys without params", () => {
        expect(t("uk", "shop.category.video")).toBe("Відео");
        expect(t("en", "shop.category.video")).toBe("Video");
        expect(t("uk", "video.offline")).toBe("Відео недоступне без мережі");
        expect(t("en", "video.play")).toBe("Play video");
      });

      it("should interpolate Stage 4 placeholders", () => {
        expect(t("uk", "video.label", { name: "Камін" })).toBe("Відео: Камін");
        expect(t("en", "achievements.count", { unlocked: 5, total: 30 })).toBe(
          "5 of 30 unlocked",
        );
        expect(t("uk", "achievements.count", { unlocked: "5", total: "30" })).toBe(
          "Відкрито 5 з 30",
        );
        expect(t("uk", "achievements.toast", { name: "Перший клік" })).toBe(
          "Досягнення: Перший клік",
        );
        expect(t("en", "achievements.progress", { current: "1,000", goal: "10,000" })).toBe(
          "1,000 / 10,000",
        );
      });
    });

    describe("Scenario: Ukrainian achievement copy uses no-break spaces in numbers [unit]", () => {
      it("should use no-break space before thousands in Ukrainian achievement descriptions", () => {
        expect(t("uk", "achievement.clicks-1000.description")).toBe(
          `Набери 1${NBSP}000 кліків усього`,
        );
        expect(t("uk", "achievement.balance-50000.description")).toBe(
          `Май 50${NBSP}000 кліків на балансі`,
        );
      });

      it("should use commas in English achievement descriptions", () => {
        expect(t("en", "achievement.clicks-1000.description")).toBe(
          "Reach 1,000 total clicks",
        );
      });
    });

    describe("Scenario: Stage 3 copy [unit]", () => {
      it("should return the table copy with placeholders kept for keys 61-68", () => {
        expect(STAGE_3_KEYS).toHaveLength(8);
        STAGE_3_KEYS.forEach((key) => {
          const expected = expectedCopy(key);
          expect(t("uk", key), key).toBe(expected.uk);
          expect(t("en", key), key).toBe(expected.en);
        });
      });

      it("should match the examples of the scenario", () => {
        expect(t("uk", "crit.text")).toBe("КРИТ ×10!");
        expect(t("en", "shop.maxed")).toBe("Max level");
        expect(t("uk", "shop.level")).toBe("Рівень {level} з {max}");
        expect(t("en", "golden.bonus")).toBe("Golden bonus ×7: {seconds} s");
      });
    });

    describe("Scenario: Shop interpolation [unit]", () => {
      it("should interpolate the shop and helper placeholders", () => {
        expect(t("uk", "shop.buy", { price: `1${NBSP}500` })).toBe(`Купити за 1${NBSP}500`);
        expect(t("en", "shop.buy", { price: "1,500" })).toBe("Buy for 1,500");
        expect(t("uk", "shop.requires", { item: "Подвійний клік" })).toBe(
          "Потрібно: Подвійний клік",
        );
        expect(t("en", "helper.monkey.label", { count: 3, rate: 3 })).toBe(
          "Monkeys: 3 (+3 per second)",
        );
      });
    });

    describe("Scenario: Percentages use a no-break space in Ukrainian [unit]", () => {
      it("should separate every Ukrainian percent sign with U+00A0", () => {
        const text = t("uk", "item.crit.description");
        expect(text).toBe(
          `Шанс, що клік зарахується ×10: 5${NBSP}% → 10${NBSP}% → 15${NBSP}%`,
        );
        expect([...text].filter((char) => char === "%")).toHaveLength(3);
        [...text].forEach((char, index) => {
          if (char === "%") {
            expect(text[index - 1], `char before % at ${index}`).toBe(NBSP);
          }
        });
        expect(text).not.toMatch(/\d %/);
        expect(text).not.toMatch(/\d%/);
      });

      it("should write English percentages without a space", () => {
        const text = t("en", "item.crit.description");
        expect(text).toBe("Chance for a click to count ×10: 5% → 10% → 15%");
        expect(text).not.toContain(NBSP);
      });
    });

    describe("Scenario: Stage 3 interpolation [unit]", () => {
      it("should interpolate the Stage 3 placeholders", () => {
        expect(t("uk", "shop.level", { level: 1, max: 3 })).toBe("Рівень 1 з 3");
        expect(t("en", "shop.level", { level: 3, max: 3 })).toBe("Level 3 of 3");
        expect(t("uk", "combo.label", { value: "1,5" })).toBe("Комбо ×1,5");
        expect(t("en", "combo.label", { value: "2" })).toBe("Combo ×2");
        expect(t("uk", "golden.bonus", { seconds: 30 })).toBe("Золотий бонус ×7: 30 с");
        expect(t("en", "golden.bonus", { seconds: 29 })).toBe("Golden bonus ×7: 29 s");
        expect(t("uk", "helper.robot.label", { count: 1, rate: 5 })).toBe(
          "Роботи: 1 (+5 за секунду)",
        );
        expect(t("en", "helper.factory.label", { count: 2, rate: 80 })).toBe(
          "Factories: 2 (+80 per second)",
        );
      });
    });

    describe("Scenario: Decimal formatting for the combo meter [unit]", () => {
      it("should format combo multipliers per language", () => {
        expect(formatNumber(1.5, "uk")).toBe("1,5");
        expect(formatNumber(1.9, "uk")).toBe("1,9");
        expect(formatNumber(1.5, "en")).toBe("1.5");
        expect(formatNumber(2, "uk")).toBe("2");
      });
    });
  });

  describe("Requirement: Translation function", () => {
    describe("Scenario: Plain lookup [unit]", () => {
      it("should look up mainButton.label in uk and en", () => {
        expect(t("uk", "mainButton.label")).toBe("Клік");
        expect(t("en", "mainButton.label")).toBe("Click");
      });
    });

    describe("Scenario: Interpolation [unit]", () => {
      it("should interpolate the {value} placeholder", () => {
        expect(t("en", "balance.ariaLabel", { value: "1,234" })).toBe("Balance: 1,234");
        expect(t("uk", "balance.ariaLabel", { value: 7 })).toBe("Баланс: 7");
      });
    });

    describe("Scenario: Missing param keeps placeholder [unit]", () => {
      it("should keep the placeholder when no param is given", () => {
        expect(t("en", "balance.ariaLabel")).toBe("Balance: {value}");
      });
    });
  });

  describe("Requirement: Number formatting", () => {
    describe("Scenario: Format numbers [unit]", () => {
      it("should group uk numbers with a no-break space", () => {
        expect(formatNumber(0, "uk")).toBe("0");
        expect(formatNumber(999, "uk")).toBe("999");
        expect(formatNumber(1234, "uk")).toBe(`1${NBSP}234`);
        expect(formatNumber(1234567, "uk")).toBe(`1${NBSP}234${NBSP}567`);
      });

      it("should group en numbers with a comma", () => {
        expect(formatNumber(1234, "en")).toBe("1,234");
        expect(formatNumber(1234567, "en")).toBe("1,234,567");
      });
    });
  });
});
