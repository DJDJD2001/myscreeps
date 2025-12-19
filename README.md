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

Memory.rooms[roomName]      .spawnList: 生成列表
                            .creepConfig: 配置该房间spawn需要负责的creep职业、身材、数量
                            .source: 该房间sourceId，以及对应的周围有几个空位可供开采
                            .spawnId: spawnId
Memory.creeps[creepName]    .role: creep职业
                            .base: creep来自于哪个房间(roomName)
                            .targetSourceId: 不是所有creep都有，表明该creep要去哪个source采集
                            .workingState: 状态机