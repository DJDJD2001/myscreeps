module.exports = function () {
    _.assign(Spawn.prototype, extensions)
}

const extensions = {
    /**
     * 初始化Memory
     * @return {void}
     */
    initMemory() {
        if (!this.memory.sourceAccessableCount) {
            this.memory.sourceAccessableCount = sources.map(source => {
                return source.pos.lookForAvailableAdjacentCount();
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
        const sources = this.find(FIND_SOURCES);
        const sourceCount = sources.length;
        const sourceAccessableCount = this.memory.sourceAccessableCount; // 每个source周围可供采集的地块数量

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
            for (let i = 0; i < sourceCount; i++) {
                harvesterNum += Math.min(Math.ceil(5 / harvesterBody.filter(part => part === WORK).length), sourceAccessableCount[i]);
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
            const existNum = creepList[role] + this.memory.spawnList.filter(creep => creep.role === role).length;
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
            }
        }
    }
        
}