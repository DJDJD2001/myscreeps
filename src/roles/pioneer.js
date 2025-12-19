/**
 * pioneer只在初期（没有container和足够的extension时）使用，负责以下工作：
 * 1. 采集能量
 * 2. 搬运能量到spawn或extension
 * 3. 修建construction site
 * 4. 升级控制器
 * @param {*} creep 
 */
export const doPioneer = function (creep) {

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
}