/**
 * pioneer只在初期（没有container和足够的extension时）使用，负责以下工作：
 * 1. 采集能量
 * 2. 搬运能量到spawn或extension
 * 3. 修建construction site
 * 4. 升级控制器
 * @param {*} creep 
 */
export const doPioneer = function (creep) {

    creep.setSourceId();

    // 状态机：
    // 1. 如果没有携带能量，去采集
    // 2. 如果能量采满，按照优先级执行：搬运-修建-升级
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
    tasks.push('upgradeController');

    creep.execute(tasks);
}