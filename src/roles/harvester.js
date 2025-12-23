/**
 * harvester，只负责采集能量，没有CARRY，采集的直接掉进container
 * @param {Creep} creep 执行该角色的creep
 * @returns {void}
 */
export const doHarvester = function (creep) {

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
}