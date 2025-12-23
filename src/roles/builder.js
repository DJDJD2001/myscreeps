export const doBuilder = function (creep) {

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
}