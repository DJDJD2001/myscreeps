// 挂载原型扩展
require('./prototype/mount')()

// 导入creep工作逻辑
import { doBuilder } from './roles/builder'
import { doHarvester } from './roles/harvester'
import { doUpgrader } from './roles/upgrader'
import { doPioneer } from './roles/pioneer'
import { doCarrier } from './roles/carrier'

// 初始化
for (var room in Game.rooms) {
    Game.rooms[room].initMemory();
}

export const loop = function () {

    // 检查CPU是否足够
    if (Game.time > 1000 && Game.cpu.bucket < 1.5 * Game.cpu.tickLimit && Game.cpu.bucket < Game.cpu.limit * 10) {
        console.log(`${Game.time} Skipping tick CPU Bucket too low. bucket: ${Game.cpu.bucket} tickLimit: ${Game.cpu.tickLimit} limit: ${Game.cpu.limit}`);
        return;
    }

    // 更新各房间creep配置
    if (Game.time % 200 === 0) {
        for (var room in Game.rooms) {
            Game.rooms[room].updateCreepConfig();
        }
    }
    
    // 统计creep数量
    const creepCountByBase = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const base = creep.memory.base;
        if (!creepCountByBase[base]) {
            creepCountByBase[base] = {};
        }
        if (!creepCountByBase[base][creep.memory.role]) {
            creepCountByBase[base][creep.memory.role] = 0;
        }
        creepCountByBase[base][creep.memory.role]++;
    }

    // 维护各房间spawnList
    for (var room in Game.rooms) {
        Game.rooms[room].updateSpawnList(creepCountByBase[room] || {});
    }

    // 执行spawn逻辑
    for (var spawn in Game.spawns) {
        Game.spawns[spawn].trySpawn();
    }

    // 执行creep逻辑
    for (var name in Game.creeps) {
        const creep = Game.creeps[name];
        switch (creep.memory.role) {
            case 'builder':
                doBuilder(creep);
                break;
            case 'harvester':
                doHarvester(creep);
                break;
            case 'upgrader':
                doUpgrader(creep);
                break;
            case 'pioneer':
                doPioneer(creep);
                break;
            case 'carrier':
                doCarrier(creep);
                break;
            default:
                console.log(`Unknown role ${creep.memory.role} for creep ${creep.name}`);
                break;
        }
    }
}