// 挂载原型扩展
import { mountAll } from './prototype/mount'
mountAll();

// 导入creep工作逻辑
import { doBuilder } from './roles/builder'
import { doHarvester } from './roles/harvester'
import { doUpgrader } from './roles/upgrader'
import { doPioneer } from './roles/pioneer'
import { doCarrier } from './roles/carrier'

global.doRoles = {}

doRoles.builder = doBuilder;
doRoles.harvester = doHarvester;
doRoles.upgrader = doUpgrader;
doRoles.pioneer = doPioneer;
doRoles.carrier = doCarrier;

// --------------------------------------------------

// 初始化
for (const room of _.values(Game.rooms)) {
    room.initMemory();
}

// 初始更新一次各房间creep配置
for (const room of _.values(Game.rooms)) {
    room.updateCreepConfig();
}

// --------------------------------------------------

export const loop = function () {

    // 检查CPU是否足够
    if (Game.time > 1000 && Game.cpu.bucket < 1.5 * Game.cpu.tickLimit && Game.cpu.bucket < Game.cpu.limit * 10) {
        console.log(`${Game.time} Skipping tick CPU Bucket too low. bucket: ${Game.cpu.bucket} tickLimit: ${Game.cpu.tickLimit} limit: ${Game.cpu.limit}`);
        return;
    }

    // 清理Memory
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }

    // 更新各房间creep配置
    if (Game.time % 200 === 0) {
        for (const room of _.values(Game.rooms)) {
            room.updateCreepConfig();
        }
    }

    // 统计creep数量，更新各房间spawnList
    const creepCountByBase = {};
    for (const creep of _.values(Game.creeps)) {
        const base = creep.memory.base;
        if (!creepCountByBase[base]) {
            creepCountByBase[base] = {};
        }
        if (!creepCountByBase[base][creep.memory.role]) {
            creepCountByBase[base][creep.memory.role] = 0;
        }
        creepCountByBase[base][creep.memory.role]++;
    }
    for (const room of _.values(Game.rooms)) {
        room.updateSpawnList(creepCountByBase[room.name] || {});
    }

    // 更新spawnIds信息，执行spawn逻辑
    // （由于没有creep的房间，建筑不会出现在Game.spawns等全局对象下，所以需要将spawn的name更新到memory中才能调用得到）
    for (const room of _.values(Game.rooms)) {
        room.memory.spawnIds = room.find(FIND_MY_SPAWNS).map(spawn => spawn.id);
    }
    for (const room of _.values(Game.rooms)) {
        const spawns = room.memory.spawnIds.map(id => Game.getObjectById(id));
        for (const spawn of spawns) {
            if (spawn) {
                spawn.trySpawn();
            }
        }
    }

    // 执行Tower逻辑
    for (const room of _.values(Game.rooms)) {
        room.executeTowers();
    }

    // 执行creep逻辑
    for (const creep of _.values(Game.creeps)) {
        if (creep.memory.role && doRoles[creep.memory.role]) {
            doRoles[creep.memory.role](creep);
        }
    }
}