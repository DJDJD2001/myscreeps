/**
 * pioneer只在初期（没有container和足够的extension时）使用
 * @param {*} creep 
 */
export const doPioneer = function (creep) {

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
}