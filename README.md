# Cyberia

2D top-down выживание в постапокалиптическом киберпанк-мире сибирских пустошей.

## Системные требования

- **Node.js**: 18.0.0 или выше
- **ОС**: Windows 10/11, macOS, Linux
- **Браузер**: Chrome, Firefox, Edge (последние версии)

## Установка

### Windows 10/11

1. **Установите Node.js 18+** (если ещё не установлен)
   - Скачайте с [nodejs.org](https://nodejs.org/)
   - Выберите LTS версию (18.x или 20.x)
   - Установите, следуя инструкциям

2. **Откройте терминал** (PowerShell или Command Prompt)

3. **Перейдите в папку проекта**
   ```cmd
   cd C:\Work\cyberia
   ```

4. **Удалите старые зависимости** (если были проблемы)
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   ```

5. **Установите зависимости**
   ```cmd
   npm install
   ```

6. **Запустите dev-сервер**
   ```cmd
   npm run dev
   ```

7. **Откройте в браузере**
   - Перейдите по адресу: http://localhost:3000

## Команды

```bash
# Разработка (dev-сервер с hot reload)
npm run dev

# Production сборка
npm run build

# Предпросмотр production сборки
npm run preview

# Проверка типов TypeScript
npm run typecheck
```

## Production сборка

```bash
# Сборка проекта
npm run build

# Результат будет в папке dist/
# Загрузите файлы из dist/ на любой веб-сервер
```

## Структура проекта

```
cyberia/
├── src/
│   ├── game/           # Игровая логика
│   │   ├── core/       # Фундамент (Utils, Rng, EventBus, Constants)
│   │   ├── engine/     # Ввод и камера (Input, Camera)
│   │   ├── systems/    # Сервисы (Difficulty, SaveStore, Sfx)
│   │   ├── data/       # Контент (items.js)
│   │   ├── art/        # Визуальные описания (pixel.js, modules.js)
│   │   ├── loot/       # Экипировка (Equipment, RunLoot)
│   │   ├── world/      # Карта (tiles, WorldMap, WorldGen, CityGenerator)
│   │   ├── sim/        # Симуляция (Simulation, Movement, Player, Entity)
│   │   ├── sim/enemies/# Враги (6 типов + registry + factory)
│   │   ├── render/     # Отрисовка (Renderer, TerrainPainter, painters, Fx, Weather)
│   │   └── Game.js     # Оркестратор
│   ├── ui/             # React UI компоненты
│   ├── App.tsx         # Главный компонент
│   ├── main.tsx        # Entry point
│   └── index.css       # Стили
├── index.html          # HTML entry point
├── package.json        # Зависимости
├── vite.config.js      # Конфигурация Vite
├── tailwind.config.js  # Конфигурация Tailwind CSS
└── tsconfig.json       # Конфигурация TypeScript
```

## Решение проблем

### Ошибка CORS при открытии index.html напрямую

**Проблема**: Открываете `index.html` двойным кликом, видите ошибку CORS.

**Решение**: Используйте dev-сервер:
```bash
npm run dev
```
Затем откройте http://localhost:3000

### Ошибка нативных биндингов Tailwind

**Проблема**: `Cannot find native binding` при сборке.

**Решение**:
```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Порт 3000 занят

**Решение**: Измените порт в `vite.config.js`:
```javascript
server: {
  port: 3001,  // или любой другой свободный порт
}
```

### Медленная работа на Windows

**Решение**:
1. Добавьте папку проекта в исключения антивируса
2. Используйте PowerShell вместо Command Prompt
3. Убедитесь, что Node.js установлен в системную папку (не в пользовательскую)

## Технологии

- **React 18** - UI фреймворк
- **TypeScript** - Типизация
- **Vite** - Сборщик и dev-сервер
- **Tailwind CSS 3** - Стилизация
- **Canvas 2D** - Рендеринг игры
- **Web Audio API** - Звуковые эффекты

## Лицензия

MIT
