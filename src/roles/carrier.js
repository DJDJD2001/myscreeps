export const doCarrier = function (creep) {

    if (creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.workingState = 'harvesting';
    } else if (creep.store[RESOURCE_ENERGY] > 0) {
        creep.memory.workingState = 'working';
    }

    const tasks = [];

    tasks.push('getEnergy');
    tasks.push('fillEnergy');

    creep.execute(tasks);
}