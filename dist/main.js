'use strict';

const mountCreepPrototype = function () {
    _.assign(Creep.prototype, extensions$3);
};

const extensions$3 = {

};

const mountRoomPositionPrototype = function () {
    _.assign(RoomPosition.prototype, extensions$2);
};

const extensions$2 = {
    /**
     * 查看该位置周围一圈的可用地块数量（非墙）
     * @return {number} 可用地块数量
     */
    lookForAvailableAdjacentCount() {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = this.x + dx;
                const y = this.y + dy;
                if (x < 0 || x >= 50 || y < 0 || y >= 50) continue;
                const terrain = Game.rooms[this.roomName].getTerrain().get(x, y);
                if (terrain !== TERRAIN_MASK_WALL) {
                    count++;
                }
            }
        }
        return count;
    }
};

const mountSpawnPrototype = function () {
    _.assign(Spawn.prototype, extensions$1);
};

const extensions$1 = {
    /**
     * 尝试生成 spawnList 中的第一个 creep, 如果成功则从列表中移除
     * @return {number} 生成结果
     */
    trySpawn() {
        if (this.spawning 
            || !this.room.memory.spawnList 
            || this.room.memory.spawnList.length === 0
        ) {
            return OK;
        }
        const ifspawnSuccess = this.spawnCreep(
            this.room.memory.spawnList[0].body,
            this.room.memory.spawnList[0].name,
            this.room.memory.spawnList[0].opts
        );
        if (ifspawnSuccess === OK) {
            this.room.memory.spawnList.shift();
        }
        return ifspawnSuccess;
    },
};

const mountRoomPrototype = function () {
    _.assign(Room.prototype, extensions);
};

const extensions = {
    /**
     * 初始化Memory
     * @return {void}
     */
    initMemory() {
        if (!this.memory.source) {
            this.memory.source = this.find(FIND_SOURCES).map(source => {
                return {
                    id: source.id, 
                    count: source.pos.lookForAvailableAdjacentCount()
                };
            });
        }
        if (!this.memory.spawnList) {
            this.memory.spawnList = [];
        }
        if (!this.memory.creepConfig) {
            this.memory.creepConfig = {};
        }
    },

    /**
     * 更新房间内各类 creep 数量及配件配置
     * @param {Object} additionalCreep 额外添加的 creep 配置（数量及配件）格式 { creepType: { body: [...], num: x }, ... }
     * @return {void}
     */
    updateCreepConfig(additionalCreep = {}) {
        // 获取基本信息
        this.controller.level;
        const maxCost = this.energyCapacityAvailable;

        // 获取建筑信息
        const sources = this.memory.source;
        const sourceCount = sources.length;
        const sourceAccessableCount = sources.map(s => s.count); // 每个source周围可供采集的地块数量

        const containerCount = this.find(FIND_MY_STRUCTURES, {
            filter: {structureType: STRUCTURE_CONTAINER}
        }).length;

        // 根据可用能量更新creep配置
        // 仅前期使用，固定250 cost
        const pioneerBody = [MOVE, MOVE, WORK, CARRY]; 
        
        // 固定1个CARRY，其余能量用于WORK和MOVE，WORK+CARRY:MOVE=2:1（默认pioneer已经把路修好了）
        const upgraderBody = [];
        upgraderBody.push(WORK, CARRY, MOVE);
        let remainingEnergy = maxCost - 200;
        while (remainingEnergy >= 250) {
            upgraderBody.push(WORK, WORK, MOVE);
            remainingEnergy -= 250;
        }
        
        // 0 CARRY, WORK:MOVE=2:1（默认pioneer已经把路和container修好了）
        const harvesterBody = [];
        if (maxCost >= 750) {
            // 再多也没意义，此时可以省掉CARRY，让harvester坐在container上
            harvesterBody.push(WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE);
        } else {
            harvesterBody.push(WORK, CARRY, MOVE);
            let harvesterEnergy = maxCost - 200;
            while (harvesterEnergy >= 250) {
                harvesterBody.push(WORK, WORK, MOVE);
                harvesterEnergy -= 250;
            }
        }

        // WORK:CARRY:MOVE=1:1:2，修建筑修墙，不一定走路
        const builderBody = [];
        let builderEnergy = maxCost;
        while (builderEnergy >= 300) {
            builderBody.push(WORK, CARRY, MOVE, MOVE);
            builderEnergy -= 300;
        }

        // CARRY:MOVE=2:1，最大500容量（默认路已经修好了）
        const carrierBody = [];
        if (maxCost >= 750) {
            carrierBody.push(CARRY, CARRY, CARRY, CARRY, CARRY,
                             CARRY, CARRY, CARRY, CARRY, CARRY,
                             MOVE,  MOVE,  MOVE,  MOVE,  MOVE);
        } else {
            let carrierEnergy = maxCost;
            while (carrierEnergy >= 150) {
                carrierBody.push(CARRY, CARRY, MOVE);
                carrierEnergy -= 150;
            }
        }

        // 判断数量
        let pioneerNum = 0;
        let upgraderNum = 0;
        let harvesterNum = 0;
        let builderNum = 0;
        let carrierNum = 0;
        if (maxCost < 450 || containerCount < sourceCount) {
            // maxCost不够或container没修完时，只生成pioneer，填满每个source周围的可用地块再+3
            pioneerNum = sourceAccessableCount.reduce((a, b) => a + b, 0) + 3;
        } else {
            // harvester根据source数量决定
            // 对每个source，拉满效率需要5个WORK，但由于sourceAccessableCount有限
            // 计算出source拉满需要多少harvester，取这个值和sourceAccessableCount的较小值
            for (const s of sources) {
                harvesterNum += Math.min(Math.ceil(5 / harvesterBody.filter(part => part === WORK).length), s.count);
            }

            // carrier与source数量相同
            carrierNum = sourceCount;

            // upgrader与source数量相同
            upgraderNum = sourceCount;

            // builder固定2个
            builderNum = 2;
        }

        // 写入memory并合并额外配置
        this.memory.creepConfig = {
            pioneer: {
                body: pioneerBody,
                num: pioneerNum,
            },
            upgrader: {
                body: upgraderBody,
                num: upgraderNum,
            },
            harvester: {
                body: harvesterBody,
                num: harvesterNum,
            },
            builder: {
                body: builderBody,
                num: builderNum,
            },
            carrier: {
                body: carrierBody,
                num: carrierNum,
            },
            ...additionalCreep,
        };
    },

    /**
     * 维护 spawnList
     * @param {Object} creepList 现有的creep列表，格式 { role: number, ... }
     * @return {void}
     */
    updateSpawnList(creepList = {}) {
        if (!this.memory.creepConfig) {
            return;
        }
        for (const role in this.memory.creepConfig) {
            existingCreepNum = creepList[role] || 0;
            const existNum = existingCreepNum + this.memory.spawnList.filter(creep => creep.opts.memory.role === role).length;
            const desiredNum = this.memory.creepConfig[role].num;
            if (existNum < desiredNum) {
                this.memory.spawnList.push({
                    body: this.memory.creepConfig[role].body,
                    name: '' + Game.time,
                    opts: {
                        memory: {
                            role: role,
                            base: this.name,
                        }
                    }
                });
                console.log(`Room ${this.name} added ${role} to spawnList. Current: ${existNum}, Desired: ${desiredNum}`);
            }
        }
    },

    /**
     * 更新房间内spawnId到memory中
     * @return {void}
     */
    updateSpawnInfo() {
        const mySpawns = this.find(FIND_MY_SPAWNS);
        this.memory.spawnIds = mySpawns.map(spawn => spawn.id);
    },
};

/**
 * 挂载所有原型扩展
 */
const mountAll = function () {
    mountCreepPrototype();
    mountRoomPositionPrototype();
    mountSpawnPrototype();
    mountRoomPrototype();
};

/**
 * pioneer只在初期（没有container和足够的extension时）使用，负责以下工作：
 * 1. 采集能量
 * 2. 搬运能量到spawn或extension
 * 3. 修建construction site
 * 4. 升级控制器
 * @param {*} creep 
 */
const doPioneer = function (creep) {

    // 分配source：用正确的迭代方式并增加空检查，避免访问 undefined
    if (!creep.memory.targetSourceId) {
        const sourceCountById = {};
        const creepsInMyRoom = creep.room.find(FIND_MY_CREEPS);
        for (const other of creepsInMyRoom) {
            if (!other || !other.memory) continue;
            const otherSourceId = other.memory.targetSourceId;
            if (otherSourceId) {
                sourceCountById[otherSourceId] = (sourceCountById[otherSourceId] || 0) + 1;
            }
        }

        // 根据room.memory.source.id选择source
        const source = creep.room.memory.source;
        for (const s of source) {
            const count = sourceCountById[s.id] || 0;
            if (count < s.count) {
                creep.memory.targetSourceId = s.id;
                break;
            }
        }
    }

    // 状态机：
    // 1. 如果没有携带能量，去采集
    // 2. 如果能量采满，按照优先级执行：搬运-修建-升级
    if (creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.workingState = 'harvesting';
    } else if (creep.store.getFreeCapacity() === 0) {
        creep.memory.workingState = 'working';
    }

    // 执行逻辑
    if (creep.memory.workingState === 'harvesting') {
        const source = Game.getObjectById(creep.memory.targetSourceId);
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            creep.say('⛏️');
        }
    } else if (creep.memory.workingState === 'working') {
        // 优先搬运能量到spawn或extension
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_SPAWN 
                        || structure.structureType === STRUCTURE_EXTENSION) 
                    && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                creep.say('🚚');
            }
            return;
        }
        // 其次修建
        const constructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (constructionSite) {
            if (creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSite, {visualizePathStyle: {stroke: '#ffffff'}});
                creep.say('🚧');
            }
            return;
        }
        // 最后升级控制器
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            creep.say('⚡');
        }
    }
};

// 挂载原型扩展
mountAll();

// 初始化
for (const room in Game.rooms) {
    Game.rooms[room].initMemory();
}

// 初始更新一次各房间creep配置
for (const room in Game.rooms) {
    Game.rooms[room].updateCreepConfig();
}

const loop = function () {

    // 检查CPU是否足够
    if (Game.time > 1000 && Game.cpu.bucket < 1.5 * Game.cpu.tickLimit && Game.cpu.bucket < Game.cpu.limit * 10) {
        console.log(`${Game.time} Skipping tick CPU Bucket too low. bucket: ${Game.cpu.bucket} tickLimit: ${Game.cpu.tickLimit} limit: ${Game.cpu.limit}`);
        return;
    }

    // 更新各房间creep配置
    if (Game.time % 200 === 0) {
        for (const room in Game.rooms) {
            Game.rooms[room].updateCreepConfig();
        }
    }
    
    // 清理Memory
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
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
    for (const room in Game.rooms) {
        Game.rooms[room].updateSpawnList(creepCountByBase[room] || {});
    }

    // 更新spawn信息（由于没有creep的房间，建筑不会出现在Game.spawns等全局对象下，所以需要将spawn的name更新到memory中才能调用得到）
    for (const room in Game.rooms) {
        Game.rooms[room].updateSpawnInfo();
    }

    // 执行spawn逻辑
    for (const room in Game.rooms) {
        const spawns = Game.rooms[room].memory.spawnIds.map(id => Game.getObjectById(id));
        for (const spawn of spawns) {
            if (spawn) {
                spawn.trySpawn();
            }
        }
    }

    // 执行creep逻辑
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        switch (creep.memory.role) {
            case 'builder':
                break;
            case 'harvester':
                break;
            case 'upgrader':
                break;
            case 'pioneer':
                doPioneer(creep);
                break;
            case 'carrier':
                break;
            default:
                console.log(`Unknown role ${creep.memory.role} for creep ${creep.name}`);
                break;
        }
    }
};

exports.loop = loop;
//# sourceMappingURL=main.js.map
