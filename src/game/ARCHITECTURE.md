# МЕРЗЛОТА — архитектура движка

Код разбит на слои с односторонними зависимостями. Главное правило:
**симуляция ничего не знает об отрисовке, звуке и UI** — о происходящем
она сообщает событиями в `EventBus`. Это делает систему тестируемой и
готовой к мультиплееру (симуляция = «сервер», рендер = «клиент»).

```
                    ┌──────────────┐
        команды ──▶ │  Simulation  │ ── события ──┐
                    └──────────────┘              │
                     использует │                 ▼
        ┌─────────┬─────────┬───┴────┐     ┌────────────┐     ┌──────────┐
        │  world  │ enemies │  loot  │     │  Renderer  │     │   Game   │
        └─────────┴─────────┴────────┘     │ (canvas)   │     │ (звук,   │
                                           └────────────┘     │ камера,  │
                                                              │ HUD-хуки)│
                                                              └──────────┘
   core/ (Utils, Rng, EventBus, Constants)  — фундамент, без зависимостей
   engine/ (Input, Camera)                  — устройства ввода/взгляда
   systems/ (SaveStore, Difficulty, Sfx)    — сервисы
   data/ (items.js) + art/ (микромодули)    — контент и визуальные описания
```

## Карта модулей

| Слой | Файлы | Ответственность |
|---|---|---|
| core | `core/Utils.js`, `core/Rng.js`, `core/EventBus.js`, `core/Constants.js` | Утилиты, детерминированный РНГ, шина событий, тайлы |
| engine | `engine/Input.js`, `engine/Camera.js` | Команда игрока за кадр; камера + тряска |
| systems | `systems/Difficulty.js`, `systems/SaveStore.js`, `systems/Sfx.js` | Баланс (единый источник чисел), персистентность, звук |
| data | `data/items.js` | Реестр артефактов (одежда/оружие, тиры) |
| loot | `loot/Equipment.js`, `loot/RunLoot.js` | Diablo-экипировка (слоты, авто-надевание, выброс); раскладка лута по карте |
| world | `world/WorldMap.js`, `world/WorldGen.js` | Данные карты + пространственные запросы; процедурная генерация |
| sim | `sim/Simulation.js`, `sim/Player.js`, `sim/Pickup.js`, `sim/Orbs.js`, `sim/Entity.js` | Чистая игровая логика забега |
| sim/enemies | `Enemy.js` (базовый ИИ) + файлы видов + `registry.js` + `EnemyFactory.js` | Типы врагов и правила расселения |
| render | `Renderer.js`, `painters.js`, `TerrainPainter.js`, `Fx.js`, `Weather.js` | Вся отрисовка; эффекты-подписчики событий |
| art | `art/pixel.js`, `art/modules.js` | Микромодули пиксель-арта: палитра + кадры (сетки или Painter-код) |
| верх | `Game.js` | Тонкий оркестратор: цикл, события → звук/камера/HUD |

## Контракт событий (EventBus)

События шлёт `Simulation` (и только она):

| Событие | Полезная нагрузка | Реагируют |
|---|---|---|
| `run-start` | `{ map }` | — |
| `attack` | `{ x, y, angle, range }` | Renderer (дуга), Game (звук) |
| `hit` | `{ x, y, dmg }` | Renderer (кровь, число), Game (звук, хитстоп, тряска) |
| `kill` | `{ x, y, name, type }` | Renderer (взрыв, «ПАЛ»), Game (звук) |
| `hurt` | `{ x, y, dmg }` | Renderer (число, брызги), Game (звук, тряска, мигание экрана) |
| `cold-tick` | `{ x, y, amount, critical }` | Renderer (число, лёд), Game (треск) |
| `hole` | `{ x, y }` | Renderer (ледяные брызги), Game (звук, тряска) |
| `pickup` | `{ x, y, item, isNew, equipped, color, statText }` | Renderer (вспышка), Game (звук, тост, снапшот) |
| `orb` | `{ x, y, heat, hp }` | Renderer (числа, тепло), Game (звук) |
| `growl`, `heartbeat` | — | Game (звук) |
| `death` | `{ cause, time, kills }` | Game (звук, статистика, экран смерти) |
| `victory` | `{ time, kills }` | Game (звук, статистика, экран победы) |

## Как расширять

### Новый класс врага (механический, подземный…)
1. Создать `sim/enemies/DrillBot.js`: `export const def = { type, art, name, hp, speed, aggro, range, dmg, cd, scale, r, h, orbs }`
   и класс `extends Enemy` с переопределёнными хуками
   (`windupTime / strikeLunge / duringStrike / …`) либо собственным `update()`
   (рытьё под снегом, телепорт, стрельба — что угодно).
2. Добавить строку в `sim/enemies/registry.js`.
3. При желании — правила расселения в `EnemyFactory.js` и арт в `art/modules.js`.

### Лут
- Новые предметы: реестр `data/items.js` (+ `RUN_LOOT`) и микро-модуль арта.
- Новые правила (дроп с боссов, сундуки, редкости): `loot/RunLoot.js`.
- Новые слоты экипировки: ключ в `systems/SaveStore.js` (defaults.equipped)
  + `data/items.SLOT_NAMES`; `Equipment` работает по `item.slot` автоматически.

### Карта (on-demand, больше площадь, лабиринты, псевдо-3d)
- Данные и запросы (`get/set/collidesCircle/speedFactor/freeSpot`) — в
  `world/WorldMap.js`. Чанковая подгрузка реализуется внутри класса,
  потребители не меняются.
- Генераторы — `world/WorldGen.js`: новый генератор возвращает `WorldMap`.
- Всё визуальное про ландшафт — `render/TerrainPainter.js`.

### Сложность
- Все числа — `systems/Difficulty.js`. Новый профиль:
  `registerProfile("hard", { heat: { baseDrain: 3 }, enemies: { count: 60 } })`
  и выбор в `Game` (`getDifficulty(режим)`).

### Визуал
- Описание образов — микро-модули `art/modules.js` (палитра + кадры-сетки
  или Painter-функции; анимации по fps).
- Отрисовка сущностей — `render/painters.js`; ландшафт — `TerrainPainter.js`;
  отклик на события — подписки `Renderer.wireEvents`. Симуляцию трогать не надо.

### Мультиплеер
- Команды изолированы: `Input.readCommand()` → плоский объект →
  `Simulation.update(dt, cmd)`. Команда удалённого игрока — тот же объект
  из сети.
- `Simulation` не трогает DOM: её можно вынести в Web Worker или на сервер,
  рассылать снапшоты состояния + события; клиент — `Renderer` + подписки.
- Состояние мира детерминировано от сида (`mulberry32`) — клиенты могут
  строить карту локально по сиду сервера.
- `SaveStore` заменяется серверным адаптером с тем же интерфейсом.

## Цикл кадра (Game.frame)

```
dt → cmd = input.readCommand()
   → update(dt, cmd)        // меню / смерть / игра; hitstop
   → camera.update(dt)
   → renderer.render(sim, camera, dt)
   → sfx.setWind(...)       // непрерывные параметры
   → снапшот HUD (по таймеру 0.12 с + событийно)
```
