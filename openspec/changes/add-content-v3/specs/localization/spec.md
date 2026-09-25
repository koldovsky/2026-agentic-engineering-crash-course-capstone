# Spec Delta: localization

Stage 4 adds 92 keys (the video category, ten video items, three video UI strings, eight
achievements UI strings and sixty achievement names / descriptions) — **160 keys in total**, with no
existing value changed (the `reset.body` rewrite is unnecessary: with design D12 a reset behaves
exactly as the current copy says).

Scenario tags: `[unit]` = Vitest test in `lib/i18n/i18n.test.ts`.

## MODIFIED Requirements

### Requirement: Dictionaries with identical keys
There SHALL be exactly two dictionaries, `uk` and `en`, with identical key sets and no empty values.
They SHALL contain exactly these 160 keys with these values (rows 1–44: DECISION (confirmed),
add-shop-v1 design D18; rows 45–68: DECISION (confirmed), add-upgrades-v2 design D21; rows 69–160
added: DECISION (confirmed), design D19). No existing value changes in this stage. The Ukrainian
apostrophe is U+2019 (`’`). In Ukrainian copy a percent sign is separated from its number by a
no-break space U+00A0 (`5 %`, DECISION (confirmed)); English writes `5%`. `{price}`, `{count}`, `{rate}`, `{level}`, `{max}`, `{value}` and
`{seconds}` are interpolated already formatted with `formatNumber`.

| # | Key | uk | en |
|---|---|---|---|
| 1 | `mainButton.label` | `Клік` | `Click` |
| 2 | `balance.ariaLabel` | `Баланс: {value}` | `Balance: {value}` |
| 3 | `theme.switchToDark` | `Увімкнути темну тему` | `Switch to dark theme` |
| 4 | `theme.switchToLight` | `Увімкнути світлу тему` | `Switch to light theme` |
| 5 | `language.short` | `УКР` | `ENG` |
| 6 | `language.switch` | `Змінити мову на англійську` | `Switch language to Ukrainian` |
| 7 | `reset.button` | `Скинути прогрес` | `Reset progress` |
| 8 | `reset.title` | `Скинути весь прогрес?` | `Reset all progress?` |
| 9 | `reset.body` | `Баланс, кліки й покупки буде обнулено. Тема й мова залишаться.` | `Your balance, clicks and purchases will be reset. Theme and language stay.` |
| 10 | `reset.confirm` | `Скинути` | `Reset` |
| 11 | `reset.cancel` | `Скасувати` | `Cancel` |
| 12 | `shop.title` | `Магазин` | `Shop` |
| 13 | `shop.category.skins` | `Скіни` | `Skins` |
| 14 | `shop.category.decor` | `Декор` | `Decor` |
| 15 | `shop.category.upgrades` | `Покращення` | `Upgrades` |
| 16 | `shop.buy` | `Купити за {price}` | `Buy for {price}` |
| 17 | `shop.owned` | `Куплено` | `Owned` |
| 18 | `shop.requires` | `Потрібно: {item}` | `Requires: {item}` |
| 19 | `shop.count` | `Маєте: {count}` | `Owned: {count}` |
| 20 | `skin.on` | `Увімкнено` | `On` |
| 21 | `skin.off` | `Вимкнено` | `Off` |
| 22 | `item.soft-shadow.name` | `М’яка тінь` | `Soft shadow` |
| 23 | `item.soft-shadow.description` | `Тінь, що глибшає під курсором і при натисканні` | `A shadow that deepens on hover and press` |
| 24 | `item.squish.name` | `Желе` | `Squish` |
| 25 | `item.squish.description` | `Кнопка сплющується й пружинить після кліку` | `Jelly-like squash and spring-back on click` |
| 26 | `item.floating-number.name` | `Спливаючі +N` | `Floating +N` |
| 27 | `item.floating-number.description` | `Зароблене спливає від курсора й тане` | `The earned amount floats up from the cursor and fades` |
| 28 | `item.jumping-cap.name` | `Кепка-стрибунець` | `Jumping cap` |
| 29 | `item.jumping-cap.description` | `Кепка на кнопці підстрибує з кожним кліком` | `A cap sits on the button and hops on each click` |
| 30 | `item.gold.name` | `Золото` | `Gold` |
| 31 | `item.gold.description` | `Металева золота поверхня` | `Metallic gold surface` |
| 32 | `item.sleeping-cat.name` | `Сплячий кіт` | `Sleeping cat` |
| 33 | `item.sleeping-cat.description` | `Кіт повільно дихає, часом ворушить вухами` | `A cat that slowly breathes, ears twitch now and then` |
| 34 | `item.lava-lamp.name` | `Лава-лампа` | `Lava lamp` |
| 35 | `item.lava-lamp.description` | `Краплі воску здіймаються й зливаються` | `Blobs rising and merging` |
| 36 | `item.hydraulic-press.name` | `Гідравлічний прес` | `Hydraulic press` |
| 37 | `item.hydraulic-press.description` | `Прес повільно чавить нескінченну низку предметів` | `A press slowly crushing an endless line of objects` |
| 38 | `item.double-click.name` | `Подвійний клік` | `Double click` |
| 39 | `item.double-click.description` | `Кожен клік приносить ×2` | `Each click is worth ×2` |
| 40 | `item.triple-click.name` | `Потрійний клік` | `Triple click` |
| 41 | `item.triple-click.description` | `Кожен клік приносить ×3 (замість ×2)` | `Each click is worth ×3 (replaces ×2)` |
| 42 | `item.monkey.name` | `Мавпочка` | `Monkey` |
| 43 | `item.monkey.description` | `Сама тисне свою кнопку: 1 клік за секунду` | `Presses its own button: 1 click per second` |
| 44 | `helper.monkey.label` | `Мавпочки: {count} (+{rate} за секунду)` | `Monkeys: {count} (+{rate} per second)` |
| 45 | `item.crit.name` | `Крит` | `Crit` |
| 46 | `item.crit.description` | `Шанс, що клік зарахується ×10: 5 % → 10 % → 15 %` | `Chance for a click to count ×10: 5% → 10% → 15%` |
| 47 | `item.combo.name` | `Комбо` | `Combo` |
| 48 | `item.combo.description` | `Швидкі кліки поспіль піднімають множник до ×2; на паузі він спадає` | `Fast clicks in a row build a multiplier up to ×2; it fades when you pause` |
| 49 | `item.golden-button.name` | `Золота кнопка` | `Golden button` |
| 50 | `item.golden-button.description` | `Часом з’являється на кілька секунд: злови — і 30 с кліки ×7` | `Appears now and then for a few seconds: catch it for 30 s of ×7 clicks` |
| 51 | `item.robot.name` | `Робот` | `Robot` |
| 52 | `item.robot.description` | `Сам тисне свою кнопку: 5 кліків за секунду` | `Presses its own button: 5 clicks per second` |
| 53 | `item.factory.name` | `Фабрика` | `Factory` |
| 54 | `item.factory.description` | `Сама тисне свою кнопку: 40 кліків за секунду` | `Presses its own button: 40 clicks per second` |
| 55 | `item.speed-monkey.name` | `Прискорення мавпочок` | `Monkey speed-up` |
| 56 | `item.speed-monkey.description` | `Мавпочки клікають удвічі швидше за кожен рівень` | `Monkeys click twice as fast per level` |
| 57 | `item.speed-robot.name` | `Прискорення роботів` | `Robot speed-up` |
| 58 | `item.speed-robot.description` | `Роботи клікають удвічі швидше за кожен рівень` | `Robots click twice as fast per level` |
| 59 | `item.speed-factory.name` | `Прискорення фабрик` | `Factory speed-up` |
| 60 | `item.speed-factory.description` | `Фабрики клікають удвічі швидше за кожен рівень` | `Factories click twice as fast per level` |
| 61 | `shop.level` | `Рівень {level} з {max}` | `Level {level} of {max}` |
| 62 | `shop.maxed` | `Максимальний рівень` | `Max level` |
| 63 | `helper.robot.label` | `Роботи: {count} (+{rate} за секунду)` | `Robots: {count} (+{rate} per second)` |
| 64 | `helper.factory.label` | `Фабрики: {count} (+{rate} за секунду)` | `Factories: {count} (+{rate} per second)` |
| 65 | `crit.text` | `КРИТ ×10!` | `CRIT ×10!` |
| 66 | `combo.label` | `Комбо ×{value}` | `Combo ×{value}` |
| 67 | `golden.catch` | `Зловити золоту кнопку` | `Catch the golden button` |
| 68 | `golden.bonus` | `Золотий бонус ×7: {seconds} с` | `Golden bonus ×7: {seconds} s` |
| 69 | `shop.category.video` | `Відео` | `Video` |
| 70 | `item.video-runner.name` | `Нескінченний ранер` | `Endless runner` |
| 71 | `item.video-runner.description` | `Довгий геймплей у фоні` | `A long gameplay loop in the background` |
| 72 | `item.video-parkour.name` | `Паркур` | `Parkour` |
| 73 | `item.video-parkour.description` | `Стрибки по блоках без кінця` | `Endless block-hopping` |
| 74 | `item.video-soap.name` | `Різання мила` | `Soap cutting` |
| 75 | `item.video-soap.description` | `Гіпнотичні нарізки мила` | `Hypnotic soap-cutting loops` |
| 76 | `item.video-kinetic-sand.name` | `Кінетичний пісок` | `Kinetic sand` |
| 77 | `item.video-kinetic-sand.description` | `Ніж ріже кольоровий пісок` | `A knife slicing colourful sand` |
| 78 | `item.video-slime.name` | `Слайм` | `Slime` |
| 79 | `item.video-slime.description` | `Повільне місіння слайму` | `Slow slime mixing` |
| 80 | `item.video-hydraulic.name` | `Прес у відео` | `Press on video` |
| 81 | `item.video-hydraulic.description` | `Прес чавить усе підряд` | `A press crushing one thing after another` |
| 82 | `item.video-marble.name` | `Мармурові доріжки` | `Marble run` |
| 83 | `item.video-marble.description` | `Кульки котяться нескінченним треком` | `Marbles rolling down an endless track` |
| 84 | `item.video-aquarium.name` | `Акваріум` | `Aquarium` |
| 85 | `item.video-aquarium.description` | `Риби плавають за склом` | `Fish swimming behind glass` |
| 86 | `item.video-fireplace.name` | `Камін` | `Fireplace` |
| 87 | `item.video-fireplace.description` | `Дрова тріщать у вогні` | `Logs crackling in the fire` |
| 88 | `item.video-rain.name` | `Дощ у вікні` | `Rain on a window` |
| 89 | `item.video-rain.description` | `Краплі стікають по склу` | `Drops running down the glass` |
| 90 | `video.label` | `Відео: {name}` | `Video: {name}` |
| 91 | `video.offline` | `Відео недоступне без мережі` | `Video unavailable offline` |
| 92 | `video.play` | `Увімкнути відео` | `Play video` |
| 93 | `achievements.open` | `Досягнення` | `Achievements` |
| 94 | `achievements.title` | `Досягнення` | `Achievements` |
| 95 | `achievements.close` | `Закрити` | `Close` |
| 96 | `achievements.count` | `Відкрито {unlocked} з {total}` | `{unlocked} of {total} unlocked` |
| 97 | `achievements.locked` | `Закрито` | `Locked` |
| 98 | `achievements.unlocked` | `Відкрито` | `Unlocked` |
| 99 | `achievements.progress` | `{current} / {goal}` | `{current} / {goal}` |
| 100 | `achievements.toast` | `Досягнення: {name}` | `Achievement: {name}` |
| 101 | `achievement.first-click.name` | `Перший клік` | `First click` |
| 102 | `achievement.first-click.description` | `Зроби один клік` | `Make one click` |
| 103 | `achievement.clicks-100.name` | `Сотня` | `Hundred` |
| 104 | `achievement.clicks-100.description` | `Набери 100 кліків усього` | `Reach 100 total clicks` |
| 105 | `achievement.clicks-1000.name` | `Тисяча` | `Thousand` |
| 106 | `achievement.clicks-1000.description` | `Набери 1 000 кліків усього` | `Reach 1,000 total clicks` |
| 107 | `achievement.clicks-10000.name` | `Десять тисяч` | `Ten thousand` |
| 108 | `achievement.clicks-10000.description` | `Набери 10 000 кліків усього` | `Reach 10,000 total clicks` |
| 109 | `achievement.clicks-100000.name` | `Сто тисяч` | `Hundred thousand` |
| 110 | `achievement.clicks-100000.description` | `Набери 100 000 кліків усього` | `Reach 100,000 total clicks` |
| 111 | `achievement.balance-1000.name` | `Скарбничка` | `Piggy bank` |
| 112 | `achievement.balance-1000.description` | `Май 1 000 кліків на балансі` | `Hold 1,000 clicks in your balance` |
| 113 | `achievement.balance-50000.name` | `Сейф` | `Vault` |
| 114 | `achievement.balance-50000.description` | `Май 50 000 кліків на балансі` | `Hold 50,000 clicks in your balance` |
| 115 | `achievement.first-purchase.name` | `Перша покупка` | `First purchase` |
| 116 | `achievement.first-purchase.description` | `Купи будь-що в магазині` | `Buy anything in the shop` |
| 117 | `achievement.purchases-10.name` | `Колекціонер` | `Collector` |
| 118 | `achievement.purchases-10.description` | `Зроби 10 покупок` | `Make 10 purchases` |
| 119 | `achievement.purchases-25.name` | `Шопоголік` | `Shopaholic` |
| 120 | `achievement.purchases-25.description` | `Зроби 25 покупок` | `Make 25 purchases` |
| 121 | `achievement.skins-3.name` | `Модник` | `Trendsetter` |
| 122 | `achievement.skins-3.description` | `Май 3 скіни` | `Own 3 skins` |
| 123 | `achievement.skins-all.name` | `Повна шафа` | `Full wardrobe` |
| 124 | `achievement.skins-all.description` | `Май усі 5 скінів` | `Own all 5 skins` |
| 125 | `achievement.gold-equipped.name` | `Золота лихоманка` | `Gold rush` |
| 126 | `achievement.gold-equipped.description` | `Увімкни золотий матеріал` | `Equip the gold material` |
| 127 | `achievement.first-decor.name` | `Затишок` | `Cosy` |
| 128 | `achievement.first-decor.description` | `Купи перший декор` | `Buy your first decoration` |
| 129 | `achievement.decor-all.name` | `Дизайнер` | `Designer` |
| 130 | `achievement.decor-all.description` | `Купи всі 3 декори` | `Buy all 3 decorations` |
| 131 | `achievement.cat-nap.name` | `Котосон` | `Cat nap` |
| 132 | `achievement.cat-nap.description` | `Купи сплячого кота` | `Buy the sleeping cat` |
| 133 | `achievement.first-video.name` | `Фоновий режим` | `Background mode` |
| 134 | `achievement.first-video.description` | `Купи перше відео` | `Buy your first video` |
| 135 | `achievement.videos-all.name` | `Марафон` | `Marathon` |
| 136 | `achievement.videos-all.description` | `Купи всі 10 відео` | `Buy all 10 videos` |
| 137 | `achievement.first-helper.name` | `Не сам` | `Not alone` |
| 138 | `achievement.first-helper.description` | `Купи першого помічника` | `Buy your first helper` |
| 139 | `achievement.helpers-10.name` | `Бригада` | `Crew` |
| 140 | `achievement.helpers-10.description` | `Май 10 помічників` | `Own 10 helpers` |
| 141 | `achievement.factory-owner.name` | `Промисловість` | `Industry` |
| 142 | `achievement.factory-owner.description` | `Май хоча б одну фабрику` | `Own at least one factory` |
| 143 | `achievement.first-crit.name` | `Критичний удар` | `Critical hit` |
| 144 | `achievement.first-crit.description` | `Зроби перший крит` | `Land your first crit` |
| 145 | `achievement.crits-100.name` | `Сотня критів` | `Hundred crits` |
| 146 | `achievement.crits-100.description` | `Зроби 100 критів` | `Land 100 crits` |
| 147 | `achievement.combo-5.name` | `Розігрів` | `Warm-up` |
| 148 | `achievement.combo-5.description` | `Набери комбо ×1,5` | `Reach a ×1.5 combo` |
| 149 | `achievement.combo-max.name` | `Максимальне комбо` | `Max combo` |
| 150 | `achievement.combo-max.description` | `Набери комбо ×2` | `Reach a ×2 combo` |
| 151 | `achievement.first-golden.name` | `Золота мить` | `Golden moment` |
| 152 | `achievement.first-golden.description` | `Злови золоту кнопку` | `Catch a golden button` |
| 153 | `achievement.golden-10.name` | `Золотошукач` | `Gold digger` |
| 154 | `achievement.golden-10.description` | `Злови 10 золотих кнопок` | `Catch 10 golden buttons` |
| 155 | `achievement.reset-once.name` | `З чистого аркуша` | `Clean slate` |
| 156 | `achievement.reset-once.description` | `Скинь прогрес один раз` | `Reset your progress once` |
| 157 | `achievement.achievements-10.name` | `Десятка` | `Ten of them` |
| 158 | `achievement.achievements-10.description` | `Відкрий 10 досягнень` | `Unlock 10 achievements` |
| 159 | `achievement.achievements-all.name` | `Повна колекція` | `Full collection` |
| 160 | `achievement.achievements-all.description` | `Відкрий усі інші досягнення` | `Unlock every other achievement` |

#### Scenario: Key parity [unit]
- **WHEN** the key sets of `uk` and `en` are compared (sorted)
- **THEN** they are identical

#### Scenario: No empty values [unit]
- **WHEN** every value of `uk` and `en` is checked
- **THEN** each is a string with `trim().length > 0`

#### Scenario: Required Stage 1 keys and copy [unit]
- **WHEN** the dictionaries are read
- **THEN** the key set of each equals exactly the 160 keys in the table above
- **AND** `uk["mainButton.label"]` is `Клік` and `en["mainButton.label"]` is `Click`
- **AND** `uk["reset.button"]` is `Скинути прогрес` and `en["reset.button"]` is `Reset progress`
- **AND** `uk["reset.body"]` is `Баланс, кліки й покупки буде обнулено. Тема й мова залишаться.`

#### Scenario: Every shop item has a name and description [unit]
- **WHEN** for each of the 29 catalog ids (`SHOP_CATALOG.map((i) => i.id)`) the keys `item.<id>.name` and `item.<id>.description` are looked up with `t` in `uk` and `en`
- **THEN** all 116 lookups return the values from the table above and none is empty

#### Scenario: Every achievement has a name and description [unit]
- **WHEN** for each of the 30 ids in `ACHIEVEMENTS.map((a) => a.id)` the keys `achievement.<id>.name` and `achievement.<id>.description` are looked up with `t` in `uk` and `en`
- **THEN** all 120 lookups return the values from the table above and none is empty
- **AND** `t("uk", "achievement.cat-nap.name")` is `Котосон`, `t("en", "achievement.cat-nap.description")` is `Buy the sleeping cat`, `t("uk", "achievement.achievements-all.description")` is `Відкрий усі інші досягнення`

#### Scenario: Stage 4 copy and interpolation [unit]
- **WHEN** `t("uk", "shop.category.video")`, `t("en", "shop.category.video")`, `t("uk", "video.offline")`, `t("en", "video.play")`, `t("uk", "video.label", { name: "Камін" })`, `t("en", "achievements.count", { unlocked: 5, total: 30 })`, `t("uk", "achievements.count", { unlocked: "5", total: "30" })`, `t("uk", "achievements.toast", { name: "Перший клік" })`, `t("en", "achievements.progress", { current: "1,000", goal: "10,000" })` are called
- **THEN** the results are `Відео`, `Video`, `Відео недоступне без мережі`, `Play video`, `Відео: Камін`, `5 of 30 unlocked`, `Відкрито 5 з 30`, `Досягнення: Перший клік`, `1,000 / 10,000`

#### Scenario: Ukrainian achievement copy uses no-break spaces in numbers [unit]
- **WHEN** `t("uk", "achievement.clicks-1000.description")` and `t("uk", "achievement.balance-50000.description")` are read
- **THEN** they are `"Набери 1\u00A0000 кліків усього"` and `"Май 50\u00A0000 кліків на балансі"` (the thousands separator is U+00A0, never U+0020)
- **AND** `t("en", "achievement.clicks-1000.description")` is `Reach 1,000 total clicks`

#### Scenario: Stage 3 copy [unit]
- **WHEN** `t` is called for keys 61–68 of the table without params in `uk` and `en`
- **THEN** each result equals the table value (placeholders kept), e.g. `t("uk", "crit.text")` is `КРИТ ×10!`, `t("en", "shop.maxed")` is `Max level`

#### Scenario: Shop interpolation [unit]
- **WHEN** `t("uk", "shop.buy", { price: "1 500" })`, `t("en", "shop.buy", { price: "1,500" })`, `t("uk", "shop.requires", { item: "Подвійний клік" })`, `t("en", "helper.monkey.label", { count: 3, rate: 3 })` are called
- **THEN** the results are `Купити за 1 500`, `Buy for 1,500`, `Потрібно: Подвійний клік`, `Monkeys: 3 (+3 per second)`

#### Scenario: Percentages use a no-break space in Ukrainian [unit]
- **WHEN** `t("uk", "item.crit.description")` and `t("en", "item.crit.description")` are read
- **THEN** the Ukrainian text is `"Шанс, що клік зарахується ×10: 5\u00A0% → 10\u00A0% → 15\u00A0%"` (each `%` preceded by U+00A0, never by U+0020 or directly by a digit)
- **AND** the English text is `"Chance for a click to count ×10: 5% → 10% → 15%"`

#### Scenario: Stage 3 interpolation [unit]
- **WHEN** `t("uk", "shop.level", { level: 1, max: 3 })`, `t("en", "shop.level", { level: 3, max: 3 })`, `t("uk", "combo.label", { value: "1,5" })`, `t("en", "combo.label", { value: "2" })`, `t("uk", "golden.bonus", { seconds: 30 })`, `t("en", "golden.bonus", { seconds: 29 })`, `t("uk", "helper.robot.label", { count: 1, rate: 5 })`, `t("en", "helper.factory.label", { count: 2, rate: 80 })` are called
- **THEN** the results are `Рівень 1 з 3`, `Level 3 of 3`, `Комбо ×1,5`, `Combo ×2`, `Золотий бонус ×7: 30 с`, `Golden bonus ×7: 29 s`, `Роботи: 1 (+5 за секунду)`, `Factories: 2 (+80 per second)`

#### Scenario: Decimal formatting for the combo meter [unit]
- **WHEN** `formatNumber(1.5, "uk")`, `formatNumber(1.9, "uk")`, `formatNumber(1.5, "en")`, `formatNumber(2, "uk")` are called
- **THEN** the results are `"1,5"`, `"1,9"`, `"1.5"`, `"2"`

## MODIFIED Requirements

### Requirement: Three video names change
Rows 82–87 of the Stage 4 copy table are replaced (design D24). Key count stays 162.

| Key | uk | en |
|---|---|---|
| `item.video-music.name` | Музика Експедиції | Expedition music |
| `item.video-music.description` | Тиха музика табору | Quiet camp music |
| `item.video-trailer.name` | Трейлер Експедиції 33 | Expedition 33 trailer |
| `item.video-trailer.description` | Трейлер запуску гри | The game's launch trailer |
| `item.video-combat.name` | Бій Експедиції 33 | Expedition 33 combat |
| `item.video-combat.description` | Посібник з бою для новачків | A beginner's combat guide |

`item.video-marble.*`, `item.video-aquarium.*`, and `item.video-fireplace.*` are removed. Item ids in catalog order put `video-music` first among videos, then the six unchanged videos, then `video-trailer`, `video-combat`, `video-rain`, `video-seal`.
