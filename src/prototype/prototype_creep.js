export const mountCreepPrototype = function () {
    _.assign(Creep.prototype, extensions)
}

const extensions = {

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
}