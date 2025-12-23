# myscreeps

automated(intended) scripts for game [screeps](https://screeps.com/)

## 所需环境:

```
nodejs
```

## build:

```
npm run build
```

## 输出：

```
dist/main.js
```

---

## Memory中额外维护了以下几个内容：

Memory.rooms[roomName]

    .spawnList: 生成列表

    .creepConfig: 配置该房间spawn需要负责的creep职业、身材、数量

    .source: 该房间sourceId，以及对应的周围有几个空位可供开采

    .spawnId: spawnId

    .autoPlan: 自动规划的结果，结构为[]，每项包含三个字段{pos: {x:x, y:y}, type: STRUCTURE_*, rcl: [1-8]}

Memory.creeps[creepName]

    .role: creep职业

    .base: creep来自于哪个房间(roomName)

    .targetSourceId: 不是所有creep都有，表明该creep要去哪个source采集

    .workingState: 状态机

    .workingPlace：对于某些creep，要指定他们的工作位置（如不带carry的harvester），存储x, y, roomName

## TODO

LINK
LAB
MINERAL
STORAGE
TERMINAL
FACTORY
OBSERVER
PS
NUKER

AUTOPLANNING