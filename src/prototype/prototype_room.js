export const mountRoomPrototype = function () {
    _.assign(Room.prototype, extensions)
}

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
        const rcl = this.controller.level;
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
}