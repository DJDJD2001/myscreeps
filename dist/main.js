'use strict';

const mountCreepPrototype = function () {
    _.assign(Creep.prototype, extensions$3);
};

const extensions$3 = {

    /**
     * 分配source id到memory.targetSourceId
     * @return {void}
     */
    setSourceId() {
        // 分配source
        if (!this.memory.targetSourceId) {
            const sourceCountById = {};
            const creepsInMyRoom = this.room.find(FIND_MY_CREEPS, {filter: {memory: {role: this.memory.role}}});
            for (const other of creepsInMyRoom) {
                if (!other || !other.memory) continue;
                const otherSourceId = other.memory.targetSourceId;
                if (otherSourceId) {
                    sourceCountById[otherSourceId] = (sourceCountById[otherSourceId] || 0) + 1;
                }
            }

            // 根据room.memory.source.id选择source
            const source = this.room.memory.source;
            for (const s of source) {
                const count = sourceCountById[s.id] || 0;
                if (count < s.count) {
                    this.memory.targetSourceId = s.id;
                    break;
                }
            }

            // 如果分配都满了，随机分配一个
            if (!this.memory.targetSourceId) {
                const randomSource = source[Game.time % source.length];
                this.memory.targetSourceId = randomSource.id;
            }
        }
    },

    /**
     * 执行任务队列
     * @param {*} tasks 任务队列，存储方法名字符串数组
     */
    execute(tasks) {
        for (const task of tasks) {
            if (this[task]()) {
                break;
            }
        }
    },

    // creep可执行的任务，返回true表示任务执行完成，false表示未执行，继续下一个任务

    getEnergy() {
        if (this.memory.workingState !== 'harvesting') {
            return false;
        }

        const target = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_CONTAINER
                        || structure.structureType === STRUCTURE_STORAGE)
                    && structure.store[RESOURCE_ENERGY] > 0;
            }
        });
        if (target) {
            if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
                this.say('🔄');
            }
            return true;
        } else {
            return false;
        }
    },

    moveToWorkingPlace() {
        if (this.memory.workingPlace) {
            const workingPos = new RoomPosition(
                this.memory.workingPlace.x,
                this.memory.workingPlace.y,
                this.memory.workingPlace.roomName
            );
            if (!this.pos.isEqualTo(workingPos)) {
                this.moveTo(workingPos, {visualizePathStyle: {stroke: '#0000ff'}});
                this.say('🚩');
                return true;
            }
        }
        return false;
    },

    harvestSource() {
        if (this.memory.workingState !== 'harvesting') {
            return false;
        }
        
        const source = Game.getObjectById(this.memory.targetSourceId);
        
        if (this.harvest(source) === ERR_NOT_IN_RANGE) {
            this.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            this.say('⛏️');
        }
        return true;
    },

    fillEnergy() {
        if (this.fillEnergyinExtension()) {
            return true;
        } else if (this.fillEnergyinTower()) {
            return true;
        } else if (this.fillEnergyinStorage()) {
            return true;
        } else {
            return false;
        }
    },

    fillEnergyinExtension() {
        const target = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_SPAWN
                    || structure.structureType === STRUCTURE_EXTENSION)
                    && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if (target) {
            if (this.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                this.say('🚚');
            }
            return true;
        } else {
            return false;
        }
    },

    fillEnergyinTower() {
        const tower = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_TOWER
                    && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if (tower) {
            if (this.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(tower, {visualizePathStyle: {stroke: '#ffffff'}});
                this.say('🚚');
            }
            return true;
        } else {
            return false;
        }
    },

    fillEnergyinStorage() {
        const storage = this.room.storage;
        if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (this.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}});
                this.say('🚚');
            }
            return true;
        } else {
            return false;
        }
    },

    buildConstruction() {
        const constructionSite = this.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (constructionSite) {
            if (this.build(constructionSite) === ERR_NOT_IN_RANGE) {
                this.moveTo(constructionSite, {visualizePathStyle: {stroke: '#ffffff'}});
                this.say('🚧');
            }
            return true;
        } else {
            return false;
        }
    },

    repairStructure() {
        const damagedStructure = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType !== STRUCTURE_WALL
                && structure.structureType !== STRUCTURE_RAMPART
                && structure.hits < structure.hitsMax
        });
        if (damagedStructure) {
            if (this.repair(damagedStructure) === ERR_NOT_IN_RANGE) {
                this.moveTo(damagedStructure, {visualizePathStyle: {stroke: '#00ff00'}});
                this.say('🔧');
            }
            return true;
        } else {
            return false;
        }
    },

    upgradeController() {
        if (this.upgradeController(this.room.controller) === ERR_NOT_IN_RANGE) {
            this.moveTo(this.room.controller, {visualizePathStyle: {stroke: '#ff00ff'}});
            this.say('⚡');
        }
        return true;
    },
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
    },

    /**
     * autoplan用，找出指定范围内可以放置建筑的全部位置
     * @param {number} range 查找范围(以this为中心，半径单位，默认5)
     * @return {[RoomPosition]|null} 可用位置，找不到返回null
     */
    findAvailablePosition(range = 5) {
        if (!this.roomName) return null;
        const positions = [];
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const x = this.x + dx;
                const y = this.y + dy;
                if (x < 0 || x >= 50 || y < 0 || y >= 50) continue;
                const terrain = Game.rooms[this.roomName].getTerrain().get(x, y);
                if (terrain === TERRAIN_MASK_WALL) continue;
                positions.push(new RoomPosition(x, y, this.roomName));
            }
        }
        return positions.length > 0 ? positions : null;
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
        // 仅前期使用，若能量允许，增加更多WORK
        const pioneerBody = [MOVE, MOVE, WORK, CARRY]; 
        let pioneerEnergy = maxCost - 250;
        while (pioneerEnergy >= 250) {
            pioneerBody.push(WORK, MOVE, MOVE, CARRY);
            pioneerEnergy -= 250;
        }

        // 固定1个CARRY，其余能量用于WORK和MOVE，WORK+CARRY:MOVE=2:1（默认pioneer已经把路修好了）
        const upgraderBody = [];
        upgraderBody.push(WORK, CARRY, MOVE);
        let upgraderEnergy = maxCost - 200;
        while (upgraderEnergy >= 250) {
            upgraderBody.push(WORK, WORK, MOVE);
            upgraderEnergy -= 250;
        }
        
        // 0 CARRY, WORK:MOVE=2:1（默认pioneer已经把路和container修好了），只有750及以上才使用，6个WORK已经拉满了
        const harvesterBody = [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE];

        // WORK:CARRY:MOVE=1:1:2，修建筑修墙，不一定走路，所以保证没路满速
        const builderBody = [];
        let builderEnergy = maxCost;
        while (builderEnergy >= 250) {
            builderBody.push(WORK, CARRY, MOVE, MOVE);
            builderEnergy -= 250;
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
        if (maxCost < 750 || containerCount < sourceCount + 1) {
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
     * 执行tower逻辑
     * @return {void}
     */
    executeTowers() {
        const towers = this.find(FIND_MY_STRUCTURES, {
            filter: {structureType: STRUCTURE_TOWER}
        });
        for (const tower of towers) {
            // 优先攻击敌人
            const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (closestHostile) {
                tower.attack(closestHostile);
                continue;
            }
            // 其次治疗我方受伤单位
            const closestInjured = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: (creep) => creep.hits < creep.hitsMax
            });
            if (closestInjured) {
                tower.heal(closestInjured);
                continue;
            }
            // 最后修理受损建筑，优先修理road和container
            const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => structure.hits < structure.hitsMax &&
                    (structure.structureType === STRUCTURE_ROAD ||
                     structure.structureType === STRUCTURE_CONTAINER ||
                     structure.hits < 0.5 * structure.hitsMax)
            });
            if (closestDamagedStructure) {
                tower.repair(closestDamagedStructure);
                continue;
            }
        }
    },

    /**
     * autoplan用，找到自己storage到某点的路径
     * @param {RoomPosition} pos 目标位置
     * @param {number} range 可选，目标可达范围，默认0
     * @return {null|{path, ops, cost, incomplete}} 路径查找结果，找不到返回null
     */
    findPathToStorage(pos, range = 0) {
        const storage = this.memory.autoPlan.find(o => o.structureType === STRUCTURE_STORAGE);
        if (!storage) return null;
        return PathFinder.search(
            new RoomPosition (storage.pos.x, storage.pos.y, this.name), // origin
            {pos: pos, range: range}, // goal
            {
                plainCost: 2,
                swampCost: 10,
                roomCallback: function(roomName) {
                    let room = Game.rooms[roomName];
                    if (!room) return;

                    let costs = new PathFinder.CostMatrix;

                    // 如果是road，设置cost为1，如果是其他建筑，设置cost为不可穿过
                    room.memory.autoPlan.forEach(o => {
                        if (o.structureType === STRUCTURE_ROAD) {
                            costs.set(o.pos.x, o.pos.y, 1);
                        } else {
                            costs.set(o.pos.x, o.pos.y, 0xff);
                        }
                    });

                    return costs;
                }
            }
        );
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

const doBuilder = function (creep) {

    if (creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.workingState = 'harvesting';
    } else if (creep.store.getFreeCapacity() === 0) {
        creep.memory.workingState = 'working';
    }

    const tasks = [];

    tasks.push('getEnergy');
    tasks.push('buildConstruction');
    tasks.push('repairStructure');
    tasks.push('upgradeController');

    creep.execute(tasks);
};

/**
 * harvester，只负责采集能量，没有CARRY，采集的直接掉进container
 * @param {Creep} creep 执行该角色的creep
 * @returns {void}
 */
const doHarvester = function (creep) {

    creep.setSourceId();

    // 确定采集位置（source旁边的container位置）
    if (!creep.memory.workingPlace) {
        const place = source.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: {structureType: STRUCTURE_CONTAINER}
        })[0]?.pos;
        if (place) {
            creep.memory.workingPlace.x = place.x;
            creep.memory.workingPlace.y = place.y;
            creep.memory.workingPlace.roomName = place.roomName;
        } else {
            console.log(`harvester ${creep.name} in room ${creep.room.name} cannot find workingPlace`);
        }
    }
    
    const tasks = [];
    
    tasks.push('moveToWorkingPlace');
    tasks.push('harvestSource');

    creep.execute(tasks);
};

const doUpgrader = function (creep) {

    if (creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.workingState = 'harvesting';
    } else if (creep.store.getFreeCapacity() === 0) {
        creep.memory.workingState = 'working';
    }

    const tasks = [];

    tasks.push('getEnergy');
    tasks.push('upgradeController');

    creep.execute(tasks);
};

/**
 * pioneer只在初期（没有container和足够的extension时）使用
 * @param {*} creep 
 */
const doPioneer = function (creep) {

    creep.setSourceId();

    // 状态机：
    // 1. 如果没有携带能量，去采集
    // 2. 如果能量采满，按照优先级执行
    if (creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.workingState = 'harvesting';
    } else if (creep.store.getFreeCapacity() === 0) {
        creep.memory.workingState = 'working';
    }

    // 执行逻辑
    const tasks = [];
    
    tasks.push('harvestSource');
    tasks.push('fillEnergy');
    tasks.push('buildConstruction');
    tasks.push('repairStructure');
    tasks.push('upgradeController');

    creep.execute(tasks);
};

const doCarrier = function (creep) {

    if (creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.workingState = 'harvesting';
    } else if (creep.store[RESOURCE_ENERGY] > 0) {
        creep.memory.workingState = 'working';
    }

    const tasks = [];

    tasks.push('getEnergy');
    tasks.push('fillEnergy');

    creep.execute(tasks);
};

/**
 * auto planning construction site in the room, save result in Memory.rooms[roomName].autoPlan
 * usage: place a red/white flag in the room's first spawn position
 * do checkAutoPlanning() every tick T check for flags and plan automatically
 * @returns {boolean} whether planning is done
 */
function checkAutoPlanning() {
    let room;
    let zeroPoint;

    for (const flag of _.values(Game.flags)) {
        if (flag.color === COLOR_RED || flag.secondaryColor === COLOR_WHITE) {
            room = flag.room;
            zeroPoint = new RoomPosition(flag.pos.x - 7, flag.pos.y - 7, flag.pos.roomName);
            flag.remove();
            break;
        }
    }

    if (!room) {
        return false;
    } else {
        return autoPlanRoom(room, zeroPoint);
    }
}

/**
 * auto plan the room, save result in Memory.rooms[roomName].autoPlan
 * 具体逻辑笔记：
 * 使用集中式，这样的话只需要确认中心点即可
 * 半自动（该函数不涉及中心点自动规划，需要手动放零点旗帜）
 * 后续可以添加相关逻辑，自动寻找合适的中心点位置
 * 不使用完全的分布式规划（太麻烦），不涉及现有structure的改建（默认从零开始）
 * 集中布局后，在source边上靠近矩形中心点的位置放置container
 * controller边上放置link和container
 * mineral边上放置container
 * 再以最短路径放置road
 * 过程中会使用一个costmatrix，先不存在memory中了（感觉暂时用不到）
 * @param {Room} room 
 * @param {RoomPosition} zeroPoint
 * @returns {boolean} whether planning is done
 */
function autoPlanRoom(room, zeroPoint) {

    room.memory.autoPlan = [];

    // 应用集中式布局
    for (let dy = 0; dy < layout.length; dy++) {
        for (let dx = 0; dx < layout[0].length; dx++) {
            const structureType = layout[dy][dx];
            if (structureType !== E) {
                const pos = { x: zeroPoint.x + dx, y: zeroPoint.y + dy };
                room.memory.autoPlan.push({
                    pos: pos,
                    structureType: structureType,
                    rcl: layoutrcl[dy][dx],
                });
            }
        }
    }

    // 给source铺路和container、link
    if (room.memory.source) {
        for (const s of room.memory.source) {
            const sourceId = s.id;
            const source = Game.getObjectById(sourceId);
            if (source) {
                let path = room.findPathToStorage(source.pos, 1);
                if (!path) {
                    console.log(`autoPlanning: cannot find path from source to storage in room ${room.name}`);
                    continue;
                }

                // 如果当前位置在规划里面没有road，则添加road
                path.path.forEach(roompos => {
                    const exist = room.memory.autoPlan.find(o => o.pos.x === roompos.x && o.pos.y === roompos.y && o.structureType === STRUCTURE_ROAD);
                    if (!exist) {
                        room.memory.autoPlan.push({
                            pos: { x: roompos.x, y: roompos.y },
                            structureType: STRUCTURE_ROAD,
                            rcl: 1,
                        });
                    }
                });

                // 在source旁边放置container
                const containerPos = path.path[path.path.length - 1];
                room.memory.autoPlan.push({
                    pos: { x: containerPos.x, y: containerPos.y },
                    structureType: STRUCTURE_CONTAINER,
                    rcl: 1,
                });

                // 在source旁边合适位置布置link
                /* 策略1：
                // 尽量放在source旁边，但不能放在路上，如果source旁边只有一个空格等情况，link需要放在最近的可用点上，可用点为非路且非规划中位置
                const availableLinkPos = source.pos.findAvailablePosition();

                // 从可用点中选择距离source最近的点作为link位置
                const linkPos = source.pos.findClosestByPath(availableLinkPos, {
                    filter: (pos) => {
                        const isPlanned = room.memory.autoPlan.find(o => o.pos.x === pos.x && o.pos.y === pos.y);
                        return !isPlanned;
                    }
                });
                if (linkPos) {
                    room.memory.autoPlan.push({
                        pos: { x: linkPos.x, y: linkPos.y },
                        structureType: STRUCTURE_LINK,
                        rcl: 7,
                    });
                } else {
                    console.log(`autoPlanning: cannot find available link position for source in room ${room.name}`);
                }
                */

                // 策略2： 沿着路径往storage方向找第一个位置，满足该位置旁边有空位放Link
                let linkPos = null;
                for (let i = path.path.length - 1; i >= 0; i--) {
                    const roompos = path.path[i];
                    const pos = new RoomPosition(roompos.x, roompos.y, room.name);
                    const availableLinkPos = pos.findAvailablePosition(1);
                    if (availableLinkPos) {
                        linkPos = availableLinkPos.filter(p => {
                            const isPlanned = room.memory.autoPlan.find(o => o.pos.x === p.x && o.pos.y === p.y);
                            return !isPlanned;
                        })[0];
                    }
                    if (linkPos) {
                        room.memory.autoPlan.push({
                            pos: { x: linkPos.x, y: linkPos.y },
                            structureType: STRUCTURE_LINK,
                            rcl: 7,
                        });
                        break;
                    }
                }
                if (!linkPos) {
                    console.log(`autoPlanning: cannot find available link position for source in room ${room.name}`);
                }
            }
        }
    }

    // 给controller铺路和container、link
    if (room.controller) {
        let path = room.findPathToStorage(room.controller.pos, 3);
        if (!path) {
            console.log(`autoPlanning: cannot find path from controller to storage in room ${room.name}`);
        } else {
            // 如果当前位置在规划里面没有road，则添加road
            path.path.forEach(roompos => {
                const exist = room.memory.autoPlan.find(o => o.pos.x === roompos.x && o.pos.y === roompos.y && o.structureType === STRUCTURE_ROAD);
                if (!exist) {
                    room.memory.autoPlan.push({
                        pos: { x: roompos.x, y: roompos.y },
                        structureType: STRUCTURE_ROAD,
                        rcl: 1,
                    });
                }
            });

            // 在工作位置放置container
            const containerPos = path.path[path.path.length - 1];
            room.memory.autoPlan.push({
                pos: { x: containerPos.x, y: containerPos.y },
                structureType: STRUCTURE_CONTAINER,
                rcl: 1,
            });

            // 放置link
            let linkPos = null;
            for (let i = path.path.length - 1; i >= 0; i--) {
                const roompos = path.path[i];
                const pos = new RoomPosition(roompos.x, roompos.y, room.name);
                const availableLinkPos = pos.findAvailablePosition(1);
                if (availableLinkPos) {
                    linkPos = availableLinkPos.filter(p => {
                        const isPlanned = room.memory.autoPlan.find(o => o.pos.x === p.x && o.pos.y === p.y);
                        return !isPlanned;
                    })[0];
                }
                if (linkPos) {
                    room.memory.autoPlan.push({
                        pos: { x: linkPos.x, y: linkPos.y },
                        structureType: STRUCTURE_LINK,
                        rcl: 5,
                    });
                    break;
                }
            }
            if (!linkPos) {
                console.log(`autoPlanning: cannot find available link position for controller in room ${room.name}`);
            }
        }
    }

    // 给mineral铺路和container
    const mineral = room.find(FIND_MINERALS)[0];
    if (mineral) {
        let path = room.findPathToStorage(mineral.pos, 1);
        if (!path) {
            console.log(`autoPlanning: cannot find path from mineral to storage in room ${room.name}`);
        } else {
            // 如果当前位置在规划里面没有road，则添加road
            path.path.forEach(roompos => {
                const exist = room.memory.autoPlan.find(o => o.pos.x === roompos.x && o.pos.y === roompos.y && o.structureType === STRUCTURE_ROAD);
                if (!exist) {
                    room.memory.autoPlan.push({
                        pos: { x: roompos.x, y: roompos.y },
                        structureType: STRUCTURE_ROAD,
                        rcl: 6,
                    });
                }
            });
            // 在mineral旁边放置container
            const containerPos = path.path[path.path.length - 1];
            room.memory.autoPlan.push({
                pos: { x: containerPos.x, y: containerPos.y },
                structureType: STRUCTURE_CONTAINER,
                rcl: 6,
            });
            // 放置extractor
            room.memory.autoPlan.push({
                pos: { x: mineral.pos.x, y: mineral.pos.y },
                structureType: STRUCTURE_EXTRACTOR,
                rcl: 6,
            });
        }
    }

    // 可视化
    visualizeAutoPlan(room);
    return true;
}

function visualizeAutoPlan(room) {
    if (!room.memory.autoPlan) return;
    for (const item of room.memory.autoPlan) {
        room.visual.text(
            structureShape[item.structureType] || '?',
            item.pos.x, item.pos.y,
            { color: structureColor[item.structureType] || 'white', font: 0.8 }
        );
    }
}

// 布局参数（以左上角为x0,y0）
const E = 'empty';
const X = STRUCTURE_EXTENSION;
const R = STRUCTURE_ROAD;
const S = STRUCTURE_SPAWN;
const T = STRUCTURE_TOWER;
const L = STRUCTURE_LAB;
const I = STRUCTURE_LINK;
const G = STRUCTURE_STORAGE;
const P = STRUCTURE_POWER_SPAWN;
const N = STRUCTURE_NUKER;
const M = STRUCTURE_TERMINAL;
const F = STRUCTURE_FACTORY;
const O = STRUCTURE_OBSERVER;

const layout = [
    [ E, E, E, E, R, R, R, R, R, E, E, E, E ],
    [ E, T, E, R, X, X, X, X, X, R, X, T, E ],
    [ E, E, R, L, L, L, X, X, X, X, R, X, E ],
    [ E, R, L, R, L, L, R, X, X, R, X, R, E ],
    [ R, X, L, L, R, R, O, R, R, X, X, X, R ],
    [ R, X, L, L, R, P, I, S, R, X, X, X, R ],
    [ R, X, X, R, T, F, E, M, T, R, X, X, R ],
    [ R, X, X, X, R, S, G, S, R, X, X, X, R ],
    [ R, X, X, X, R, R, N, R, R, X, X, X, R ],
    [ E, R, X, R, X, X, R, X, X, R, X, R, E ],
    [ E, X, R, X, X, X, X, X, X, X, R, X, E ],
    [ E, T, X, R, X, X, X, X, X, R, X, T, E ],
    [ E, E, E, E, R, R, R, R, R, E, E, E, E ],
];

const layoutrcl = [
    [ 0, 0, 0, 0, 7, 7, 7, 6, 6, 0, 0, 0, 0 ],
    [ 0, 7, 0, 7, 8, 8, 8, 6, 6, 6, 6, 8, 0 ],
    [ 0, 0, 7, 8, 8, 8, 8, 6, 6, 6, 4, 6, 0 ],
    [ 0, 7, 8, 7, 7, 7, 6, 6, 6, 4, 6, 4, 0 ],
    [ 7, 8, 8, 6, 6, 6, 8, 6, 4, 4, 4, 4, 4 ],
    [ 7, 8, 6, 6, 6, 8, 5, 8, 4, 4, 4, 4, 4 ],
    [ 7, 8, 8, 6, 5, 7, 0, 6, 3, 4, 4, 4, 4 ],
    [ 7, 7, 7, 7, 5, 7, 4, 1, 2, 2, 4, 4, 4 ],
    [ 7, 7, 7, 7, 5, 5, 8, 2, 2, 2, 3, 3, 4 ],
    [ 0, 7, 7, 5, 5, 5, 5, 2, 2, 2, 3, 3, 0 ],
    [ 0, 7, 5, 7, 5, 5, 5, 5, 3, 2, 3, 8, 0 ],
    [ 0, 8, 7, 5, 5, 5, 5, 5, 3, 3, 8, 8, 0 ],
    [ 0, 0, 0, 0, 5, 5, 5, 5, 5, 0, 0, 0, 0 ],
];

const structureShape = {
    "spawn": "◎",
    "extension": "ⓔ",
    "link": "◈",
    "road": "•",
    "constructedWall": "▓",
    "rampart": "⊙",
    "storage": "▤",
    "tower": "🔫",
    "observer": "👀",
    "powerSpawn": "❂",
    "extractor": "⇌",
    "terminal": "✡",
    "lab": "☢",
    "container": "□",
    "nuker": "▲",
    "factory": "☭"
};

const structureColor = {
    "spawn": "cyan",
    "extension": "#0bb118",
    "link": "yellow",
    "road": "#fa6f6f",
    "constructedWall": "#003fff",
    "rampart": "#003fff",
    "storage": "yellow",
    "tower": "cyan",
    "observer": "yellow",
    "powerSpawn": "cyan",
    "extractor": "cyan",
    "terminal": "yellow",
    "lab": "#d500ff",
    "container": "yellow",
    "nuker": "cyan",
    "factory": "yellow"
};

// 挂载原型扩展
mountAll();

global.doRoles = {};

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

const loop = function () {

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

    // 特判：如果是第一个房间的第一个spawn的话，执行一次自动规划
    if (Game.spawns['Spawn1'] && !Game.spawns['Spawn1'].room.memory.autoPlan) {
        Game.spawns['Spawn1'].room.createFlag(
            Game.spawns['Spawn1'].pos.x,
            Game.spawns['Spawn1'].pos.y,
            'autoPlan' + Game.time,
            COLOR_RED,
            COLOR_WHITE
        );
    }

    checkAutoPlanning();

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
};

exports.loop = loop;
//# sourceMappingURL=main.js.map
